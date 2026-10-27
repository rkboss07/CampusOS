import React from 'react';
import { 
  LayoutDashboard, 
  Bell, 
  Calendar, 
  CheckSquare, 
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  X
} from 'lucide-react';
import { StudentProfile } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  profile: StudentProfile;
  userEmail?: string | null;
  userPhotoUrl?: string | null;
  onOpenProfile: () => void;
  onSignOut?: () => void;
  criticalCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  profile,
  userEmail,
  userPhotoUrl,
  onOpenProfile,
  onSignOut,
  criticalCount,
  isDarkMode,
  onToggleDarkMode,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'notices', 
      label: 'Notices', 
      icon: Bell,
      badge: criticalCount > 0 ? criticalCount : undefined 
    },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  ];

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-[#1C1B18]/40 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
        />
      )}

      {/* Sidebar (Off-canvas drawer on mobile, static sidebar on desktop) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 md:w-60 bg-[#F6F3EC] border-r border-[#EAE5DC] flex flex-col justify-between h-full select-none shrink-0 px-3.5 py-5 text-[#2C2A26] transition-transform duration-200 ease-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* User Profile at Top + Mobile Close Button */}
          <div className="px-1.5 pb-4 mb-3 border-b border-[#EAE5DC] flex items-center justify-between gap-2">
            <button
              onClick={() => {
                onOpenProfile();
                onCloseMobile?.();
              }}
              className="flex-1 flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-xl hover:bg-[#ECE7DF] transition-colors cursor-pointer text-left group min-w-0"
            >
              {userPhotoUrl ? (
                <img
                  src={userPhotoUrl}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-[#E2B2A0] object-cover shrink-0"
                />
              ) : (
                <div className="type-caption font-semibold w-8 h-8 rounded-full bg-[#F2C6B6] border border-[#E2B2A0] flex items-center justify-center text-[#5C3428] shadow-2xs shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="type-section-title text-[#1C1B18] truncate">
                    {profile.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#78736A] shrink-0 group-hover:text-[#1C1B18]" />
                </div>
                <p className="type-caption truncate">
                  {profile.branch} · {profile.year}
                </p>
                {userEmail && (
                  <p className="type-caption truncate opacity-80">
                    {userEmail}
                  </p>
                )}
              </div>
            </button>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="type-button md:hidden p-1.5 rounded-xl text-[#57534E] hover:text-[#1C1B18] hover:bg-[#EAE4DA] cursor-pointer shrink-0"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Core Menus */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    onCloseMobile?.();
                  }}
                  className={`type-button w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#EAE4DA] text-[#1C1B18] font-semibold shadow-2xs'
                      : 'text-[#4A463F] hover:bg-[#EFECE4] hover:text-[#1C1B18] font-normal'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#F97316]' : 'text-[#57534E]'
                      }`}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="type-caption font-semibold px-1.5 py-0.5 rounded-full bg-[#F97316] text-white tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Theme Toggle & Sign Out / Switch User at Bottom of Sidebar */}
        <div className="pt-3 border-t border-[#EAE5DC] space-y-2">
          <button
            onClick={onToggleDarkMode}
            className="type-button w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#ECE7DF] border border-[#EAE5DC] text-[#1C1B18] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {isDarkMode ? (
                <>
                  <Moon className="w-4 h-4 text-[#F97316]" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-[#F97316]" />
                  <span>Light Mode</span>
                </>
              )}
            </span>
            <span className="type-caption font-semibold px-2 py-0.5 rounded-md bg-[#EAE4DA] text-[#1C1B18]">
              Switch
            </span>
          </button>

          {onSignOut && (
            <button
              onClick={() => {
                onSignOut();
                onCloseMobile?.();
              }}
              className="type-button w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FEF2F2] border border-[#EAE5DC] text-[#57534E] hover:text-[#EF4444] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </span>
              <span className="type-caption">Switch User</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
