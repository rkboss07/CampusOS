import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Download,
  Flag,
  Check,
  Plus,
  Inbox,
  GripVertical,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Notice } from '../types';
import { getMonthDays, downloadIcsFile } from '../utils/calendarUtils';

interface CalendarViewProps {
  notices: Notice[];
  onSelectNotice?: (notice: Notice) => void;
  onEditNotice?: (notice: Notice) => void;
  onUpdateNoticeDeadline?: (noticeId: string, newDeadline: string) => void;
  onOpenIngestModal?: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  notices,
  onSelectNotice,
  onEditNotice,
  onUpdateNoticeDeadline,
  onOpenIngestModal,
}) => {
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonth, setViewMonth] = useState<number>(7); // 7 = August
  const [draggedNoticeId, setDraggedNoticeId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [lastMoveBanner, setLastMoveBanner] = useState<{
    title: string;
    fromDate: string;
    toDate: string;
  } | null>(null);

  const monthDays = getMonthDays(viewYear, viewMonth);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDragStart = (e: React.DragEvent, notice: Notice) => {
    e.dataTransfer.setData('text/plain', notice.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNoticeId(notice.id);
  };

  const handleDragEnd = () => {
    setDraggedNoticeId(null);
    setDragOverDate(null);
  };

  const handleDropOnDate = (e: React.DragEvent, targetDateString: string) => {
    e.preventDefault();
    const noticeId = e.dataTransfer.getData('text/plain') || draggedNoticeId;
    setDraggedNoticeId(null);
    setDragOverDate(null);

    if (!noticeId) return;
    const targetNotice = notices.find((n) => n.id === noticeId);
    if (!targetNotice) return;

    const oldDate = targetNotice.deadline || targetNotice.eventDate || 'Unscheduled';
    if (oldDate === targetDateString) return;

    onUpdateNoticeDeadline?.(noticeId, targetDateString);
    setLastMoveBanner({
      title: targetNotice.title,
      fromDate: oldDate,
      toDate: targetDateString,
    });
  };

  const latestMovedNotice = lastMoveBanner
    ? notices.find((n) => n.title === lastMoveBanner.title)
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE5DC] pb-5">
        <div>
          <h1 className="type-screen-title text-[#1C1B18]">Smart Academic Calendar</h1>
          <p className="type-body text-[#78736A] mt-1.5">
            Drag any notice from one date to another to reschedule its deadline and automatically recalculate its priority score.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => downloadIcsFile(notices)}
            disabled={notices.length === 0}
            className="type-button px-3.5 py-2 rounded-full bg-[#F6F3EC] hover:bg-[#ECE7DF] disabled:opacity-40 text-[#1C1B18] border border-[#E5E0D5] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#57534E]" />
            <span>Export .ICS</span>
          </button>
          {onOpenIngestModal && (
            <button
              onClick={onOpenIngestModal}
              className="type-button px-4 py-2 rounded-full bg-[#1C1B18] hover:bg-[#33312C] text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>New notice</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Feedback Banner when a notice is dragged to a new date */}
      {lastMoveBanner && (
        <div className="p-3.5 px-4 rounded-2xl bg-[#FFF7ED] border border-[#FDBA74] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#F97316] shrink-0" />
            <p className="type-body text-[#1C1B18]">
              Rescheduled <strong>{lastMoveBanner.title}</strong> from{' '}
              <span className="tabular-nums text-[#78736A]">{lastMoveBanner.fromDate}</span> to{' '}
              <strong className="tabular-nums text-[#EA580C]">{lastMoveBanner.toDate}</strong>
              {latestMovedNotice && (
                <span>
                  {' '}
                  · Updated Priority Score:{' '}
                  <strong className="tabular-nums text-[#1C1B18]">
                    {latestMovedNotice.priorityScore}/100 ({latestMovedNotice.priorityLevel})
                  </strong>
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setLastMoveBanner(null)}
            className="type-caption text-[#78736A] hover:text-[#1C1B18] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Academic Term Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Drag-and-Drop Month Grid */}
        <div className="lg:col-span-7 bg-[#FAF8F5] rounded-2xl border border-[#EAE5DC] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="type-section-title text-[#1C1B18]">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h3>
              <span className="type-caption text-[#78736A]">
                · Drag notices between dates
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-white hover:bg-[#ECE7DF] border border-[#EAE5DC] text-[#1C1B18] cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setViewYear(2026);
                  setViewMonth(7);
                }}
                className="type-caption font-semibold px-2.5 py-1 rounded-lg bg-white hover:bg-[#ECE7DF] border border-[#EAE5DC] text-[#1C1B18] cursor-pointer"
              >
                Aug 2026
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-white hover:bg-[#ECE7DF] border border-[#EAE5DC] text-[#1C1B18] cursor-pointer"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <div key={day} className="type-caption font-semibold py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {monthDays.slice(0, 35).map((item, index) => {
              const matchedNotices = notices.filter(
                (n) =>
                  n.deadline === item.dateString ||
                  (!n.deadline && n.eventDate === item.dateString)
              );
              const isDropTarget = dragOverDate === item.dateString;

              return (
                <div
                  key={index}
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
                  onDrop={(e) => handleDropOnDate(e, item.dateString)}
                  onClick={() => {
                    if (matchedNotices.length > 0 && onSelectNotice) {
                      onSelectNotice(matchedNotices[0]);
                    }
                  }}
                  className={`min-h-[76px] p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isDropTarget
                      ? 'border-2 border-dashed border-[#F97316] bg-[#FFF0E5] scale-[1.02]'
                      : !item.isCurrentMonth
                      ? 'opacity-40 border-[#EAE5DC]/60 bg-transparent text-[#9A948A]'
                      : matchedNotices.length > 0
                      ? 'bg-[#FFF7ED] border-[#F97316] text-[#9A3412] font-semibold shadow-2xs cursor-pointer'
                      : 'border-[#EAE5DC] bg-white text-[#2C2A26] hover:border-[#D5CFC2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="type-caption font-semibold tabular-nums">
                      {item.day}
                    </span>
                    {matchedNotices.length > 0 && (
                      <span className="type-caption tabular-nums text-[#EA580C]">
                        {matchedNotices[0].priorityScore}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1">
                    {matchedNotices.map((matched) => (
                      <div
                        key={matched.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, matched)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNotice?.(matched);
                        }}
                        title={`Drag to another date to change deadline · ${matched.title} (${matched.priorityScore}/100)`}
                        className={`type-caption bg-[#F97316] hover:bg-[#EA580C] text-white px-1.5 py-0.5 rounded font-semibold truncate flex items-center gap-1 cursor-grab active:cursor-grabbing transition-opacity ${
                          draggedNoticeId === matched.id ? 'opacity-40' : ''
                        }`}
                      >
                        <GripVertical className="w-2.5 h-2.5 shrink-0 opacity-80" />
                        <span className="truncate">{matched.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Priority Action Cards (Also Draggable onto Calendar Dates!) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#FDF3EA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="type-section-title text-[#1C1B18]">Priority Deadlines</span>
              <span className="type-caption font-semibold w-5 h-5 rounded-full bg-[#F97316] text-white flex items-center justify-center tabular-nums">
                {notices.length}
              </span>
            </div>
            <span className="type-caption text-[#78736A]">
              Drag card to calendar to reschedule
            </span>
          </div>

          {notices.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#FFF0E5] text-[#F97316] flex items-center justify-center mx-auto border border-[#FDBA74]/40">
                <Inbox className="w-5 h-5" />
              </div>
              <h4 className="type-section-title text-[#1C1B18]">No scheduled deadlines yet</h4>
              <p className="type-body text-[#78736A]">
                Upload a college notice or circular to automatically plot deadlines on your calendar.
              </p>
            </div>
          ) : (
            notices.map((notice) => {
              const isDone = notice.status === 'completed';
              return (
                <div
                  key={notice.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, notice)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectNotice?.(notice)}
                  className={`bg-white border border-[#EAE5DC] hover:border-[#F59E0B] rounded-2xl p-4 space-y-2 shadow-[0_2px_8px_rgba(28,27,24,0.03)] cursor-grab active:cursor-grabbing transition-all ${
                    draggedNoticeId === notice.id ? 'opacity-40 scale-98' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-[#8C867B] shrink-0" />
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          isDone
                            ? 'bg-[#F97316] text-white'
                            : 'border-2 border-[#D5CFC2]'
                        }`}
                      >
                        {isDone && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                      </span>
                      <span className="type-caption font-semibold text-[#EA580C] tabular-nums">
                        {notice.deadline || '2026-08-18'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="type-caption font-semibold px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#92400E] tabular-nums">
                        {notice.priorityScore}/100
                      </span>
                      {onEditNotice && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditNotice(notice);
                          }}
                          className="p-1.5 rounded-lg text-[#78736A] hover:text-[#1C1B18] hover:bg-[#F6F3EC] transition-colors cursor-pointer"
                          title="Edit notice & deadline"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="type-section-title text-[#1C1B18]">{notice.title}</h4>

                  <p className="type-body text-[#78736A] line-clamp-2">
                    {notice.requiredAction}
                  </p>

                  <div className="pt-1 flex items-center gap-2 text-[#57534E] type-caption">
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3 text-[#78736A]" />
                      <span>{notice.category}</span>
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Flag className="w-3 h-3 text-[#EF4444]" />
                      <span>{notice.priorityLevel}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
