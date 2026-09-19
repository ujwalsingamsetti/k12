import React from 'react';

const SUBJECT_OPTIONS = [
  { value: 'science', label: 'Science (General)' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'biology', label: 'Biology' },
];

const LEVEL_OPTIONS = [
  { value: 'Class 10', label: 'Class 10 (Secondary)' },
  { value: 'Class 12', label: 'Class 12 (Higher Secondary)' },
  { value: 'Undergraduate', label: 'Undergraduate (Engineering/B.Sc)' },
  { value: 'Middle School', label: 'Middle School (Class 6-8)' },
];

const QuestionConfigPanel = ({
  questionText,
  setQuestionText,
  markingScheme,
  setMarkingScheme,
  subject,
  setSubject,
  academicLevel,
  setAcademicLevel,
  maxScore,
  setMaxScore,
  presets,
  onSelectPreset,
  onReset,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-black">
              1
            </span>
            Question & Rubric Setup
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure criteria or load verified official examination presets
          </p>
        </div>

        {/* Presets dropdown */}
        <div className="flex items-center gap-2">
          {presets && presets.length > 0 && (
            <div className="relative">
              <select
                aria-label="Load Verified Official Exam Preset"
                onChange={(e) => {
                  if (e.target.value) {
                    onSelectPreset(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="" disabled>
                  ⚡ Load Official Preset...
                </option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {preset.title} ({preset.max_score} Marks)
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={onReset}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Row 1: Subject, Level, Max Marks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SUBJECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Academic Standard
            </label>
            <select
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Max Marks
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={maxScore}
                onChange={(e) => setMaxScore(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
              />
              <span className="absolute right-3 top-2 text-[10px] uppercase font-bold text-slate-400">
                pts
              </span>
            </div>
          </div>
        </div>

        {/* Question text */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Exam Question Prompt <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-slate-400">
              {questionText.length} characters
            </span>
          </div>
          <textarea
            rows={3}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="e.g. State Gauss's law in electrostatics. Using Gauss's law, derive an expression for the electric field due to an infinitely long straight wire of uniform linear charge density lambda."
            className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-normal"
          />
        </div>

        {/* Marking Scheme / Rubric */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Marking Scheme / Step-wise Rubric <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
              Helps AI grade step-by-step
            </span>
          </div>
          <textarea
            rows={3}
            value={markingScheme}
            onChange={(e) => setMarkingScheme(e.target.value)}
            placeholder="1. Accurate statement of law [1 Mark]&#10;2. Identification of cylindrical Gaussian surface [1 Mark]&#10;3. Formula: E = lambda / (2*pi*epsilon_0*r) [1 Mark]"
            className="w-full p-3 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};

export default QuestionConfigPanel;
