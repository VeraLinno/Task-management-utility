/*
  storage.js
  Async localStorage wrapper to simulate real async persistence.

  All methods return Promises.
*/

(function (global) {
  "use strict";

  const STORAGE_KEY = "vanilla_task_manager_v1";

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function safeJsonParse(text, fallback) {
    try {
      return JSON.parse(text);
    } catch (err) {
      return fallback;
    }
  }

  function readRaw() {
    const raw = global.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: [] };
    const parsed = safeJsonParse(raw, { tasks: [] });
    if (!parsed || typeof parsed !== "object") return { tasks: [] };
    if (!Array.isArray(parsed.tasks)) parsed.tasks = [];
    return parsed;
  }

  function writeRaw(data) {
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  const storage = {
    key: STORAGE_KEY,

    getAllTasks: function () {
      return delay(0).then(function () {
        return readRaw().tasks.slice();
      });
    },

    setAllTasks: function (tasks) {
      return delay(0).then(function () {
        writeRaw({ tasks: tasks.slice() });
        return true;
      });
    },

    clear: function () {
      return delay(0).then(function () {
        global.localStorage.removeItem(STORAGE_KEY);
        return true;
      });
    },
  };

  global.AppStorage = storage;
})(window);
