import React, { useState } from 'react';
import { Check, Plus, Calendar as CalendarIcon, Flag, MoreHorizontal } from 'lucide-react';
import { Task } from '../types';

interface TasksViewProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, dueDate: string) => void;
  onOpenIngestModal?: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
  onOpenIngestModal,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('2026-08-18');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask(newTitle.trim(), newDate);
    setNewTitle('');
  };

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  const renderFlagChip = (level: string) => {
    const color =
      level === 'Critical' || level === 'High'
        ? 'text-[#EF4444] fill-[#EF4444]/15'
        : level === 'Medium'
        ? 'text-[#F59E0B] fill-[#F59E0B]/15'
        : 'text-[#10B981] fill-[#10B981]/15';
    return (
      <span className="type-caption inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#EAE5DC] bg-[#FAF8F5] text-[#57534E]">
        <Flag className={`w-3 h-3 ${color}`} />
        <span>{level}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE5DC] pb-5">
        <div>
          <h1 className="type-screen-title text-[#1C1B18]">Personal Task Management</h1>
          <p className="type-body text-[#78736A] mt-1.5">
            Actionable academic deliverables extracted from college circulars with progress tracking.
          </p>
        </div>

        {onOpenIngestModal && (
          <button
            onClick={onOpenIngestModal}
            className="type-button px-4 py-2 rounded-full bg-[#1C1B18] hover:bg-[#33312C] text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>New notice</span>
          </button>
        )}
      </div>

      {/* Add Task Bar */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2.5 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EAE5DC]">
        <input
          type="text"
          placeholder="Add a new college task (e.g. Get exam form stamped at department office)..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="type-body flex-1 bg-white border border-[#E5E0D5] rounded-xl px-3.5 py-2 text-[#1C1B18] placeholder-[#8C867B] focus:outline-none focus:border-[#F97316]"
        />
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="type-caption bg-white border border-[#E5E0D5] rounded-xl px-3 py-2 text-[#1C1B18] focus:outline-none cursor-pointer"
        />
        <button
          type="submit"
          className="type-button px-4 py-2 bg-[#1C1B18] hover:bg-[#33312C] text-white rounded-xl shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add task</span>
        </button>
      </form>

      {/* Two-Column Kanban Task Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Pending Column */}
        <div className="space-y-3">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#FDF3EA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="type-section-title text-[#1C1B18]">To Do & In Progress</span>
              <span className="type-body">🗓️</span>
              <span className="type-caption font-semibold w-5 h-5 rounded-full bg-[#F97316] text-white flex items-center justify-center tabular-nums">
                {pendingTasks.length}
              </span>
            </div>
            <MoreHorizontal className="w-4 h-4 text-[#57534E]" />
          </div>

          {pendingTasks.length === 0 ? (
            <div className="type-body p-8 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] text-center text-[#78736A]">
              No pending tasks yet. Add a task above or upload a college notice to generate deliverables.
            </div>
          ) : (
            pendingTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onToggleTask(task.id)}
              className="p-4 rounded-2xl bg-white border border-[#EAE5DC] hover:border-[#F59E0B] shadow-[0_2px_8px_rgba(28,27,24,0.03)] space-y-3 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="w-5 h-5 rounded-full border-2 border-[#D5CFC2] hover:border-[#F97316] transition-colors" />
                <span className="type-caption font-semibold">{task.category}</span>
              </div>

              <p className="type-section-title text-[#1C1B18]">
                {task.title}
              </p>

              {/* Subtask Bar */}
              <div className="space-y-1.5">
                <div className="type-caption flex items-center justify-between">
                  <span>Subtask</span>
                  <span className="tabular-nums">2/4</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="h-1.5 rounded-full bg-[#F97316]" />
                  <div className="h-1.5 rounded-full bg-[#F97316]" />
                  <div className="h-1.5 rounded-full bg-[#EAE5DC]" />
                  <div className="h-1.5 rounded-full bg-[#EAE5DC]" />
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="type-caption inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#EAE5DC] bg-[#FAF8F5] text-[#57534E]">
                    <CalendarIcon className="w-3 h-3 text-[#78736A]" />
                    <span>{task.dueDate}</span>
                  </span>
                  {renderFlagChip(task.priority)}
                </div>

                <span className="type-button text-[#EA580C]">
                  Complete →
                </span>
              </div>
            </div>
          )))}
        </div>

        {/* Completed Column */}
        <div className="space-y-3">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#FEF9E7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="type-section-title text-[#1C1B18]">Completed Deliverables</span>
              <span className="type-body">✅</span>
              <span className="type-caption font-semibold w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center tabular-nums">
                {completedTasks.length}
              </span>
            </div>
            <MoreHorizontal className="w-4 h-4 text-[#57534E]" />
          </div>

          {completedTasks.length === 0 ? (
            <div className="type-body p-8 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] text-center text-[#78736A]">
              Click any task on the left to mark it completed.
            </div>
          ) : (
            completedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] space-y-2.5 transition-all cursor-pointer opacity-80 hover:opacity-100"
              >
                <div className="flex items-center justify-between">
                  <span className="w-5 h-5 rounded-full bg-[#F97316] text-white flex items-center justify-center">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  <span className="type-caption">Undo</span>
                </div>

                <p className="type-section-title text-[#78736A] line-through">
                  {task.title}
                </p>

                <div className="grid grid-cols-4 gap-1.5">
                  <div className="h-1.5 rounded-full bg-[#F97316]" />
                  <div className="h-1.5 rounded-full bg-[#F97316]" />
                  <div className="h-1.5 rounded-full bg-[#F97316]" />
                  <div className="h-1.5 rounded-full bg-[#F97316]" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
