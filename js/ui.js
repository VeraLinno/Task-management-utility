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
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Invalid date";
    // Display as local YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function isoToDateInputValue(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function parseTagsFromInput(text) {
    if (typeof text !== "string") return [];
    const parts = text
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
    const el = $("message");
    if (!el) return;
    el.classList.remove("message--ok", "message--error");
    if (type === "ok") el.classList.add("message--ok");
    if (type === "error") el.classList.add("message--error");
    el.textContent = text;
    el.hidden = false;
  }

  function clearMessage() {
    const el = $("message");
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("message--ok", "message--error");
  }

  function renderTask(task) {
    const statusClass = "pill--" + task.status;
    const prioClass = "pill--" + task.priority;

    let tagsHtml = "";
    if (task.tags && task.tags.length) {
      tagsHtml = task.tags
        .map(function (t) {
          return '<span class="pill">#' + escapeHtml(t) + "</span>";
        })
        .join("");
    }

    const descHtml = task.description
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
    const list = $("taskList");
    const count = $("taskCount");
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
    const search = $("search").value;
    const status = $("filterStatus").value;
    const priority = $("filterPriority").value;
    const tag = $("filterTag").value;
    const dueBefore = $("filterDueBefore").value;

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
    const cancel = $("btnCancelEdit");
    if (cancel) cancel.hidden = mode !== "edit";
  }

  function resetForm() {
    const form = $("taskForm");
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
    const id = $("taskId").value;
    const title = $("title").value;
    const description = $("description").value;
    const status = $("status").value;
    const priority = $("priority").value;
    const dueDateInput = $("dueDate").value;
    const tagsInput = $("tags").value;

    const dueDateISO = global.TaskService.parseDateInputToISO(dueDateInput);

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
    const criteria = getCriteriaFromControls();
    const tasks = await global.TaskService.query(criteria);
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
    const form = $("taskForm");
    const list = $("taskList");

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      clearMessage();

      try {
        const input = getTaskInputFromForm();
        const isEdit = Boolean(input.id);

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
      const btn = e.target && e.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.getAttribute("data-action");
      const card = btn.closest("article[data-task-id]");
      if (!card) return;
      const id = card.getAttribute("data-task-id");

      try {
        clearMessage();
        if (action === "edit") {
          const task = await global.TaskService.getById(id);
          if (!task) throw new global.TaskService.AppError("Task not found", "NOT_FOUND");
          fillFormForEdit(task);
          setMessage("ok", "Editing task: " + task.title);
          return;
        }

        if (action === "delete") {
          const ok = global.confirm("Delete this task? This cannot be undone.");
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

  const ui = {
    init: async function () {
      // Set default due date to today
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      $("dueDate").value = y + "-" + m + "-" + d;

      bindEvents();
      await refreshList();
    },
  };

  global.AppUI = ui;
})(window);
