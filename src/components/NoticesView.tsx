import React, { useState } from 'react';
import { 
  Search, 
  Check, 
  Trash2, 
  Inbox,
  CheckCheck,
  Plus,
  Flag,
  Calendar as CalendarIcon,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Notice } from '../types';

interface NoticesViewProps {
  notices: Notice[];
  onSelectNotice?: (notice: Notice) => void;
  onToggleStatus?: (noticeId: string) => void;
  onDeleteNotice?: (noticeId: string) => void;
  onOpenIngestModal?: () => void;
}

export const NoticesView: React.FC<NoticesViewProps> = ({ 
  notices, 
  onSelectNotice,
  onToggleStatus,
  onDeleteNotice,
  onOpenIngestModal,
}) => {
  const [statusTab, setStatusTab] = useState<'active' | 'completed' | 'all'>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const categories = ['all', 'Examination', 'Assignment', 'Fee', 'Scholarship', 'Placement', 'Workshop / Event'];

  const activeCount = notices.filter(n => n.status !== 'completed').length;
  const completedCount = notices.filter(n => n.status === 'completed').length;
  const totalCount = notices.length;

  const filtered = notices.filter(n => {
    if (statusTab === 'active' && n.status === 'completed') return false;
    if (statusTab === 'completed' && n.status !== 'completed') return false;
    if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.rawContent.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleActionComplete = (e: React.MouseEvent, notice: Notice) => {
    e.stopPropagation();
    if (notice.status !== 'completed') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
    onToggleStatus?.(notice.id);
  };

  const handleDelete = (e: React.MouseEvent, noticeId: string) => {
    e.stopPropagation();
    onDeleteNotice?.(noticeId);
  };

  const getFlagColor = (level: string) => {
    if (level === 'Critical' || level === 'High') return 'text-[#EF4444] fill-[#EF4444]/15';
    if (level === 'Medium') return 'text-[#F59E0B] fill-[#F59E0B]/15';
    return 'text-[#10B981] fill-[#10B981]/15';
  };

  const getFilledSegments = (score: number) => {
    if (score >= 85) return 4;
    if (score >= 65) return 3;
    if (score >= 40) return 2;
    return 1;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE5DC] pb-5">
        <div>
          <h1 className="type-screen-title text-[#1C1B18]">Notices</h1>
          <p className="type-body text-[#78736A] mt-1 max-w-xl">
            Prioritized college circulars and official announcements in card view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Segmented Control */}
          <div className="inline-flex items-center p-1 bg-[#F6F3EC] rounded-xl border border-[#EAE5DC]">
            <button
              onClick={() => setStatusTab('active')}
              className={`type-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusTab === 'active'
                  ? 'bg-white text-[#1C1B18] shadow-2xs'
                  : 'text-[#6E6A63] hover:text-[#1C1B18]'
              }`}
            >
              <span>Active</span>
              <span className={`type-caption font-semibold px-1.5 py-0.2 rounded-full tabular-nums ${
                statusTab === 'active' ? 'bg-[#F97316] text-white' : 'bg-[#EAE4DA] text-[#57534E]'
              }`}>
                {activeCount}
              </span>
            </button>

            <button
              onClick={() => setStatusTab('completed')}
              className={`type-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusTab === 'completed'
                  ? 'bg-white text-[#1C1B18] shadow-2xs'
                  : 'text-[#6E6A63] hover:text-[#1C1B18]'
              }`}
            >
              <span>Completed</span>
              <span className={`type-caption font-semibold px-1.5 py-0.2 rounded-full tabular-nums ${
                statusTab === 'completed' ? 'bg-[#10B981] text-white' : 'bg-[#EAE4DA] text-[#57534E]'
              }`}>
                {completedCount}
              </span>
            </button>

            <button
              onClick={() => setStatusTab('all')}
              className={`type-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusTab === 'all'
                  ? 'bg-white text-[#1C1B18] shadow-2xs'
                  : 'text-[#6E6A63] hover:text-[#1C1B18]'
              }`}
            >
              <span>All</span>
              <span className="type-caption font-semibold px-1.5 py-0.2 rounded-full bg-[#EAE4DA] text-[#57534E] tabular-nums">
                {totalCount}
              </span>
            </button>
          </div>

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

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`type-button px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#1C1B18] text-white shadow-2xs'
                  : 'bg-[#F6F3EC] text-[#57534E] hover:bg-[#ECE7DF] hover:text-[#1C1B18]'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-[#8C867B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search notices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl pl-8 pr-3 py-2 text-[#1C1B18] placeholder-[#8C867B] focus:outline-none focus:bg-white focus:border-[#F97316]"
          />
        </div>
      </div>

      {/* Notices Card Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#FFF0E5] text-[#F97316] flex items-center justify-center mx-auto border border-[#FDBA74]/40">
            {statusTab === 'active' ? (
              <CheckCheck className="w-6 h-6" />
            ) : (
              <Inbox className="w-6 h-6 text-[#78736A]" />
            )}
          </div>
          <div>
            <h3 className="type-section-title text-[#1C1B18]">
              {statusTab === 'active' 
                ? 'All Caught Up!' 
                : statusTab === 'completed'
                ? 'No completed notices yet'
                : 'No notices found'}
            </h3>
            <p className="type-body text-[#78736A] max-w-md mx-auto mt-1">
              {statusTab === 'active' 
                ? 'You have completed all active circulars and deadlines. Switch to the Completed tab to view archived cards.' 
                : statusTab === 'completed'
                ? 'Click "Mark as Done" on any active notice card to complete it.'
                : 'Try modifying your search query or category filter.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {filtered.map((notice) => {
            const isCompleted = notice.status === 'completed';
            const segments = getFilledSegments(notice.priorityScore);

            return (
              <div
                key={notice.id}
                onClick={() => onSelectNotice?.(notice)}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 cursor-pointer group ${
                  isCompleted
                    ? 'bg-[#FAF8F5] border-[#EAE5DC] opacity-75 hover:opacity-100'
                    : 'bg-white border-[#EAE5DC] hover:border-[#F59E0B] shadow-[0_2px_8px_rgba(28,27,24,0.04)] hover:shadow-[0_10px_24px_rgba(245,158,11,0.12)]'
                }`}
              >
                <div className="space-y-3">
                  {/* Card Top Row: Check Circle + Category + Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleActionComplete(e, notice)}
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                          isCompleted
                            ? 'bg-[#F97316] text-white'
                            : 'border-2 border-[#D5CFC2] hover:border-[#F97316]'
                        }`}
                        title={isCompleted ? 'Restore notice' : 'Mark as done'}
                      >
                        {isCompleted && <Check className="w-3 h-3" strokeWidth={3} />}
                      </button>
                      <span className="type-caption font-semibold">
                        {notice.category}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, notice.id)}
                      className="p-1.5 rounded-lg text-[#8C867B] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                      title="Delete notice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 1. Heading */}
                  <h3 className={`type-section-title ${
                    isCompleted ? 'line-through text-[#8C867B]' : 'text-[#1C1B18] group-hover:text-[#EA580C]'
                  }`}>
                    {notice.title}
                  </h3>

                  {/* 2. Priority Score Bar */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="type-caption flex items-center justify-between">
                      <span>Priority Score</span>
                      <span className="font-semibold text-[#1C1B18] tabular-nums">
                        {notice.priorityScore}/100
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 rounded-full ${
                            step <= segments ? 'bg-[#F97316]' : 'bg-[#EAE5DC]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-[#F2EFE9]">
                  {/* 3. Deadline & Priority Level Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="type-caption inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EAE5DC] bg-[#FAF8F5] text-[#57534E]">
                      <CalendarIcon className="w-3 h-3 text-[#78736A]" />
                      <span>{notice.deadline || 'No deadline'}</span>
                    </span>

                    <span className="type-caption inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EAE5DC] bg-[#FAF8F5] text-[#57534E]">
                      <Flag className={`w-3 h-3 ${getFlagColor(notice.priorityLevel)}`} />
                      <span>{notice.priorityLevel}</span>
                    </span>
                  </div>

                  {/* 4. Action Buttons: Mark as Done + Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => handleActionComplete(e, notice)}
                      className={`type-button flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isCompleted
                          ? 'bg-[#F6F3EC] hover:bg-[#ECE7DF] text-[#2C2A26]'
                          : 'bg-[#FDF3EA] hover:bg-[#F97316] text-[#EA580C] hover:text-white border border-[#FDBA74]/50'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Undo</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                          <span>Mark as Done</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={(e) => handleDelete(e, notice.id)}
                      className="type-button py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#FEF2F2] text-[#78736A] hover:text-[#EF4444] border border-[#EAE5DC] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
