import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Trash2,
  RotateCcw,
  Flag,
  Pencil,
  Save,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Notice, NoticeCategory, StudentProfile } from '../types';
import { generateGoogleCalendarUrl } from '../utils/calendarUtils';
import { recalculateNoticePriority } from '../utils/noticeAnalyzer';

interface NoticeDetailModalProps {
  notice: Notice | null;
  profile: StudentProfile;
  initialEditMode?: boolean;
  onClose: () => void;
  onToggleStatus: (noticeId: string) => void;
  onAddCalendarTask: (notice: Notice) => void;
  onUpdateNotice?: (updatedNotice: Notice) => void;
  onDeleteNotice?: (noticeId: string) => void;
}

const CATEGORIES: NoticeCategory[] = [
  'Examination',
  'Assignment',
  'Fee',
  'Scholarship',
  'Placement',
  'Workshop / Event',
  'General',
];

const BRANCH_OPTIONS = [
  'All Departments',
  'B.Tech AI & ML',
  'B.Tech CSE',
  'B.Tech IT',
  'B.Tech ECE',
  'B.Tech ME',
  'MBA',
  'MCA',
];

const YEAR_OPTIONS = ['All Years', '1st Year', '2nd Year', '3rd Year', '4th Year'];

const ACTION_TYPES: { value: Notice['actionType']; label: string }[] = [
  { value: 'submit_form', label: 'Submit Form / Application' },
  { value: 'fee_payment', label: 'Fee / Dues Payment' },
  { value: 'assignment_submission', label: 'Assignment / Project Submission' },
  { value: 'event_registration', label: 'Event / Workshop Registration' },
  { value: 'portal_action', label: 'Portal Verification / Action' },
  { value: 'read_acknowledge', label: 'Read & Acknowledge' },
];

