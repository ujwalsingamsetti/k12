import React, { useState } from 'react';

const EvaluationReportView = ({
  evaluation,
  isLoading,
  loadingStep,
  onOverrideScore,
}) => {
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [overrideScoreVal, setOverrideScoreVal] = useState('');
  const [overrideNotesVal, setOverrideNotesVal] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Loading Screen
  if (isLoading) {
    const steps = [
      { id: 1, label: 'Multimodal OCR & Formula Parsing', desc: 'Google Cloud Vision / Gemini 1.5 Flash' },
      { id: 2, label: 'Curriculum RAG Context Retrieval', desc: 'SentenceTransformers + Qdrant Vector DB' },
      { id: 3, label: 'Step-wise Rubric Reasoning & Grading', desc: 'DeepSeek API (deepseek-chat / DeepSeek-V3)' },
    ];

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col items-center justify-center min-h-[480px]">
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-950/80 animate-ping opacity-75"></div>
          <div className="w-16 h-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
          <span className="absolute text-xl">⚡</span>
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white text-center">
          AI Evaluation In Progress
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-8 text-center max-w-sm">
          Analyzing handwriting, cross-referencing official rubrics, and evaluating conceptual mastery...
        </p>

        <div className="w-full max-w-md space-y-3">
          {steps.map((step) => {
            const isCurrent = loadingStep >= step.id;
            return (
              <div
                key={step.id}
                className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                  isCurrent
                    ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-100 dark:border-slate-800 opacity-40'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {isCurrent ? '✓' : step.id}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Empty State (No evaluation performed yet)
  if (!evaluation) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col items-center justify-center min-h-[480px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-3xl mb-4 shadow-inner">
          🎯
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Evaluation Report Studio
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">
          Configure an exam question, upload a handwritten answer sheet (or type the answer), and run AI Evaluation to inspect diagnostic criteria, misconceptions, and score breakdowns.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400">
          <span>💡 Tip:</span>
          <span>Click <strong>Load Official Preset</strong> at the top to test verified examination assets instantly.</span>
        </div>
      </div>
    );
  }

  // Handle Score Override Submit
  const handleApplyOverride = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(overrideScoreVal);
    if (isNaN(parsed) || parsed < 0 || parsed > evaluation.max_score) {
      alert(`Score must be a number between 0 and ${evaluation.max_score}`);
      return;
    }
    setIsOverriding(true);
    try {
      await onOverrideScore({
        evaluation_id: evaluation.evaluation_id,
        adjusted_score: parsed,
        max_score: evaluation.max_score,
        examiner_notes: overrideNotesVal || 'Manual examiner adjustment applied.',
      });
      setShowOverridePanel(false);
    } catch (err) {
      alert('Failed to apply override: ' + (err.message || 'Unknown error'));
    } finally {
      setIsOverriding(false);
    }
  };

  // Copy JSON Export
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(evaluation, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Status Color Logic
  const getStatusBadge = (status, pct) => {
    if (pct >= 80 || status === 'EXEMPLARY') {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        label: 'Exemplary Mastery',
      };
    }
    if (pct >= 50 || status === 'PASS') {
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
        label: 'Passed / Competent',
      };
    }
    if (pct >= 30 || status === 'NEEDS_IMPROVEMENT') {
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
        label: 'Needs Conceptual Revision',
      };
    }
    return {
      bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
      label: 'Below Passing Standard',
    };
  };

  const statusBadge = getStatusBadge(evaluation.status, evaluation.percentage);
  const bd = evaluation.breakdown || {};

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              AI Evaluation Report
            </h2>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}
            >
              {statusBadge.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
            ID: {evaluation.evaluation_id?.slice(0, 8)} • Model: {evaluation.model || 'deepseek-chat'} ({evaluation.provider || 'deepseek'})
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyJson}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all font-medium"
          >
            {copiedJson ? '✓ Copied JSON' : '📋 Copy JSON'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all font-medium"
          >
            🖨️ Print
          </button>
          <button
            type="button"
            onClick={() => setShowOverridePanel(!showOverridePanel)}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-semibold border border-indigo-200 dark:border-indigo-800 transition-all"
          >
            ✏️ Examiner Override
          </button>
        </div>
      </div>

      {/* Examiner Override Form (Collapsible) */}
      {showOverridePanel && (
        <form
          onSubmit={handleApplyOverride}
          className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
              Manual Examiner Score Adjustment
            </span>
            <button
              type="button"
              onClick={() => setShowOverridePanel(false)}
              className="text-xs text-amber-700 dark:text-amber-300 hover:underline"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Adjusted Score (Max: {evaluation.max_score})
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={evaluation.max_score}
                required
                placeholder={evaluation.score.toString()}
                value={overrideScoreVal}
                onChange={(e) => setOverrideScoreVal(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Examiner Remarks / Rationale
              </label>
              <input
                type="text"
                placeholder="e.g. Awarded partial credit for derivation steps..."
                value={overrideNotesVal}
                onChange={(e) => setOverrideNotesVal(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isOverriding}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
          >
            {isOverriding ? 'Saving...' : 'Apply Adjusted Score'}
          </button>
        </form>
      )}

      {/* Score Hero & Criteria Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Main Score Card */}
        <div className="sm:col-span-1 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/50 flex flex-col justify-center items-center text-center">
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Total Score
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
              {evaluation.score}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {evaluation.max_score}
            </span>
          </div>
          <div className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 px-2.5 py-0.5 rounded-full shadow-sm">
            {evaluation.percentage}% Marks
          </div>
        </div>

        {/* Criteria Breakdown (3 Columns) */}
        <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Correctness
              </span>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {bd.factual_correctness ?? '–'} pts
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Factual, scientific, and mathematical accuracy
            </p>
            <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((bd.factual_correctness || 0) / (evaluation.max_score * 0.5 || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Completeness
              </span>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {bd.structural_completeness ?? '–'} pts
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Coverage of all required steps & diagrams
            </p>
            <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((bd.structural_completeness || 0) / (evaluation.max_score * 0.3 || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Understanding
              </span>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {bd.conceptual_understanding ?? '–'} pts
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Clarity of reasoning and terminology
            </p>
            <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((bd.conceptual_understanding || 0) / (evaluation.max_score * 0.2 || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Feedback */}
      {evaluation.overall_feedback && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            Examiner Summary & Feedback
          </span>
          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
            {evaluation.overall_feedback}
          </p>
        </div>
      )}

      {/* Correct Points (Strengths) */}
      {evaluation.correct_points && evaluation.correct_points.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span className="text-emerald-500">✓</span> Demonstrated Strengths & Correct Steps
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {evaluation.correct_points.map((pt, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2"
              >
                <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Misconceptions & Conceptual Errors */}
      {evaluation.misconceptions && evaluation.misconceptions.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span className="text-rose-500">⚠️</span> Misconceptions & Student Conceptual Errors
          </h4>
          <div className="space-y-2">
            {evaluation.misconceptions.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-800 dark:text-rose-300">
                    {item.concept || 'Conceptual Gap'}
                  </span>
                  {item.impact && (
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded">
                      {item.impact}
                    </span>
                  )}
                </div>
                {item.student_claim && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    <strong className="text-rose-700 dark:text-rose-400">Student Claim:</strong> "{item.student_claim}"
                  </p>
                )}
                {item.correction && (
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-rose-100 dark:border-rose-900/40">
                    <strong className="text-emerald-700 dark:text-emerald-400">Correction:</strong> {item.correction}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Concepts */}
      {evaluation.missing_concepts && evaluation.missing_concepts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span className="text-amber-500">⚡</span> Missing Concepts & Required Elements
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {evaluation.missing_concepts.map((concept, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] font-medium"
              >
                - {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Remedial Textbook Guidance */}
      {evaluation.improvement_guidance && evaluation.improvement_guidance.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span className="text-indigo-500">📚</span> Targeted Textbook Chapters & Practice
          </h4>
          <div className="space-y-2">
            {evaluation.improvement_guidance.map((guide, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 dark:text-indigo-300">
                    {guide.resource || 'Curriculum Reference'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300">
                  {guide.suggestion}
                </p>
                {guide.practice && (
                  <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-mono">
                    🎯 Practice: {guide.practice}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted OCR Transcription (Collapsible) */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setShowExtractedText(!showExtractedText)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white py-1"
        >
          <span className="flex items-center gap-2">
            🔍 Extracted OCR Text & Diagrams {evaluation.diagram_detected && '(Diagram Detected)'}
          </span>
          <span>{showExtractedText ? '▲ Collapse' : '▼ Expand'}</span>
        </button>

        {showExtractedText && (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-60 border border-slate-800">
            <pre className="whitespace-pre-wrap font-mono">
              {evaluation.extracted_text || 'No text extracted.'}
            </pre>
            {evaluation.diagram_metadata?.shapes_detected && (
              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                Detected geometric shapes: {evaluation.diagram_metadata.shapes_detected.length} items
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationReportView;
