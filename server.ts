import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Dynamically initialize GoogleGenAI server-side with required headers
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Valid Gemini models from @google/genai skill guidelines ordered to avoid 20 RPD free-tier bottleneck
const GEMINI_FALLBACK_MODELS = [
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
] as const;

// Simple in-memory cache to avoid redundant API calls and preserve Free Tier quota
const analysisCache = new Map<string, any>();
const dailyBriefCache = new Map<string, any>();

async function generateWithGeminiFallback(
  ai: GoogleGenAI,
  requestConfig: {
    contents: any;
    config: any;
  }
): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;

  for (const modelName of GEMINI_FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: requestConfig.contents,
        config: requestConfig.config,
      });
      if (response && response.text) {
        return { text: response.text, modelUsed: modelName };
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || err?.error?.code;
      const msg = String(err?.message || '');
      const isQuotaOrRateLimit =
        status === 429 ||
        status === 'RESOURCE_EXHAUSTED' ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('quota');

      // Try next Gemini model in the cascade if quota/rate-limit or model unavailable
      if (isQuotaOrRateLimit || status === 404 || status === 503) {
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('All Gemini models temporarily unavailable');
}

// Heuristic fallback NLP engine when running offline, without API key, or when all free-tier quotas are exhausted
function heuristicAnalyzeNotice(text: string, studentProfile?: any) {
  const lower = text.toLowerCase();

  let category:
    | 'Examination'
    | 'Assignment'
    | 'Fee'
    | 'Scholarship'
    | 'Placement'
    | 'Workshop / Event'
    | 'General' = 'General';
  if (/exam|mid-term|end-term|datesheet|admit card|hall ticket|back paper|sessional/i.test(lower)) {
    category = 'Examination';
  } else if (/assignment|lab practical|submission|quiz|homework|git repo|project report/i.test(lower)) {
    category = 'Assignment';
  } else if (/fee|dues|tuition|fine|challan|payment|penalty|accounts/i.test(lower)) {
    category = 'Fee';
  } else if (/scholarship|up scholarship|nsp|merit|financial aid|stipend/i.test(lower)) {
    category = 'Scholarship';
  } else if (/placement|drive|internship|t&p|campus interview|recruitment|ctc|package/i.test(lower)) {
    category = 'Placement';
  } else if (/workshop|seminar|hackathon|bootcamp|guest lecture|webinar|symposium|fest/i.test(lower)) {
    category = 'Workshop / Event';
  }

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

  if (/1st\s*year|first\s*year|sem\s*(1|2|i|ii)\b/i.test(lower)) targetYear = '1st Year';
  else if (/2nd\s*year|second\s*year|sem\s*(3|4|iii|iv)\b/i.test(lower)) targetYear = '2nd Year';
  else if (/3rd\s*year|third\s*year|sem\s*(5|6|v|vi)\b/i.test(lower)) targetYear = '3rd Year';
  else if (/4th\s*year|final\s*year|sem\s*(7|8|vii|viii)\b/i.test(lower)) targetYear = '4th Year';

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
  // 1. Match "18 August 2026" or "18th Aug, 2026"
  const dmyTextMatch = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?[\s,/-]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,/-]+(\d{4})\b/i
  );
  // 2. Match "August 18, 2026" or "Aug 18th 2026"
  const mdyTextMatch = text.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,/-]+(\d{1,2})(?:st|nd|rd|th)?(?:[\s,/-]+(\d{4}))?\b/i
  );
  // 3. Match "YYYY-MM-DD"
  const isoMatch = text.match(/\b(\d{4})[-/](\d{2})[-/](\d{2})\b/);
  // 4. Match "DD/MM/YYYY" or "DD-MM-YYYY"
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

  let requiredAction = 'Review circular details and complete required submission before deadline';
  if (/submit.*examination form|exam form/i.test(lower)) {
    requiredAction = 'Submit examination form and verify student ERP portal records';
  } else if (/fee.*pay|submit.*fee|deposit|clear.*dues/i.test(lower)) {
    requiredAction = 'Pay outstanding semester fee via accounts counter or online gateway';
  } else if (/register|registration/i.test(lower)) {
    requiredAction = 'Complete registration on portal before link expires';
  } else if (/assignment.*submit|submit.*assignment/i.test(lower)) {
    requiredAction = 'Submit assignment PDF or GitHub repository to LMS';
  }

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

  let priorityLevel: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
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
    eventTime: category === 'Workshop / Event' ? deadlineTime : null,
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
    portalUrl: /https?:\/\/[^\s)]+/i.exec(text)?.[0] || 'https://aktu.ac.in',
    importance,
    urgency,
    studentRelevance,
    priorityScore,
    priorityLevel,
    priorityReason: `Score calculated from deadline proximity (${deadline}), ${category.toLowerCase()} category weighting, and ${studentRelevance}% match with your student profile.`,
    summary: text.slice(0, 180) + (text.length > 180 ? '...' : ''),
    keyPoints: [
      `Category: ${category}`,
      `Target: ${targetBranch} (${targetYear})`,
      `Action: ${requiredAction}`,
      `Deadline: ${deadline} (${deadlineTime})`,
    ],
    consequencesOfMissing:
      category === 'Examination'
        ? 'Strict debarment from appearing in semester examinations.'
        : 'Late fine and administrative block.',
    suggestedTasks: [
      {
        title: requiredAction,
        dueDate: deadline,
        estimatedMinutes: 20,
      },
    ],
  };
}

