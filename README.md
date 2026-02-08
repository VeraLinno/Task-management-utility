# Vanilla Task Manager

Browser-based task management utility built with **vanilla HTML/CSS/JavaScript** (no frameworks, no external libraries). Data persists in **localStorage** via an **async Promise-based storage layer**.

## How to run

1. Open [`velinn-js/index.html`](velinn-js/index.html) in any modern browser.
2. Add tasks using the form.

No build step, no server required.

## Features

- Create, list, update, delete tasks
- Search tasks by title/description
- Filter tasks by:
  - status
  - priority
  - tag
  - due date (on/before)
- Clean UI with success/error feedback

## Task model

Each task contains:

- `id` (unique string)
- `title` (required)
- `description` (optional)
- `status` (`todo` | `in-progress` | `done`)
- `priority` (`low` | `medium` | `high`)
- `dueDate` (ISO string)
- `tags` (array of strings)

## Storage approach

- All tasks are stored under a single localStorage key: `vanilla_task_manager_v1`.
- The storage layer is isolated in [`velinn-js/js/storage.js`](velinn-js/js/storage.js).
- Reads/writes are wrapped in Promises (with a tiny `setTimeout`) to simulate real async persistence.

## Validation rules

Implemented in [`velinn-js/js/taskService.js`](velinn-js/js/taskService.js):

- Title is required and cannot be empty
- Due date must be a valid date and must be **today or in the future**
- Status must be one of: `todo`, `in-progress`, `done`
- Priority must be one of: `low`, `medium`, `high`
- Tags must be an array of **non-empty strings** (input is parsed from comma-separated text)

## Async handling

- UI calls service methods using `async/await`.
- Service calls storage methods using `await`.
- Storage methods always return Promises.

## Project structure

- [`velinn-js/index.html`](velinn-js/index.html)
- [`velinn-js/style.css`](velinn-js/style.css)
- `velinn-js/js/`
  - [`velinn-js/js/storage.js`](velinn-js/js/storage.js)
  - [`velinn-js/js/taskService.js`](velinn-js/js/taskService.js)
  - [`velinn-js/js/ui.js`](velinn-js/js/ui.js)
  - [`velinn-js/js/main.js`](velinn-js/js/main.js)
