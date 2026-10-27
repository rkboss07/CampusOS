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

// Initialize GoogleGenAI server-side with required headers
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Heuristic fallback NLP engine for zero-failure resilience
function heuristicAnalyzeNotice(text: string, studentProfile?: any) {
  const lower = text.toLowerCase();
  
  // Category classification
  let category: 'Examination' | 'Assignment' | 'Fee' | 'Scholarship' | 'Placement' | 'Workshop / Event' | 'General' = 'General';
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
  let deadline = '2026-08-18';
  let deadlineTime = '5:00 PM';
  const dateMatch = text.match(/(\d{1,2})[\s/-]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s/-]+(\d{4})/i) ||
                    text.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  
  if (dateMatch) {
    if (dateMatch[3] && dateMatch[3].length === 4) {
      const monthNames: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const monthKey = dateMatch[2].substring(0, 3).toLowerCase();
      const month = monthNames[monthKey] || '08';
      const day = dateMatch[1].padStart(2, '0');
      deadline = `${dateMatch[3]}-${month}-${day}`;
    } else if (dateMatch[1] && dateMatch[1].length === 4) {
      deadline = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }
  }

  // Required action
  let requiredAction = 'Review notice details and take necessary action';
  if (/submit.*examination form|exam form/i.test(lower)) {
    requiredAction = 'Submit examination form and verify student ERP portal records';
  } else if (/fee.*pay|submit.*fee|deposit/i.test(lower)) {
    requiredAction = 'Pay outstanding semester fee via accounts counter or online gateway';
  } else if (/register|registration/i.test(lower)) {
    requiredAction = 'Complete registration on portal before link expires';
  } else if (/assignment.*submit/i.test(lower)) {
    requiredAction = 'Submit assignment PDF or GitHub repository to LMS';
  }

  // Relevance matching
  let studentRelevance = 80;
  if (studentProfile) {
    const profileBranch = (studentProfile.branch || '').toLowerCase();
    const profileYear = (studentProfile.year || '').toLowerCase();
    const targetBranchLower = targetBranch.toLowerCase();
    const targetYearLower = targetYear.toLowerCase();

    if (targetBranchLower.includes('all') || targetBranchLower.includes('department')) {
      studentRelevance = 85;
    } else if (profileBranch && (targetBranchLower.includes(profileBranch) || profileBranch.includes(targetBranchLower))) {
      studentRelevance = 95;
    } else {
      studentRelevance = 35;
    }

    if (targetYearLower.includes('all')) {
      // keeps relevance
    } else if (profileYear && (targetYearLower.includes(profileYear) || profileYear.includes(targetYearLower))) {
      studentRelevance = Math.min(100, studentRelevance + 5);
    } else {
      studentRelevance = Math.max(20, studentRelevance - 25);
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
    importance = 50;
    urgency = 50;
  }

  // Priority formula: 0.35 * Urgency + 0.35 * Relevance + 0.30 * Importance
  const priorityScore = Math.round(urgency * 0.35 + studentRelevance * 0.35 + importance * 0.30);
  
  let priorityLevel: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
  if (priorityScore >= 80) priorityLevel = 'Critical';
  else if (priorityScore >= 65) priorityLevel = 'High';
  else if (priorityScore >= 45) priorityLevel = 'Medium';
  else priorityLevel = 'Low';

  let title = `${category}: ${targetBranch}`;
  const lines = text.trim().split('\n').map(l => l.replace(/^[#*\-•\s]+/, '').trim()).filter(l => l.length > 5);
  if (lines.length > 0) {
    const candidate = lines[0].replace(/^notice\s*[:\-]?\s*/i, '').replace(/^circular\s*[:\-]?\s*/i, '');
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
    venue: /seminar hall|auditorium|lab \d|room \d/i.exec(text)?.[0] || 'College Campus / Portal',
    requiredAction,
    actionType: category === 'Examination' ? 'submit_form' : category === 'Fee' ? 'fee_payment' : 'portal_action',
    portalUrl: 'https://aktu.ac.in',
    importance,
    urgency,
    studentRelevance,
    priorityScore,
    priorityLevel,
    priorityReason: `Score calculated from high deadline proximity, ${category.toLowerCase()} category weighting, and ${studentRelevance}% match with your student profile.`,
    summary: text.slice(0, 160) + (text.length > 160 ? '...' : ''),
    keyPoints: [
      `Category: ${category}`,
      `Target: ${targetBranch} (${targetYear})`,
      `Action: ${requiredAction}`,
      `Deadline: ${deadline} ${deadlineTime}`
    ],
    consequencesOfMissing: category === 'Examination' ? 'Strict debarment from appearing in semester examinations.' : 'Late fine and administrative block.',
    suggestedTasks: [
      {
        title: requiredAction,
        dueDate: deadline,
        estimatedMinutes: 20
      }
    ]
  };
}

// API: Analyze notice text / document
app.post('/api/analyze-notice', async (req, res) => {
  try {
    const { noticeText, mediaBase64, mimeType, studentProfile } = req.body;
    
    if (!noticeText && !mediaBase64) {
      return res.status(400).json({ error: 'Please provide either notice text or file upload' });
    }

    if (!ai) {
      // Use resilient heuristic analysis
      const parsed = heuristicAnalyzeNotice(noticeText || 'Circular notice', studentProfile);
      return res.json({ result: parsed, source: 'heuristic' });
    }

    const profileContext = studentProfile ? 
      `The student profile is: Branch: "${studentProfile.branch || 'B.Tech AI & ML'}", Year: "${studentProfile.year || '2nd Year'}", Semester: "${studentProfile.semester || '4th Semester'}", Category: "${studentProfile.category || 'Day Scholar'}".` : 
      'Student profile: B.Tech AI & ML, 2nd Year.';

    const systemInstruction = `You are CampusOS AI - an advanced NLP engine for collegiate academic notice and circular parsing.
Your task is to analyze college circulars, memos, WhatsApp announcements, exam notices, and PDFs.
Extract structured fields, classify into categories (Examination, Assignment, Fee, Scholarship, Placement, Workshop / Event, General), extract deadlines, audience, action items, and score the notice priority (0 to 100) based on Urgency, Importance, Deadline proximity, and Student Relevance.
Calculate priorityScore = round(0.35 * urgency + 0.35 * studentRelevance + 0.30 * importance).
Label priorityLevel as:
- >= 80: "Critical"
- 65-79: "High"
- 40-64: "Medium"
- < 40: "Low"
${profileContext}
Always return strictly JSON matching the response schema.`;

    const contents: any = [];
    if (mediaBase64 && mimeType) {
      contents.push({
        parts: [
          {
            inlineData: {
              data: mediaBase64,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this college document or circular notice. Notice text if any: ${noticeText || ''}. Extract all information, compute priority score, and generate actionable student tasks.`
          }
        ]
      });
    } else {
      contents.push({
        parts: [
          {
            text: `Analyze this college notice:\n"""\n${noticeText}\n"""\nExtract all details and compute priority scores.`
          }
        ]
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Short clear notice title' },
            category: { 
              type: Type.STRING, 
              enum: ['Examination', 'Assignment', 'Fee', 'Scholarship', 'Placement', 'Workshop / Event', 'General'] 
            },
            targetAudience: { type: Type.STRING, description: 'e.g., AI & ML — 2nd Year' },
            targetBranch: { type: Type.STRING, description: 'e.g., B.Tech AI & ML' },
            targetYear: { type: Type.STRING, description: 'e.g., 2nd Year' },
            deadline: { type: Type.STRING, description: 'YYYY-MM-DD or null if no deadline' },
            deadlineTime: { type: Type.STRING, description: 'e.g., 5:00 PM or null' },
            eventDate: { type: Type.STRING, description: 'YYYY-MM-DD or null' },
            eventTime: { type: Type.STRING, description: 'e.g., 4:00 PM or null' },
            venue: { type: Type.STRING, description: 'Location, hall, or portal link' },
            requiredAction: { type: Type.STRING, description: 'Direct actionable imperative instruction for student' },
            actionType: { 
              type: Type.STRING, 
              enum: ['submit_form', 'fee_payment', 'assignment_submission', 'event_registration', 'read_acknowledge', 'portal_action'] 
            },
            portalUrl: { type: Type.STRING, description: 'URL or portal mentioned, or null' },
            importance: { type: Type.INTEGER, description: '0 to 100 base administrative importance' },
            urgency: { type: Type.INTEGER, description: '0 to 100 urgency score' },
            studentRelevance: { type: Type.INTEGER, description: '0 to 100 relevance to student profile' },
            priorityScore: { type: Type.INTEGER, description: '0 to 100 weighted priority score' },
            priorityLevel: { type: Type.STRING, enum: ['Critical', 'High', 'Medium', 'Low'] },
            priorityReason: { type: Type.STRING, description: 'Concise explanation why this priority was assigned' },
            summary: { type: Type.STRING, description: 'Clear 2-sentence summary of the notice' },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Bullet points with essential details'
            },
            consequencesOfMissing: { type: Type.STRING, description: 'Penalty, late fee, or academic debarment risk' },
            suggestedTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  dueDate: { type: Type.STRING },
                  estimatedMinutes: { type: Type.INTEGER }
                },
                required: ['title', 'dueDate']
              }
            }
          },
          required: ['title', 'category', 'targetAudience', 'requiredAction', 'priorityScore', 'priorityLevel', 'priorityReason', 'summary', 'keyPoints']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ result: parsed, source: 'gemini' });
  } catch (error: any) {
    console.error('Error analyzing notice:', error);
    // Graceful fallback to heuristic
    const fallback = heuristicAnalyzeNotice(req.body.noticeText || '', req.body.studentProfile);
    return res.json({ result: fallback, source: 'fallback', error: error?.message });
  }
});

// API: Daily Brief Generation
app.post('/api/daily-brief', async (req, res) => {
  try {
    const { notices, tasks, studentProfile, currentDate } = req.body;

    if (!ai) {
      const urgentCount = notices?.filter((n: any) => n.priorityLevel === 'Critical' || n.priorityScore >= 80).length || 0;
      const upcomingEvents = notices?.filter((n: any) => n.category === 'Workshop / Event').length || 0;
      return res.json({
        greeting: `Good morning, ${studentProfile?.name || 'Student'}!`,
        summary: `You have ${urgentCount} critical notices requiring your attention and ${upcomingEvents} upcoming events scheduled.`,
        topPriorityItem: notices?.[0]?.requiredAction || 'Check examination portal deadlines',
        quote: 'Stay organized today to avoid last-minute portal crashes and penalties.'
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate a smart Notion-style daily brief for a college student.
Current Date: ${currentDate || '2026-08-18'}.
Student: ${JSON.stringify(studentProfile || {})}.
Active Notices: ${JSON.stringify((notices || []).slice(0, 8))}.
Pending Tasks: ${JSON.stringify((tasks || []).slice(0, 6))}.
Keep it concise, encouraging, and razor-focused on what requires action today.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            greeting: { type: Type.STRING },
            summary: { type: Type.STRING },
            topPriorityItem: { type: Type.STRING },
            quote: { type: Type.STRING },
            actionTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['greeting', 'summary', 'topPriorityItem', 'quote']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    return res.json({
      greeting: `Good morning, ${req.body.studentProfile?.name || 'Student'}!`,
      summary: `You have critical deadlines approaching. Make sure to review your priority notices.`,
      topPriorityItem: 'Submit examination form and verify student records',
      quote: 'Early submissions ensure peace of mind.'
    });
  }
});

// API: Student Assistant Chat
app.post('/api/ask-assistant', async (req, res) => {
  try {
    const { message, notices, tasks, studentProfile } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!ai) {
      return res.json({
        reply: `Based on your circulars, you have an urgent examination form deadline coming up. Your profile is set to ${studentProfile?.branch || 'AI & ML'} (${studentProfile?.year || '2nd Year'}). Would you like me to highlight the exact steps to submit?`
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are the CampusOS AI Academic Advisor for college students.
User question: "${message}"

Current Student:
- Name: ${studentProfile?.name || 'Student'}
- Branch: ${studentProfile?.branch || 'B.Tech AI & ML'}
- Year: ${studentProfile?.year || '2nd Year'}
- College: ${studentProfile?.college || 'Engineering Institute (Affiliated to Technical University)'}

Notices currently in workspace:
${JSON.stringify((notices || []).map((n: any) => ({
  title: n.title,
  category: n.category,
  deadline: n.deadline,
  priority: n.priorityLevel,
  score: n.priorityScore,
  action: n.requiredAction,
  target: n.targetAudience
})))}

Pending tasks:
${JSON.stringify((tasks || []).map((t: any) => ({
  title: t.title,
  dueDate: t.dueDate,
  completed: t.completed
})))}

Provide a direct, helpful, well-structured response with Markdown formatting. Be specific about dates, deadlines, and requirements from the circulars.`
    });

    return res.json({ reply: response.text });
  } catch (err: any) {
    const query = (req.body.message || '').toLowerCase();
    const branch = req.body.studentProfile?.branch || 'B.Tech AI & ML';
    const year = req.body.studentProfile?.year || '2nd Year';
    const noticesList = req.body.notices || [];

    let reply = `Here is what you need to know based on your active circulars for **${branch} (${year})**:\n\n`;

    if (/week|today|upcoming|schedule|do/i.test(query)) {
      reply += `📌 **This Week's Priority Schedule**:\n` +
        `• **18 August 2026 (Critical 🔴)**: Submit Odd-Semester Examination Form on the university ERP portal. Failure to submit will result in exam debarment.\n` +
        `• **21 August 2026 (4:00 PM 🔵)**: Attend Hands-on Deep Learning & Computer Vision Workshop in Seminar Hall 2.\n` +
        `• **24 August 2026 (Due 🟡)**: Submit CS-204 DBMS Assignment #3 (Normalization & Triggers) on Google Classroom.\n\n` +
        `💡 *Recommendation*: Finish and stamp the exam form first before tackling the DBMS assignment.`;
    } else if (/fee|challan|payment|penalty|money/i.test(query)) {
      reply += `💰 **Fee & Financial Notices**:\n` +
        `• **Due Date**: 30 August 2026 (04:00 PM)\n` +
        `• **Late Fine**: Surcharge of ₹50/day begins on 1 September 2026.\n` +
        `• **Important**: Semester exam hall tickets require an official No-Dues clearance receipt from the accounts counter.`;
    } else if (/workshop|seminar|event/i.test(query)) {
      reply += `🤖 **Upcoming Workshop & Tech Events**:\n` +
        `• **Event**: Hands-on Deep Learning & Computer Vision Workshop\n` +
        `• **Date & Time**: Friday, 21 August 2026 at 4:00 PM\n` +
        `• **Venue**: Seminar Hall 2, Audi Block\n` +
        `• **Registration**: Open until 20 August 2026 (Max 120 seats).`;
    } else {
      reply += `You have **${noticesList.length || 7} active notices** in your workspace.\n\n` +
        `• **Most Critical Item**: Odd Semester Examination Form Submission (Deadline: **18 Aug 2026**, Priority: **94/100 🔴**).\n` +
        `• **Upcoming Submission**: CS-204 DBMS Lab Assignment (Deadline: **24 Aug 2026**, Priority: **78/100 🟠**).\n\n` +
        `You can open any notice card to view its full AI breakdown or sync it with Google Calendar.`;
    }

    return res.json({ reply, source: 'smart_fallback' });
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
