/*
  taskService.js
  Task CRUD + validation.

  Depends on: window.AppStorage
*/

(function (global) {
  "use strict";

  var ALLOWED_STATUS = ["todo", "in-progress", "done"];
  var ALLOWED_PRIORITY = ["low", "medium", "high"];

  function AppError(message, code, details) {
    this.name = "AppError";
    this.message = message || "Unexpected error";
    this.code = code || "APP_ERROR";
    this.details = details;
  }
  AppError.prototype = Object.create(Error.prototype);

  function nowStartOfDayLocal() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function parseDateInputToISO(dateInputValue) {
    // date input is YYYY-MM-DD; interpret as local date at 00:00.
    if (typeof dateInputValue !== "string" || !dateInputValue) return null;
    var parts = dateInputValue.split("-");
    if (parts.length !== 3) return null;
    var y = Number(parts[0]);
    var m = Number(parts[1]);
    var d = Number(parts[2]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    var dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (Number.isNaN(dt.getTime())) return null;
    // Ensure round-trip matches (guards invalid dates like 2026-02-31)
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt.toISOString();
  }

  function isValidDueDateISO(iso) {
    if (typeof iso !== "string" || !iso) return false;
    var dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return false;
    // Must be today or future (compare by local day)
    var dueLocal = new Date(dt.getTime());
    dueLocal.setHours(0, 0, 0, 0);
    return dueLocal.getTime() >= nowStartOfDayLocal().getTime();
  }

  function normalizeTags(tags) {
    if (tags == null) return [];
    if (!Array.isArray(tags)) throw new AppError("Tags must be an array", "VALIDATION_ERROR");
    var out = [];
    for (var i = 0; i < tags.length; i++) {
      var t = tags[i];
      if (typeof t !== "string") throw new AppError("Tags must be strings", "VALIDATION_ERROR");
      var trimmed = t.trim();
      if (!trimmed) throw new AppError("Tags cannot be empty", "VALIDATION_ERROR");
      out.push(trimmed);
    }
    // de-dupe (case-insensitive)
    var seen = Object.create(null);
    var deduped = [];
    for (var j = 0; j < out.length; j++) {
      var key = out[j].toLowerCase();
      if (!seen[key]) {
        seen[key] = true;
        deduped.push(out[j]);
      }
    }
    return deduped;
  }

  function validateTaskInput(input, mode) {
    // mode: 'create' | 'update'
    if (!input || typeof input !== "object") throw new AppError("Invalid task input", "VALIDATION_ERROR");

    var title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) throw new AppError("Title is required", "VALIDATION_ERROR");

    var description = "";
    if (input.description != null) {
      if (typeof input.description !== "string") throw new AppError("Description must be a string", "VALIDATION_ERROR");
      description = input.description.trim();
    }

    var status = input.status || "todo";
    if (ALLOWED_STATUS.indexOf(status) === -1) {
      throw new AppError("Status must be one of: " + ALLOWED_STATUS.join(", "), "VALIDATION_ERROR");
    }

    var priority = input.priority || "medium";
    if (ALLOWED_PRIORITY.indexOf(priority) === -1) {
      throw new AppError(
        "Priority must be one of: " + ALLOWED_PRIORITY.join(", "),
        "VALIDATION_ERROR"
      );
    }

    var dueDateISO = input.dueDate;
    if (typeof dueDateISO !== "string" || !dueDateISO) {
      throw new AppError("Due date is required", "VALIDATION_ERROR");
    }
    if (!isValidDueDateISO(dueDateISO)) {
      throw new AppError("Due date must be today or a future date", "VALIDATION_ERROR");
    }

    var tags = normalizeTags(input.tags);

    var base = {
      title: title,
      description: description,
      status: status,
      priority: priority,
      dueDate: dueDateISO,
      tags: tags,
    };

    if (mode === "update") {
      if (typeof input.id !== "string" && typeof input.id !== "number") {
        throw new AppError("Task id is required for update", "VALIDATION_ERROR");
      }
      base.id = String(input.id);
    }

    return base;
  }

  function generateId() {
    // Unique enough for local app: timestamp + random
    return String(Date.now()) + "_" + Math.random().toString(16).slice(2);
  }

  function sortTasks(tasks) {
    // Sort by due date asc, then priority (high->low), then title
    var prioRank = { high: 0, medium: 1, low: 2 };
    return tasks
      .slice()
      .sort(function (a, b) {
        var ad = new Date(a.dueDate).getTime();
        var bd = new Date(b.dueDate).getTime();
        if (ad !== bd) return ad - bd;
        var ap = prioRank[a.priority] ?? 99;
        var bp = prioRank[b.priority] ?? 99;
        if (ap !== bp) return ap - bp;
        return String(a.title).localeCompare(String(b.title));
      });
  }

  var taskService = {
    allowedStatus: ALLOWED_STATUS.slice(),
    allowedPriority: ALLOWED_PRIORITY.slice(),
    parseDateInputToISO: parseDateInputToISO,

    list: async function () {
      try {
        var tasks = await global.AppStorage.getAllTasks();
        return sortTasks(tasks);
      } catch (err) {
        throw new AppError("Failed to load tasks", "STORAGE_ERROR", err);
      }
    },

    getById: async function (id) {
      var sid = String(id);
      var tasks = await this.list();
      for (var i = 0; i < tasks.length; i++) {
        if (String(tasks[i].id) === sid) return tasks[i];
      }
      return null;
    },

    create: async function (input) {
      var validated = validateTaskInput(input, "create");
      var task = {
        id: generateId(),
        title: validated.title,
        description: validated.description,
        status: validated.status,
        priority: validated.priority,
        dueDate: validated.dueDate,
        tags: validated.tags,
      };

      try {
        var tasks = await global.AppStorage.getAllTasks();
        tasks.push(task);
        await global.AppStorage.setAllTasks(tasks);
        return task;
      } catch (err) {
        throw new AppError("Failed to save task", "STORAGE_ERROR", err);
      }
    },

    update: async function (input) {
      var validated = validateTaskInput(input, "update");
      try {
        var tasks = await global.AppStorage.getAllTasks();
        var idx = -1;
        for (var i = 0; i < tasks.length; i++) {
          if (String(tasks[i].id) === String(validated.id)) {
            idx = i;
            break;
          }
        }
        if (idx === -1) throw new AppError("Task not found", "NOT_FOUND");

        var updated = {
          id: String(validated.id),
          title: validated.title,
          description: validated.description,
          status: validated.status,
          priority: validated.priority,
          dueDate: validated.dueDate,
          tags: validated.tags,
        };

        tasks[idx] = updated;
        await global.AppStorage.setAllTasks(tasks);
        return updated;
      } catch (err) {
        if (err && err.name === "AppError") throw err;
        throw new AppError("Failed to update task", "STORAGE_ERROR", err);
      }
    },

    remove: async function (id) {
      var sid = String(id);
      try {
        var tasks = await global.AppStorage.getAllTasks();
        var next = [];
        var removed = false;
        for (var i = 0; i < tasks.length; i++) {
          if (String(tasks[i].id) === sid) {
            removed = true;
          } else {
            next.push(tasks[i]);
          }
        }
        if (!removed) throw new AppError("Task not found", "NOT_FOUND");
        await global.AppStorage.setAllTasks(next);
        return true;
      } catch (err) {
        if (err && err.name === "AppError") throw err;
        throw new AppError("Failed to delete task", "STORAGE_ERROR", err);
      }
    },

    query: async function (criteria) {
      // criteria: { search, status, priority, tag, dueBeforeISO }
      var c = criteria || {};
      var tasks = await this.list();

      var search = typeof c.search === "string" ? c.search.trim().toLowerCase() : "";
      var status = typeof c.status === "string" ? c.status : "";
      var priority = typeof c.priority === "string" ? c.priority : "";
      var tag = typeof c.tag === "string" ? c.tag.trim().toLowerCase() : "";
      var dueBeforeISO = typeof c.dueBeforeISO === "string" ? c.dueBeforeISO : "";

      if (status && ALLOWED_STATUS.indexOf(status) === -1) {
        throw new AppError("Invalid status filter", "VALIDATION_ERROR");
      }
      if (priority && ALLOWED_PRIORITY.indexOf(priority) === -1) {
        throw new AppError("Invalid priority filter", "VALIDATION_ERROR");
      }
      if (dueBeforeISO) {
        var dt = new Date(dueBeforeISO);
        if (Number.isNaN(dt.getTime())) throw new AppError("Invalid due date filter", "VALIDATION_ERROR");
      }

      var dueBeforeTime = dueBeforeISO ? new Date(dueBeforeISO).getTime() : null;

      var out = tasks.filter(function (t) {
        if (status && t.status !== status) return false;
        if (priority && t.priority !== priority) return false;
        if (tag) {
          var has = false;
          for (var i = 0; i < t.tags.length; i++) {
            if (String(t.tags[i]).toLowerCase() === tag) {
              has = true;
              break;
            }
          }
          if (!has) return false;
        }
        if (dueBeforeTime != null) {
          var tt = new Date(t.dueDate).getTime();
          if (tt > dueBeforeTime) return false;
        }
        if (search) {
          var hay = (t.title + "\n" + (t.description || "")).toLowerCase();
          if (hay.indexOf(search) === -1) return false;
        }
        return true;
      });

      return sortTasks(out);
    },

    AppError: AppError,
  };

  global.TaskService = taskService;
})(window);
