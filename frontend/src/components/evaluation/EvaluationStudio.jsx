import React, { useState, useEffect, useCallback } from 'react';
import QuestionConfigPanel from './QuestionConfigPanel';
import AnswerUploadDropzone from './AnswerUploadDropzone';
import EvaluationReportView from './EvaluationReportView';
import { getEvaluationPresets, evaluateDirect, overrideEvaluationScore, formatErrorMessage } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

const EvaluationStudio = () => {
  const { darkMode, toggleTheme } = useTheme();
  const toast = useToast();

  // Presets
  const [presets, setPresets] = useState([]);

  // Question & Rubric State
  const [questionText, setQuestionText] = useState('');
  const [markingScheme, setMarkingScheme] = useState('');
  const [subject, setSubject] = useState('science');
  const [academicLevel, setAcademicLevel] = useState('Class 10');
  const [maxScore, setMaxScore] = useState(2.0);

  // Student Answer State
  const [files, setFiles] = useState([]);
  const [answerText, setAnswerText] = useState('');
  const [activeTab, setActiveTab] = useState('upload');

  // Evaluation & Processing State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadPresetData = useCallback((preset) => {
    setQuestionText(preset.question_text || '');
    setMarkingScheme(preset.marking_scheme || '');
    setSubject(preset.subject || 'science');
    setAcademicLevel(preset.academic_level || 'Class 10');
    setMaxScore(preset.max_score || 2.0);
    if (preset.sample_answer_text) {
      setAnswerText(preset.sample_answer_text);
    }
    toast.info(`Loaded preset: ${preset.title}`);
  }, [toast]);

  // Fetch verified presets on initial mount
  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const res = await getEvaluationPresets();
        if (res.data && res.data.length > 0) {
          setPresets(res.data);
          // Pre-populate with first official CBSE preset
          loadPresetData(res.data[0]);
        }
      } catch (err) {
        console.warn('Could not load official presets:', err);
      }
    };
    fetchPresets();
  }, [loadPresetData]);

  const handleSelectPreset = (presetId) => {
    const found = presets.find((p) => p.id === presetId);
    if (found) {
      loadPresetData(found);
    }
  };

  const handleResetWorkspace = () => {
    setQuestionText('');
    setMarkingScheme('');
    setFiles([]);
    setAnswerText('');
    setEvaluationResult(null);
    setErrorMessage(null);
    toast.info('Workspace reset to blank state.');
  };

  const handleEvaluate = async () => {
    setErrorMessage(null);

    // Validation
    if (!questionText.trim()) {
      toast.error('Please enter the question text before evaluating.');
      return;
    }
    if (!markingScheme.trim()) {
      toast.error('Please enter the marking scheme or rubric.');
      return;
    }
    if (files.length === 0 && !answerText.trim()) {
      toast.error('Please upload a handwritten answer sheet or enter typed answer text.');
      return;
    }

    setIsLoading(true);
    setLoadingStep(1);

    // Step simulation for visual feedback
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 2200);

    try {
      const formData = new FormData();
      formData.append('question_text', questionText.trim());
      formData.append('marking_scheme', markingScheme.trim());
      formData.append('subject', subject);
      formData.append('academic_level', academicLevel);
      formData.append('max_score', maxScore.toString());

      if (answerText.trim()) {
        formData.append('student_answer_text', answerText.trim());
      }

      files.forEach((item) => {
        formData.append('files', item.file);
      });

      const response = await evaluateDirect(formData);
      clearInterval(stepInterval);
      setEvaluationResult(response.data);
      toast.success(`Evaluation complete! Score: ${response.data.score}/${response.data.max_score}`);
    } catch (err) {
      clearInterval(stepInterval);
      const msg = formatErrorMessage(err);
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverrideScore = async (overrideData) => {
    const res = await overrideEvaluationScore(overrideData);
    if (res.data) {
      setEvaluationResult((prev) => ({
        ...prev,
        score: res.data.adjusted_score,
        percentage: res.data.percentage,
        status: res.data.status,
        overall_feedback: `${prev.overall_feedback}\n\n[Examiner Note]: ${res.data.examiner_notes}`,
      }));
      toast.success(`Marks adjusted to ${res.data.adjusted_score}/${res.data.max_score}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Executive Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-black text-lg">
              K12
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">
                  AI Evaluation Studio
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  v2.0 Core
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Multimodal OCR • Qdrant RAG • DeepSeek Reasoning
              </p>
            </div>
          </div>

          {/* System Status Badges */}
          <div className="hidden md:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              DeepSeek-V3 Active
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Gemini Vision OCR
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              Qdrant RAG
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Banner if any */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <p>{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2-Column Responsive Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Inputs (Question + Answer Upload + Run CTA) */}
          <div className="lg:col-span-6 space-y-5">
            <QuestionConfigPanel
              questionText={questionText}
              setQuestionText={setQuestionText}
              markingScheme={markingScheme}
              setMarkingScheme={setMarkingScheme}
              subject={subject}
              setSubject={setSubject}
              academicLevel={academicLevel}
              setAcademicLevel={setAcademicLevel}
              maxScore={maxScore}
              setMaxScore={setMaxScore}
              presets={presets}
              onSelectPreset={handleSelectPreset}
              onReset={handleResetWorkspace}
            />

            <AnswerUploadDropzone
              files={files}
              setFiles={setFiles}
              answerText={answerText}
              setAnswerText={setAnswerText}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />

            {/* Primary Action Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleEvaluate}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2.5 transition-all duration-200 ${
                isLoading
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25 active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Evaluating Answer Script...</span>
                </>
              ) : (
                <>
                  <span>⚡ Run AI Evaluation</span>
                  <span className="text-xs opacity-80 font-normal">
                    ({subject} • {academicLevel} • {maxScore} pts)
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: AI Evaluation Diagnostic Report */}
          <div className="lg:col-span-6 sticky top-24">
            <EvaluationReportView
              evaluation={evaluationResult}
              isLoading={isLoading}
              loadingStep={loadingStep}
              onOverrideScore={handleOverrideScore}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-4 bg-white/50 dark:bg-slate-900/50 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>K12 Answer Sheet Evaluator • Capstone Project 2026</span>
          <span className="font-mono text-[11px]">
            Powered by DeepSeek-V3 & Google Gemini Vision
          </span>
        </div>
      </footer>
    </div>
  );
};

export default EvaluationStudio;
