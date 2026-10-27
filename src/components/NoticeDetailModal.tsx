import React, { useState } from 'react';
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
  Flag
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Notice, StudentProfile } from '../types';
import { generateGoogleCalendarUrl } from '../utils/calendarUtils';

interface NoticeDetailModalProps {
  notice: Notice | null;
  profile: StudentProfile;
  onClose: () => void;
  onToggleStatus: (noticeId: string) => void;
  onAddCalendarTask: (notice: Notice) => void;
  onDeleteNotice?: (noticeId: string) => void;
}

export const NoticeDetailModal: React.FC<NoticeDetailModalProps> = ({
  notice,
  profile,
  onClose,
  onToggleStatus,
  onAddCalendarTask,
  onDeleteNotice,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'raw'>('ai');

  if (!notice) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${notice.title}\nDeadline: ${notice.deadline}\nAction: ${notice.requiredAction}\nPriority: ${notice.priorityScore}/100\n\n${notice.rawContent}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#F97316] border border-[#FDBA74]/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="type-caption font-semibold inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-[#EAE5DC] bg-white text-[#1C1B18] tabular-nums">
                <Flag className="w-3 h-3 text-[#EF4444] fill-[#EF4444]/15" />
                <span>{notice.priorityScore}/100 · {notice.priorityLevel}</span>
              </span>
              <span className="type-caption px-2.5 py-0.5 rounded-lg bg-white text-[#57534E] border border-[#EAE5DC]">
                {notice.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="type-button p-2 rounded-xl text-[#57534E] hover:text-[#1C1B18] hover:bg-[#EAE4DA] transition-colors cursor-pointer"
              title="Copy Summary"
            >
              {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="type-button p-2 rounded-xl text-[#57534E] hover:text-[#1C1B18] hover:bg-[#EAE4DA] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switch between AI Breakdown and Original Document */}
        <div className="px-6 pt-3 pb-2 border-b border-[#EAE5DC] flex items-center gap-6 bg-[#FAF8F5]">
          <button
            onClick={() => setActiveTab('ai')}
            className={`type-button pb-2 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'ai' 
                ? 'border-[#F97316] text-[#1C1B18]' 
                : 'border-transparent text-[#78736A] hover:text-[#1C1B18]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Information Extraction & Priority Matrix</span>
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`type-button pb-2 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'raw' 
                ? 'border-[#F97316] text-[#1C1B18]' 
                : 'border-transparent text-[#78736A] hover:text-[#1C1B18]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#78736A]" />
            <span>Original College Notice / Memo</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          {activeTab === 'ai' ? (
            <>
              {/* Notice Title & Executive Summary */}
              <div>
                <h3 className="type-section-title text-[#1C1B18]">
                  {notice.title}
                </h3>
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
                      <span className="type-section-title text-[#10B981] tabular-nums">{notice.studentRelevance}%</span>
                      <div className="w-12 h-1.5 bg-[#EAE5DC] rounded-full overflow-hidden">
                        <div className="h-full bg-[#10B981]" style={{ width: `${notice.studentRelevance}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#EAE5DC]">
                    <span className="type-caption">Urgency</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="type-section-title text-[#F59E0B] tabular-nums">{notice.urgency}%</span>
                      <div className="w-12 h-1.5 bg-[#EAE5DC] rounded-full overflow-hidden">
                        <div className="h-full bg-[#F59E0B]" style={{ width: `${notice.urgency}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#EAE5DC]">
                    <span className="type-caption">Importance</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="type-section-title text-[#F97316] tabular-nums">{notice.importance}%</span>
                      <div className="w-12 h-1.5 bg-[#EAE5DC] rounded-full overflow-hidden">
                        <div className="h-full bg-[#F97316]" style={{ width: `${notice.importance}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#EAE5DC]">
                    <span className="type-caption">Final Verdict</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="type-section-title text-[#1C1B18]">{notice.priorityLevel}</span>
                      <Flag className="w-3.5 h-3.5 text-[#EF4444]" />
                    </div>
                  </div>
                </div>

                <p className="type-body text-[#57534E]">
                  {notice.priorityReason}
                </p>
              </div>

              {/* Extracted Information Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] space-y-1">
                  <span className="type-caption font-semibold">Category & Target</span>
                  <p className="type-section-title text-[#1C1B18]">{notice.category}</p>
                  <p className="type-caption text-[#57534E]">{notice.targetAudience}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] space-y-1">
                  <span className="type-caption font-semibold text-[#EA580C]">Deadline / Timing</span>
                  <p className="type-section-title text-[#1C1B18] tabular-nums">{notice.deadline || 'No fixed deadline'}</p>
                  <p className="type-caption">{notice.deadlineTime || notice.eventTime || 'By end of college hours'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] space-y-1 md:col-span-2">
                  <span className="type-caption font-semibold">Required Action for Student</span>
                  <p className="type-section-title text-[#1C1B18]">{notice.requiredAction}</p>
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
                  <h4 className="type-section-title text-[#1C1B18]">Essential Highlights</h4>
                  <ul className="space-y-1.5">
                    {notice.keyPoints.map((pt, i) => (
                      <li key={i} className="type-body text-[#2C2A26] flex items-start gap-2.5 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EAE5DC]">
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
          ) : (
            /* Original Notice Text */
            <div className="space-y-3">
              <div className="type-caption flex items-center justify-between">
                <span>Source: {notice.sourceFileName || 'Direct Paste / OCR Extract'}</span>
                <span className="tabular-nums">Created: {new Date(notice.createdAt).toLocaleDateString()}</span>
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
                    origin: { y: 0.7 }
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
