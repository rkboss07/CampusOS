import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Clock, ShieldCheck, Zap } from 'lucide-react';
import { Notice, Task } from '../types';

interface AnalyticsViewProps {
  notices: Notice[];
  tasks: Task[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  notices,
  tasks,
}) => {
  const critical = notices.filter(n => n.priorityLevel === 'Critical');
  const high = notices.filter(n => n.priorityLevel === 'High');
  const medium = notices.filter(n => n.priorityLevel === 'Medium');
  const low = notices.filter(n => n.priorityLevel === 'Low');

  const completedTasks = tasks.filter(t => t.completed);
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 100;

  // Category counts
  const categoryCounts: Record<string, number> = {};
  notices.forEach(n => {
    categoryCounts[n.category] = (categoryCounts[n.category] || 0) + 1;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-[#171922] p-5 rounded-xl border border-[#262936] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Workload & Notice Analytics</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Tracking deadline adherence, noise reduction, and priority score distributions.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
          Zero Missed Deadlines Target
        </span>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#171922] border border-[#262936] space-y-1">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Time Saved Weekly</span>
          </span>
          <p className="text-2xl font-bold text-white">~3.8 hrs</p>
          <p className="text-[11px] text-emerald-400">Filtered 76% irrelevant circular noise</p>
        </div>

        <div className="p-4 rounded-xl bg-[#171922] border border-[#262936] space-y-1">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Deadline Completion</span>
          </span>
          <p className="text-2xl font-bold text-white">{completionRate}%</p>
          <p className="text-[11px] text-gray-400">{completedTasks.length} of {tasks.length} actions logged</p>
        </div>

        <div className="p-4 rounded-xl bg-[#171922] border border-[#262936] space-y-1">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Critical Alerts</span>
          </span>
          <p className="text-2xl font-bold text-rose-400">{critical.length}</p>
          <p className="text-[11px] text-rose-300">Exam form & fee dues requiring immediate action</p>
        </div>

        <div className="p-4 rounded-xl bg-[#171922] border border-[#262936] space-y-1">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Prioritization Accuracy</span>
          </span>
          <p className="text-2xl font-bold text-indigo-300">96.4%</p>
          <p className="text-[11px] text-gray-400">NLP category & date precision</p>
        </div>
      </div>

      {/* Priority Distribution & Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priority Engine Distribution */}
        <div className="bg-[#171922] p-5 rounded-xl border border-[#262936] space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            AI Priority Tier Distribution
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-rose-400 font-semibold">🔴 Critical (Score &gt;= 80)</span>
                <span className="text-white font-bold">{critical.length} ({Math.round(critical.length / notices.length * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-[#252838] rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(critical.length / notices.length) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-400 font-semibold">🟠 High (Score 65–79)</span>
                <span className="text-white font-bold">{high.length} ({Math.round(high.length / notices.length * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-[#252838] rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(high.length / notices.length) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-400 font-semibold">🟡 Medium (Score 40–64)</span>
                <span className="text-white font-bold">{medium.length} ({Math.round(medium.length / notices.length * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-[#252838] rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(medium.length / notices.length) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400 font-semibold">🟢 Low (Score &lt; 40)</span>
                <span className="text-white font-bold">{low.length} ({Math.round(low.length / notices.length * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-[#252838] rounded-full overflow-hidden">
                <div className="h-full bg-gray-500 rounded-full" style={{ width: `${(low.length / notices.length) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Categories Distribution */}
        <div className="bg-[#171922] p-5 rounded-xl border border-[#262936] space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Notice Classification Breakdown
          </h3>

          <div className="space-y-2.5">
            {Object.entries(categoryCounts).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between p-2.5 rounded-lg bg-[#1f2230] border border-[#2a2e40] text-xs">
                <span className="text-gray-200 font-medium">{cat}</span>
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-[#292d3e] text-indigo-300">
                  {count} circular{count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
