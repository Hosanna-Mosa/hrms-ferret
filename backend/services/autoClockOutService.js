const Attendance = require('../models/Attendance');

const autoClockOut = async () => {
  try {
    const now = new Date();
    // Get the current local date in Asia/Kolkata timezone
    const kolkataTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const year = kolkataTime.getFullYear();
    const monthStr = String(kolkataTime.getMonth() + 1).padStart(2, '0');
    const dayStr = String(kolkataTime.getDate()).padStart(2, '0');
    const todayStr = `${year}-${monthStr}-${dayStr}`;

    // Find all attendance records where check_in_at is set but check_out_at is missing,
    // and the work_date is today or older
    const activeSessions = await Attendance.find({
      check_in_at: { $exists: true },
      check_out_at: { $exists: false },
      work_date: { $lte: todayStr }
    }).exec();

    for (const session of activeSessions) {
      const sessionDate = session.work_date;
      const autoOutDate = new Date(`${sessionDate}T23:59:00+05:30`);

      // Only clock out if the current time has passed the auto-out target of 11:59 PM on that session's day
      if (now >= autoOutDate) {
        session.check_out_at = autoOutDate;

        // Close any active breaks
        const activeBreak = session.breaks.find(b => !b.ended_at);
        if (activeBreak) {
          activeBreak.ended_at = autoOutDate;
          const breakMinutes = Math.round((autoOutDate - new Date(activeBreak.started_at)) / 60000);
          session.total_break_minutes += Math.max(0, breakMinutes);
        }

        // Calculate total worked minutes
        const checkInTime = new Date(session.check_in_at).getTime();
        const checkOutTime = autoOutDate.getTime();
        const totalMinutes = Math.round((checkOutTime - checkInTime) / 60000);
        session.total_work_minutes = Math.max(0, totalMinutes);

        await session.save();
        console.log(`[Auto Clock-Out] Automatically clocked out employee ${session.employee_id} for date ${sessionDate}`);
      }
    }
  } catch (error) {
    console.error('[Auto Clock-Out] Error in autoClockOut background job:', error);
  }
};

const startAutoClockOutJob = () => {
  console.log('[Auto Clock-Out] Initializing background job...');
  // Run on startup
  autoClockOut();

  // Run every 5 minutes
  setInterval(autoClockOut, 5 * 60 * 1000);
};

module.exports = {
  autoClockOut,
  startAutoClockOutJob
};