export const NoticeDetailModal: React.FC<NoticeDetailModalProps> = ({
  notice,
  profile,
  initialEditMode = false,
  onClose,
  onToggleStatus,
  onAddCalendarTask,
  onUpdateNotice,
  onDeleteNotice,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'edit' | 'raw'>(
    initialEditMode ? 'edit' : 'ai'
  );

  // Editable form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('General');
  const [deadline, setDeadline] = useState('2026-08-18');
  const [deadlineTime, setDeadlineTime] = useState('5:00 PM');
  const [targetBranch, setTargetBranch] = useState('All Departments');
  const [targetYear, setTargetYear] = useState('All Years');
  const [targetAudience, setTargetAudience] = useState('');
  const [venue, setVenue] = useState('');
  const [requiredAction, setRequiredAction] = useState('');
  const [actionType, setActionType] = useState<Notice['actionType']>('portal_action');
  const [portalUrl, setPortalUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [consequencesOfMissing, setConsequencesOfMissing] = useState('');
  const [keyPointsText, setKeyPointsText] = useState('');
  const [rawContent, setRawContent] = useState('');

  useEffect(() => {
    if (!notice) return;
    setTitle(notice.title || '');
    setCategory(notice.category || 'General');
    setDeadline(notice.deadline || '2026-08-18');
    setDeadlineTime(notice.deadlineTime || '5:00 PM');
    setTargetBranch(notice.targetBranch || 'All Departments');
    setTargetYear(notice.targetYear || 'All Years');
    setTargetAudience(
      notice.targetAudience || `${notice.targetBranch} — ${notice.targetYear}`
    );
    setVenue(notice.venue || 'College Campus');
    setRequiredAction(notice.requiredAction || '');
    setActionType(notice.actionType || 'portal_action');
    setPortalUrl(notice.portalUrl || '');
    setSummary(notice.summary || '');
    setConsequencesOfMissing(notice.consequencesOfMissing || '');
    setKeyPointsText((notice.keyPoints || []).join('\n'));
    setRawContent(notice.rawContent || '');
    setActiveTab(initialEditMode ? 'edit' : 'ai');
  }, [notice, initialEditMode]);

  // Live recalculated notice preview whenever any form field changes
  const livePreviewNotice = useMemo(() => {
    if (!notice) return null;
    const parsedKeyPoints = keyPointsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const draft: Notice = {
      ...notice,
      title: title.trim() || 'Official Academic Notice',
      category,
      deadline: deadline || '2026-08-18',
      deadlineTime: deadlineTime.trim() || '5:00 PM',
      targetBranch: targetBranch.trim() || 'All Departments',
      targetYear: targetYear.trim() || 'All Years',
      targetAudience:
        targetAudience.trim() || `${targetBranch.trim()} — ${targetYear.trim()}`,
      venue: venue.trim() || 'College Campus',
      requiredAction: requiredAction.trim() || 'Review circular details',
      actionType,
      portalUrl: portalUrl.trim() || null,
      summary: summary.trim() || 'Academic notice summary',
      consequencesOfMissing: consequencesOfMissing.trim(),
      keyPoints: parsedKeyPoints,
      rawContent: rawContent.trim() || notice.rawContent,
    };

    return recalculateNoticePriority(draft, profile);
  }, [
    notice,
    title,
    category,
    deadline,
    deadlineTime,
    targetBranch,
    targetYear,
    targetAudience,
    venue,
    requiredAction,
    actionType,
    portalUrl,
    summary,
    consequencesOfMissing,
    keyPointsText,
    rawContent,
    profile,
  ]);

  if (!notice || !livePreviewNotice) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `${notice.title}\nDeadline: ${notice.deadline}\nAction: ${notice.requiredAction}\nPriority: ${notice.priorityScore}/100\n\n${notice.rawContent}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!livePreviewNotice) return;
    onUpdateNotice?.(livePreviewNotice);
    setActiveTab('ai');
  };

  const handleQuickDeadlineChange = (newDeadline: string) => {
    if (!newDeadline) return;
    setDeadline(newDeadline);
    const updated = recalculateNoticePriority(
      {
        ...notice,
        deadline: newDeadline,
        eventDate: notice.category === 'Workshop / Event' ? newDeadline : notice.eventDate,
      },
      profile
    );
    onUpdateNotice?.(updated);
  };

  const displayedNotice = activeTab === 'edit' ? livePreviewNotice : notice;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B18]/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-white border border-[#E5E0D5] rounded-3xl flex flex-col shadow-[0_24px_60px_rgba(28,27,24,0.18)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#EAE5DC] flex items-center justify-between gap-4 bg-[#F6F3EC]">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#F97316] border border-[#FDBA74]/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="type-caption font-semibold inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-[#EAE5DC] bg-white text-[#1C1B18] tabular-nums">
                <Flag className="w-3 h-3 text-[#EF4444] fill-[#EF4444]/15" />
                <span>
                  {displayedNotice.priorityScore}/100 · {displayedNotice.priorityLevel}
                </span>
              </span>
              <span className="type-caption px-2.5 py-0.5 rounded-lg bg-white text-[#57534E] border border-[#EAE5DC]">
                {displayedNotice.category}
              </span>
              {activeTab === 'edit' && (
                <span className="type-caption font-semibold text-[#EA580C]">
                  Live Priority Recalculation Active
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab !== 'edit' && (
              <button
                onClick={() => setActiveTab('edit')}
                className="type-button px-3 py-1.5 rounded-xl bg-white hover:bg-[#ECE7DF] border border-[#EAE5DC] text-[#1C1B18] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Edit all notice details"
              >
                <Pencil className="w-3.5 h-3.5 text-[#F97316]" />
                <span>Edit Notice</span>
              </button>
            )}
            <button
              onClick={handleCopy}
              className="type-button p-2 rounded-xl text-[#57534E] hover:text-[#1C1B18] hover:bg-[#EAE4DA] transition-colors cursor-pointer"
              title="Copy Summary"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[#10B981]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="type-button p-2 rounded-xl text-[#57534E] hover:text-[#1C1B18] hover:bg-[#EAE4DA] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switch between AI Breakdown, Edit Notice, and Original Document */}
        <div className="px-6 pt-3 pb-2 border-b border-[#EAE5DC] flex items-center gap-6 bg-[#FAF8F5] overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('ai')}
            className={`type-button pb-2 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-[#F97316] text-[#1C1B18]'
                : 'border-transparent text-[#78736A] hover:text-[#1C1B18]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Priority Matrix & Details</span>
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`type-button pb-2 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'edit'
                ? 'border-[#F97316] text-[#1C1B18]'
                : 'border-transparent text-[#78736A] hover:text-[#1C1B18]'
            }`}
          >
            <Pencil className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Edit Notice & Deadline</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`type-button pb-2 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'raw'
                ? 'border-[#F97316] text-[#1C1B18]'
                : 'border-transparent text-[#78736A] hover:text-[#1C1B18]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#78736A]" />
            <span>Original College Notice</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          {activeTab === 'ai' && (
            <>
              {/* Notice Title & Executive Summary */}
              <div>
                <h3 className="type-section-title text-[#1C1B18]">{notice.title}</h3>
                <p className="type-body text-[#3D3A34] mt-2 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EAE5DC]">
                  {notice.summary}
                </p>
              </div>

              {/* Priority Engine Score Deconstruction */}
              <div className="p-4 rounded-2xl bg-[#FDF3EA]/60 border border-[#FDBA74]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="type-section-title text-[#1C1B18]">
                    Priority Prediction Breakdown (Score: {notice.priorityScore}/100)
                  </h4>
                  <span className="type-caption">
                    Profile: {profile.branch} ({profile.year})
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-white border border-[#EAE5DC]">
                    <span className="type-caption">Student Relevance</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="type-section-title text-[#10B981] tabular-nums">
                        {notice.studentRelevance}%
                      </span>
                      <div className="w-12 h-1.5 bg-[#EAE5DC] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#10B981]"
                          style={{ width: `${notice.studentRelevance}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#EAE5DC]">
                    <span className="type-caption">Urgency</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="type-section-title text-[#F59E0B] tabular-nums">
                        {notice.urgency}%
                      </span>
                      <div className="w-12 h-1.5 bg-[#EAE5DC] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#F59E0B]"
                          style={{ width: `${notice.urgency}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#EAE5DC]">
                    <span className="type-caption">Importance</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="type-section-title text-[#F97316] tabular-nums">
                        {notice.importance}%
                      </span>
                      <div className="w-12 h-1.5 bg-[#EAE5DC] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#F97316]"
                          style={{ width: `${notice.importance}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#EAE5DC]">
                    <span className="type-caption">Final Verdict</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="type-section-title text-[#1C1B18]">
                        {notice.priorityLevel}
                      </span>
                      <Flag className="w-3.5 h-3.5 text-[#EF4444]" />
                    </div>
                  </div>
                </div>

                <p className="type-body text-[#57534E]">{notice.priorityReason}</p>
              </div>

              {/* Extracted Information Fields + Quick Inline Deadline Picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] space-y-1">
                  <span className="type-caption font-semibold">Category & Target</span>
                  <p className="type-section-title text-[#1C1B18]">{notice.category}</p>
                  <p className="type-caption text-[#57534E]">
                    {notice.targetAudience} ({notice.targetBranch} · {notice.targetYear})
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-caption font-semibold text-[#EA580C]">
                      Deadline / Timing (Quick Change)
                    </span>
                    <span className="type-caption text-[#78736A]">
                      {notice.deadlineTime || '5:00 PM'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={notice.deadline || '2026-08-18'}
                      onChange={(e) => handleQuickDeadlineChange(e.target.value)}
                      className="type-button bg-white border border-[#E5E0D5] rounded-xl px-3 py-1.5 text-[#1C1B18] focus:outline-none focus:border-[#F97316] tabular-nums cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveTab('edit')}
                      className="type-caption text-[#EA580C] hover:underline cursor-pointer"
                    >
                      Edit all fields →
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] space-y-1 md:col-span-2">
                  <span className="type-caption font-semibold">
                    Required Action for Student
                  </span>
                  <p className="type-section-title text-[#1C1B18]">
                    {notice.requiredAction}
                  </p>
                  {notice.venue && (
                    <p className="type-caption text-[#57534E] flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                      <span>{notice.venue}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Key Bullet Points */}
              {notice.keyPoints && notice.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <h4 className="type-section-title text-[#1C1B18]">
                    Essential Highlights
                  </h4>
                  <ul className="space-y-1.5">
                    {notice.keyPoints.map((pt, i) => (
                      <li
                        key={i}
                        className="type-body text-[#2C2A26] flex items-start gap-2.5 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EAE5DC]"
                      >
                        <span className="type-caption font-semibold w-4 h-4 rounded-full bg-[#F97316] text-white flex items-center justify-center shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Consequences of Missing */}
              {notice.consequencesOfMissing && (
                <div className="type-body p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Consequence of missing: </span>
                    <span>{notice.consequencesOfMissing}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'edit' && (
            <form onSubmit={handleSaveEdits} className="space-y-4">
              {/* Live Priority Recalculation Preview Bar */}
              <div className="p-4 rounded-2xl bg-[#FDF3EA] border border-[#FDBA74]/60 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#F97316]" />
                    <span className="type-section-title text-[#1C1B18]">
                      Recalculated Priority Score:{' '}
                      <span className="text-[#EA580C] tabular-nums">
                        {livePreviewNotice.priorityScore}/100 ({livePreviewNotice.priorityLevel})
                      </span>
                    </span>
                  </div>
                  <div className="type-caption flex items-center gap-3 tabular-nums">
                    <span>Urgency: {livePreviewNotice.urgency}%</span>
                    <span>·</span>
                    <span>Relevance: {livePreviewNotice.studentRelevance}%</span>
                    <span>·</span>
                    <span>Importance: {livePreviewNotice.importance}%</span>
                  </div>
                </div>
                <p className="type-caption text-[#57534E]">
                  {livePreviewNotice.priorityReason}
                </p>
              </div>

              {/* Row 1: Title */}
              <div className="space-y-1.5">
                <label className="type-caption font-semibold text-[#1C1B18] block">
                  Notice Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3.5 py-2.5 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                />
              </div>

              {/* Row 2: Category, Deadline Date, Deadline Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#1C1B18] block">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as NoticeCategory)}
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3 py-2.5 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#EA580C] block">
                    Deadline Date
                  </label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3 py-2.5 text-[#1C1B18] tabular-nums focus:outline-none focus:bg-white focus:border-[#F97316]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#1C1B18] block">
                    Deadline / Event Time
                  </label>
                  <input
                    type="text"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    placeholder="e.g. 5:00 PM"
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3 py-2.5 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                  />
                </div>
              </div>

              {/* Row 3: Target Branch, Target Year, Action Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#1C1B18] block">
                    Target Branch
                  </label>
                  <select
                    value={
                      BRANCH_OPTIONS.includes(targetBranch)
                        ? targetBranch
                        : 'All Departments'
                    }
                    onChange={(e) => {
                      const nextBranch = e.target.value;
                      setTargetBranch(nextBranch);
                      setTargetAudience(`${nextBranch} — ${targetYear}`);
                    }}
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3 py-2.5 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                  >
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#1C1B18] block">
                    Target Year
                  </label>
                  <select
                    value={YEAR_OPTIONS.includes(targetYear) ? targetYear : 'All Years'}
                    onChange={(e) => {
                      const nextYear = e.target.value;
                      setTargetYear(nextYear);
                      setTargetAudience(`${targetBranch} — ${nextYear}`);
                    }}
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3 py-2.5 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#1C1B18] block">
                    Action Type
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) =>
                      setActionType(e.target.value as Notice['actionType'])
                    }
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3 py-2.5 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                  >
                    {ACTION_TYPES.map((act) => (
                      <option key={act.value} value={act.value}>
                        {act.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Target Audience, Venue, Portal URL */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#1C1B18] block">
                    Target Audience Label
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3 py-2 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#1C1B18] block">
                    Venue / Office / Portal
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3 py-2 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#1C1B18] block">
                    Portal Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={portalUrl}
                    onChange={(e) => setPortalUrl(e.target.value)}
                    placeholder="https://..."
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3 py-2 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                  />
                </div>
              </div>

              {/* Row 5: Required Action */}
              <div className="space-y-1.5">
                <label className="type-caption font-semibold text-[#1C1B18] block">
                  Required Action for Student
                </label>
                <input
                  type="text"
                  required
                  value={requiredAction}
                  onChange={(e) => setRequiredAction(e.target.value)}
                  className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3.5 py-2.5 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                />
              </div>

              {/* Row 6: Summary & Consequences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#1C1B18] block">
                    Executive Summary
                  </label>
                  <textarea
                    rows={3}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl p-3 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#1C1B18] block">
                    Consequences of Missing
                  </label>
                  <textarea
                    rows={3}
                    value={consequencesOfMissing}
                    onChange={(e) => setConsequencesOfMissing(e.target.value)}
                    placeholder="e.g. Late fee penalty or exam debarment"
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl p-3 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                  />
                </div>
              </div>

              {/* Row 7: Key Highlights & Original Notice Content */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#1C1B18] block">
                    Essential Highlights (One bullet per line)
                  </label>
                  <textarea
                    rows={3}
                    value={keyPointsText}
                    onChange={(e) => setKeyPointsText(e.target.value)}
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl p-3 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="type-caption font-semibold text-[#1C1B18] block">
                    Original Notice / Memo Text
                  </label>
                  <textarea
                    rows={3}
                    value={rawContent}
                    onChange={(e) => setRawContent(e.target.value)}
                    className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl p-3 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className="type-button px-4 py-2 rounded-full bg-[#F6F3EC] hover:bg-[#ECE7DF] text-[#57534E] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="type-button px-5 py-2 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes & Update Priority ({livePreviewNotice.priorityScore}/100)</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'raw' && (
            /* Original Notice Text */
            <div className="space-y-3">
              <div className="type-caption flex items-center justify-between">
                <span>
                  Source: {notice.sourceFileName || 'Direct Paste / OCR Extract'}
                </span>
                <span className="tabular-nums">
                  Created: {new Date(notice.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="type-body p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] text-[#2C2A26] whitespace-pre-wrap select-all">
                {notice.rawContent}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-[#EAE5DC] bg-[#F6F3EC] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                if (notice.status !== 'completed') {
                  confetti({
                    particleCount: 50,
                    spread: 60,
                    origin: { y: 0.7 },
                  });
                }
                onToggleStatus(notice.id);
              }}
              className={`type-button px-3.5 py-2 rounded-full flex items-center gap-1.5 cursor-pointer transition-all ${
                notice.status === 'completed'
                  ? 'bg-white text-[#2C2A26] border border-[#E5E0D5] hover:bg-[#ECE7DF]'
                  : 'bg-[#F97316] hover:bg-[#EA580C] text-white shadow-xs'
              }`}
            >
              {notice.status === 'completed' ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore to Active</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Completed</span>
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'edit' ? 'ai' : 'edit')}
              className="type-button px-3.5 py-2 rounded-full bg-white text-[#1C1B18] hover:bg-[#ECE7DF] border border-[#E5E0D5] flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-[#F97316]" />
              <span>{activeTab === 'edit' ? 'View Breakdown' : 'Edit Notice'}</span>
            </button>

            <button
              onClick={() => onAddCalendarTask(notice)}
              className="type-button px-3.5 py-2 rounded-full bg-white text-[#1C1B18] hover:bg-[#ECE7DF] border border-[#E5E0D5] flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Add to Tasks</span>
            </button>

            {onDeleteNotice && (
              <button
                onClick={() => {
                  onDeleteNotice(notice.id);
                  onClose();
                }}
                className="type-button px-3 py-2 rounded-full bg-white hover:bg-[#FEF2F2] text-[#EF4444] border border-[#E5E0D5] flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Remove notice from workspace"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {notice.portalUrl && (
              <a
                href={notice.portalUrl}
                target="_blank"
                rel="noreferrer"
                className="type-button px-3.5 py-2 rounded-full bg-white hover:bg-[#ECE7DF] text-[#1C1B18] border border-[#E5E0D5] flex items-center gap-1.5 transition-colors"
              >
                <span>Open Portal</span>
                <ExternalLink className="w-3 h-3 text-[#F97316]" />
              </a>
            )}

            <a
              href={generateGoogleCalendarUrl(notice)}
              target="_blank"
              rel="noreferrer"
              className="type-button px-4 py-2 rounded-full bg-[#1C1B18] hover:bg-[#33312C] text-white flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Google Calendar</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
