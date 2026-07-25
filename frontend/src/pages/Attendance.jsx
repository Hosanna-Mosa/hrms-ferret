import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const Attendance = () => {
  const { user } = useAuth();
  const [workMode, setWorkMode] = useState('remote');
  const [attendance, setAttendance] = useState({ status: 'idle', in: null, out: null, breakStart: null, breakTotal: 0 });
  const [history, setHistory] = useState([]);
  const [clock, setClock] = useState('00:00:00');
  const [dateStr, setDateStr] = useState('');
  const [currentMonth, setCurrentMonth] = useState('2026-07');

  // Detail Modal States
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calendar events, holidays & news state
  const [announcements, setAnnouncements] = useState([]);
  const [meetings, setMeetings] = useState([]);

  const fetchAnnouncements = async () => {
    try {
      const res = await apiRequest('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (e) {
      console.error('Error fetching announcements:', e);
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await apiRequest('/api/meetings/me');
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (e) {
      console.error('Error fetching meetings:', e);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const res = await apiRequest(`/api/attendance/me?month=${currentMonth}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);

        // Find today's session
        const todayStr = new Date().toISOString().slice(0, 10);
        const todaySession = data.find(s => s.work_date.slice(0, 10) === todayStr);

        if (todaySession) {
          setWorkMode(todaySession.work_mode || 'remote');
          if (todaySession.check_out_at) {
            setAttendance({
              status: 'done',
              in: todaySession.check_in_at,
              out: todaySession.check_out_at,
              breakTotal: todaySession.total_break_minutes * 60000,
              workedMinutes: todaySession.total_work_minutes
            });
          } else {
            const activeBreak = todaySession.breaks?.find(b => !b.ended_at);
            if (activeBreak) {
              setAttendance({
                status: 'break',
                in: todaySession.check_in_at,
                breakStart: activeBreak.started_at,
                breakTotal: (todaySession.total_break_minutes || 0) * 60000
              });
            } else {
              setAttendance({
                status: 'working',
                in: todaySession.check_in_at,
                breakTotal: (todaySession.total_break_minutes || 0) * 60000
              });
            }
          }
        } else {
          setAttendance({ status: 'idle', in: null, out: null, breakStart: null, breakTotal: 0 });
        }
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
    fetchAnnouncements();
    fetchMeetings();

    const timer = setInterval(() => {
      const n = new Date();
      setClock(n.toLocaleTimeString());
      setDateStr(n.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentMonth]);

  const handleCheckIn = async () => {
    try {
      const res = await apiRequest('/api/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ work_mode: workMode })
      });
      if (res.ok) {
        fetchAttendanceData();
        alert('Clocked in successfully!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleBreak = async () => {
    try {
      const endpoint = attendance.status === 'working' ? '/api/attendance/break/start' : '/api/attendance/break/end';
      const res = await apiRequest(endpoint, { method: 'POST' });
      if (res.ok) {
        fetchAttendanceData();
        alert(attendance.status === 'working' ? 'Break started.' : 'Break stopped.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await apiRequest('/api/attendance/check-out', { method: 'POST' });
      if (res.ok) {
        fetchAttendanceData();
        alert('Clocked out successfully!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getWorkedTimeMs = () => {
    if (!attendance.in) return 0;
    if (attendance.status === 'done' && attendance.workedMinutes) {
      return attendance.workedMinutes * 60000;
    }
    const end = attendance.out ? new Date(attendance.out).getTime() : Date.now();
    const start = new Date(attendance.in).getTime();
    return Math.max(0, end - start);
  };

  const getBreakTimeMs = () => {
    let br = attendance.breakTotal || 0;
    if (attendance.status === 'break' && attendance.breakStart) {
      br += Date.now() - new Date(attendance.breakStart).getTime();
    }
    return br;
  };

  const getDurationString = (ms) => {
    const m = Math.max(0, Math.floor(ms / 60000));
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const exportCSV = () => {
    let csv = 'Date,Mode,Clock In,Break,Clock Out,Hours,Status\n';
    history.forEach(row => {
      csv += `"${formatDate(row.work_date)}","${row.work_mode}","${formatTime(row.check_in_at)}","${row.total_break_minutes}m","${formatTime(row.check_out_at)}","${getDurationString(row.total_work_minutes * 60000)}","${row.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `attendance_${currentMonth}.csv`);
    a.click();
  };

  const getCalendarDays = () => {
    const days = [];
    const daysInMonth = 31; // hardcoded July for prototype match
    
    // Construct calendarEvents dynamically for the currentMonth
    const calendarEvents = {};

    // 1. Add Holidays
    const holidays = {
      '2026-07-04': [{ title: 'Independence Day', desc: 'National Holiday (US)', type: 'holiday' }],
      '2026-07-17': [{ title: 'Company Day', desc: 'Ferret Foundation Day celebration', type: 'holiday' }],
      '2026-08-15': [{ title: 'Independence Day', desc: 'National Holiday (India)', type: 'holiday' }]
    };

    Object.keys(holidays).forEach(dateKey => {
      if (dateKey.startsWith(currentMonth)) {
        const dayNum = parseInt(dateKey.slice(8, 10));
        calendarEvents[dayNum] = [...(calendarEvents[dayNum] || []), ...holidays[dateKey]];
      }
    });

    // 2. Add Meetings
    // Daily Standup for every weekday of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(2026, parseInt(currentMonth.slice(5, 7)) - 1, d);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Mon-Fri
        calendarEvents[d] = [
          ...(calendarEvents[d] || []),
          { title: 'Daily Standup', desc: 'Daily team sync at 10:00 AM', type: 'meeting' }
        ];
      }
    }

    // Special meetings
    const specialMeetings = {
      '2026-07-10': [{ title: 'Sprint 11 Retro', desc: 'Review of Sprint 11 achievements', type: 'meeting' }],
      '2026-07-20': [{ title: 'Sprint 12 Planning', desc: 'Task delegation for Sprint 12', type: 'meeting' }],
      '2026-07-24': [{ title: 'All-Hands Meeting', desc: 'Monthly company-wide review', type: 'meeting' }]
    };

    Object.keys(specialMeetings).forEach(dateKey => {
      if (dateKey.startsWith(currentMonth)) {
        const dayNum = parseInt(dateKey.slice(8, 10));
        calendarEvents[dayNum] = [...(calendarEvents[dayNum] || []), ...specialMeetings[dateKey]];
      }
    });

    // 3. Add News / Announcements
    announcements.forEach(ann => {
      const dateVal = ann.published_at || ann.createdAt;
      if (dateVal) {
        const dateStr = new Date(dateVal).toISOString().slice(0, 10);
        if (dateStr.startsWith(currentMonth)) {
          const dayNum = parseInt(dateStr.slice(8, 10));
          calendarEvents[dayNum] = [
            ...(calendarEvents[dayNum] || []),
            { title: ann.title, desc: ann.body, type: 'news' }
          ];
        }
      }
    });

    // 4. Add dynamic meetings scheduled by manager/admin
    meetings.forEach(meeting => {
      if (meeting.meeting_date && meeting.meeting_date.startsWith(currentMonth)) {
        const dayNum = parseInt(meeting.meeting_date.slice(8, 10));
        calendarEvents[dayNum] = [
          ...(calendarEvents[dayNum] || []),
          { 
            title: meeting.title, 
            desc: `${meeting.start_time} - ${meeting.end_time || '--:--'} (Organizer: ${meeting.manager_id?.full_name || 'Manager'})`, 
            type: 'meeting' 
          }
        ];
      }
    });

    // Find calendar status maps
    const statusMap = {};
    history.forEach(s => {
      const day = parseInt(s.work_date.slice(8, 10));
      statusMap[day] = { status: s.status, mode: s.work_mode };
    });

    const today = new Date();
    const currentDayNum = today.getFullYear() === 2026 && today.getMonth() === 6 ? today.getDate() : 99;

    // Default joining date is July 20, 2026
    const joinDate = 20;

    for (let i = 1; i <= daysInMonth; i++) {
      let cls = '';
      if (statusMap[i]) {
        if (statusMap[i].status === 'late') cls = 'late';
        else if (statusMap[i].mode === 'wfh') cls = 'wfh';
        else cls = 'present';
      } else {
        // Mark past weekdays as absent after the joining date
        if (i >= joinDate && i < currentDayNum) {
          const date = new Date(2026, 6, i);
          const dayOfWeek = date.getDay();
          const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
          if (!isWeekend) {
            cls = 'absent';
          }
        }
      }
      days.push({ 
        num: i, 
        className: cls,
        events: calendarEvents[i] || []
      });
    }
    return days;
  };

  const handleDayClick = (day) => {
    // Find attendance record for this day
    const rec = history.find(s => parseInt(s.work_date.slice(8, 10)) === day.num);
    const dateObj = new Date(2026, 6, day.num);
    setSelectedDayInfo({
      dayNum: day.num,
      date: dateObj,
      record: rec,
      events: day.events,
      className: day.className
    });
    setIsModalOpen(true);
  };

  const handleRowClick = (row) => {
    const dayNum = parseInt(row.work_date.slice(8, 10));
    const rec = row;
    const dateObj = new Date(row.work_date);
    const dayDay = calendarDays.find(d => d.num === dayNum);
    setSelectedDayInfo({
      dayNum,
      date: dateObj,
      record: rec,
      events: dayDay ? dayDay.events : [],
      className: row.status === 'late' ? 'late' : (row.work_mode === 'wfh' ? 'wfh' : 'present')
    });
    setIsModalOpen(true);
  };

  const calendarDays = getCalendarDays();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Count summary days dynamically
  const presentDaysCount = calendarDays.filter(d => d.className === 'present').length;
  const lateDaysCount = calendarDays.filter(d => d.className === 'late').length;
  const wfhDaysCount = calendarDays.filter(d => d.className === 'wfh').length;
  const absentDaysCount = calendarDays.filter(d => d.className === 'absent').length;

  const totalWorkedMinutes = history.reduce((sum, s) => sum + (s.total_work_minutes || 0), 0);
  const workedHoursStr = `${Math.floor(totalWorkedMinutes / 60)}h ${totalWorkedMinutes % 60}m`;

  const getWeeklyStats = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const weekLogs = history.filter(s => {
      const logDate = new Date(s.work_date);
      return logDate >= monday;
    });

    const weekMinutes = weekLogs.reduce((sum, s) => sum + (s.total_work_minutes || 0), 0);
    const weekHoursStr = `${Math.floor(weekMinutes / 60)}h ${weekMinutes % 60}m`;
    const workingDaysCount = weekLogs.filter(s => s.check_in_at).length;

    return { weekHoursStr, workingDaysCount };
  };

  const { weekHoursStr, workingDaysCount } = getWeeklyStats();

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">TIME & PRESENCE</span>
          <h1>Attendance Management</h1>
          <p>
            {user?.role === 'SuperAdmin' 
              ? 'Review company holidays and your monthly calendar overview.' 
              : 'Clock in, clock out, manage breaks, and review your monthly attendance.'}
          </p>
        </div>
        {user?.role !== 'SuperAdmin' && (
          <div className="segmented">
            <button 
              className={workMode === 'remote' ? 'active' : ''} 
              onClick={() => attendance.status === 'idle' && setWorkMode('remote')}
              disabled={attendance.status !== 'idle'}
            >
              Remote
            </button>
            <button 
              className={workMode === 'office' ? 'active' : ''} 
              onClick={() => attendance.status === 'idle' && setWorkMode('office')}
              disabled={attendance.status !== 'idle'}
            >
              Office
            </button>
            <button 
              className={workMode === 'wfh' ? 'active' : ''} 
              onClick={() => attendance.status === 'idle' && setWorkMode('wfh')}
              disabled={attendance.status !== 'idle'}
            >
              WFH
            </button>
          </div>
        )}
      </div>

      {user?.role !== 'SuperAdmin' && (
        <>
          <article className="panel attendance-hero">
            <div>
              <span className={`pill ${
                attendance.status === 'idle' ? 'neutral' : 
                attendance.status === 'break' ? 'warning' : 'success'
              }`} id="attPill">
                {attendance.status === 'idle' && 'Not Started'}
                {attendance.status === 'working' && 'Working'}
                {attendance.status === 'break' && 'On Break'}
                {attendance.status === 'done' && 'Completed'}
              </span>
              <h2 id="attClock">{clock}</h2>
              <p id="attDate">{dateStr}</p>
            </div>
            <div className="actions">
              <button 
                className="btn primary" 
                id="attCheckIn" 
                onClick={handleCheckIn} 
                disabled={attendance.status !== 'idle'}
              >
                Clock In
              </button>
              <button 
                className="btn outline" 
                id="attBreak" 
                onClick={handleToggleBreak} 
                disabled={attendance.status !== 'working' && attendance.status !== 'break'}
              >
                {attendance.status === 'break' ? 'Stop Break' : 'Start Break'}
              </button>
              <button 
                className="btn dark" 
                id="attCheckOut" 
                onClick={handleCheckOut} 
                disabled={attendance.status !== 'working' && attendance.status !== 'break'}
              >
                Clock Out
              </button>
            </div>
          </article>

          <div className="metrics four">
            <article className="metric">
              <span>Today</span>
              <strong id="todayWorked">{getDurationString(getWorkedTimeMs())}</strong>
              <small>Total worked</small>
            </article>
            <article className="metric">
              <span>This Week</span>
              <strong>{weekHoursStr}</strong>
              <small>{workingDaysCount} working day{workingDaysCount !== 1 ? 's' : ''}</small>
            </article>
            <article className="metric">
              <span>This Month</span>
              <strong>{workedHoursStr}</strong>
              <small>Attendance Summary</small>
            </article>
            <article className="metric">
              <span>Late Logins</span>
              <strong>{lateDaysCount}</strong>
              <small>Current month</small>
            </article>
          </div>
        </>
      )}

      <div className="grid calendar-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Monthly Calendar</h3>
              <p>{currentMonth === '2026-07' ? 'July 2026' : currentMonth} attendance overview.</p>
            </div>
            <div>
              <button 
                className="icon-btn" 
                onClick={() => setCurrentMonth(currentMonth === '2026-07' ? '2026-06' : '2026-07')}
              >
                ‹
              </button>
              <button 
                className="icon-btn"
                onClick={() => setCurrentMonth(currentMonth === '2026-07' ? '2026-08' : '2026-07')}
              >
                ›
              </button>
            </div>
          </div>
          <div id="attendanceCalendar" className="calendar">
            {weekdays.map(d => (
              <div className="head" key={d}>{d}</div>
            ))}
            {/* Pad calendar starting day of week for July 2026 (Wednesday starts offset 3 empty spaces) */}
            {currentMonth === '2026-07' && [1, 2, 3].map(x => (
              <div key={`pad-${x}`} style={{ background: 'transparent' }}></div>
            ))}
            {calendarDays.map(day => (
              <div 
                className={day.className} 
                key={day.num}
                style={{ 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '4px',
                  padding: '2px',
                  cursor: 'pointer'
                }}
                onClick={() => handleDayClick(day)}
              >
                <span style={{ fontSize: '11px' }}>{day.num}</span>
                {day.events && day.events.map((evt, idx) => (
                  <span 
                    key={idx}
                    title={`${evt.type.toUpperCase()}: ${evt.desc}`}
                    style={{ 
                      fontSize: '6.5px', 
                      lineHeight: '1.1', 
                      background: evt.type === 'holiday' ? 'rgba(239, 68, 68, 0.12)' :
                                  evt.type === 'meeting' ? 'rgba(59, 130, 246, 0.12)' :
                                  'rgba(16, 185, 129, 0.12)', 
                      borderLeft: evt.type === 'holiday' ? '2px solid var(--red)' :
                                  evt.type === 'meeting' ? '2px solid var(--blue)' :
                                  '2px solid var(--green)',
                      borderRadius: '2px', 
                      padding: '1px 2px', 
                      color: evt.type === 'holiday' ? 'var(--red)' :
                             evt.type === 'meeting' ? 'var(--blue)' :
                             'var(--green)',
                      whiteSpace: 'nowrap',
                      maxWidth: '95%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    {evt.title}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Attendance Summary</h3>
              <p>Current month breakdown.</p>
            </div>
          </div>
          <div className="summary-list">
            <div>
              <span><i className="dot green"></i>Present</span>
              <b>{presentDaysCount} day{presentDaysCount !== 1 ? 's' : ''}</b>
            </div>
            <div>
              <span><i className="dot amber"></i>Late</span>
              <b>{lateDaysCount} day{lateDaysCount !== 1 ? 's' : ''}</b>
            </div>
            <div>
              <span><i className="dot blue"></i>WFH</span>
              <b>{wfhDaysCount} day{wfhDaysCount !== 1 ? 's' : ''}</b>
            </div>
            <div>
              <span><i className="dot red"></i>Absent</span>
              <b>{absentDaysCount} day{absentDaysCount !== 1 ? 's' : ''}</b>
            </div>
          </div>
          {lateDaysCount > 0 && (
            <div className="late-alert">
              <b>Late login alert</b>
              <p>You have clocked in late during this month. Ensure you check in before 9:15 AM.</p>
            </div>
          )}
        </article>
      </div>

      {user?.role !== 'SuperAdmin' && (
        <article className="panel table-panel">
          <div className="panel-head pad">
            <div>
              <h3>Attendance History</h3>
              <p>Detailed daily records. Click a row to view details.</p>
            </div>
            <button className="btn outline small" onClick={exportCSV}>
              Export CSV
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Clock In</th>
                  <th>Break</th>
                  <th>Clock Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="attendanceHistory">
                {history.map((row) => (
                  <tr key={row._id} style={{ cursor: 'pointer' }} onClick={() => handleRowClick(row)}>
                    <td>{formatDate(row.work_date)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{row.work_mode}</td>
                    <td>{formatTime(row.check_in_at)}</td>
                    <td>{getDurationString(row.total_break_minutes * 60000)}</td>
                    <td>{formatTime(row.check_out_at)}</td>
                    <td>{getDurationString(row.total_work_minutes * 60000)}</td>
                    <td>
                      <span className={`pill ${
                        row.status === 'present' ? 'success' : 
                        row.status === 'late' ? 'warning' : 'neutral'
                      }`}>
                        {row.status === 'present' && 'Present'}
                        {row.status === 'late' && 'Late'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* Detail Modal Dialog */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {selectedDayInfo && (
          <div>
            <h3 style={{ marginBottom: '5px' }}>Attendance Details</h3>
            <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '20px' }}>
              {selectedDayInfo.date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div style={{ background: '#fafbfc', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>LOGGING STATUS</span>
                <span className={`pill ${
                  selectedDayInfo.className === 'present' ? 'success' : 
                  selectedDayInfo.className === 'late' ? 'warning' : 
                  selectedDayInfo.className === 'wfh' ? 'neutral' : 
                  selectedDayInfo.className === 'absent' ? 'danger' : 'neutral'
                }`} style={{ textTransform: 'capitalize' }}>
                  {selectedDayInfo.className || 'Absent'}
                </span>
              </div>

              <div style={{ background: '#fafbfc', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>WORK MODE</span>
                <strong style={{ fontSize: '12px', textTransform: 'capitalize' }}>
                  {selectedDayInfo.record?.work_mode || (selectedDayInfo.className === 'absent' ? 'N/A' : 'Off-day')}
                </strong>
              </div>
            </div>

            {selectedDayInfo.events && selectedDayInfo.events.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {selectedDayInfo.events.map((evt, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      background: evt.type === 'holiday' ? '#fef2f2' :
                                  evt.type === 'meeting' ? '#eff6ff' :
                                  '#ecfdf5', 
                      borderLeft: evt.type === 'holiday' ? '3px solid var(--red)' :
                                  evt.type === 'meeting' ? '3px solid var(--blue)' :
                                  '3px solid var(--green)', 
                      padding: '10px 12px', 
                      borderRadius: '4px' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <strong style={{ 
                        fontSize: '12px', 
                        color: evt.type === 'holiday' ? 'var(--red)' :
                               evt.type === 'meeting' ? 'var(--blue)' :
                               'var(--green)' 
                      }}>
                        {evt.title}
                      </strong>
                      <span style={{ 
                        fontSize: '8px', 
                        fontWeight: 'bold', 
                        textTransform: 'uppercase',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        background: 'rgba(0,0,0,0.05)',
                        color: evt.type === 'holiday' ? 'var(--red)' :
                               evt.type === 'meeting' ? 'var(--blue)' :
                               'var(--green)'
                      }}>
                        {evt.type}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{evt.desc}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: '#fafbfc', padding: '15px', borderRadius: '8px', marginBottom: '25px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--muted)' }}>TIME LOG DETAILS</h4>
              <table style={{ width: '100%', minWidth: 'auto', fontSize: '11px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--muted)' }}>Clock In Time</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>
                      {selectedDayInfo.record ? formatTime(selectedDayInfo.record.check_in_at) : '--:--'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--muted)' }}>Break Time</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>
                      {selectedDayInfo.record ? getDurationString(selectedDayInfo.record.total_break_minutes * 60000) : '--:--'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--muted)' }}>Clock Out Time</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>
                      {selectedDayInfo.record ? formatTime(selectedDayInfo.record.check_out_at) : '--:--'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: 'var(--muted)' }}>Total Worked Hours</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--green)' }}>
                      {selectedDayInfo.record ? getDurationString(selectedDayInfo.record.total_work_minutes * 60000) : '--:--'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'end' }}>
              <button className="btn primary small" onClick={() => setIsModalOpen(false)}>
                Close Details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Attendance;
