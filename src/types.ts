export type NoticeCategory = 
  | 'Examination'
  | 'Assignment'
  | 'Fee'
  | 'Scholarship'
  | 'Placement'
  | 'Workshop / Event'
  | 'General';

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Notice {
  id: string;
  title: string;
  rawContent: string;
  category: NoticeCategory;
  targetAudience: string;
  targetBranch: string;
  targetYear: string;
  deadline: string | null; // e.g. "2026-08-18"
  deadlineTime: string | null;
  eventDate: string | null;
  eventTime: string | null;
  venue: string | null;
  requiredAction: string;
  actionType: 'submit_form' | 'fee_payment' | 'assignment_submission' | 'event_registration' | 'read_acknowledge' | 'portal_action';
  portalUrl: string | null;
  importance: number; // 0-100
  urgency: number; // 0-100
  studentRelevance: number; // 0-100
  priorityScore: number; // 0-100
  priorityLevel: PriorityLevel;
  priorityReason: string;
  summary: string;
  keyPoints: string[];
  consequencesOfMissing: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  source: 'pdf' | 'text' | 'image' | 'preset';
  sourceFileName?: string;
  pdfUrl?: string;
}

export interface Task {
  id: string;
  noticeId?: string;
  title: string;
  dueDate: string;
  priority: PriorityLevel;
  category: NoticeCategory;
  completed: boolean;
  estimatedMinutes?: number;
}

export interface StudentProfile {
  name: string;
  rollNumber: string;
  degree: string;
  branch: string;
  year: string;
  semester: string;
  section: string;
  category: 'Day Scholar' | 'Hosteller';
  college: string;
  email: string;
}

export interface DailyBrief {
  greeting: string;
  summary: string;
  topPriorityItem: string;
  quote: string;
  actionTips?: string[];
}
