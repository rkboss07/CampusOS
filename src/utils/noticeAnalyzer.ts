import { Notice, StudentProfile, Task, DailyBrief } from '../types';

export interface AnalyzedNoticePayload {
  title: string;
  category: Notice['category'];
  targetAudience: string;
  targetBranch: string;
  targetYear: string;
  deadline: string;
  deadlineTime: string;
  eventDate: string | null;
  eventTime: string | null;
  venue: string;
  requiredAction: string;
  actionType: Notice['actionType'];
  portalUrl: string | null;
  importance: number;
  urgency: number;
  studentRelevance: number;
  priorityScore: number;
  priorityLevel: Notice['priorityLevel'];
  priorityReason: string;
  summary: string;
  keyPoints: string[];
  consequencesOfMissing: string;
}

/**
 * Computes Urgency, Importance, Student Relevance, Priority Score (0-100),
 * Priority Level, and Priority Reason dynamically whenever any notice field
 * (deadline, category, branch, year, action, consequences, etc.) or student profile changes.
 */
export function computePriorityMetrics(
  fields: {
    category: Notice['category'];
    targetBranch: string;
    targetYear: string;
    targetAudience?: string;
    deadline: string | null;
    deadlineTime?: string | null;
    actionType?: Notice['actionType'];
    requiredAction?: string;
    consequencesOfMissing?: string;
    title?: string;
  },
  studentProfile?: StudentProfile
): {
  importance: number;
  urgency: number;
  studentRelevance: number;
  priorityScore: number;
  priorityLevel: Notice['priorityLevel'];
  priorityReason: string;
} {
  const category = fields.category || 'General';
  const targetBranch = fields.targetBranch || 'All Departments';
  const targetYear = fields.targetYear || 'All Years';
  const deadline = fields.deadline || '2026-08-18';
  const deadlineTime = fields.deadlineTime || '5:00 PM';
  const actionType = fields.actionType || 'portal_action';
  const requiredAction = fields.requiredAction || '';
  const consequences = fields.consequencesOfMissing || '';
  const title = fields.title || '';

  // 1. Student Relevance (0 - 100)
  let studentRelevance = 85;
  if (studentProfile) {
    const profileBranch = (studentProfile.branch || '').toLowerCase().trim();
    const profileYear = (studentProfile.year || '').toLowerCase().trim();
    const targetBranchLower = targetBranch.toLowerCase().trim();
    const targetYearLower = targetYear.toLowerCase().trim();

    if (
      targetBranchLower.includes('all') ||
      targetBranchLower.includes('department') ||
      targetBranchLower.includes('student')
    ) {
      studentRelevance = 86;
    } else if (
      profileBranch &&
      (targetBranchLower.includes(profileBranch) || profileBranch.includes(targetBranchLower))
    ) {
      studentRelevance = 96;
    } else {
      studentRelevance = 42;
    }

    if (!targetYearLower.includes('all')) {
      if (
        profileYear &&
        (targetYearLower.includes(profileYear) || profileYear.includes(targetYearLower))
      ) {
        studentRelevance = Math.min(100, studentRelevance + 4);
      } else {
        studentRelevance = Math.max(20, studentRelevance - 22);
      }
    }
  }

  // 2. Importance (0 - 100) based on category, actionType, requiredAction, and consequences
  let importance = 65;
  if (category === 'Examination') importance = 95;
  else if (category === 'Fee') importance = 91;
  else if (category === 'Placement') importance = 88;
  else if (category === 'Assignment') importance = 84;
  else if (category === 'Scholarship') importance = 80;
  else if (category === 'Workshop / Event') importance = 64;
  else importance = 56;

  if (actionType === 'submit_form' || actionType === 'fee_payment') {
    importance += 3;
  } else if (actionType === 'assignment_submission') {
    importance += 2;
  } else if (actionType === 'read_acknowledge') {
    importance -= 5;
  }

  const combinedText = `${title} ${requiredAction} ${consequences}`.toLowerCase();
  if (/debar|mandatory|compulsory|penalty|fine|strictly|urgent|final|immediate/i.test(combinedText)) {
    importance += 3;
  }
  importance = Math.max(25, Math.min(100, Math.round(importance)));

  // 3. Urgency (0 - 100) based on deadline date & time
  // Anchor against 2026-08-01 for the August 2026 academic term (or today if outside 2026)
  let urgency = 82;
  const parsedDeadline = new Date(`${deadline}T00:00:00`);
  if (!Number.isNaN(parsedDeadline.getTime())) {
    const year = parsedDeadline.getFullYear();
    const anchorDate =
      year === 2026
        ? new Date('2026-08-01T00:00:00')
        : new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');

    const diffDays = Math.round(
      (parsedDeadline.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 0) {
      urgency = 99;
    } else if (diffDays <= 35) {
      // Smoothly scales from 98 (Aug 1) down to 50 (Sep 5) so every calendar day change updates the score
      urgency = Math.round(98 - diffDays * 1.35);
    } else {
      urgency = Math.max(30, Math.round(50 - (diffDays - 35) * 0.5));
    }

    // Time of day modifier
    if (/am\b/i.test(deadlineTime)) {
      urgency = Math.min(100, urgency + 2);
    }
  }
  urgency = Math.max(25, Math.min(100, urgency));

  // 4. Weighted Priority Score
  const priorityScore = Math.max(
    10,
    Math.min(100, Math.round(urgency * 0.4 + studentRelevance * 0.3 + importance * 0.3))
  );

  let priorityLevel: Notice['priorityLevel'] = 'Medium';
  if (priorityScore >= 80) priorityLevel = 'Critical';
  else if (priorityScore >= 65) priorityLevel = 'High';
  else if (priorityScore >= 45) priorityLevel = 'Medium';
  else priorityLevel = 'Low';

  const priorityReason = `Score ${priorityScore}/100 (${priorityLevel}) calculated from deadline proximity on ${deadline} at ${deadlineTime} (${urgency}% urgency), ${category.toLowerCase()} weight (${importance}% importance), and ${studentRelevance}% relevance to ${studentProfile?.branch || targetBranch} (${studentProfile?.year || targetYear}).`;

  return {
    importance,
    urgency,
    studentRelevance,
    priorityScore,
    priorityLevel,
    priorityReason,
  };
}

/**
 * Recalculates a full Notice object whenever any of its properties are edited
 * or when its deadline is dragged on the calendar.
 */
export function recalculateNoticePriority(
  notice: Notice,
  studentProfile?: StudentProfile
): Notice {
  const targetBranch = notice.targetBranch || 'All Departments';
  const targetYear = notice.targetYear || 'All Years';
  const targetAudience =
    notice.targetAudience || `${targetBranch} — ${targetYear}`;
  const deadline = notice.deadline || '2026-08-18';
  const deadlineTime = notice.deadlineTime || '5:00 PM';

  const metrics = computePriorityMetrics(
    {
      category: notice.category,
      targetBranch,
      targetYear,
      targetAudience,
      deadline,
      deadlineTime,
      actionType: notice.actionType,
      requiredAction: notice.requiredAction,
      consequencesOfMissing: notice.consequencesOfMissing,
      title: notice.title,
    },
    studentProfile
  );

  return {
    ...notice,
    targetBranch,
    targetYear,
    targetAudience,
    deadline,
    deadlineTime,
    eventDate: notice.category === 'Workshop / Event' ? deadline : notice.eventDate,
    importance: metrics.importance,
    urgency: metrics.urgency,
    studentRelevance: metrics.studentRelevance,
    priorityScore: metrics.priorityScore,
    priorityLevel: metrics.priorityLevel,
    priorityReason: metrics.priorityReason,
  };
}

/**
 * Deterministic client-side notice analyzer used automatically when deployed
 * to static hosts like GitHub Pages (where /api/* backend routes are not present).
 */
export function analyzeNoticeClientSide(
  text: string,
  studentProfile?: StudentProfile
): AnalyzedNoticePayload {
  const lower = text.toLowerCase();

  // Category classification
  let category: Notice['category'] = 'General';
  if (/exam|mid-term|end-term|datesheet|admit card|hall ticket|back paper/i.test(lower)) {
    category = 'Examination';
  } else if (/assignment|lab practical|submission|quiz|homework|git repo/i.test(lower)) {
    category = 'Assignment';
  } else if (/fee|dues|tuition|fine|challan|payment|penalty/i.test(lower)) {
    category = 'Fee';
  } else if (/scholarship|up scholarship|nsp|merit|financial aid|stipend/i.test(lower)) {
    category = 'Scholarship';
  } else if (/placement|drive|internship|t&p|campus interview|recruitment|ctc|package/i.test(lower)) {
    category = 'Placement';
  } else if (/workshop|seminar|hackathon|bootcamp|guest lecture|webinar|symposium|fest/i.test(lower)) {
    category = 'Workshop / Event';
  }

  // Branch & Year extraction
  let targetBranch = 'All Departments';
  let targetYear = 'All Years';
  if (/ai\s*(&|\+|and)?\s*ml|aiml|artificial intelligence/i.test(lower)) {
    targetBranch = 'B.Tech AI & ML';
  } else if (/cse|computer science/i.test(lower)) {
    targetBranch = 'B.Tech CSE';
  } else if (/it|information technology/i.test(lower)) {
    targetBranch = 'B.Tech IT';
  } else if (/ece|electronics/i.test(lower)) {
    targetBranch = 'B.Tech ECE';
  } else if (/me|mechanical/i.test(lower)) {
    targetBranch = 'B.Tech ME';
  }

  if (/1st\s*year|first\s*year/i.test(lower)) targetYear = '1st Year';
  else if (/2nd\s*year|second\s*year/i.test(lower)) targetYear = '2nd Year';
  else if (/3rd\s*year|third\s*year/i.test(lower)) targetYear = '3rd Year';
  else if (/4th\s*year|final\s*year/i.test(lower)) targetYear = '4th Year';

  // Date extraction
  const monthNames: Record<string, string> = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
  };

  let deadline = '2026-08-18';
  const dmyTextMatch = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?[\s,/-]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,/-]+(\d{4})\b/i
  );
  const mdyTextMatch = text.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,/-]+(\d{1,2})(?:st|nd|rd|th)?(?:[\s,/-]+(\d{4}))?\b/i
  );
  const isoMatch = text.match(/\b(\d{4})[-/](\d{2})[-/](\d{2})\b/);
  const dmySlashMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);

  if (dmyTextMatch) {
    const day = dmyTextMatch[1].padStart(2, '0');
    const month = monthNames[dmyTextMatch[2].substring(0, 3).toLowerCase()] || '08';
    deadline = `${dmyTextMatch[3]}-${month}-${day}`;
  } else if (mdyTextMatch) {
    const month = monthNames[mdyTextMatch[1].substring(0, 3).toLowerCase()] || '08';
    const day = mdyTextMatch[2].padStart(2, '0');
    const year = mdyTextMatch[3] || '2026';
    deadline = `${year}-${month}-${day}`;
  } else if (isoMatch) {
    deadline = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  } else if (dmySlashMatch) {
    const day = dmySlashMatch[1].padStart(2, '0');
    const month = dmySlashMatch[2].padStart(2, '0');
    deadline = `${dmySlashMatch[3]}-${month}-${day}`;
  }

  const timeMatch = text.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)|\d{1,2}\s*(?:AM|PM|am|pm))\b/);
  const deadlineTime = timeMatch ? timeMatch[1].toUpperCase() : '5:00 PM';

  // Required action extraction
  let requiredAction = 'Review notice details and take necessary action';
  if (/submit.*examination form|exam form/i.test(lower)) {
    requiredAction = 'Submit examination form and verify student ERP portal records';
  } else if (/fee.*pay|submit.*fee|deposit|clear.*dues/i.test(lower)) {
    requiredAction = 'Pay outstanding semester fee via accounts counter or online gateway';
  } else if (/register|registration/i.test(lower)) {
    requiredAction = 'Complete registration on portal before link expires';
  } else if (/assignment.*submit|submit.*assignment/i.test(lower)) {
    requiredAction = 'Submit assignment PDF or repository to Classroom LMS';
  }

  const actionType: Notice['actionType'] =
    category === 'Examination'
      ? 'submit_form'
      : category === 'Fee'
      ? 'fee_payment'
      : category === 'Assignment'
      ? 'assignment_submission'
      : 'portal_action';

  const consequencesOfMissing =
    category === 'Examination'
      ? 'Immediate debarment from appearing in semester examinations.'
      : 'Administrative late fine or portal hold.';

  let title = `${category}: ${targetBranch}`;
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.replace(/^[#*\-•\s]+/, '').trim())
    .filter((l) => l.length > 5);
  if (lines.length > 0) {
    const candidate = lines[0]
      .replace(/^notice\s*[:\-]?\s*/i, '')
      .replace(/^circular\s*[:\-]?\s*/i, '');
    if (candidate.length > 8) {
      title = candidate.length > 70 ? candidate.substring(0, 68) + '...' : candidate;
    }
  }

  const metrics = computePriorityMetrics(
    {
      category,
      targetBranch,
      targetYear,
      deadline,
      deadlineTime,
      actionType,
      requiredAction,
      consequencesOfMissing,
      title,
    },
    studentProfile
  );

  return {
    title,
    category,
    targetAudience: `${targetBranch} — ${targetYear}`,
    targetBranch,
    targetYear,
    deadline,
    deadlineTime,
    eventDate: category === 'Workshop / Event' ? deadline : null,
    eventTime: category === 'Workshop / Event' ? '4:00 PM' : null,
    venue:
      /seminar hall\s*\d*|auditorium|lab\s*\d+|room\s*\d+/i.exec(text)?.[0] ||
      'College Campus / Portal',
    requiredAction,
    actionType,
    portalUrl: 'https://aktu.ac.in',
    importance: metrics.importance,
    urgency: metrics.urgency,
    studentRelevance: metrics.studentRelevance,
    priorityScore: metrics.priorityScore,
    priorityLevel: metrics.priorityLevel,
    priorityReason: metrics.priorityReason,
    summary: text.slice(0, 160) + (text.length > 160 ? '...' : ''),
    keyPoints: [
      `Category: ${category}`,
      `Target: ${targetBranch} (${targetYear})`,
      `Action: ${requiredAction}`,
      `Deadline: ${deadline} (${deadlineTime})`,
    ],
    consequencesOfMissing,
  };
}

/**
 * Attempts server-side notice analysis first; seamlessly falls back to
 * client-side analysis when running on static hosting such as GitHub Pages.
 */
export async function analyzeNoticeWithFallback(params: {
  noticeText: string;
  mediaBase64?: string | null;
  mimeType?: string;
  studentProfile: StudentProfile;
}): Promise<AnalyzedNoticePayload> {
  try {
    const res = await fetch('/api/analyze-notice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.result) {
        return data.result as AnalyzedNoticePayload;
      }
    }
  } catch {
    // Expected on static hosts like GitHub Pages where /api/* does not exist
  }

  return analyzeNoticeClientSide(params.noticeText, params.studentProfile);
}

/**
 * Attempts server-side daily brief first; falls back to client-side brief on GitHub Pages.
 */
export async function generateDailyBriefWithFallback(params: {
  notices: Notice[];
  tasks: Task[];
  studentProfile: StudentProfile;
  currentDate: string;
}): Promise<DailyBrief> {
  try {
    const res = await fetch('./api/daily-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return (await res.json()) as DailyBrief;
    }
  } catch {
    // Static host fallback
  }

  const urgentCount =
    params.notices.filter(
      (n) => n.priorityLevel === 'Critical' || n.priorityScore >= 80
    ).length || 0;
  const upcomingEvents =
    params.notices.filter((n) => n.category === 'Workshop / Event').length || 0;

  return {
    greeting: `Good morning, ${params.studentProfile.name || 'Student'}!`,
    summary: `You have ${urgentCount} critical notices requiring your attention and ${upcomingEvents} upcoming events scheduled.`,
    topPriorityItem:
      params.notices[0]?.requiredAction || 'Check examination portal deadlines',
    quote: 'Stay organized today to avoid last-minute portal crashes and penalties.',
  };
}
