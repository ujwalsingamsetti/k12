import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getTextbookStats,
  getTextbookCatalog,
  getTextbookChunks,
  deleteIndexedTextbook,
  chunkAndIngestTextbook,
  getDiscoveredTextbooks,
  ingestDiscoveredTextbook,
  formatErrorMessage,
} from '../../services/api';
import { useToast } from '../../context/ToastContext';

const SUBJECT_OPTIONS = [
  { value: 'science', label: 'Science' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'computer science', label: 'Computer Science' },
  { value: 'english', label: 'English' },
];

const CLASS_OPTIONS = [
  { value: 'Class 10', label: 'Class 10 (Secondary)' },
  { value: 'Class 12', label: 'Class 12 (Senior Secondary)' },
  { value: 'Class 11', label: 'Class 11' },
  { value: 'Class 9', label: 'Class 9' },
];

export default function TextbookVectorStudio({ onBackToEvaluation }) {
  const toast = useToast();

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'discovered'

  // Data states
  const [stats, setStats] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [discoveredList, setDiscoveredList] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isLoadingDiscovered, setIsLoadingDiscovered] = useState(false);

  // Upload & Chunk Form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('science');
  const [classLevel, setClassLevel] = useState('Class 10');
  const [chapter, setChapter] = useState('');
  const [chunkSize, setChunkSize] = useState(800);
  const [chunkOverlap, setChunkOverlap] = useState(150);

  // Ingestion execution state
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStep, setIngestStep] = useState(1);
  const [lastIngestedResult, setLastIngestedResult] = useState(null);

  // Chunk Inspection Modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedTextbookForInspect, setSelectedTextbookForInspect] = useState(null);
  const [inspectChunks, setInspectChunks] = useState([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [chunkSearchQuery, setChunkSearchQuery] = useState('');

  // Deletion state
  const [deletingId, setDeletingId] = useState(null);

  // Fetch telemetry and stats
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await getTextbookStats();
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Could not load vector stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch catalog of ingested textbooks
  const fetchCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const res = await getTextbookCatalog();
      if (res.data) {
        setCatalog(res.data);
      }
    } catch (err) {
      console.warn('Could not load textbook catalog:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  // Fetch discovered repository textbooks
  const fetchDiscovered = useCallback(async () => {
    setIsLoadingDiscovered(true);
    try {
      const res = await getDiscoveredTextbooks();
      if (res.data) {
        setDiscoveredList(res.data);
      }
    } catch (err) {
      console.warn('Could not load discovered textbooks:', err);
    } finally {
      setIsLoadingDiscovered(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchCatalog();
    fetchDiscovered();
  }, [fetchStats, fetchCatalog, fetchDiscovered]);

  // Handle PDF file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Only PDF textbook files are supported for vector chunking.');
        return;
      }
      setSelectedFile(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      if (!title) {
        setTitle(cleanName);
      }
      if (!chapter) {
        setChapter(cleanName);
      }
      toast.info(`Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  // Trigger PDF chunking & ingestion
  const handleChunkAndIngest = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please choose a textbook PDF file to chunk and ingest.');
      return;
    }

    setIsIngesting(true);
    setIngestStep(1);
    setLastIngestedResult(null);

    const effectiveTitle = title.trim() || chapter.trim() || (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : 'Textbook');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', effectiveTitle);
    formData.append('subject', subject);
    formData.append('class_level', classLevel);
    if (chapter.trim()) formData.append('chapter', chapter.trim());
    formData.append('chunk_size', String(chunkSize));
    formData.append('chunk_overlap', String(chunkOverlap));

    try {
      // Step simulator for UI feedback
      const stepTimer1 = setTimeout(() => setIngestStep(2), 700);
      const stepTimer2 = setTimeout(() => setIngestStep(3), 1500);

      const res = await chunkAndIngestTextbook(formData);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIngestStep(4);

      if (res.data && res.data.success) {
        toast.success(
          `Indexed ${res.data.total_chunks} real chunks from ${res.data.total_pages} pages into Qdrant!`
        );
        setLastIngestedResult(res.data);
        setSelectedFile(null);
        // Refresh catalog, stats and discovered list
        fetchStats();
        fetchCatalog();
        fetchDiscovered();
      } else {
        toast.error(res.data?.message || 'Textbook indexing completed with warnings.');
      }
    } catch (err) {
      const msg = formatErrorMessage(err);
      toast.error(`Ingestion failed: ${msg}`);
    } finally {
      setIsIngesting(false);
    }
  };

  // Trigger 1-click ingestion for a discovered PDF
  const handleIngestDiscovered = async (item) => {
    setIsIngesting(true);
    setIngestStep(1);
    try {
      toast.info(`Ingesting discovered textbook: ${item.title}...`);
      const res = await ingestDiscoveredTextbook({
        filepath: item.filepath,
        subject: item.subject,
        class_level: item.class_level,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
      });

      if (res.data && res.data.success) {
        toast.success(
          `Successfully ingested ${res.data.total_chunks} chunks from ${item.filename}!`
        );
        fetchStats();
        fetchCatalog();
        fetchDiscovered();
      } else {
        toast.error(res.data?.message || 'Ingestion failed.');
      }
    } catch (err) {
      const msg = formatErrorMessage(err);
      toast.error(`Failed to ingest ${item.filename}: ${msg}`);
    } finally {
      setIsIngesting(false);
    }
  };

  // Batch ingest all un-ingested discovered textbooks
  const handleBatchIngestAllDiscovered = async () => {
    const uningested = discoveredList.filter((d) => !d.is_ingested);
    if (uningested.length === 0) {
      toast.info('All discovered textbooks are already indexed in Qdrant.');
      return;
    }

    setIsIngesting(true);
    let successCount = 0;
    try {
      for (const item of uningested) {
        toast.info(`Ingesting ${item.title}...`);
        const res = await ingestDiscoveredTextbook({
          filepath: item.filepath,
          subject: item.subject,
          class_level: item.class_level,
          chunk_size: chunkSize,
          chunk_overlap: chunkOverlap,
        });
        if (res.data?.success) {
          successCount++;
        }
      }
      toast.success(`Batch ingestion complete: ${successCount} textbooks added to Qdrant!`);
      fetchStats();
      fetchCatalog();
      fetchDiscovered();
    } catch (err) {
      const msg = formatErrorMessage(err);
      toast.error(`Batch ingestion interrupted: ${msg}`);
    } finally {
      setIsIngesting(false);
    }
  };

  // Inspect real chunks
  const handleOpenInspectChunks = async (textbook) => {
    setSelectedTextbookForInspect(textbook);
    setInspectModalOpen(true);
    setInspectChunks([]);
    setChunkSearchQuery('');
    setIsLoadingChunks(true);

    try {
      const res = await getTextbookChunks(textbook.id);
      if (res.data && res.data.chunks) {
        setInspectChunks(res.data.chunks);
      }
    } catch (err) {
      const msg = formatErrorMessage(err);
      toast.error(`Could not retrieve chunks: ${msg}`);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  // Delete textbook and purge from Qdrant
  const handleDeleteTextbook = async (id, title) => {
    if (!window.confirm(`Permanently delete all vector chunks for "${title}" from Qdrant?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await deleteIndexedTextbook(id);
      if (res.data?.success) {
        toast.success(`Removed "${title}" from vector DB.`);
        fetchStats();
        fetchCatalog();
        fetchDiscovered();
      }
    } catch (err) {
      const msg = formatErrorMessage(err);
      toast.error(`Delete failed: ${msg}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter chunks in inspection modal
  const filteredInspectChunks = useMemo(() => {
    if (!chunkSearchQuery.trim()) return inspectChunks;
    const q = chunkSearchQuery.toLowerCase();
    return inspectChunks.filter(
      (c) =>
        c.text.toLowerCase().includes(q) ||
        String(c.page_number).includes(q) ||
        String(c.chunk_index).includes(q)
    );
  }, [inspectChunks, chunkSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Bar with Navigation & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 text-lg">
              📚
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Textbook Vector & Chunking Studio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct PyMuPDF PDF extraction • Real sliding-window chunks • Qdrant dense vector indexing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToEvaluation && (
            <button
              type="button"
              onClick={onBackToEvaluation}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Back to Exam Evaluator</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              fetchStats();
              fetchCatalog();
              fetchDiscovered();
              toast.info('Refreshed vector database telemetry.');
            }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xs font-bold"
            title="Refresh DB Telemetry"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Vector DB Telemetry Stats Card */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
              Total Real Chunks
            </span>
            <div className="text-2xl font-black mt-1 text-white flex items-baseline gap-1.5">
              <span>{isLoadingStats ? '...' : (stats?.total_points ?? 0)}</span>
              <span className="text-xs font-normal text-slate-300">vectors</span>
            </div>
            <span className="text-[10px] text-emerald-400 mt-1 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live in Qdrant
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
              Vector Collection
            </span>
            <div className="text-sm font-bold font-mono mt-1.5 text-white truncate">
              {stats?.collection_name || 'k12_textbooks'}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Dimension: {stats?.vector_size || 384} • Cosine
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
              Dense Embedding Model
            </span>
            <div className="text-xs font-mono font-semibold mt-1.5 text-white truncate">
              all-MiniLM-L6-v2
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              SentenceTransformers Local
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Indexed Textbooks
            </span>
            <div className="text-2xl font-black mt-1 text-white flex items-baseline gap-1.5">
              <span>{catalog.length}</span>
              <span className="text-xs font-normal text-slate-300">books</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Verbatim textbook pages
            </span>
          </div>
        </div>

        {/* Subjects breakdown tags */}
        {stats?.subjects_breakdown && Object.keys(stats.subjects_breakdown).length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-300">Subject Coverage:</span>
            {Object.entries(stats.subjects_breakdown).map(([subj, count]) => (
              <span
                key={subj}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-white border border-white/15"
              >
                {subj.toUpperCase()}: <span className="text-amber-300">{count} chunks</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs Switcher: Upload New vs Discovered Textbooks */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>📤</span>
          <span>Upload & Ingest Textbook PDF</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('discovered')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'discovered'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>🔍</span>
          <span>Discovered Repository Textbooks</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
            {discoveredList.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Upload & Chunk PDF */}
      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Upload Form */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
              <span>📄</span>
              <span>Upload Real Textbook PDF</span>
            </h3>

            {/* Dropzone */}
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors bg-slate-50/50 dark:bg-slate-950/40">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isIngesting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <span className="text-3xl">📥</span>
                {selectedFile ? (
                  <div>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • PDF Document
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Drop real textbook PDF here or <span className="text-indigo-600 font-bold underline">browse</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      NCERT, CBSE or standard curriculum textbook chapters
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {SUBJECT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Academic Level
                </label>
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CLASS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Textbook / Book Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. NCERT Science Class 10"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Chapter / Unit Title (Optional)
              </label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g. Chapter 1: Chemical Reactions and Equations"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Chunking Hyperparameters */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                ⚙️ Chunking Engine Hyperparameters
              </span>

              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Target Chunk Size:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {chunkSize} characters
                  </span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="2000"
                  step="50"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Sliding Window Overlap:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {chunkOverlap} characters
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="400"
                  step="25"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Action CTA */}
            <button
              type="button"
              disabled={isIngesting || !selectedFile}
              onClick={handleChunkAndIngest}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                isIngesting || !selectedFile
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25 active:scale-[0.99]'
              }`}
            >
              {isIngesting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>
                    {ingestStep === 1 && 'Extracting PDF Pages with PyMuPDF...'}
                    {ingestStep === 2 && 'Generating Real Paragraph Chunks...'}
                    {ingestStep === 3 && 'Embedding with all-MiniLM-L6-v2...'}
                    {ingestStep === 4 && 'Upserting into Qdrant Collection...'}
                  </span>
                </>
              ) : (
                <>
                  <span>⚡ Extract, Chunk & Index into Qdrant</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Live Preview & Inspection */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>🔎</span>
                <span>Real Chunk Previewer</span>
              </span>
              {lastIngestedResult && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {lastIngestedResult.total_chunks} Chunks Stored
                </span>
              )}
            </h3>

            {lastIngestedResult ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {lastIngestedResult.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Extracted from {lastIngestedResult.total_pages} pages • Subject: {lastIngestedResult.subject} ({lastIngestedResult.class_level})
                  </div>
                </div>

                <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                  {lastIngestedResult.chunks_preview?.map((chunk, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          Chunk #{chunk.chunk_index} • Page {chunk.page_number}
                        </span>
                        <span>
                          {chunk.char_count} chars • {chunk.word_count} words
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-mono text-[11px] leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                        {chunk.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-3xl mb-2">📑</span>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  No Textbook Chunks Ingested in this Session
                </p>
                <p className="text-[10px] text-slate-400 max-w-xs mt-1">
                  Upload a PDF textbook on the left or choose from discovered repository textbooks to see real extracted chunks here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Discovered Repository Textbooks */}
      {activeTab === 'discovered' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                <span>📁</span>
                <span>Discovered Repository Textbooks & Question Schemes</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official NCERT textbook chapters and marking schemes discovered in local repository assets.
              </p>
            </div>

            <button
              type="button"
              disabled={isIngesting || discoveredList.every((d) => d.is_ingested)}
              onClick={handleBatchIngestAllDiscovered}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <span>⚡ Batch Ingest All New ({discoveredList.filter((d) => !d.is_ingested).length})</span>
            </button>
          </div>

          {isLoadingDiscovered ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Scanning disk for textbook PDFs...
            </div>
          ) : discoveredList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No textbook PDFs found in local folders.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-3 px-3">Title / File</th>
                    <th className="py-3 px-3">Subject</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3">Pages</th>
                    <th className="py-3 px-3">Size</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {discoveredList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-xs">
                          {item.filename}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {item.subject.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-semibold">
                        {item.class_level}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {item.total_pages}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {item.file_size_kb.toFixed(0)} KB
                      </td>
                      <td className="py-3 px-3">
                        {item.is_ingested ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <span>✅</span> Indexed in Qdrant
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            <span>⏳</span> Ready to Ingest
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          disabled={isIngesting || item.is_ingested}
                          onClick={() => handleIngestDiscovered(item)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            item.is_ingested
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                          }`}
                        >
                          {item.is_ingested ? 'Indexed' : '⚡ Ingest Chunks'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Ingested Textbooks Catalog Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
              <span>📚</span>
              <span>Indexed Textbook Catalog in Qdrant ({catalog.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actively indexed textbooks powering RAG grounding for automated evaluation.
            </p>
          </div>
        </div>

        {isLoadingCatalog ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Loading textbook catalog...
          </div>
        ) : catalog.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No textbooks have been indexed yet. Upload a PDF or ingest discovered textbooks above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-3 px-3">Textbook Title</th>
                  <th className="py-3 px-3">Subject & Level</th>
                  <th className="py-3 px-3">Pages</th>
                  <th className="py-3 px-3">Vector Chunks</th>
                  <th className="py-3 px-3">Ingested Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {catalog.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {book.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">
                        {book.filename} {book.chapter && `• ${book.chapter}`}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {book.subject.toUpperCase()}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                          {book.class_level}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {book.total_pages}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                        {book.chunk_count} chunks
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(book.ingested_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenInspectChunks(book)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors shadow-sm"
                        >
                          🔍 Inspect Chunks
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === book.id}
                          onClick={() => handleDeleteTextbook(book.id, book.title)}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold transition-colors"
                        >
                          {deletingId === book.id ? 'Deleting...' : '🗑️ Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT CHUNKS MODAL */}
      {inspectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <span>🔍</span>
                  <span>Real Vector Chunks: {selectedTextbookForInspect?.title}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Subject: {selectedTextbookForInspect?.subject} • {selectedTextbookForInspect?.class_level} • {inspectChunks.length} vectors stored in Qdrant
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Filter Search Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <input
                type="text"
                value={chunkSearchQuery}
                onChange={(e) => setChunkSearchQuery(e.target.value)}
                placeholder="Search chunk text, page number, or keywords..."
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Chunks List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {isLoadingChunks ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Fetching vectors from Qdrant...
                </div>
              ) : filteredInspectChunks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No matching chunks found.
                </div>
              ) : (
                filteredInspectChunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          Chunk #{chunk.chunk_index}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                          Page {chunk.page_number}
                        </span>
                      </div>
                      <span className="font-mono text-[10px]">
                        ID: {chunk.id.substring(0, 16)}... • {chunk.char_count} chars • {chunk.word_count} words
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 font-mono text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 select-text whitespace-pre-wrap">
                      {chunk.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
