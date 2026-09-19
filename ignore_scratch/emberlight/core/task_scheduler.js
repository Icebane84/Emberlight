/* ==========================================================================
   FILE: core/task_scheduler.js
   ROLE: Cooperative Single-Threaded Time-Slicing Scheduler
   ========================================================================== */
window._TaskSchedulerInternal = window._TaskSchedulerInternal || {};

(() => {
  'use strict';

  const taskQueue = [];

  function enqueueTask(taskFn, priority = 0) {
    taskQueue.push({ fn: taskFn, priority });
    taskQueue.sort((a, b) => b.priority - a.priority);
  }

  function processQueue(frameTimeLimitMs = 4.0) {
    const startTime = performance.now();

    while (taskQueue.length > 0) {
      // If we exceed our slice of the frame budget, pause and resume next frame
      if (performance.now() - startTime > frameTimeLimitMs) {
        break;
      }

      const task = taskQueue.shift();
      try {
        task.fn();
      } catch (err) {
        console.error('[SCHEDULER] Task execution error:', err);
      }
    }
  }

  window._TaskSchedulerInternal.Scheduler = Object.freeze({
    enqueueTask,
    processQueue
  });
})();

if (typeof window !== 'undefined') {
  window.EmberlightScheduler = window._TaskSchedulerInternal.Scheduler;
}
delete window._TaskSchedulerInternal;