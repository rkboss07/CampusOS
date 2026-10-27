/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { NoticesView } from './components/NoticesView';
import { CalendarView } from './components/CalendarView';
import { TasksView } from './components/TasksView';
import { ProfileModal } from './components/ProfileModal';
import { NoticeIngestModal } from './components/NoticeIngestModal';
import { NoticeDetailModal } from './components/NoticeDetailModal';
import { SignInView } from './components/SignInView';
import { defaultStudentProfile } from './data/initialData';
import { Notice, Task, StudentProfile, DailyBrief } from './types';
import { analyzeNoticeWithFallback, generateDailyBriefWithFallback } from './utils/noticeAnalyzer';
import {
  isGuestSessionActive,
  startGuestSession,
  endGuestSession,
  getOrCreateGuestId,
  loadGuestWorkspace,
  saveGuestWorkspace,
} from './utils/guestStorage';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  ensureUserProfile,
  updateUserProfileInDb,
  createNoticeInDb,
  updateNoticeStatusInDb,
  deleteNoticeFromDb,
  createTaskInDb,
  updateTaskCompletedInDb,
  deleteTaskFromDb,
  subscribeToUserNotices,
  subscribeToUserTasks,
} from './firebase';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => isGuestSessionActive());
  const [guestId, setGuestId] = useState<string>(() => getOrCreateGuestId());
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('campusos_theme') === 'dark';
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [isProcessingNotice, setIsProcessingNotice] = useState<boolean>(false);

  // Per-user state (starts completely empty with zero entries for each new user or new guest)
  const [profile, setProfile] = useState<StudentProfile>(defaultStudentProfile);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [latestProcessedNotice, setLatestProcessedNotice] = useState<Notice | null>(null);
  const [dailyBrief, setDailyBrief] = useState<DailyBrief | null>(null);

  // Persist theme preference
  useEffect(() => {
    localStorage.setItem('campusos_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Listen to Firebase Auth state and subscribe to per-user Firestore collections
  useEffect(() => {
    let unsubNotices: (() => void) | null = null;
    let unsubTasks: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubNotices) {
        unsubNotices();
        unsubNotices = null;
      }
      if (unsubTasks) {
        unsubTasks();
        unsubTasks = null;
      }

      if (user) {
        // Authenticated with Google: exit guest mode and load Firestore workspace
        endGuestSession();
        setIsGuestMode(false);
        setCurrentUser(user);
        setNotices([]);
        setTasks([]);
        setLatestProcessedNotice(null);

        try {
          const loadedProfile = await ensureUserProfile(user);
          setProfile(loadedProfile);

          unsubNotices = subscribeToUserNotices(user.uid, (userNotices) => {
            setNotices(userNotices);
            setLatestProcessedNotice((prev) => {
              if (userNotices.length === 0) return null;
              if (prev && userNotices.some((n) => n.id === prev.id)) {
                return userNotices.find((n) => n.id === prev.id) || userNotices[0];
              }
              return userNotices[0];
            });
          });

          unsubTasks = subscribeToUserTasks(user.uid, (userTasks) => {
            setTasks(userTasks);
          });
        } catch (err) {
          console.error('Error initializing user workspace:', err);
        } finally {
          setIsAuthReady(true);
        }
        return;
      }

      // Not signed in with Google: check if Guest session is active
      setCurrentUser(null);
      if (isGuestSessionActive()) {
        const activeGuestId = getOrCreateGuestId();
        setGuestId(activeGuestId);
        setIsGuestMode(true);
        const guestData = await loadGuestWorkspace(activeGuestId);
        setProfile(guestData.profile);
        setNotices(guestData.notices);
        setTasks(guestData.tasks);
        setLatestProcessedNotice(guestData.notices[0] || null);
      } else {
        setIsGuestMode(false);
        setNotices([]);
        setTasks([]);
        setLatestProcessedNotice(null);
        setSelectedNotice(null);
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubAuth();
      if (unsubNotices) unsubNotices();
      if (unsubTasks) unsubTasks();
    };
  }, []);

  // Automatically sync Guest workspace to Cookies, localStorage, and Cache Storage API
  useEffect(() => {
    if (!isGuestMode || currentUser) return;
    saveGuestWorkspace(guestId, {
      profile,
      notices,
      tasks,
    });
  }, [isGuestMode, currentUser, guestId, profile, notices, tasks]);

  // Load Daily Brief when user/guest or notices change
  useEffect(() => {
    if (!currentUser && !isGuestMode) return;
    generateDailyBriefWithFallback({
      notices,
      tasks,
      studentProfile: profile,
      currentDate: '2026-08-18',
    }).then(setDailyBrief);
  }, [currentUser?.uid, isGuestMode, notices.length, profile.branch, profile.year]);

  // Prioritize notice handler (saves to Firestore for Google users or local Cache/Cookies for Guest users)
  const handlePrioritizeNotice = async (
    text: string,
    fileData?: { fileName: string; base64?: string }
  ) => {
    if (!currentUser && !isGuestMode) return;
    setIsProcessingNotice(true);
    try {
      const result = await analyzeNoticeWithFallback({
        noticeText: text,
        mediaBase64: fileData?.base64,
        mimeType: 'application/pdf',
        studentProfile: profile,
      });

      const noticeId = `notice-${Date.now()}`;
      const newNotice: Notice = {
        id: noticeId,
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
        priorityReason:
          result.priorityReason ||
          'High priority score based on immediate deadline proximity and branch alignment.',
        summary: result.summary || text.slice(0, 140),
        keyPoints: result.keyPoints || [],
        consequencesOfMissing: result.consequencesOfMissing || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        source: fileData ? 'pdf' : 'text',
        sourceFileName: fileData?.fileName || 'Circular_Notice.pdf',
      };

      const linkedTask: Task = {
        id: `task-${Date.now()}`,
        noticeId: newNotice.id,
        title: newNotice.requiredAction,
        dueDate: newNotice.deadline || '2026-08-18',
        priority: newNotice.priorityLevel,
        category: newNotice.category,
        completed: false,
        estimatedMinutes: 20,
      };

      if (currentUser) {
        await createNoticeInDb(currentUser.uid, newNotice);
        await createTaskInDb(currentUser.uid, linkedTask);
      } else if (isGuestMode) {
        setNotices((prev) => [newNotice, ...prev]);
        setTasks((prev) => [linkedTask, ...prev]);
      }

      setLatestProcessedNotice(newNotice);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingNotice(false);
    }
  };

  // Toggle task completed (syncs with corresponding notice)
  const handleToggleTask = async (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;
    const nextCompleted = !targetTask.completed;

    if (currentUser) {
      await updateTaskCompletedInDb(currentUser.uid, taskId, nextCompleted);
      if (targetTask.noticeId) {
        await updateNoticeStatusInDb(
          currentUser.uid,
          targetTask.noticeId,
          nextCompleted ? 'completed' : 'active'
        );
      }
    } else if (isGuestMode) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: nextCompleted } : t))
      );
      if (targetTask.noticeId) {
        setNotices((prev) =>
          prev.map((n) =>
            n.id === targetTask.noticeId
              ? { ...n, status: nextCompleted ? 'completed' : 'active' }
              : n
          )
        );
      }
    }
  };

  // Add custom task
  const handleAddTask = async (title: string, dueDate: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      dueDate,
      priority: 'High',
      category: 'General',
      completed: false,
    };

    if (currentUser) {
      await createTaskInDb(currentUser.uid, newTask);
    } else if (isGuestMode) {
      setTasks((prev) => [newTask, ...prev]);
    }
  };

  // Toggle notice status between active and completed (syncs with task)
  const handleToggleNoticeStatus = async (noticeId: string) => {
    const targetNotice = notices.find((n) => n.id === noticeId);
    if (!targetNotice) return;

    const nextStatus: 'active' | 'completed' =
      targetNotice.status === 'completed' ? 'active' : 'completed';

    if (currentUser) {
      await updateNoticeStatusInDb(currentUser.uid, noticeId, nextStatus);
      const linkedTask = tasks.find((t) => t.noticeId === noticeId);
      if (linkedTask) {
        await updateTaskCompletedInDb(
          currentUser.uid,
          linkedTask.id,
          nextStatus === 'completed'
        );
      }
    } else if (isGuestMode) {
      setNotices((prev) =>
        prev.map((n) => (n.id === noticeId ? { ...n, status: nextStatus } : n))
      );
      setTasks((prev) =>
        prev.map((t) =>
          t.noticeId === noticeId ? { ...t, completed: nextStatus === 'completed' } : t
        )
      );
    }

    if (selectedNotice?.id === noticeId) {
      setSelectedNotice((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }
  };

  // Delete notice permanently
  const handleDeleteNotice = async (noticeId: string) => {
    if (currentUser) {
      await deleteNoticeFromDb(currentUser.uid, noticeId);
      const linkedTasks = tasks.filter((t) => t.noticeId === noticeId);
      for (const t of linkedTasks) {
        await deleteTaskFromDb(currentUser.uid, t.id);
      }
    } else if (isGuestMode) {
      setNotices((prev) => prev.filter((n) => n.id !== noticeId));
      setTasks((prev) => prev.filter((t) => t.noticeId !== noticeId));
      setLatestProcessedNotice((prev) => (prev?.id === noticeId ? null : prev));
    }

    if (selectedNotice?.id === noticeId) {
      setSelectedNotice(null);
    }
  };

  const handleAddCalendarTask = async (notice: Notice) => {
    const existing = tasks.find((t) => t.noticeId === notice.id);
    if (!existing) {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        noticeId: notice.id,
        title: notice.requiredAction,
        dueDate: notice.deadline || '2026-08-18',
        priority: notice.priorityLevel,
        category: notice.category,
        completed: false,
        estimatedMinutes: 25,
      };
      if (currentUser) {
        await createTaskInDb(currentUser.uid, newTask);
      } else if (isGuestMode) {
        setTasks((prev) => [newTask, ...prev]);
      }
    }
    setCurrentTab('tasks');
    setSelectedNotice(null);
  };

  // Profile update
  const handleProfileSave = async (updated: StudentProfile) => {
    setProfile(updated);
    if (currentUser) {
      await updateUserProfileInDb(currentUser.uid, updated);
    }
  };

  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleGuestSignIn = async () => {
    const id = startGuestSession();
    setGuestId(id);
    const guestData = await loadGuestWorkspace(id);
    setProfile(guestData.profile);
    setNotices(guestData.notices);
    setTasks(guestData.tasks);
    setLatestProcessedNotice(guestData.notices[0] || null);
    setIsGuestMode(true);
  };

  const handleSignOut = async () => {
    if (isGuestMode) {
      endGuestSession();
      setIsGuestMode(false);
      setNotices([]);
      setTasks([]);
      setLatestProcessedNotice(null);
      setSelectedNotice(null);
    }
    if (currentUser) {
      await signOutUser();
    }
  };

  if (!isAuthReady) {
    return (
      <div
        className={`h-screen w-screen bg-[#EFECE6] flex items-center justify-center antialiased text-[#1C1B18] ${
          isDarkMode ? 'theme-dark' : ''
        }`}
      >
        <div className="bg-white px-6 py-4 rounded-2xl border border-[#EAE5DC] shadow-xs">
          <p className="type-section-title text-[#1C1B18]">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!currentUser && !isGuestMode) {
    return (
      <SignInView
        onSignIn={handleSignIn}
        onGuestSignIn={handleGuestSignIn}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />
    );
  }

  const criticalCount = notices.filter(
    (n) => n.priorityLevel === 'Critical' && n.status !== 'completed'
  ).length;

  return (
    <div
      className={`h-screen w-screen bg-[#EFECE6] p-0 sm:p-2.5 flex overflow-hidden antialiased text-[#1C1B18] transition-colors ${
        isDarkMode ? 'theme-dark' : ''
      }`}
    >
      <div className="flex flex-1 bg-[#F6F3EC] sm:rounded-[22px] border border-[#E2DDD2] shadow-[0_12px_40px_rgba(28,27,24,0.06)] overflow-hidden transition-colors relative">
        {/* Workspace Sidebar (Collapsible on mobile phones) */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          profile={profile}
          userEmail={currentUser ? currentUser.email : 'Guest Session (Local Cache & Cookies)'}
          userPhotoUrl={currentUser?.photoURL}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onSignOut={handleSignOut}
          criticalCount={criticalCount}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
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
              onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
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
        onNoticeCreated={async (notice) => {
          const linkedTask: Task = {
            id: `task-${Date.now()}`,
            noticeId: notice.id,
            title: notice.requiredAction,
            dueDate: notice.deadline || '2026-08-18',
            priority: notice.priorityLevel,
            category: notice.category,
            completed: false,
            estimatedMinutes: 20,
          };

          if (currentUser) {
            await createNoticeInDb(currentUser.uid, notice);
            await createTaskInDb(currentUser.uid, linkedTask);
          } else if (isGuestMode) {
            setNotices((prev) => [notice, ...prev]);
            setTasks((prev) => [linkedTask, ...prev]);
          }
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
