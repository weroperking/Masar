export const autoScheduleService = {
  isRunning: false,

  async checkAndRunSchedules(): Promise<{ started: number, ended: number }> {
    // Deprecated: Auto-scheduling is now handled by the backend CRON jobs.
    return { started: 0, ended: 0 };
  }
};

