/*
  ui.js
  DOM rendering + event wiring.

  Depends on: window.TaskService
*/

(function (global) {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDueDate(iso) {
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Invalid date";
    // Display as local YYYY-MM-DD
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function isoToDateInputValue(iso) {
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function parseTagsFromInput(text) {
    if (typeof text !== "string") return [];
    var parts = text
      .split(",")
      .map(function (t) {
        return t.trim();
      })
      .filter(function (t) {
        return Boolean(t);
      });
    return parts;
  }

  function setMessage(type, text) {
    var el = $("message");
    if (!el) return;
    el.classList.remove("message--ok", "message--error");
    if (type === "ok") el.classList.add("message--ok");
    if (type === "error") el.classList.add("message--error");
    el.textContent = text;
    el.hidden = false;
  }

  function clearMessage() {
    var el = $("message");
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("message--ok", "message--error");
  }

  function renderTask(task) {
    var statusClass = "pill--" + task.status;
    var prioClass = "pill--" + task.priority;

    var tagsHtml = "";
    if (task.tags && task.tags.length) {
      tagsHtml = task.tags
        .map(function (t) {
          return '<span class="pill">#' + escapeHtml(t) + "</span>";
        })
        .join("");
    }

    var descHtml = task.description
      ? '<p class="task__desc">' + escapeHtml(task.description) + "</p>"
      : "";

    return (
      '<article class="task" data-task-id="' +
      escapeHtml(task.id) +
      '">' +
      '<div class="task__top">' +
      '<div>' +
      '<h3 class="task__title">' +
      escapeHtml(task.title) +
      "</h3>" +
      '<div class="task__meta">' +
      '<span class="pill ' +
      statusClass +
      '">' +
      escapeHtml(task.status) +
      "</span>" +
      '<span class="pill ' +
      prioClass +
      '">' +
      escapeHtml(task.priority) +
      "</span>" +
      '<span class="pill">Due: ' +
      escapeHtml(formatDueDate(task.dueDate)) +
      "</span>" +
      "</div>" +
      "</div>" +
      '<div class="task__actions">' +
      '<button class="btn btn--secondary" type="button" data-action="edit">Edit</button>' +
      '<button class="btn btn--danger" type="button" data-action="delete">Delete</button>' +
      "</div>" +
      "</div>" +
      descHtml +
      (tagsHtml ? '<div class="task__tags">' + tagsHtml + "</div>" : "") +
      "</article>"
    );
  }

  function renderTaskList(tasks) {
    var list = $("taskList");
    var count = $("taskCount");
    if (count) count.textContent = String(tasks.length);

    if (!list) return;
    if (!tasks.length) {
      list.innerHTML =
        '<div class="task" role="note">No tasks match your current search/filters.</div>';
      return;
    }

    list.innerHTML = tasks.map(renderTask).join("");
  }

  function getCriteriaFromControls() {
    var search = $("search").value;
    var status = $("filterStatus").value;
    var priority = $("filterPriority").value;
    var tag = $("filterTag").value;
    var dueBefore = $("filterDueBefore").value;

    return {
      search: search,
      status: status,
      priority: priority,
      tag: tag,
      dueBeforeISO: dueBefore ? global.TaskService.parseDateInputToISO(dueBefore) : "",
    };
  }

  function setFormMode(mode) {
    // mode: 'create' | 'edit'
    var cancel = $("btnCancelEdit");
    if (cancel) cancel.hidden = mode !== "edit";
  }

  function resetForm() {
    var form = $("taskForm");
    form.reset();
    $("taskId").value = "";
    setFormMode("create");
  }

  function fillFormForEdit(task) {
    $("taskId").value = String(task.id);
    $("title").value = task.title;
    $("description").value = task.description || "";
    $("status").value = task.status;
    $("priority").value = task.priority;
    $("dueDate").value = isoToDateInputValue(task.dueDate);
    $("tags").value = (task.tags || []).join(", ");
    setFormMode("edit");
  }

  function getTaskInputFromForm() {
    var id = $("taskId").value;
    var title = $("title").value;
    var description = $("description").value;
    var status = $("status").value;
    var priority = $("priority").value;
    var dueDateInput = $("dueDate").value;
    var tagsInput = $("tags").value;

    var dueDateISO = global.TaskService.parseDateInputToISO(dueDateInput);

    return {
      id: id ? String(id) : undefined,
      title: title,
      description: description,
      status: status,
      priority: priority,
      dueDate: dueDateISO,
      tags: parseTagsFromInput(tagsInput),
    };
  }

  async function refreshList() {
    clearMessage();
    var criteria = getCriteriaFromControls();
    var tasks = await global.TaskService.query(criteria);
    renderTaskList(tasks);
  }

  function friendlyError(err) {
    if (!err) return "Unknown error";
    if (typeof err === "string") return err;
    if (err.name === "AppError" && err.message) return err.message;
    if (err.message) return err.message;
    return "Unexpected error";
  }

  function bindEvents() {
    var form = $("taskForm");
    var list = $("taskList");

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      clearMessage();

      try {
        var input = getTaskInputFromForm();
        var isEdit = Boolean(input.id);

        if (isEdit) {
          await global.TaskService.update(input);
          setMessage("ok", "Task updated");
        } else {
          await global.TaskService.create(input);
          setMessage("ok", "Task created");
        }

        resetForm();
        await refreshList();
      } catch (err) {
        setMessage("error", friendlyError(err));
      }
    });

    $("btnResetForm").addEventListener("click", function () {
      clearMessage();
      resetForm();
    });

    $("btnCancelEdit").addEventListener("click", function () {
      clearMessage();
      resetForm();
    });

    list.addEventListener("click", async function (e) {
      var btn = e.target && e.target.closest("button[data-action]");
      if (!btn) return;

      var action = btn.getAttribute("data-action");
      var card = btn.closest("article[data-task-id]");
      if (!card) return;
      var id = card.getAttribute("data-task-id");

      try {
        clearMessage();
        if (action === "edit") {
          var task = await global.TaskService.getById(id);
          if (!task) throw new global.TaskService.AppError("Task not found", "NOT_FOUND");
          fillFormForEdit(task);
          setMessage("ok", "Editing task: " + task.title);
          return;
        }

        if (action === "delete") {
          var ok = global.confirm("Delete this task? This cannot be undone.");
          if (!ok) return;
          await global.TaskService.remove(id);
          setMessage("ok", "Task deleted");
          await refreshList();
          return;
        }
      } catch (err) {
        setMessage("error", friendlyError(err));
      }
    });

    function onControlsChanged() {
      refreshList().catch(function (err) {
        setMessage("error", friendlyError(err));
      });
    }

    $("search").addEventListener("input", onControlsChanged);
    $("filterStatus").addEventListener("change", onControlsChanged);
    $("filterPriority").addEventListener("change", onControlsChanged);
    $("filterTag").addEventListener("input", onControlsChanged);
    $("filterDueBefore").addEventListener("change", onControlsChanged);

    $("btnClearFilters").addEventListener("click", function () {
      $("search").value = "";
      $("filterStatus").value = "";
      $("filterPriority").value = "";
      $("filterTag").value = "";
      $("filterDueBefore").value = "";
      onControlsChanged();
    });
  }

  var ui = {
    init: async function () {
      // Set default due date to today
      var today = new Date();
      var y = today.getFullYear();
      var m = String(today.getMonth() + 1).padStart(2, "0");
      var d = String(today.getDate()).padStart(2, "0");
      $("dueDate").value = y + "-" + m + "-" + d;

      bindEvents();
      await refreshList();
    },
  };

  global.AppUI = ui;
})(window);