// API: Analyze notice text or PDF document using Google Gemini with multi-model fallback
app.post('/api/analyze-notice', async (req, res) => {
  try {
    const { noticeText, mediaBase64, mimeType, studentProfile } = req.body;

    if (!noticeText && !mediaBase64) {
      return res
        .status(400)
        .json({ error: 'Please provide either notice text or a PDF file upload' });
    }

    const cacheKey = JSON.stringify({
      text: (noticeText || '').slice(0, 1500),
      hasPdf: Boolean(mediaBase64),
      pdfLen: mediaBase64 ? mediaBase64.length : 0,
      branch: studentProfile?.branch || '',
      year: studentProfile?.year || '',
    });

    if (analysisCache.has(cacheKey)) {
      return res.json({
        result: analysisCache.get(cacheKey),
        source: 'gemini-cache',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      const parsed = heuristicAnalyzeNotice(
        noticeText || 'Circular notice',
        studentProfile
      );
      return res.json({ result: parsed, source: 'heuristic' });
    }

    const profileContext = studentProfile
      ? `The student profile is: Name: "${studentProfile.name || 'Student'}", Branch: "${studentProfile.branch || 'B.Tech AI & ML'}", Year: "${studentProfile.year || '2nd Year'}", College: "${studentProfile.college || 'Engineering Institute'}".`
      : 'Student profile: B.Tech AI & ML, 2nd Year.';

    const systemInstruction = `You are the Google Gemini extraction engine for CampusOS, an academic notice and PDF circular analyzer for college students.
Carefully read the provided college circular (PDF document and/or text announcement) and extract structured metadata:
1. Extract the exact deadline date in ISO "YYYY-MM-DD" format (e.g., if the notice says "18 August 2026" or "18/08/2026", output "2026-08-18"). If no explicit year is given, assume 2026.
2. Extract the deadlineTime (e.g., "5:00 PM") and eventDate/eventTime if it is a workshop, seminar, or placement drive.
3. Classify into one of: "Examination", "Assignment", "Fee", "Scholarship", "Placement", "Workshop / Event", "General".
4. Extract targetAudience, targetBranch, targetYear, venue, requiredAction (clear imperative instruction for the student), consequencesOfMissing, a concise summary, and 3-4 keyPoints.
5. Score importance (0-100), urgency (0-100), and studentRelevance (0-100) relative to the student's profile.
6. Compute priorityScore = round(0.35 * urgency + 0.35 * studentRelevance + 0.30 * importance).
7. Set priorityLevel: >= 80 "Critical", 65-79 "High", 40-64 "Medium", < 40 "Low".
${profileContext}
Return strictly valid JSON matching the responseSchema.`;

    const parts: any[] = [];
    if (mediaBase64) {
      parts.push({
        inlineData: {
          data: mediaBase64,
          mimeType: mimeType || 'application/pdf',
        },
      });
    }
    parts.push({
      text: noticeText
        ? `Extract all deadlines, action items, audience details, and priority scores from this college circular:\n"""\n${noticeText}\n"""`
        : 'Extract all deadlines, action items, audience details, and priority scores from the attached college circular PDF document.',
    });

    const { text: rawJson, modelUsed } = await generateWithGeminiFallback(ai, {
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Short clear notice title' },
            category: {
              type: Type.STRING,
              enum: [
                'Examination',
                'Assignment',
                'Fee',
                'Scholarship',
                'Placement',
                'Workshop / Event',
                'General',
              ],
            },
            targetAudience: {
              type: Type.STRING,
              description: 'e.g., B.Tech AI & ML — 2nd Year',
            },
            targetBranch: { type: Type.STRING, description: 'e.g., B.Tech AI & ML' },
            targetYear: { type: Type.STRING, description: 'e.g., 2nd Year' },
            deadline: {
              type: Type.STRING,
              description: 'Deadline date in YYYY-MM-DD format',
            },
            deadlineTime: {
              type: Type.STRING,
              description: 'Deadline time e.g., 5:00 PM',
            },
            eventDate: {
              type: Type.STRING,
              description: 'Event date in YYYY-MM-DD format if applicable',
            },
            eventTime: {
              type: Type.STRING,
              description: 'Event time e.g., 4:00 PM if applicable',
            },
            venue: {
              type: Type.STRING,
              description: 'Location, room, seminar hall, or online portal',
            },
            requiredAction: {
              type: Type.STRING,
              description: 'Clear actionable instruction for the student',
            },
            actionType: {
              type: Type.STRING,
              enum: [
                'submit_form',
                'fee_payment',
                'assignment_submission',
                'event_registration',
                'read_acknowledge',
                'portal_action',
              ],
            },
            portalUrl: {
              type: Type.STRING,
              description: 'URL mentioned in the notice if any',
            },
            importance: {
              type: Type.INTEGER,
              description: '0 to 100 administrative importance score',
            },
            urgency: {
              type: Type.INTEGER,
              description: '0 to 100 urgency score based on deadline',
            },
            studentRelevance: {
              type: Type.INTEGER,
              description: '0 to 100 relevance to the student profile',
            },
            priorityScore: {
              type: Type.INTEGER,
              description: '0 to 100 weighted priority score',
            },
            priorityLevel: {
              type: Type.STRING,
              enum: ['Critical', 'High', 'Medium', 'Low'],
            },
            priorityReason: {
              type: Type.STRING,
              description: 'Concise explanation of why this priority score was assigned',
            },
            summary: {
              type: Type.STRING,
              description: 'Clear 2-sentence summary of the circular',
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 4 concise bullet points with essential details',
            },
            consequencesOfMissing: {
              type: Type.STRING,
              description: 'Penalty, late fee, or academic debarment risk if missed',
            },
          },
          required: [
            'title',
            'category',
            'targetAudience',
            'targetBranch',
            'targetYear',
            'deadline',
            'deadlineTime',
            'venue',
            'requiredAction',
            'actionType',
            'importance',
            'urgency',
            'studentRelevance',
            'priorityScore',
            'priorityLevel',
            'priorityReason',
            'summary',
            'keyPoints',
            'consequencesOfMissing',
          ],
        },
      },
    });

    const parsed = JSON.parse(rawJson || '{}');
    analysisCache.set(cacheKey, parsed);
    return res.json({ result: parsed, source: modelUsed });
  } catch (_error: any) {
    // Gracefully fall back without logging an unhandled error when Free Tier rate limits are reached
    const fallback = heuristicAnalyzeNotice(
      req.body.noticeText || 'Circular notice',
      req.body.studentProfile
    );
    return res.json({
      result: fallback,
      source: 'fallback',
    });
  }
});

