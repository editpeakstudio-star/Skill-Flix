import React from 'react';
import { X, FileText, Download, ExternalLink, ShieldCheck, Lock } from 'lucide-react';
import { PdfResource } from '../types';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdf: PdfResource | null;
  hasAccess: boolean;
  onOpenSubscribe: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdf,
  hasAccess,
  onOpenSubscribe
}) => {
  if (!isOpen || !pdf) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-[#090D18] border border-blue-500/20 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/[0.08] bg-[#05070D]">
          <div className="flex items-center gap-3 truncate">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                {pdf.title}
              </h3>
              <span className="text-[10px] text-slate-400">
                {pdf.categoryName} • {pdf.pageCount} Pages • {pdf.fileSize || 'PDF'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasAccess ? (
              <a
                href={pdf.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            ) : (
              <button
                onClick={onOpenSubscribe}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Unlock Pass</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-[#05070D] relative flex items-center justify-center p-4 overflow-hidden">
          {hasAccess ? (
            pdf.pdfUrl ? (
              <iframe
                src={`${pdf.pdfUrl}#toolbar=0`}
                title={pdf.title}
                className="w-full h-full rounded-xl border border-white/[0.08] bg-white"
              />
            ) : (
              <div className="text-center p-6">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">PDF resource link is being prepared by Admin.</p>
              </div>
            )
          ) : (
            <div className="max-w-md text-center p-6 bg-[#0B101D] border border-amber-500/20 rounded-2xl shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">
                Protected Learning Material
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                This exclusive PDF resource is reserved for students with an active All-Access or {pdf.categoryName} pass.
              </p>
              <button
                onClick={onOpenSubscribe}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
              >
                ⚡ Get All-Access Pass (₹999)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
