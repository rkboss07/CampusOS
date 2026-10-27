import React from 'react';
import { Calendar as CalendarIcon, Download, Flag, Check, Plus } from 'lucide-react';
import { Notice } from '../types';
import { getMonthDays, downloadIcsFile } from '../utils/calendarUtils';

interface CalendarViewProps {
  notices: Notice[];
  onSelectNotice?: (notice: Notice) => void;
  onOpenIngestModal?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  notices,
  onSelectNotice,
  onOpenIngestModal,
}) => {
  const augustDays = getMonthDays(2026, 7); // August 2026

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE5DC] pb-5">
        <div>
          <h1 className="type-screen-title text-[#1C1B18]">Smart Academic Calendar</h1>
          <p className="type-body text-[#78736A] mt-1.5">
            All extracted circular deadlines and campus workshops synchronized to your August 2026 schedule.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => downloadIcsFile(notices)}
            className="type-button px-3.5 py-2 rounded-full bg-[#F6F3EC] hover:bg-[#ECE7DF] text-[#1C1B18] border border-[#E5E0D5] flex items-center gap-1.5 transition-colors cursor-pointer"
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

      {/* Academic Term Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: AUGUST 2026 Month Grid */}
        <div className="lg:col-span-7 bg-[#FAF8F5] rounded-2xl border border-[#EAE5DC] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="type-body">🗓️</span>
              <h3 className="type-section-title text-[#1C1B18]">
                August 2026
              </h3>
            </div>
            <span className="type-caption">Odd Semester Term</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <div key={day} className="type-caption font-semibold py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {augustDays.slice(0, 35).map((item, index) => {
              const is18 = item.dateString === '2026-08-18';
              const is21 = item.dateString === '2026-08-21';
              const is24 = item.dateString === '2026-08-24';
              const is30 = item.dateString === '2026-08-30';

              return (
                <div
                  key={index}
                  onClick={() => {
                    const matched = notices.find(
                      (n) => n.deadline === item.dateString || n.eventDate === item.dateString
                    );
                    if (matched && onSelectNotice) onSelectNotice(matched);
                  }}
                  className={`min-h-[64px] p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    is18 || is21 || is24 || is30 ? 'cursor-pointer hover:scale-[1.02]' : ''
                  } ${
                    !item.isCurrentMonth
                      ? 'opacity-35 border-transparent bg-transparent text-[#9A948A]'
                      : is18
                      ? 'bg-[#FEF2F2] border-[#EF4444] text-[#991B1B] font-semibold shadow-2xs'
                      : is21
                      ? 'bg-[#FFF7ED] border-[#F97316] text-[#9A3412] font-semibold'
                      : is24
                      ? 'bg-[#FEF9E7] border-[#F59E0B] text-[#92400E] font-semibold'
                      : is30
                      ? 'bg-[#ECFDF5] border-[#10B981] text-[#065F46] font-semibold'
                      : 'border-[#EAE5DC] bg-white text-[#2C2A26]'
                  }`}
                >
                  <span className="type-caption font-semibold tabular-nums">{item.day}</span>
                  {is18 && <span className="type-caption bg-[#EF4444] text-white px-1.5 py-0.5 rounded font-semibold text-center truncate">EXAM</span>}
                  {is21 && <span className="type-caption bg-[#F97316] text-white px-1.5 py-0.5 rounded font-semibold text-center truncate">WORKSHOP</span>}
                  {is24 && <span className="type-caption bg-[#F59E0B] text-white px-1.5 py-0.5 rounded font-semibold text-center truncate">DBMS</span>}
                  {is30 && <span className="type-caption bg-[#10B981] text-white px-1.5 py-0.5 rounded font-semibold text-center truncate">FEES</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Priority Action Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#FDF3EA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="type-section-title text-[#1C1B18]">Priority Deadlines</span>
              <span className="type-body">📌</span>
              <span className="type-caption font-semibold w-5 h-5 rounded-full bg-[#F97316] text-white flex items-center justify-center tabular-nums">
                {notices.length}
              </span>
            </div>
          </div>

          {notices.slice(0, 4).map((notice) => {
            const isDone = notice.status === 'completed';
            return (
              <div
                key={notice.id}
                onClick={() => onSelectNotice?.(notice)}
                className="bg-white border border-[#EAE5DC] hover:border-[#F59E0B] rounded-2xl p-4 space-y-2 shadow-[0_2px_8px_rgba(28,27,24,0.03)] cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      isDone ? 'bg-[#F97316] text-white' : 'border-2 border-[#D5CFC2]'
                    }`}>
                      {isDone && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                    </span>
                    <span className="type-caption font-semibold text-[#EA580C]">
                      {notice.deadline || 'August 2026'}
                    </span>
                  </div>
                  <span className="type-caption font-semibold px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#92400E] tabular-nums">
                    {notice.priorityScore}/100
                  </span>
                </div>

                <h4 className="type-section-title text-[#1C1B18]">
                  {notice.title}
                </h4>

                <p className="type-body text-[#78736A] line-clamp-2">
                  {notice.requiredAction}
                </p>

                <div className="pt-1 flex items-center gap-2">
                  <span className="type-caption inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#EAE5DC] bg-[#FAF8F5] text-[#57534E]">
                    <CalendarIcon className="w-3 h-3 text-[#78736A]" />
                    <span>{notice.category}</span>
                  </span>
                  <span className="type-caption inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#EAE5DC] bg-[#FAF8F5] text-[#57534E]">
                    <Flag className="w-3 h-3 text-[#EF4444]" />
                    <span>{notice.priorityLevel}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
