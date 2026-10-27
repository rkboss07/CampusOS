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

  // Relevance matching against Student Profile
  let studentRelevance = 80;
  if (studentProfile) {
    const profileBranch = (studentProfile.branch || '').toLowerCase();
    const profileYear = (studentProfile.year || '').toLowerCase();
    const targetBranchLower = targetBranch.toLowerCase();
    const targetYearLower = targetYear.toLowerCase();

    if (targetBranchLower.includes('all') || targetBranchLower.includes('department')) {
      studentRelevance = 85;
    } else if (
      profileBranch &&
      (targetBranchLower.includes(profileBranch) || profileBranch.includes(targetBranchLower))
    ) {
      studentRelevance = 95;
    } else {
      studentRelevance = 35;
    }

    if (!targetYearLower.includes('all')) {
      if (
        profileYear &&
        (targetYearLower.includes(profileYear) || profileYear.includes(targetYearLower))
      ) {
        studentRelevance = Math.min(100, studentRelevance + 5);
      } else {
        studentRelevance = Math.max(20, studentRelevance - 25);
      }
    }
  }

  let urgency = 85;
  let importance = 90;
  if (category === 'Examination' || category === 'Fee') {
    importance = 95;
    urgency = 90;
  } else if (category === 'Assignment' || category === 'Placement') {
    importance = 88;
    urgency = 82;
  } else if (category === 'Workshop / Event') {
    importance = 65;
    urgency = 60;
  } else {
    importance = 55;
    urgency = 55;
  }

  const priorityScore = Math.round(
    urgency * 0.35 + studentRelevance * 0.35 + importance * 0.3
  );

  let priorityLevel: Notice['priorityLevel'] = 'Medium';
  if (priorityScore >= 80) priorityLevel = 'Critical';
  else if (priorityScore >= 65) priorityLevel = 'High';
  else if (priorityScore >= 45) priorityLevel = 'Medium';
  else priorityLevel = 'Low';

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
    actionType:
      category === 'Examination'
        ? 'submit_form'
        : category === 'Fee'
        ? 'fee_payment'
        : 'portal_action',
    portalUrl: 'https://aktu.ac.in',
    importance,
    urgency,
    studentRelevance,
    priorityScore,
    priorityLevel,
    priorityReason: `Score calculated from deadline proximity (${deadline}), ${category.toLowerCase()} priority weighting, and ${studentRelevance}% match with your student profile.`,
    summary: text.slice(0, 160) + (text.length > 160 ? '...' : ''),
    keyPoints: [
      `Category: ${category}`,
      `Target: ${targetBranch} (${targetYear})`,
      `Action: ${requiredAction}`,
      `Deadline: ${deadline} (${deadlineTime})`,
    ],
    consequencesOfMissing:
      category === 'Examination'
        ? 'Immediate debarment from appearing in semester examinations.'
        : 'Administrative late fine or portal hold.',
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
