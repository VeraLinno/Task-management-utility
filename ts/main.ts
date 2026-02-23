/**
 * main.ts
 * 
 * Application entry point.
 * Initializes the UI module and handles global error handling.
 */

import { ui } from "./ui";

/**
 * Application startup function
 */
async function start(): Promise<void> {
  try {
    await ui.init();
  } catch (err) {
    // Last-resort error surface
    console.error(err);
    
    const el = document.getElementById("message");
    if (el) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : String(err);
      el.textContent = `Failed to start app: ${errorMessage}`;
      el.classList.add("message--error");
      el.hidden = false;
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}

// Export for potential testing
export { start };
