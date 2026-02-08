# AI Assisted Development Log

This document captures how AI was used to design and implement the project.

## Prompts used

1. **Initial build request**
   - Build a browser-based task management utility using pure JavaScript only (no frameworks, no libraries).
   - Requirements included: task model fields, CRUD, filter/search, modular architecture, async storage, validation, clean UI, and deliverables.

2. **Implementation approach requested by the prompt**
   - Implement incrementally: storage layer → task service → UI rendering → filters/search.

## How AI helped

### Design / architecture

- Proposed a simple modular architecture using IIFEs and globals:
  - [`velinn-js/js/storage.js`](velinn-js/js/storage.js): async localStorage wrapper
  - [`velinn-js/js/taskService.js`](velinn-js/js/taskService.js): CRUD + validation + query
  - [`velinn-js/js/ui.js`](velinn-js/js/ui.js): DOM rendering and event wiring
  - [`velinn-js/js/main.js`](velinn-js/js/main.js): bootstrap

This keeps concerns separated while still working when opening [`velinn-js/index.html`](velinn-js/index.html) directly.

### Validation

- Implemented validation rules in [`velinn-js/js/taskService.js`](velinn-js/js/taskService.js):
  - required title
  - due date must be valid and today/future
  - status/priority must be in allowed sets
  - tags must be an array of non-empty strings (with de-duplication)

### Async handling

- Ensured all storage interactions are async by wrapping localStorage reads/writes in Promises.
- Used `async/await` in service and UI layers to keep code readable.

### UI

- Built a clean, framework-free UI in [`velinn-js/index.html`](velinn-js/index.html) and [`velinn-js/style.css`](velinn-js/style.css).
- Implemented user-friendly success/error messages and confirmation on delete.

## Notes

- The app is intentionally dependency-free and runs without a build step.
- The code is structured to look like it was built step-by-step (separate modules, clear comments, explicit validation and error handling).
