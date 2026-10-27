import React, { useState } from 'react';
import { FolderClosed, FileText, Download, Eye, Upload, Sparkles, Search, CheckCircle } from 'lucide-react';
import { Notice } from '../types';

interface DocumentsViewProps {
  notices: Notice[];
  onSelectNotice: (notice: Notice) => void;
  onOpenIngest: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  notices,
  onSelectNotice,
  onOpenIngest,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const documents = notices.map(n => ({
    id: n.id,
    fileName: n.sourceFileName || `${n.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
    category: n.category,
    date: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Aug 2026',
    sizeKb: Math.floor(120 + (n.priorityScore * 3.4)),
    priority: n.priorityLevel,
    notice: n,
  })).filter(doc => 
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-[#171922] p-5 rounded-xl border border-[#262936] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderClosed className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Circular & Document Repository</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Official university circulars, PDFs, exam orders, and scanned notices stored in one place.
          </p>
        </div>

        <button
          onClick={onOpenIngest}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload PDF / Memo</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search circulars by file name, keyword or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#171922] border border-[#262936] rounded-xl pl-8 pr-3 py-2 text-xs text-gray-200 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => onSelectNotice(doc.notice)}
            className="bg-[#171922] hover:bg-[#1c1f2c] rounded-xl border border-[#262936] hover:border-[#3a4158] p-4 flex flex-col justify-between cursor-pointer transition-all group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#202332] text-gray-400 border border-[#2b3044]">
                  {doc.sizeKb} KB
                </span>
              </div>

              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                {doc.fileName}
              </h4>

              <p className="text-[11px] text-gray-400 line-clamp-2">
                {doc.notice.summary}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#242735] flex items-center justify-between text-[11px]">
              <span className="text-indigo-400 font-medium">{doc.category}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNotice(doc.notice);
                  }}
                  className="p-1 rounded text-gray-400 hover:text-white"
                  title="Inspect AI Extraction"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
