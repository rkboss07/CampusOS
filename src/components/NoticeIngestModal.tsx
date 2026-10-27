import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  FileUp, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { Notice, StudentProfile } from '../types';
import { extractTextFromPdfFile, fileToBase64, ExtractedPdfData } from '../utils/pdfExtractor';

interface NoticeIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoticeCreated: (notice: Notice) => void;
  profile: StudentProfile;
}

export const NoticeIngestModal: React.FC<NoticeIngestModalProps> = ({
  isOpen,
  onClose,
  onNoticeCreated,
  profile,
}) => {
  const [activeMode, setActiveMode] = useState<'pdf' | 'text'>('pdf');
  const [inputText, setInputText] = useState('');
  
  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfData, setPdfData] = useState<ExtractedPdfData | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    setPdfFile(file);
    setIsExtractingPdf(true);
    setErrorMessage(null);

    try {
      const extracted = await extractTextFromPdfFile(file);
      setPdfData(extracted);
      const b64 = await fileToBase64(file);
      setPdfBase64(b64);
      if (extracted.text) {
        setInputText(extracted.text);
      }
    } catch (err: any) {
      console.error('PDF extraction failed:', err);
      setErrorMessage('Could not read PDF text directly. You can still paste the notice text below.');
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const handleRunPipeline = async () => {
    const textToAnalyze = inputText.trim() || pdfData?.text || '';
    if (!textToAnalyze) {
      setErrorMessage('Please upload a PDF or enter circular text before continuing.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/analyze-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noticeText: textToAnalyze,
          mediaBase64: pdfBase64,
          mimeType: 'application/pdf',
          studentProfile: profile,
        }),
      });

      if (!res.ok) {
        throw new Error('Analysis server request failed');
      }

      const data = await res.json();
      const result = data.result;

      const newNotice: Notice = {
        id: `notice-${Date.now()}`,
        title: result.title || 'Official Academic Notice',
        rawContent: textToAnalyze,
        category: result.category || 'General',
        targetAudience: result.targetAudience || 'All Enrolled Students',
        targetBranch: result.targetBranch || profile.branch,
        targetYear: result.targetYear || profile.year,
        deadline: result.deadline || '2026-08-18',
        deadlineTime: result.deadlineTime || '05:00 PM',
        eventDate: result.eventDate || result.deadline || null,
        eventTime: result.eventTime || null,
        venue: result.venue || 'College Campus',
        requiredAction: result.requiredAction || 'Review circular requirements',
        actionType: result.actionType || 'portal_action',
        portalUrl: result.portalUrl || null,
        importance: result.importance ?? 90,
        urgency: result.urgency ?? 90,
        studentRelevance: result.studentRelevance ?? 95,
        priorityScore: result.priorityScore ?? 94,
        priorityLevel: result.priorityLevel || 'Critical',
        priorityReason: result.priorityReason || 'High priority score based on immediate deadline proximity and branch alignment.',
        summary: result.summary || textToAnalyze.slice(0, 140),
        keyPoints: result.keyPoints || [],
        consequencesOfMissing: result.consequencesOfMissing || 'Administrative penalty or debarment.',
        status: 'active',
        createdAt: new Date().toISOString(),
        source: activeMode === 'pdf' ? 'pdf' : 'text',
        sourceFileName: pdfFile?.name || pdfData?.fileName || 'College_Circular.pdf',
      };

      onNoticeCreated(newNotice);
      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Processing failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B18]/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white border border-[#E5E0D5] rounded-3xl flex flex-col shadow-[0_24px_60px_rgba(28,27,24,0.18)] overflow-hidden max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-[#EAE5DC] flex items-center justify-between bg-[#F6F3EC]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F97316] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="type-section-title text-[#1C1B18]">
                Add Notice to Student Board
              </h3>
              <p className="type-caption">
                Upload a PDF circular or paste announcement text to extract and prioritize
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="type-button p-1.5 rounded-xl text-[#57534E] hover:text-[#1C1B18] hover:bg-[#EAE4DA] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Method Toggle: PDF Upload vs Text Paste */}
        <div className="px-6 pt-3 pb-2 border-b border-[#EAE5DC] flex items-center gap-2 bg-white">
          <div className="inline-flex p-1 bg-[#F6F3EC] rounded-xl border border-[#EAE5DC]">
            <button
              onClick={() => setActiveMode('pdf')}
              className={`type-button px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                activeMode === 'pdf'
                  ? 'bg-white text-[#1C1B18] shadow-2xs'
                  : 'text-[#6E6A63] hover:text-[#1C1B18]'
              }`}
            >
              <FileUp className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Upload PDF Circular</span>
            </button>

            <button
              onClick={() => setActiveMode('text')}
              className={`type-button px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                activeMode === 'text'
                  ? 'bg-white text-[#1C1B18] shadow-2xs'
                  : 'text-[#6E6A63] hover:text-[#1C1B18]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Paste Text / WhatsApp Notice</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto bg-white">
          {activeMode === 'pdf' ? (
            <div className="space-y-3">
              <label className={`
                border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
                ${pdfFile || pdfData ? 'border-[#F97316] bg-[#FFF7ED]' : 'border-[#D5CFC2] hover:border-[#F97316] bg-[#FAF8F5]'}
              `}>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={isProcessing || isExtractingPdf}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfUpload(file);
                  }}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-xl bg-[#FFF0E5] text-[#F97316] border border-[#FDBA74]/50 flex items-center justify-center">
                  {isExtractingPdf ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>

                <div className="text-center space-y-0.5">
                  <p className="type-section-title text-[#1C1B18]">
                    {pdfFile ? pdfFile.name : 'Click to browse or drop university PDF notice'}
                  </p>
                  <p className="type-caption">
                    Supports official university memos, exam orders, fee circulars (.pdf)
                  </p>
                </div>
              </label>

              {pdfData && (
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC] space-y-2">
                  <div className="type-caption flex items-center justify-between">
                    <span className="font-semibold text-[#10B981] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PDF Extracted ({pdfData.numPages} Page{pdfData.numPages > 1 ? 's' : ''} · {(pdfData.fileSizeBytes / 1024).toFixed(0)} KB)</span>
                    </span>
                    <span className="truncate max-w-[180px]">{pdfData.fileName}</span>
                  </div>

                  <div className="type-body p-3 rounded-xl bg-white border border-[#EAE5DC] text-[#2C2A26] max-h-28 overflow-y-auto whitespace-pre-wrap select-all">
                    {pdfData.text || 'No text content found in PDF'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="type-section-title text-[#1C1B18] block">
                College Circular Text or WhatsApp Announcement
              </label>
              <textarea
                rows={5}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. All B.Tech AI & ML 2nd year students must submit the examination form by 18 August 2026..."
                className="type-body w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-2xl p-3.5 text-[#1C1B18] placeholder-[#8C867B] focus:outline-none focus:bg-white focus:border-[#F97316]"
              />
            </div>
          )}

          {errorMessage && (
            <div className="type-body p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-[#EAE5DC] bg-[#F6F3EC] flex items-center justify-between">
          <p className="type-caption">
            Targeting: <strong className="text-[#1C1B18]">{profile.branch}</strong> ({profile.year})
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="type-button px-3.5 py-2 rounded-full text-[#57534E] hover:text-[#1C1B18] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleRunPipeline}
              disabled={isProcessing || isExtractingPdf}
              className="type-button px-5 py-2 rounded-full bg-[#1C1B18] hover:bg-[#33312C] text-white flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing Notice...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Prioritize Notice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
