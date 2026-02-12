/*
  main.js
  App bootstrap.

  Depends on: AppStorage, TaskService, AppUI
*/

(function (global) {
  "use strict";

  async function start() {
    try {
      await global.AppUI.init();
    } catch (err) {
      // Last-resort error surface
      console.error(err);
      const el = document.getElementById("message");
      if (el) {
        el.textContent = "Failed to start app: " + (err && err.message ? err.message : String(err));
        el.classList.add("message--error");
        el.hidden = false;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(window);
