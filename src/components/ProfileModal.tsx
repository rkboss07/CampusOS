import React, { useState } from 'react';
import { X, User } from 'lucide-react';
import { StudentProfile } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onSaveProfile: (profile: StudentProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [formData, setFormData] = useState<StudentProfile>(profile);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B18]/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white border border-[#E5E0D5] rounded-3xl flex flex-col shadow-[0_24px_60px_rgba(28,27,24,0.18)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 px-6 border-b border-[#EAE5DC] flex items-center justify-between bg-[#F6F3EC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#F97316] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h3 className="type-section-title text-[#1C1B18]">Student Academic Profile</h3>
          </div>
          <button onClick={onClose} className="type-button p-1.5 rounded-xl text-[#57534E] hover:text-[#1C1B18] hover:bg-[#EAE4DA] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
          <div>
            <label className="type-section-title text-[#1C1B18] block mb-1.5">Student Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3.5 py-2.5 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="type-section-title text-[#1C1B18] block mb-1.5">Branch</label>
              <select
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3 py-2.5 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316] cursor-pointer"
              >
                <option value="B.Tech AI & ML">B.Tech AI & ML</option>
                <option value="B.Tech CSE">B.Tech CSE</option>
                <option value="B.Tech IT">B.Tech IT</option>
                <option value="B.Tech ME">B.Tech Mechanical</option>
              </select>
            </div>

            <div>
              <label className="type-section-title text-[#1C1B18] block mb-1.5">Year</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3 py-2.5 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316] cursor-pointer"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          <div>
            <label className="type-section-title text-[#1C1B18] block mb-1.5">College Name</label>
            <input
              type="text"
              value={formData.college}
              onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-xl px-3.5 py-2.5 text-[#1C1B18] focus:outline-none focus:bg-white focus:border-[#F97316]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="type-button px-4 py-2 rounded-full text-[#57534E] hover:text-[#1C1B18] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="type-button px-5 py-2 bg-[#1C1B18] hover:bg-[#33312C] text-white rounded-full cursor-pointer shadow-xs"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
