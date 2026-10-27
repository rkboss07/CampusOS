/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Menu, LogIn, LogOut, UserCheck, ShieldCheck } from 'lucide-react';
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
  getActiveNamedUser,
  startNamedUserSession,
  endNamedUserSession,
  NamedUserAccount,
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
  const [namedUser, setNamedUser] = useState<NamedUserAccount | null>(() => getActiveNamedUser());
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => isGuestSessionActive());
  const [guestId, setGuestId] = useState<string>(() => getOrCreateGuestId());
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [showSignInScreen, setShowSignInScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.search.includes('signin=1') ||
      window.location.hash.includes('signin')
    );
  });

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

    // Safety fallback timer so static hosts / blocked third-party cookies never hang on loading
    const authTimeout = setTimeout(() => {
      setIsAuthReady(true);
    }, 1200);

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      clearTimeout(authTimeout);
      if (unsubNotices) {
        unsubNotices();
        unsubNotices = null;
      }
      if (unsubTasks) {
        unsubTasks();
        unsubTasks = null;
      }

      if (user) {
        // Authenticated with Google: exit guest/named mode and load Firestore workspace
        endGuestSession();
        endNamedUserSession();
        setNamedUser(null);
        setIsGuestMode(false);
        setShowSignInScreen(false);
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

      // Not signed in with Google: check if a Named Email Account or Guest session is active
      setCurrentUser(null);
      const savedNamedAccount = getActiveNamedUser();
      if (savedNamedAccount) {
        setNamedUser(savedNamedAccount);
        setIsGuestMode(false);
        const userData = await loadGuestWorkspace(savedNamedAccount.uid, savedNamedAccount.name);
        setProfile(userData.profile);
        setNotices(userData.notices);
        setTasks(userData.tasks);
        setLatestProcessedNotice(userData.notices[0] || null);
      } else if (isGuestSessionActive()) {
        const activeGuestId = getOrCreateGuestId();
        setGuestId(activeGuestId);
        setIsGuestMode(true);
        const guestData = await loadGuestWorkspace(activeGuestId, 'Guest Student');
        setProfile(guestData.profile);
        setNotices(guestData.notices);
        setTasks(guestData.tasks);
        setLatestProcessedNotice(guestData.notices[0] || null);
      } else {
        setIsGuestMode(false);
        setNamedUser(null);
        setNotices([]);
        setTasks([]);
        setLatestProcessedNotice(null);
        setSelectedNotice(null);
      }
      setIsAuthReady(true);
    });

    return () => {
      clearTimeout(authTimeout);
      unsubAuth();
      if (unsubNotices) unsubNotices();
      if (unsubTasks) unsubTasks();
    };
  }, []);

  // Persist workspace to browser Cache Storage, LocalStorage, and Cookies whenever local account/guest data changes
  const activeLocalWorkspaceId = !currentUser
    ? namedUser
      ? namedUser.uid
      : isGuestMode
      ? guestId
      : null
    : null;

  useEffect(() => {
    if (!isAuthReady || !activeLocalWorkspaceId) return;
    saveGuestWorkspace(activeLocalWorkspaceId, { profile, notices, tasks });
  }, [isAuthReady, activeLocalWorkspaceId, profile, notices, tasks]);

  // Recompute daily brief when notices or profile change
  useEffect(() => {
    let isMounted = true;
    if (!currentUser && !namedUser && !isGuestMode) return;

    generateDailyBriefWithFallback(notices, profile).then((brief) => {
      if (isMounted) setDailyBrief(brief);
    });
    return () => {
      isMounted = false;
    };
  }, [notices, profile, currentUser, namedUser, isGuestMode]);

  // Quick prioritize from dashboard hero input or file upload
  const handlePrioritizeNotice = async (
    rawText: string,
    fileData?: { fileName: string; base64?: string }
  ) => {
    if (!rawText.trim() && !fileData?.base64) return;
    if (!currentUser && !namedUser && !isGuestMode) return;
    setIsProcessingNotice(true);
    try {
      const analyzed = await analyzeNoticeWithFallback(rawText, profile, fileData);
      const noticeId = `notice-${Date.now()}`;
      const newNotice: Notice = {
        id: noticeId,
        title: analyzed.title,
        rawText: rawText || `Uploaded PDF: ${fileData?.fileName || 'Document'}`,
        summary: analyzed.summary,
        category: analyzed.category,
        priorityScore: analyzed.priorityScore,
        priorityLevel: analyzed.priorityLevel,
        deadline: analyzed.deadline,
        requiredAction: analyzed.requiredAction,
        targetBranches: analyzed.targetBranches,
        targetYears: analyzed.targetYears,
        sender: fileData?.fileName ? `PDF (${fileData.fileName})` : 'Quick Drop Input',
        receivedAt: new Date().toISOString().split('T')[0],
        aiReasoning: analyzed.aiReasoning,
        scoreBreakdown: analyzed.scoreBreakdown,
        status: 'active',
        attachmentName: fileData?.fileName,
      };

      const newTask: Task = {
        id: `task-${Date.now()}`,
        noticeId: newNotice.id,
        title: analyzed.requiredAction,
        dueDate: analyzed.deadline || '2026-08-18',
        priority: analyzed.priorityLevel,
        category: analyzed.category,
        completed: false,
        estimatedMinutes: 20,
      };

      if (currentUser) {
        await createNoticeInDb(currentUser.uid, newNotice);
        await createTaskInDb(currentUser.uid, newTask);
      } else {
        setNotices((prev) => [newNotice, ...prev]);
        setTasks((prev) => [newTask, ...prev]);
      }

      setLatestProcessedNotice(newNotice);
      setSelectedNotice(newNotice);
    } finally {
      setIsProcessingNotice(false);
    }
  };

  // Toggle task completion (syncs back to notice status)
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
    } else {
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
    } else {
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
    } else {
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
    } else {
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
      } else {
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
    setShowSignInScreen(false);
  };

  const handleEmailSignIn = async (name: string, email: string) => {
    if (currentUser) {
      await signOutUser();
    }
    const account = startNamedUserSession(name, email);
    setNamedUser(account);
    setIsGuestMode(false);
    const userData = await loadGuestWorkspace(account.uid, account.name);
    setProfile(userData.profile);
    setNotices(userData.notices);
    setTasks(userData.tasks);
    setLatestProcessedNotice(userData.notices[0] || null);
    setSelectedNotice(null);
    setShowSignInScreen(false);
  };

  const handleGuestSignIn = async () => {
    if (currentUser) {
      await signOutUser();
    }
    endNamedUserSession();
    setNamedUser(null);
    const id = startGuestSession();
    setGuestId(id);
    const guestData = await loadGuestWorkspace(id, 'Guest Student');
    setProfile(guestData.profile);
    setNotices(guestData.notices);
    setTasks(guestData.tasks);
    setLatestProcessedNotice(guestData.notices[0] || null);
    setSelectedNotice(null);
    setIsGuestMode(true);
    setShowSignInScreen(false);
  };

  const handleSignOut = async () => {
    if (isGuestMode) {
      endGuestSession();
      setIsGuestMode(false);
    }
    if (namedUser) {
      endNamedUserSession();
      setNamedUser(null);
    }
    setNotices([]);
    setTasks([]);
    setLatestProcessedNotice(null);
    setSelectedNotice(null);
    if (currentUser) {
      await signOutUser();
    }
    setShowSignInScreen(true);
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

  const hasActiveSession = Boolean(currentUser || namedUser || isGuestMode);

  if (!hasActiveSession || showSignInScreen) {
    return (
      <SignInView
        onSignIn={handleSignIn}
        onEmailSignIn={handleEmailSignIn}
        onGuestSignIn={handleGuestSignIn}
        onCancel={hasActiveSession ? () => setShowSignInScreen(false) : undefined}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />
    );
  }

  const criticalCount = notices.filter(
    (n) => n.priorityLevel === 'Critical' && n.status !== 'completed'
  ).length;

  const activeUserEmail = currentUser
    ? currentUser.email
    : namedUser
    ? namedUser.email
    : 'Guest Session (Local Cache & Cookies)';

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
          userEmail={activeUserEmail}
          userPhotoUrl={currentUser?.photoURL}
          isGuestMode={isGuestMode && !currentUser && !namedUser}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenSignIn={() => setShowSignInScreen(true)}
          onSignOut={handleSignOut}
          criticalCount={criticalCount}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 bg-white sm:rounded-2xl sm:my-2 sm:mr-2 border-l sm:border border-[#EAE5DC] overflow-y-auto px-4 sm:px-9 py-5 sm:py-6 transition-colors min-w-0">
          {/* Top Account & Navigation Bar (Visible on all screens so Sign In / Account Switch is always accessible) */}
          <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-[#EAE5DC]">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="type-button md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F6F3EC] border border-[#EAE5DC] text-[#1C1B18] cursor-pointer shrink-0"
                aria-label="Open navigation menu"
              >
                <Menu className="w-4 h-4 text-[#F97316]" />
                <span>Menu</span>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <span className="type-caption font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#EAE5DC] text-[#57534E] truncate">
                  {currentUser || namedUser ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                      <span className="truncate">
                        {currentUser?.email || namedUser?.email}
                      </span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                      <span>Guest Mode (Local Cache)</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isGuestMode && !currentUser && !namedUser ? (
                <button
                  onClick={() => setShowSignInScreen(true)}
                  className="type-button px-3.5 py-2 rounded-xl bg-[#1C1B18] hover:bg-[#33312C] text-white inline-flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Sign In</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowSignInScreen(true)}
                    className="type-button px-3 py-1.5 rounded-xl bg-[#F6F3EC] hover:bg-[#ECE7DF] border border-[#EAE5DC] text-[#1C1B18] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>Switch Account</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="type-button px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FEF2F2] border border-[#EAE5DC] text-[#57534E] hover:text-[#EF4444] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              )}
            </div>
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
          } else {
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
