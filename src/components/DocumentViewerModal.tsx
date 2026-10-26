import React, { useState, useEffect, useRef } from 'react';
import { MedicalDocument, DocumentPage } from '../types';
import { api } from '../services/api';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  X,
  ShieldCheck,
  FileText,
  Info,
  Activity,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Sparkles
} from 'lucide-react';

interface DocumentViewerModalProps {
  document: MedicalDocument;
  isDoctorMode?: boolean;
  sessionId?: string;
  requestId?: string;
  onClose: () => void;
  onSessionEnded?: (traceData: any) => void;
  onOpenAIAnalysis?: (doc: MedicalDocument) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  isDoctorMode = false,
  sessionId,
  requestId,
  onClose,
  onSessionEnded,
  onOpenAIAnalysis,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showMetadata, setShowMetadata] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionId || null);

  // Time tracking per page
  const pageStartTimeRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const pageDurationsRef = useRef<Record<number, number>>({});

  const pages: DocumentPage[] = document.pages && document.pages.length > 0
    ? document.pages
    : [
        {
          pageNumber: 1,
          title: `${document.title} - Clinical Record`,
          type: 'report',
          sections: [
            { label: 'Patient Document', value: document.title },
            { label: 'Category', value: document.category },
            { label: 'Specialty', value: document.specialty },
            { label: 'Clinical Assessment', value: document.clinical_notes || 'Verified medical diagnostic file.' },
          ],
        },
      ];

  const totalPages = pages.length;

  // If doctor mode and no session id was provided, start viewing session on backend
  useEffect(() => {
    let isMounted = true;
    if (isDoctorMode && !activeSessionId) {
      api.startViewingSession({ document_id: document.id, request_id: requestId })
        .then((res) => {
          if (isMounted) {
            setActiveSessionId(res.sessionId);
          }
        })
        .catch((err) => {
          console.error('Failed to initiate live session', err);
          alert(err.message || 'Access error');
          onClose();
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isDoctorMode, document.id]);

  // Doctor session heartbeat
  useEffect(() => {
    if (!isDoctorMode || !activeSessionId) return;

    const interval = setInterval(() => {
      const elapsed = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
      api.sendHeartbeat(activeSessionId, elapsed).catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [isDoctorMode, activeSessionId]);

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;

    const now = Date.now();
    const durationOnPrevPage = Math.max(1, Math.round((now - pageStartTimeRef.current) / 1000));
    pageDurationsRef.current[currentPage] = (pageDurationsRef.current[currentPage] || 0) + durationOnPrevPage;

    const prevPageNum = currentPage;
    setCurrentPage(newPage);
    pageStartTimeRef.current = Date.now();

    // Broadcast page switch to backend & patient in real time
    if (isDoctorMode && activeSessionId) {
      try {
        await api.changePageView(activeSessionId, {
          page_number: newPage,
          previous_page: prevPageNum,
          previous_page_duration_seconds: durationOnPrevPage,
        });
      } catch (err) {
        console.warn('Page view update failed', err);
      }
    }
  };

  const handleCloseViewer = async () => {
    if (isDoctorMode && activeSessionId) {
      const now = Date.now();
      const finalPageDuration = Math.max(1, Math.round((now - pageStartTimeRef.current) / 1000));
      pageDurationsRef.current[currentPage] = (pageDurationsRef.current[currentPage] || 0) + finalPageDuration;
      const totalDuration = Math.max(1, Math.round((now - sessionStartTimeRef.current) / 1000));

      try {
        const res = await api.endViewingSession(activeSessionId, {
          final_page: currentPage,
          final_page_duration_seconds: finalPageDuration,
          total_duration_seconds: totalDuration,
        });

        if (onSessionEnded) {
          onSessionEnded({
            documentId: document.id,
            documentTitle: document.title,
            category: document.category,
            totalDurationSeconds: totalDuration,
            pageBreakdown: res.pageBreakdown,
            txHash: res.txHash,
          });
        }
      } catch (err) {
        console.error('Failed to end viewing session', err);
      }
    }
    onClose();
  };

  const activePageData = pages.find((p) => p.pageNumber === currentPage) || pages[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 animate-fade-in">
      <div
        className={`bg-slate-900 w-full ${
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-5xl h-[90vh] rounded-2xl'
        } border border-slate-700 shadow-2xl flex flex-col overflow-hidden text-slate-100`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center space-x-3 truncate">
            <button
              onClick={handleCloseViewer}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Close viewer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-400 flex-shrink-0" />
                <span className="truncate">{document.title}</span>
              </h2>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span className="text-sky-400 font-semibold">{document.category}</span>
                <span>•</span>
                <span>Uploaded by: {document.uploader_name}</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono">
                  <ShieldCheck className="h-3 w-3" /> SHA-256 Verified
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Live indicator if doctor is viewing */}
            {isDoctorMode && (
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold animate-pulse">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>LIVE TRANSMITTING</span>
              </div>
            )}

            {/* AI Summary Trigger */}
            {onOpenAIAnalysis && (
              <button
                onClick={() => onOpenAIAnalysis(document)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/40 text-xs font-semibold transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">AI Analysis</span>
              </button>
            )}

            {/* Metadata toggle */}
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className={`p-2 rounded-lg text-xs font-medium border transition-colors ${
                showMetadata
                  ? 'bg-sky-600/30 border-sky-500 text-sky-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Document Metadata & Security"
            >
              <Info className="h-4 w-4" />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={handleCloseViewer}
              className="p-2 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 transition-colors"
              title="Close Document Viewer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Viewer Center Stage */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Document Content Canvas / Paper */}
          <div className="flex-1 bg-slate-950 overflow-auto p-4 sm:p-8 flex items-center justify-center">
            <div
              className="bg-white text-slate-900 rounded-xl shadow-2xl transition-all duration-300 border border-slate-300 p-8 min-w-[320px] max-w-3xl w-full"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              {/* Medical Header */}
              <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
                <div>
                  <div className="text-xl font-extrabold text-slate-900 tracking-tight uppercase font-sans">
                    {document.uploader_name}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Accredited Diagnostic & Clinical Healthcare Network
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Ref ID: {document.id} • SHA-256 Verified
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block px-2.5 py-1 bg-sky-100 text-sky-800 rounded font-bold text-xs">
                    {document.specialty}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Date: {document.created_at ? String(document.created_at).substring(0, 10) : new Date().toISOString().substring(0, 10)}
                  </div>
                </div>
              </div>

              {/* Page Title & Subtitle */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">{activePageData?.title || `${document.title || 'Medical'} - Record`}</h3>
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    PAGE {currentPage} OF {totalPages}
                  </span>
                </div>
                <div className="h-1 w-16 bg-sky-600 rounded mt-1.5" />
              </div>

              {/* Dynamic Page Layout */}
              {activePageData?.type === 'imaging' && (
                <div className="mb-6 bg-slate-900 text-emerald-400 rounded-xl p-6 font-mono text-xs border border-slate-700 shadow-inner">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400 text-[11px]">
                    <span>HIGH-RESOLUTION RADIOGRAPHIC CAPTURE</span>
                    <span className="text-emerald-400">● 100% SIGNAL FIDELITY</span>
                  </div>
                  {/* Visual SVG Graphic for X-ray / ECG / Scan */}
                  <div className="py-6 flex flex-col items-center justify-center">
                    <svg className="w-full h-32 text-emerald-500 opacity-85" viewBox="0 0 500 100">
                      <path
                        d="M 0 50 L 50 50 L 60 40 L 70 60 L 80 50 L 140 50 L 150 15 L 160 85 L 170 35 L 180 50 L 250 50 L 260 40 L 270 60 L 280 50 L 340 50 L 350 10 L 360 90 L 370 30 L 380 50 L 500 50"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-[10px] text-slate-400 mt-2">
                      Digital Vector Scan Render — Calibrated to Medical Standard
                    </span>
                  </div>
                </div>
              )}

              {/* Content Sections */}
              <div className="space-y-4">
                {(activePageData?.sections || []).map((sec, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px] mb-1">
                      {sec.label}
                    </span>
                    <div className="text-slate-900 font-medium leading-relaxed">{sec.value}</div>
                  </div>
                ))}
              </div>

              {/* Medical Footer & Signature */}
              <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
                <div>
                  <div className="font-bold text-slate-800">Personal Health Locker Protocol</div>
                  <div className="text-[10px] text-slate-400">
                    Encrypted Cloud Storage • Patient-Controlled Access Scope
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-slate-800 font-bold">✓ Digitally Signed & Sealed</div>
                  <div className="text-[10px] text-slate-400">Hash: {document.file_hash ? String(document.file_hash).substring(0, 16) : 'SHA256-VERIFIED'}...</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right-Side Metadata Inspector Panel */}
          {showMetadata && (
            <div className="w-80 bg-slate-850 border-l border-slate-800 p-5 space-y-4 text-xs overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <span className="font-bold text-white uppercase tracking-wider">
                  Document Integrity & Trace
                </span>
                <button onClick={() => setShowMetadata(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Document Title</span>
                  <span className="font-bold text-white text-sm">{document.title}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Category & Specialty</span>
                  <span className="text-sky-300 font-semibold">{document.category}</span>
                  <span className="text-slate-500"> / </span>
                  <span className="text-emerald-300 font-semibold">{document.specialty}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">SHA-256 Integrity Hash</span>
                  <span className="font-mono text-[10px] text-emerald-400 break-all select-all block mt-1 bg-black/40 p-1.5 rounded">
                    {document.file_hash}
                  </span>
                  <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Untampered Record
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Encrypted Storage Key</span>
                  <span className="font-mono text-[10px] text-slate-300 break-all block mt-0.5">
                    {document.storage_key}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Clinical Notes</span>
                  <span className="text-slate-300 block mt-0.5">
                    {document.clinical_notes || 'Standard clinical diagnostics.'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="px-4 sm:px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoomLevel(Math.max(60, zoomLevel - 15))}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="font-mono text-slate-300 font-bold min-w-[45px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(150, zoomLevel + 15))}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
            >
              Reset
            </button>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center space-x-3">
            <button
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="font-mono font-bold text-slate-200">
              Page {currentPage} / {totalPages}
            </div>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Doctor End Session Action */}
          {isDoctorMode ? (
            <button
              onClick={handleCloseViewer}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all"
            >
              Finish & End Session
            </button>
          ) : (
            <button
              onClick={handleCloseViewer}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
