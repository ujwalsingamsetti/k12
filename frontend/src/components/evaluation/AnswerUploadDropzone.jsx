import React, { useState, useRef } from 'react';

const AnswerUploadDropzone = ({
  files,
  setFiles,
  answerText,
  setAnswerText,
  activeTab,
  setActiveTab,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(Array.from(e.target.files));
    }
  };

  const handleFilesAdded = (newFiles) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    const filtered = newFiles.filter((f) => validTypes.includes(f.type) || f.name.match(/\.(png|jpe?g|webp|pdf)$/i));
    
    // Add object preview URLs for images
    const withPreviews = filtered.map((f) => ({
      file: f,
      id: `${f.name}_${f.size}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      isPdf: f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    }));

    setFiles((prev) => [...prev, ...withPreviews]);
  };

  const handleRemoveFile = (idToRemove) => {
    setFiles((prev) => {
      const target = prev.find((item) => item.id === idToRemove);
      if (target && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== idToRemove);
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-black">
              2
            </span>
            Student Answer Submission
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Upload handwritten answer sheets (PNG, JPG, PDF) or provide typed text
          </p>
        </div>

        {/* Input Mode Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📸 Handwritten Sheet {files.length > 0 && `(${files.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'text'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ✍️ Typed Text
          </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div className="space-y-4">
          {/* Dropzone container */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-4 ring-indigo-500/10'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xl shadow-inner">
                📄
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Click to browse or drag & drop student answer sheet
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Supported formats: High-res PNG, JPG, JPEG, WEBP, or multi-page PDF
                </p>
              </div>
              <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Gemini Vision OCR
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Diagram Extraction
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Auto-Deskew
                </span>
              </div>
            </div>
          </div>

          {/* Uploaded files grid */}
          {files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Uploaded Answer Files ({files.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    files.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
                    setFiles([]);
                  }}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-medium"
                >
                  Remove all
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {files.map((item, index) => (
                  <div
                    key={item.id}
                    className="relative group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-2 shadow-sm overflow-hidden flex flex-col justify-between"
                  >
                    {item.isPdf ? (
                      <div className="h-24 w-full rounded-lg bg-rose-50 dark:bg-rose-950/40 flex flex-col items-center justify-center p-2 text-center">
                        <span className="text-2xl mb-1">📑</span>
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 truncate w-full">
                          PDF Document
                        </span>
                      </div>
                    ) : (
                      <div
                        onClick={() => setPreviewModalUrl(item.previewUrl)}
                        className="h-24 w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-zoom-in relative"
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium">
                          🔍 View
                        </div>
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <div className="truncate mr-1">
                        <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                          P.{index + 1} {item.file.name}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {(item.file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-400 hover:text-rose-600 flex items-center justify-center text-xs transition-colors shrink-0"
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Student Typed or Transcribed Answer Text
            </label>
            <span className="text-[10px] text-slate-400">
              {answerText.trim().split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
          <textarea
            rows={7}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Type or paste student handwritten text here if not uploading images..."
            className="w-full p-3.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-normal"
          />
        </div>
      )}

      {/* Image Preview Lightbox Modal */}
      {previewModalUrl && (
        <div
          onClick={() => setPreviewModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Answer Sheet Inspection
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕ Close
              </button>
            </div>
            <div className="overflow-auto p-2 flex items-center justify-center max-h-[80vh]">
              <img
                src={previewModalUrl}
                alt="Enlarged answer sheet scan"
                className="max-w-full max-h-full object-contain rounded-lg shadow"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnswerUploadDropzone;
