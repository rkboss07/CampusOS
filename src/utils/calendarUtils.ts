import { Notice } from '../types';

export function getMonthDays(year: number, monthIndex: number) {
  // monthIndex is 0-based (0 = Jan, 7 = Aug)
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  
  // Convert Sunday-first (0-6) to Monday-first (0-6: Mon=0 ... Sun=6)
  let startingDayOfWeek = firstDay.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;
  
  const totalDays = lastDay.getDate();
  const days: { day: number; dateString: string; isCurrentMonth: boolean }[] = [];
  
  // Previous month trailing days
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevMonth = monthIndex === 0 ? 12 : monthIndex;
    const prevYear = monthIndex === 0 ? year - 1 : year;
    const mStr = String(prevMonth).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    days.push({
      day: d,
      dateString: `${prevYear}-${mStr}-${dStr}`,
      isCurrentMonth: false,
    });
  }
  
  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const mStr = String(monthIndex + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    days.push({
      day: d,
      dateString: `${year}-${mStr}-${dStr}`,
      isCurrentMonth: true,
    });
  }
  
  // Next month leading days to complete full 6 weeks (42 cells) or 5 weeks
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const nextMonth = monthIndex === 11 ? 1 : monthIndex + 2;
    const nextYear = monthIndex === 11 ? year + 1 : year;
    const mStr = String(nextMonth).padStart(2, '0');
    const dStr = String(i).padStart(2, '0');
    days.push({
      day: i,
      dateString: `${nextYear}-${mStr}-${dStr}`,
      isCurrentMonth: false,
    });
  }
  
  return days;
}

export function generateGoogleCalendarUrl(notice: Notice): string {
  const title = encodeURIComponent(`[${notice.priorityLevel}] ${notice.title}`);
  const details = encodeURIComponent(
    `Required Action: ${notice.requiredAction}\nPriority: ${notice.priorityScore}/100 (${notice.priorityLevel})\nCategory: ${notice.category}\nVenue/Portal: ${notice.venue || 'Campus'}\n\nSummary: ${notice.summary}`
  );
  const location = encodeURIComponent(notice.venue || 'College Campus');
  
  let dateFormatted = '';
  const dateStr = notice.deadline || notice.eventDate || '2026-08-18';
  const cleanDate = dateStr.replace(/-/g, '');
  
  if (notice.eventTime) {
    dateFormatted = `${cleanDate}T090000Z/${cleanDate}T120000Z`;
  } else {
    dateFormatted = `${cleanDate}/${cleanDate}`;
  }
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dateFormatted}`;
}

export function downloadIcsFile(notices: Notice[], filename = 'campus-notices.ics') {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CampusOS//College Notice Prioritizer//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  notices.forEach(notice => {
    const targetDate = notice.deadline || notice.eventDate;
    if (!targetDate) return;
    const cleanDate = targetDate.replace(/-/g, '');
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    icsContent.push('BEGIN:VEVENT');
    icsContent.push(`UID:${notice.id}@campusos.ai`);
    icsContent.push(`DTSTAMP:${now}`);
    icsContent.push(`DTSTART;VALUE=DATE:${cleanDate}`);
    icsContent.push(`DTEND;VALUE=DATE:${cleanDate}`);
    icsContent.push(`SUMMARY:[${notice.priorityLevel.toUpperCase()}] ${notice.title.replace(/[,;]/g, ' ')}`);
    icsContent.push(`DESCRIPTION:${notice.requiredAction.replace(/[,;]/g, ' ')} (Score: ${notice.priorityScore}/100)`);
    icsContent.push(`LOCATION:${(notice.venue || 'College').replace(/[,;]/g, ' ')}`);
    icsContent.push('STATUS:CONFIRMED');
    icsContent.push('END:VEVENT');
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
