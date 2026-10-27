/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { NoticesView } from './components/NoticesView';
import { CalendarView } from './components/CalendarView';
import { TasksView } from './components/TasksView';
import { ProfileModal } from './components/ProfileModal';
import { NoticeIngestModal } from './components/NoticeIngestModal';
import { NoticeDetailModal } from './components/NoticeDetailModal';
import { sampleNotices, sampleTasks, defaultStudentProfile } from './data/initialData';
import { Notice, Task, StudentProfile, DailyBrief } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('campusos_theme') === 'dark';
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [isProcessingNotice, setIsProcessingNotice] = useState<boolean>(false);

  // App Data with local storage persistence
  const [profile, setProfile] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem('campusos_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return defaultStudentProfile;
  });

  const [notices, setNotices] = useState<Notice[]>(() => {
    const saved = localStorage.getItem('campusos_notices');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return sampleNotices;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('campusos_tasks');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return sampleTasks;
  });

  // Currently inspected notice
  const [latestProcessedNotice, setLatestProcessedNotice] = useState<Notice | null>(sampleNotices[0]);
  const [dailyBrief, setDailyBrief] = useState<DailyBrief | null>(null);

  // Persist theme & state
  useEffect(() => {
    localStorage.setItem('campusos_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('campusos_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('campusos_notices', JSON.stringify(notices));
  }, [notices]);

  useEffect(() => {
    localStorage.setItem('campusos_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Load Daily Brief
  const fetchDailyBrief = async () => {
    try {
      const res = await fetch('/api/daily-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notices,
          tasks,
          studentProfile: profile,
          currentDate: '2026-08-18'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDailyBrief(data);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchDailyBrief();
  }, [profile.branch, profile.year]);

  // Prioritize notice handler
  const handlePrioritizeNotice = async (text: string, fileData?: { fileName: string, base64?: string }) => {
    setIsProcessingNotice(true);
    try {
      const res = await fetch('/api/analyze-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noticeText: text,
          mediaBase64: fileData?.base64,
          mimeType: 'application/pdf',
          studentProfile: profile,
        }),
      });

      const data = await res.json();
      const result = data.result;

      const newNotice: Notice = {
        id: `notice-${Date.now()}`,
        title: result.title || 'Official Academic Notice',
        rawContent: text,
        category: result.category || 'General',
        targetAudience: result.targetAudience || 'All Students',
        targetBranch: result.targetBranch || profile.branch,
        targetYear: result.targetYear || profile.year,
        deadline: result.deadline || '2026-08-18',
        deadlineTime: result.deadlineTime || '5:00 PM',
        eventDate: result.eventDate || result.deadline || null,
        eventTime: result.eventTime || null,
        venue: result.venue || 'College Campus',
        requiredAction: result.requiredAction || 'Review details',
        actionType: result.actionType || 'portal_action',
        portalUrl: result.portalUrl || null,
        importance: result.importance ?? 90,
        urgency: result.urgency ?? 90,
        studentRelevance: result.studentRelevance ?? 95,
        priorityScore: result.priorityScore ?? 94,
        priorityLevel: result.priorityLevel || 'Critical',
        priorityReason: result.priorityReason || 'High priority score based on immediate deadline proximity and branch alignment.',
        summary: result.summary || text.slice(0, 140),
        keyPoints: result.keyPoints || [],
        consequencesOfMissing: result.consequencesOfMissing || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        source: fileData ? 'pdf' : 'text',
        sourceFileName: fileData?.fileName,
      };

      setNotices(prev => [newNotice, ...prev]);
      setLatestProcessedNotice(newNotice);

      // Add to task board automatically
      setTasks(prev => [
        {
          id: `task-${Date.now()}`,
          noticeId: newNotice.id,
          title: newNotice.requiredAction,
          dueDate: newNotice.deadline || '2026-08-18',
          priority: newNotice.priorityLevel,
          category: newNotice.category,
          completed: false,
          estimatedMinutes: 20
        },
        ...prev
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingNotice(false);
    }
  };

  // Toggle task completed (syncs with corresponding notice)
  const handleToggleTask = (taskId: string) => {
    setTasks(prev => {
      let linkedNoticeId: string | undefined;
      let newCompletedState = false;

      const updated = prev.map(t => {
        if (t.id === taskId) {
          newCompletedState = !t.completed;
          linkedNoticeId = t.noticeId;
          return { ...t, completed: newCompletedState };
        }
        return t;
      });

      if (linkedNoticeId) {
        setNotices(nPrev => nPrev.map(n => {
          if (n.id === linkedNoticeId) {
            return { ...n, status: newCompletedState ? 'completed' : 'active' };
          }
          return n;
        }));
      }

      return updated;
    });
  };

  // Add custom task
  const handleAddTask = (title: string, dueDate: string) => {
    setTasks(prev => [
      {
        id: `task-${Date.now()}`,
        title,
        dueDate,
        priority: 'High',
        category: 'General',
        completed: false,
      },
      ...prev
    ]);
  };

  // Toggle notice status between active and completed (syncs with task)
  const handleToggleNoticeStatus = (noticeId: string) => {
    let nextStatus: 'active' | 'completed' = 'completed';

    setNotices(prev => prev.map(n => {
      if (n.id === noticeId) {
        nextStatus = n.status === 'completed' ? 'active' : 'completed';
        return { ...n, status: nextStatus };
      }
      return n;
    }));

    // Synchronize corresponding task if exists
    setTasks(prev => prev.map(t => {
      if (t.noticeId === noticeId) {
        return { ...t, completed: nextStatus === 'completed' };
      }
      return t;
    }));

    if (selectedNotice?.id === noticeId) {
      setSelectedNotice(prev => prev ? { ...prev, status: nextStatus } : null);
    }
  };

  // Delete notice permanently from the list
  const handleDeleteNotice = (noticeId: string) => {
    setNotices(prev => prev.filter(n => n.id !== noticeId));
    setTasks(prev => prev.filter(t => t.noticeId !== noticeId));
    if (selectedNotice?.id === noticeId) {
      setSelectedNotice(null);
    }
  };

  const handleAddCalendarTask = (notice: Notice) => {
    const existing = tasks.find(t => t.noticeId === notice.id);
    if (!existing) {
      setTasks(prev => [
        {
          id: `task-${Date.now()}`,
          noticeId: notice.id,
          title: notice.requiredAction,
          dueDate: notice.deadline || '2026-08-18',
          priority: notice.priorityLevel,
          category: notice.category,
          completed: false,
          estimatedMinutes: 25,
        },
        ...prev
      ]);
    }
    setCurrentTab('tasks');
    setSelectedNotice(null);
  };

  // Profile update
  const handleProfileSave = (updated: StudentProfile) => {
    setProfile(updated);
  };

  const criticalCount = notices.filter(n => n.priorityLevel === 'Critical' && n.status !== 'completed').length;

  return (
    <div className={`h-screen w-screen bg-[#EFECE6] p-0 sm:p-2.5 flex overflow-hidden antialiased text-[#1C1B18] transition-colors ${isDarkMode ? 'theme-dark' : ''}`}>
      <div className="flex flex-1 bg-[#F6F3EC] sm:rounded-[22px] border border-[#E2DDD2] shadow-[0_12px_40px_rgba(28,27,24,0.06)] overflow-hidden transition-colors relative">
        {/* Workspace Sidebar (Collapsible on mobile phones) */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          profile={profile}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          criticalCount={criticalCount}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 bg-white sm:rounded-2xl sm:my-2 sm:mr-2 border-l sm:border border-[#EAE5DC] overflow-y-auto px-4 sm:px-9 py-5 sm:py-6 transition-colors min-w-0">
          {/* Mobile Menu Trigger Bar (Only visible on phones < md) */}
          <div className="flex md:hidden items-center justify-between pb-4 mb-4 border-b border-[#EAE5DC]">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="type-button inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F6F3EC] border border-[#EAE5DC] text-[#1C1B18] cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4 text-[#F97316]" />
              <span>Menu</span>
            </button>
            <span className="type-caption font-semibold capitalize">
              {currentTab}
            </span>
          </div>

          {currentTab === 'dashboard' && (
            <DashboardView
              notices={notices}
              tasks={tasks}
              profile={profile}
              dailyBrief={dailyBrief}
              onToggleTask={handleToggleTask}
              onToggleNoticeStatus={handleToggleNoticeStatus}
              onDeleteNotice={handleDeleteNotice}
              onNavigateTab={setCurrentTab}
              onPrioritizeNotice={handlePrioritizeNotice}
              isProcessingNotice={isProcessingNotice}
              latestProcessedNotice={latestProcessedNotice}
              onSelectNotice={(n) => setSelectedNotice(n)}
              onOpenIngestModal={() => setIsIngestModalOpen(true)}
              onOpenProfileModal={() => setIsProfileModalOpen(true)}
              isDarkMode={isDarkMode}
              onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
            />
          )}

          {currentTab === 'notices' && (
            <NoticesView 
              notices={notices} 
              onSelectNotice={(n) => setSelectedNotice(n)}
              onToggleStatus={handleToggleNoticeStatus}
              onDeleteNotice={handleDeleteNotice}
              onOpenIngestModal={() => setIsIngestModalOpen(true)}
            />
          )}

          {currentTab === 'calendar' && (
            <CalendarView 
              notices={notices} 
              onSelectNotice={(n) => setSelectedNotice(n)}
              onOpenIngestModal={() => setIsIngestModalOpen(true)}
            />
          )}

          {currentTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onOpenIngestModal={() => setIsIngestModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Modal: Ingest Notice via PDF upload or Text paste */}
      <NoticeIngestModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onNoticeCreated={(notice) => {
          setNotices(prev => [notice, ...prev]);
          setLatestProcessedNotice(notice);
          setSelectedNotice(notice);
        }}
        profile={profile}
      />

      {/* Modal: Notice Detailed Inspector with AI Score Breakdown */}
      <NoticeDetailModal
        notice={selectedNotice}
        profile={profile}
        onClose={() => setSelectedNotice(null)}
        onToggleStatus={handleToggleNoticeStatus}
        onAddCalendarTask={handleAddCalendarTask}
        onDeleteNotice={handleDeleteNotice}
      />

      {/* Modal: Student Academic Profile Settings */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onSaveProfile={handleProfileSave}
      />
    </div>
  );
}
