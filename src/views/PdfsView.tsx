import React, { useState } from 'react';
import { FileText, Download, Lock, CheckCircle, Search, ExternalLink } from 'lucide-react';
import { PdfResource, Category, UserProfile } from '../types';

interface PdfsViewProps {
  pdfs: PdfResource[];
  categories: Category[];
  currentUser: UserProfile | null;
  searchQuery: string;
  onViewPdf: (pdf: PdfResource) => void;
  onOpenSubscribe: (cat?: Category) => void;
}

export const PdfsView: React.FC<PdfsViewProps> = ({
  pdfs,
  categories,
  currentUser,
  searchQuery,
  onViewPdf,
  onOpenSubscribe
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string>('all');

  const isAdmin = currentUser?.role === 'master_admin' || currentUser?.role === 'admin';
  const hasAllAccess = currentUser?.hasAllAccess;

  const isUnlocked = (catId: string) => {
    if (hasAllAccess || isAdmin) return true;
    return !!currentUser?.allowedCategories?.includes(catId);
  };

  const filteredPdfs = pdfs.filter(p => {
    if (!isAdmin && !p.isPublished) return false;
    if (selectedCatId !== 'all' && p.categoryId !== selectedCatId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          PDF Publications & Learning Notes
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Hand-crafted workflow blueprints, shortcut cheat sheets, and preset documentation.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCatId('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
            selectedCatId === 'all'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-[#090D18] text-slate-400 hover:text-white border border-white/[0.08]'
          }`}
        >
          All Materials ({pdfs.filter(p => isAdmin || p.isPublished).length})
        </button>

        {categories.map((cat) => {
          const count = pdfs.filter(p => p.categoryId === cat.id && (isAdmin || p.isPublished)).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCatId === cat.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-[#090D18] text-slate-400 hover:text-white border border-white/[0.08]'
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* PDFs Grid */}
      {filteredPdfs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPdfs.map((pdf) => {
            const unlocked = isUnlocked(pdf.categoryId);
            const catObj = categories.find(c => c.id === pdf.categoryId);

            return (
              <div
                key={pdf.id}
                onClick={() => {
                  if (unlocked) {
                    onViewPdf(pdf);
                  } else {
                    onOpenSubscribe(catObj);
                  }
                }}
                className="rounded-2xl bg-[#090D18] border border-white/[0.08] hover:border-blue-500/40 p-4 shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    {unlocked ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Unlocked
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block mb-1">
                    {pdf.categoryName}
                  </span>
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                    {pdf.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {pdf.description || 'Downloadable masterclass study notes and presets.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">
                    {pdf.pageCount} Pages • {pdf.fileSize || 'PDF'}
                  </span>
                  <span className="text-blue-400 font-semibold">
                    {unlocked ? 'View Material' : 'Unlock Pass'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-[#090D18] border border-white/[0.08] text-center max-w-md mx-auto">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-white">No PDF resources available</h4>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery
              ? `No resources match "${searchQuery}".`
              : 'Upload PDF guides in Admin Console to share with students.'}
          </p>
        </div>
      )}
    </div>
  );
};