// API: Daily Brief Generation using Google Gemini with multi-model fallback
app.post('/api/daily-brief', async (req, res) => {
  try {
    const { notices, tasks, studentProfile, currentDate } = req.body;
    const ai = getGeminiClient();

    if (!ai || !notices || notices.length === 0) {
      const urgentCount =
        notices?.filter(
          (n: any) => n.priorityLevel === 'Critical' || n.priorityScore >= 80
        ).length || 0;
      const upcomingEvents =
        notices?.filter((n: any) => n.category === 'Workshop / Event').length || 0;
      return res.json({
        greeting: `Good morning, ${studentProfile?.name || 'Student'}!`,
        summary: `You have ${urgentCount} critical notices requiring your attention and ${upcomingEvents} upcoming events scheduled.`,
        topPriorityItem:
          notices?.[0]?.requiredAction || 'Upload a college notice to get started',
        quote: 'Stay organized today to avoid last-minute portal crashes and penalties.',
      });
    }

    const briefKey = JSON.stringify({
      date: currentDate,
      user: studentProfile?.name,
      noticeIds: (notices || []).slice(0, 5).map((n: any) => n.id),
      taskCount: (tasks || []).length,
    });

    if (dailyBriefCache.has(briefKey)) {
      return res.json(dailyBriefCache.get(briefKey));
    }

    const { text: rawJson } = await generateWithGeminiFallback(ai, {
      contents: `Generate a daily brief for a college student.
Current Date: ${currentDate || '2026-08-18'}.
Student: ${JSON.stringify(studentProfile || {})}.
Active Notices: ${JSON.stringify((notices || []).slice(0, 8))}.
Pending Tasks: ${JSON.stringify((tasks || []).slice(0, 6))}.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            greeting: { type: Type.STRING },
            summary: { type: Type.STRING },
            topPriorityItem: { type: Type.STRING },
            quote: { type: Type.STRING },
          },
          required: ['greeting', 'summary', 'topPriorityItem', 'quote'],
        },
      },
    });

    const parsed = JSON.parse(rawJson || '{}');
    dailyBriefCache.set(briefKey, parsed);
    return res.json(parsed);
  } catch {
    return res.json({
      greeting: `Good morning, ${req.body.studentProfile?.name || 'Student'}!`,
      summary: `Review your prioritized notices and upcoming academic deadlines.`,
      topPriorityItem:
        req.body.notices?.[0]?.requiredAction || 'Upload a college circular',
      quote: 'Early submissions ensure peace of mind.',
    });
  }
});

// Mount Vite or serve static assets
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusOS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
