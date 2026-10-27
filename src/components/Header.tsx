import React from 'react';
import { 
  Menu, 
  Search, 
  Plus, 
  Sparkles, 
  User, 
  Layers
} from 'lucide-react';
import { StudentProfile } from '../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenIngest: () => void;
  onOpenProfile: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  profile: StudentProfile;
  onSwitchBranchPreset: (branch: string, year: string) => void;
  activeTabTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenIngest,
  onOpenProfile,
  searchQuery,
  setSearchQuery,
  profile,
  onSwitchBranchPreset,
  activeTabTitle,
}) => {
  return (
    <header className="h-14 border-b border-[#262933] bg-[#14161b]/90 backdrop-blur-md px-4 flex items-center justify-between gap-3 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#202430] lg:hidden cursor-pointer"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 hidden sm:inline">Workspace</span>
          <span className="text-xs text-gray-400 hidden sm:inline">/</span>
          <h1 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
            {activeTabTitle}
          </h1>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search circulars, deadlines, keywords (e.g. Exam, Fees, DBMS)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1b1e27] border border-[#2d3140] rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-400 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs px-1"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Right controls: Quick Branch Tester + Ingest Notice Button */}
      <div className="flex items-center gap-2">
        {/* Quick Branch & Year Profile Switcher */}
        <div className="relative hidden sm:flex items-center gap-1 text-xs bg-[#1b1e27] border border-[#2d3140] rounded-lg px-2 py-1">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-gray-400 text-[11px]">Role:</span>
          <select
            value={`${profile.branch}|${profile.year}`}
            onChange={(e) => {
              const [b, y] = e.target.value.split('|');
              onSwitchBranchPreset(b, y);
            }}
            className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer pr-1"
            title="Switch student profile to see dynamic AI priority re-ranking"
          >
            <option value="B.Tech AI & ML|2nd Year" className="bg-[#1b1e27] text-white">
              B.Tech AI & ML (2nd Year)
            </option>
            <option value="B.Tech CSE|4th Year" className="bg-[#1b1e27] text-white">
              CSE (4th Year / Final Year)
            </option>
            <option value="B.Tech IT|3rd Year" className="bg-[#1b1e27] text-white">
              IT (3rd Year)
            </option>
            <option value="B.Tech ME|1st Year" className="bg-[#1b1e27] text-white">
              Mechanical (1st Year)
            </option>
          </select>
        </div>

        {/* Profile Button */}
        <button
          onClick={onOpenProfile}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#202430] border border-[#2d3140] cursor-pointer"
          title="Student Settings"
        >
          <User className="w-4 h-4" />
        </button>

        {/* Ingest Notice */}
        <button
          onClick={onOpenIngest}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Notice</span>
        </button>
      </div>
    </header>
  );
};
