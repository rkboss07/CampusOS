import React, { useState } from 'react';
import { 
  Sparkles, 
  Calendar as CalendarIcon, 
  Check,
  FileUp,
  Search,
  LayoutGrid,
  Columns3,
  ArrowUpDown,
  Plus,
  Flag,
  Trash2,
  RotateCcw,
  Inbox,
  Pencil,
  GripVertical
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Notice, StudentProfile, Task, DailyBrief } from '../types';
import { getMonthDays } from '../utils/calendarUtils';
import { extractTextFromPdfFile, fileToBase64 } from '../utils/pdfExtractor';

interface DashboardViewProps {
  notices: Notice[];
  tasks: Task[];
  profile: StudentProfile;
  dailyBrief: DailyBrief | null;
  onToggleTask: (taskId: string) => void;
  onToggleNoticeStatus?: (noticeId: string) => void;
  onDeleteNotice?: (noticeId: string) => void;
  onNavigateTab: (tab: string) => void;
  onPrioritizeNotice: (text: string, fileData?: { fileName: string, base64?: string }) => Promise<void>;
  isProcessingNotice: boolean;
  latestProcessedNotice: Notice | null;
  onSelectNotice: (notice: Notice) => void;
  onEditNotice?: (notice: Notice) => void;
  onUpdateNoticeDeadline?: (noticeId: string, newDeadline: string) => void;
  onOpenIngestModal: () => void;
  onOpenProfileModal?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  notices,
  onToggleNoticeStatus,
  onDeleteNotice,
  onNavigateTab,
  onPrioritizeNotice,
  isProcessingNotice,
  latestProcessedNotice,
  onSelectNotice,
  onEditNotice,
  onUpdateNoticeDeadline,
  onOpenIngestModal,
  isDarkMode,
}) => {
  const [viewMode, setViewMode] = useState<'board' | 'cards' | 'calendar'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByScore, setSortByScore] = useState(true);
  const [inputText, setInputText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | undefined>(undefined);
  const [draggedNoticeId, setDraggedNoticeId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const augustDays = getMonthDays(2026, 7);

  const handleQuickSubmit = (sample?: string) => {
    const textToSubmit = sample || inputText;
    if (!textToSubmit.trim() && !selectedFileBase64) return;
    onPrioritizeNotice(
      textToSubmit || `Uploaded PDF Circular: ${selectedFileName}`,
      selectedFileName ? { fileName: selectedFileName, base64: selectedFileBase64 } : undefined
    );
    if (!sample) {
      setInputText('');
      setSelectedFileName(null);
      setSelectedFileBase64(undefined);
    }
  };

  const handleInlinePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    try {
      const [extracted, b64] = await Promise.all([
        extractTextFromPdfFile(file),
        fileToBase64(file),
      ]);
      setSelectedFileBase64(b64);
      setInputText(extracted.text || `Circular notice from: ${file.name}`);
    } catch (err) {
      console.warn('PDF extraction failed:', err);
    }
  };

  const handleCardCheck = (e: React.MouseEvent, notice: Notice) => {
    e.stopPropagation();
    if (notice.status !== 'completed') {
      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.75 }
      });
    }
    onToggleNoticeStatus?.(notice.id);
  };

  const handleDelete = (e: React.MouseEvent, noticeId: string) => {
    e.stopPropagation();
    onDeleteNotice?.(noticeId);
  };

  // Filter & sort notices
  const filteredNotices = notices
    .filter((n) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.requiredAction.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortByScore) return b.priorityScore - a.priorityScore;
      return (a.deadline || '2099').localeCompare(b.deadline || '2099');
    });

  // Partition notices into the 4 thematic columns
  const colExams = filteredNotices.filter(
    (n) => n.category === 'Examination' || n.category === 'General'
  );
  const colFees = filteredNotices.filter(
    (n) => n.category === 'Fee' || n.category === 'Scholarship'
  );
  const colAssignments = filteredNotices.filter(
    (n) => n.category === 'Assignment'
  );
  const colEvents = filteredNotices.filter(
    (n) => n.category === 'Workshop / Event' || n.category === 'Placement'
  );

  const renderFlagChip = (level: string) => {
    if (level === 'Critical' || level === 'High') {
      return (
        <span className="type-caption inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#EAE5DC] bg-[#FAF8F5] text-[#57534E]">
          <Flag className="w-3 h-3 text-[#EF4444] fill-[#EF4444]/15" />
          <span>{level}</span>
        </span>
      );
    }
    if (level === 'Medium') {
      return (
        <span className="type-caption inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#EAE5DC] bg-[#FAF8F5] text-[#57534E]">
          <Flag className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]/15" />
          <span>Medium</span>
        </span>
      );
    }
    return (
      <span className="type-caption inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#EAE5DC] bg-[#FAF8F5] text-[#57534E]">
        <Flag className="w-3 h-3 text-[#10B981] fill-[#10B981]/15" />
        <span>Low</span>
      </span>
    );
  };

  const getFilledSegments = (score: number) => {
    if (score >= 85) return 4;
    if (score >= 65) return 3;
    if (score >= 40) return 2;
    return 1;
  };

  const renderNoticeCard = (notice: Notice) => {
    const isDone = notice.status === 'completed';
    const segments = getFilledSegments(notice.priorityScore);

    return (
      <div
        key={notice.id}
        onClick={() => onSelectNotice(notice)}
        className="bg-white rounded-2xl p-4 space-y-3 transition-all cursor-pointer flex flex-col justify-between border border-[#EAE5DC] hover:border-[#FDBA74] shadow-[0_2px_6px_rgba(28,27,24,0.03)] hover:shadow-[0_6px_18px_rgba(249,115,22,0.08)]"
      >
        <div className="space-y-2.5">
          {/* Top Row: Check Circle + Edit + Delete */}
          <div className="flex items-center justify-between">
            <button
              onClick={(e) => handleCardCheck(e, notice)}
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isDone
                  ? 'bg-[#F97316] text-white'
                  : 'border-2 border-[#D5CFC2] hover:border-[#F97316]'
              }`}
              title={isDone ? 'Restore' : 'Mark as done'}
            >
              {isDone && <Check className="w-3 h-3" strokeWidth={3} />}
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditNotice ? onEditNotice(notice) : onSelectNotice(notice);
                }}
                className="p-1 rounded-lg text-[#8C867B] hover:text-[#1C1B18] hover:bg-[#F6F3EC] transition-colors cursor-pointer"
                title="Edit notice & deadline"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => handleDelete(e, notice.id)}
                className="p-1 rounded-lg text-[#8C867B] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                title="Delete notice"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 1. Heading */}
          <h4 className={`type-section-title ${isDone ? 'line-through text-[#8C867B]' : 'text-[#1C1B18]'}`}>
            {notice.title}
          </h4>

          {/* 2. Priority Score Segmented Bar */}
          <div className="space-y-1">
            <div className="type-caption flex items-center justify-between">
              <span>Priority Score</span>
              <span className="font-semibold text-[#1C1B18] tabular-nums">{notice.priorityScore}/100</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`h-1.5 rounded-full ${
                    bar <= segments ? 'bg-[#F97316]' : 'bg-[#EAE5DC]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          {/* 3. Deadline & Priority Level */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="type-caption inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#EAE5DC] bg-[#FAF8F5] text-[#57534E]">
              <CalendarIcon className="w-3 h-3 text-[#78736A]" />
              <span>{notice.deadline || 'Today'}</span>
            </span>
            {renderFlagChip(notice.priorityLevel)}
          </div>

          {/* 4. Mark as Done, Edit & Delete Buttons */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-[#F2EFE9]">
            <button
              onClick={(e) => handleCardCheck(e, notice)}
              className={`type-button flex-1 py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                isDone
                  ? 'bg-[#F6F3EC] hover:bg-[#ECE7DF] text-[#2C2A26]'
                  : 'bg-[#FDF3EA] hover:bg-[#F97316] text-[#EA580C] hover:text-white'
              }`}
            >
              {isDone ? (
                <>
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                  <span>Mark as Done</span>
                </>
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditNotice ? onEditNotice(notice) : onSelectNotice(notice);
              }}
              className="type-button py-1.5 px-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F6F3EC] text-[#57534E] hover:text-[#1C1B18] border border-[#EAE5DC] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit</span>
            </button>

            <button
              onClick={(e) => handleDelete(e, notice.id)}
              className="type-button py-1.5 px-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FEF2F2] text-[#78736A] hover:text-[#EF4444] border border-[#EAE5DC] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Hero Title + Line-Art Doodle Illustration + Primary Action */}
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <h1 className="type-screen-title text-[#1C1B18]">
            CampusOS Dashboard
          </h1>
          <p className="type-body text-[#78736A] sm:whitespace-nowrap sm:truncate">
            Turn scattered college circulars, notices, and deadlines into prioritized, actionable tasks.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Hand-drawn Paper & Pencil Line-Art Illustration */}
          <div className="hidden xl:block shrink-0 select-none pointer-events-none">
            <svg
              width="320"
              height="80"
              viewBox="0 0 380 92"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#3D3A34]"
            >
              <path
                d="M48 48 C 75 68, 95 24, 118 44 C 135 58, 112 72, 128 38 C 145 12, 175 64, 198 52 C 218 42, 205 25, 224 45 C 245 68, 285 72, 315 56 C 335 45, 322 28, 342 42 C 355 52, 368 38, 378 28"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
              />
              <g transform="translate(12, 6) rotate(-18)">
                <rect x="0" y="0" width="38" height="46" rx="2" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 10 C 12 8, 18 12, 30 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <path d="M6 18 C 14 16, 22 20, 31 17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <path d="M6 26 C 14 24, 20 28, 28 25" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <path d="M6 34 C 12 33, 18 35, 24 33" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </g>
              <g transform="translate(168, 24) rotate(22)">
                <rect x="0" y="0" width="36" height="44" rx="2" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 10 L 28 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <path d="M6 17 C 14 15, 20 19, 28 17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <path d="M6 24 C 14 22, 22 26, 29 24" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <path d="M6 32 L 22 32" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </g>
              <g transform="translate(222, 16) rotate(-32)">
                <rect x="0" y="0" width="14" height="58" rx="1.5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.2" />
                <line x1="4.5" y1="6" x2="4.5" y2="52" stroke="currentColor" strokeWidth="0.9" />
                <line x1="9.5" y1="6" x2="9.5" y2="52" stroke="currentColor" strokeWidth="0.9" />
                <line x1="0" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.1" />
                <path d="M0 58 L 7 72 L 14 58 Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M5 67 L 7 72 L 9 67 Z" fill="currentColor" />
              </g>
              <g transform="translate(284, 56) rotate(8)">
                <rect x="0" y="0" width="26" height="26" rx="2" fill="#FEF3C7" stroke="currentColor" strokeWidth="1.1" />
                <circle cx="13" cy="13" r="6" stroke="currentColor" strokeWidth="0.9" strokeDasharray="2 2" />
              </g>
            </svg>
          </div>

          <button
            onClick={onOpenIngestModal}
            className="type-button px-4 py-2.5 rounded-full bg-[#1C1B18] hover:bg-[#33312C] text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 self-start lg:self-center"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>New notice</span>
          </button>
        </div>
      </div>

      {/* Prominent Centerpiece: Ingest College Notice */}
      <div
        className={`rounded-3xl border-2 p-6 sm:p-7 shadow-[0_10px_30px_rgba(249,115,22,0.07)] space-y-5 transition-colors ${
          isDarkMode
            ? 'bg-[#211710] border-[#F97316]/40'
            : 'bg-[#FFF5EC] border-[#FDBA74]/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#F97316] text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="type-section-title text-[#1C1B18]">
                Ingest College Notice
              </h2>
              <p className="type-body text-[#57534E] mt-0.5">
                Upload an official PDF circular or paste announcement text to extract deadlines, priority score, and action items.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenIngestModal}
            className="type-button px-4 py-2 rounded-xl bg-white hover:bg-[#F6F3EC] text-[#1C1B18] border border-[#E5E0D5] transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
          >
            Open Full Uploader →
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: Spacious Circular Text Input */}
          <div className="lg:col-span-8 flex flex-col">
            <textarea
              rows={3}
              placeholder={
                selectedFileName
                  ? `Extracted from PDF (${selectedFileName}) — review or edit notice text before prioritizing...`
                  : 'Paste college circular, notice text, or WhatsApp announcement here (e.g. All students must submit the semester examination form by 18 August 2026)...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleQuickSubmit();
                }
              }}
              className="type-body w-full flex-1 min-h-[108px] bg-white border border-[#E5E0D5] rounded-2xl p-4 text-[#1C1B18] placeholder-[#9A948A] focus:outline-none focus:border-[#F97316] shadow-2xs resize-none"
            />
          </div>

          {/* Right: Dedicated PDF Dropzone + Large Prioritize CTA */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-3">
            <label className="flex-1 border-2 border-dashed border-[#FDBA74] bg-white hover:bg-[#FFF7ED] rounded-2xl p-3.5 flex items-center justify-center gap-3 cursor-pointer transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#FFF0E5] text-[#F97316] flex items-center justify-center shrink-0">
                <FileUp className="w-4 h-4" />
              </div>
              <div className="min-w-0 text-left">
                <p className="type-button text-[#1C1B18] truncate">
                  {selectedFileName ? selectedFileName : 'Upload PDF Circular'}
                </p>
                <p className="type-caption truncate">
                  {selectedFileName ? 'PDF loaded · Click to change' : 'Browse or drop .pdf file'}
                </p>
              </div>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleInlinePdfUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => handleQuickSubmit()}
              disabled={isProcessingNotice || (!inputText.trim() && !selectedFileBase64)}
              className="type-button w-full py-3 px-5 bg-[#1C1B18] hover:bg-[#33312C] disabled:opacity-40 text-white rounded-2xl flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4 text-[#F97316]" />
              <span>{isProcessingNotice ? 'Analyzing Circular...' : 'Prioritize Notice'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bullet Summary Card (Natural editorial style, no AI labels) */}
      {latestProcessedNotice && (
        <div className="bg-white rounded-2xl border border-[#EAE5DC] p-5 shadow-[0_2px_6px_rgba(28,27,24,0.03)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F2EFE9] pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#F97316] shrink-0" />
              <h2 className="type-section-title text-[#1C1B18] truncate">
                Key Takeaways: {latestProcessedNotice.title}
              </h2>
            </div>
            <div className="type-caption flex items-center gap-2 shrink-0">
              <span>{latestProcessedNotice.category}</span>
              <span>·</span>
              <span className="font-semibold text-[#1C1B18]">
                Due {latestProcessedNotice.deadline || '18 Aug 2026'}
              </span>
              <span>·</span>
              <button
                onClick={() => onSelectNotice(latestProcessedNotice)}
                className="type-button text-[#EA580C] hover:text-[#C2410C] cursor-pointer"
              >
                Full circular →
              </button>
            </div>
          </div>

          <ul className="type-body grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[#2C2A26]">
            <li className="flex items-start gap-2.5">
              <span className="text-[#F97316] font-semibold mt-0.5">•</span>
              <span>
                <strong className="text-[#1C1B18]">Action Required:</strong> {latestProcessedNotice.requiredAction}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#F97316] font-semibold mt-0.5">•</span>
              <span>
                <strong className="text-[#1C1B18]">Applicable To:</strong> {latestProcessedNotice.targetAudience} ({latestProcessedNotice.venue || 'Campus Portal'})
              </span>
            </li>
            {(latestProcessedNotice.keyPoints && latestProcessedNotice.keyPoints.length > 0
              ? latestProcessedNotice.keyPoints.slice(0, 3)
              : [latestProcessedNotice.summary]
            ).map((point, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <span className="text-[#F97316] font-semibold mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
            {latestProcessedNotice.consequencesOfMissing && (
              <li className="flex items-start gap-2.5">
                <span className="text-[#EF4444] font-semibold mt-0.5">•</span>
                <span>
                  <strong className="text-[#1C1B18]">If Missed:</strong> {latestProcessedNotice.consequencesOfMissing}
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* View Switcher Toolbar (Cards / Board / Calendar + Search + Sort) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 bg-[#F6F3EC] rounded-xl border border-[#EAE5DC] self-start">
          <button
            onClick={() => setViewMode('cards')}
            className={`type-button flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'cards'
                ? 'bg-white text-[#1C1B18] shadow-2xs'
                : 'text-[#6E6A63] hover:text-[#1C1B18]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>

          <button
            onClick={() => setViewMode('board')}
            className={`type-button flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'board'
                ? 'bg-white text-[#1C1B18] shadow-2xs'
                : 'text-[#6E6A63] hover:text-[#1C1B18]'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>Board</span>
          </button>

          <button
            onClick={() => setViewMode('calendar')}
            className={`type-button flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'calendar'
                ? 'bg-white text-[#1C1B18] shadow-2xs'
                : 'text-[#6E6A63] hover:text-[#1C1B18]'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>
        </div>

        {/* Right: Search + Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#8C867B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search notice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl pl-8 pr-3 py-2 text-[#1C1B18] placeholder-[#8C867B] focus:outline-none focus:bg-white focus:border-[#D5CFC2]"
            />
          </div>

          <button
            onClick={() => setSortByScore(!sortByScore)}
            className="type-button w-9 h-9 rounded-xl border border-[#E5E0D5] bg-[#FAF8F5] hover:bg-[#F0ECE1] text-[#3D3A34] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={sortByScore ? 'Sorted by Priority Score' : 'Sorted by Deadline'}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* VIEW 1: 4-COLUMN KANBAN BOARD */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {/* COLUMN 1: Examinations & General */}
          <div className="space-y-3">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#FDF3EA] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="type-section-title text-[#1C1B18]">Examinations</span>
                <span className="type-body">📔</span>
                <span className="type-caption font-semibold w-5 h-5 rounded-full bg-[#F97316] text-white flex items-center justify-center tabular-nums">
                  {colExams.length}
                </span>
              </div>
            </div>
            {colExams.map((notice) => renderNoticeCard(notice))}
            <button
              onClick={onOpenIngestModal}
              className="type-button w-full py-2.5 px-3.5 rounded-xl bg-[#F6F3EC] hover:bg-[#ECE7DF] text-[#2C2A26] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#57534E]" />
              <span>Add notice</span>
            </button>
          </div>

          {/* COLUMN 2: Fees & Scholarships */}
          <div className="space-y-3">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#FEF9E7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="type-section-title text-[#1C1B18]">Fees & Grants</span>
                <span className="type-body">🗓️</span>
                <span className="type-caption font-semibold w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center tabular-nums">
                  {colFees.length}
                </span>
              </div>
            </div>
            {colFees.map((notice) => renderNoticeCard(notice))}
            <button
              onClick={onOpenIngestModal}
              className="type-button w-full py-2.5 px-3.5 rounded-xl bg-[#F6F3EC] hover:bg-[#ECE7DF] text-[#2C2A26] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#57534E]" />
              <span>Add notice</span>
            </button>
          </div>

          {/* COLUMN 3: Assignments */}
          <div className="space-y-3">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#FDF0F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="type-section-title text-[#1C1B18]">Assignments</span>
                <span className="type-body">📓</span>
                <span className="type-caption font-semibold w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center tabular-nums">
                  {colAssignments.length}
                </span>
              </div>
            </div>
            {colAssignments.map((notice) => renderNoticeCard(notice))}
            <button
              onClick={onOpenIngestModal}
              className="type-button w-full py-2.5 px-3.5 rounded-xl bg-[#F6F3EC] hover:bg-[#ECE7DF] text-[#2C2A26] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#57534E]" />
              <span>Add notice</span>
            </button>
          </div>

          {/* COLUMN 4: Workshops & Events */}
          <div className="space-y-3">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#FDF4EC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="type-section-title text-[#1C1B18]">Events & Drives</span>
                <span className="type-body">💻</span>
                <span className="type-caption font-semibold w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center tabular-nums">
                  {colEvents.length}
                </span>
              </div>
            </div>
            {colEvents.map((notice) => renderNoticeCard(notice))}
            <button
              onClick={onOpenIngestModal}
              className="type-button w-full py-2.5 px-3.5 rounded-xl bg-[#F6F3EC] hover:bg-[#ECE7DF] text-[#2C2A26] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#57534E]" />
              <span>Add notice</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: CARDS GRID VIEW */}
      {viewMode === 'cards' && (
        filteredNotices.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-[#FFF0E5] text-[#F97316] flex items-center justify-center mx-auto border border-[#FDBA74]/40">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="type-section-title text-[#1C1B18]">No notices in your workspace yet</h3>
            <p className="type-body text-[#78736A] max-w-md mx-auto">
              Upload a PDF circular or paste a notice above to prioritize it and add it to your personal board.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {filteredNotices.map((notice) => renderNoticeCard(notice))}
          </div>
        )
      )}

      {/* VIEW 3: INLINE SMART CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-[#FAF8F5] rounded-2xl border border-[#EAE5DC] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="type-section-title text-[#1C1B18]">
                August 2026 Academic Schedule
              </h2>
              <p className="type-caption">
                Drag any notice from one date to another to change its deadline and recalculate its priority score.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('calendar')}
              className="type-button text-[#EA580C] hover:text-[#C2410C] cursor-pointer"
            >
              Open Full Calendar View →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <div key={day} className="type-caption font-semibold py-1">
                {day}
              </div>
            ))}
            {augustDays.slice(0, 35).map((item, i) => {
              const matchedNotices = notices.filter(
                (n) =>
                  n.deadline === item.dateString ||
                  (!n.deadline && n.eventDate === item.dateString)
              );
              const isDropTarget = dragOverDate === item.dateString;

              return (
                <div
                  key={i}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverDate !== item.dateString) {
                      setDragOverDate(item.dateString);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverDate === item.dateString) {
                      setDragOverDate(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const noticeId = e.dataTransfer.getData('text/plain') || draggedNoticeId;
                    setDraggedNoticeId(null);
                    setDragOverDate(null);
                    if (noticeId) {
                      onUpdateNoticeDeadline?.(noticeId, item.dateString);
                    }
                  }}
                  onClick={() => {
                    if (matchedNotices.length > 0) onSelectNotice(matchedNotices[0]);
                  }}
                  className={`type-caption min-h-[72px] rounded-xl p-2 border flex flex-col justify-between text-left transition-all ${
                    isDropTarget
                      ? 'border-2 border-dashed border-[#F97316] bg-[#FFF0E5] scale-[1.02]'
                      : !item.isCurrentMonth
                      ? 'opacity-35 border-transparent bg-transparent text-[#9A948A]'
                      : matchedNotices.length > 0
                      ? 'bg-[#FFF7ED] border-[#F97316] text-[#9A3412] font-semibold cursor-pointer'
                      : 'border-[#EAE5DC] bg-white text-[#2C2A26]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="tabular-nums">{item.day}</span>
                    {matchedNotices.length > 0 && (
                      <span className="tabular-nums text-[#EA580C]">
                        {matchedNotices[0].priorityScore}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 mt-1">
                    {matchedNotices.map((matchedNotice) => (
                      <div
                        key={matchedNotice.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', matchedNotice.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedNoticeId(matchedNotice.id);
                        }}
                        onDragEnd={() => {
                          setDraggedNoticeId(null);
                          setDragOverDate(null);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNotice(matchedNotice);
                        }}
                        className="type-caption bg-[#F97316] text-white px-1.5 py-0.5 rounded font-semibold truncate flex items-center gap-1 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="w-2.5 h-2.5 shrink-0 opacity-80" />
                        <span className="truncate">{matchedNotice.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
