import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Stack,
  Divider,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  CircularProgress,
  AppBar,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Assignment as ExamIcon,
  MenuBook as TextbookIcon,
  AutoAwesome as SparklesIcon,
  Psychology as BrainIcon,
  CheckCircle as CheckIcon,
  Bolt as BoltIcon,
  School as SchoolIcon,
  Refresh as RefreshIcon,
  ViewSidebar as SplitIcon,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

import QuestionConfigPanel from './QuestionConfigPanel';
import AnswerUploadDropzone from './AnswerUploadDropzone';
import EvaluationReportView from './EvaluationReportView';
import TextbookVectorStudio from '../textbooks/TextbookVectorStudio';

import {
  getEvaluationPresets,
  evaluateDirect,
  evaluateDirectStream,
  overrideEvaluationScore,
  extractQuestionPaper,
  formatErrorMessage,
} from '../../services/api';
import { useToast } from '../../context/ToastContext';

const WORKSPACE_STORAGE_KEY = 'k12_studio_workspace_state_v2';
const CUSTOM_PAPERS_STORAGE_KEY = 'k12_custom_question_papers_v2';

const EvaluationStudio = () => {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Route to Stage mapping
  // /setup -> 0, /upload -> 1, /evaluate -> 2, /results or /report -> 3
  const getStageFromPath = useCallback((pathname) => {
    if (pathname === '/upload') return 1;
    if (pathname === '/evaluate') return 2;
    if (pathname === '/results' || pathname === '/report') return 3;
    return 0; // /setup or default
  }, []);

  const currentPath = location.pathname;
  const isTextbookRoute = currentPath === '/textbooks';

  // Studio View Mode: 'evaluator' | 'textbooks'
  const [currentStudioView, setCurrentStudioView] = useState(isTextbookRoute ? 'textbooks' : 'evaluator');

  // Guided Stepper vs Split Layout View: 'split' | 'guided'
  const [layoutMode, setLayoutMode] = useState('split');

  // Active Stage (0: Setup, 1: Upload, 2: Execute, 3: Results)
  const [activeStage, setActiveStage] = useState(() => getStageFromPath(currentPath));

  // Presets & Custom Uploaded Question Papers
  const [presets, setPresets] = useState([]);
  const [customPresets, setCustomPresets] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PAPERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedPresetId, setSelectedPresetId] = useState('');

  // Multi-Question State
  const [questions, setQuestions] = useState([
    {
      question_number: 1,
      question_text: '',
      marking_scheme: '',
      max_score: 2.0,
    },
  ]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Subject & Level
  const [subject, setSubject] = useState('science');
  const [academicLevel, setAcademicLevel] = useState('Class 10');

  // Student Answer State
  const [files, setFiles] = useState([]);
  const [answerText, setAnswerText] = useState('');
  const [activeTab, setActiveTab] = useState('upload');

  // Processing & Evaluation State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isExtractingPaper, setIsExtractingPaper] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState({
    stage: 'idle',
    status: 'idle',
    title: '',
    message: '',
    progress: 0,
    step: 1,
    logs: [],
  });

  // Synchronize URL route with state
  useEffect(() => {
    if (location.pathname === '/textbooks') {
      setCurrentStudioView('textbooks');
    } else {
      setCurrentStudioView('evaluator');
      const targetStage = getStageFromPath(location.pathname);
      setActiveStage(targetStage);
    }
  }, [location.pathname, getStageFromPath]);

  // Stage transition navigation handler
  const handleStageNavigation = useCallback(
    (stageIndex) => {
      setActiveStage(stageIndex);
      if (stageIndex === 0) navigate('/setup');
      else if (stageIndex === 1) navigate('/upload');
      else if (stageIndex === 2) navigate('/evaluate');
      else if (stageIndex === 3) navigate('/results');
    },
    [navigate]
  );

  // Load preset data into workspace
  const loadPresetData = useCallback(
    (preset) => {
      setSelectedPresetId(preset.id || '');
      setSubject(preset.subject || 'science');
      setAcademicLevel(preset.academic_level || 'Class 10');

      if (preset.questions && preset.questions.length > 0) {
        setQuestions(
          preset.questions.map((q, idx) => ({
            question_number: q.question_number || idx + 1,
            question_text: q.question_text || '',
            marking_scheme: q.marking_scheme || '',
            max_score: parseFloat(q.max_score) || 2.0,
          }))
        );
      } else {
        setQuestions([
          {
            question_number: 1,
            question_text: preset.question_text || '',
            marking_scheme: preset.marking_scheme || '',
            max_score: parseFloat(preset.max_score) || 2.0,
          },
        ]);
      }

      setActiveQuestionIndex(0);
      setEvaluationResult(null);

      if (preset.sample_answer_text) {
        setAnswerText(preset.sample_answer_text);
      }

      toast.info(`Loaded Question Paper: ${preset.title}`);
    },
    [toast]
  );

  // Initialize workspace from persistent localStorage or default presets
  useEffect(() => {
    let hasLoadedSavedState = false;
    try {
      const savedRaw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved && saved.questions && saved.questions.length > 0) {
          setQuestions(saved.questions);
          setActiveQuestionIndex(saved.activeQuestionIndex || 0);
          setSubject(saved.subject || 'science');
          setAcademicLevel(saved.academicLevel || 'Class 10');
          if (saved.answerText) setAnswerText(saved.answerText);
          if (saved.selectedPresetId) setSelectedPresetId(saved.selectedPresetId);
          if (location.pathname === '/results' || location.pathname === '/report') {
            if (saved.evaluationResult) setEvaluationResult(saved.evaluationResult);
          } else {
            setEvaluationResult(null);
          }
          if (saved.layoutMode) setLayoutMode(saved.layoutMode);
          hasLoadedSavedState = true;
        }
      }
    } catch (e) {
      console.warn('Could not restore workspace state from localStorage:', e);
    }

    // Fetch official presets from backend
    const fetchPresets = async () => {
      try {
        const res = await getEvaluationPresets();
        const official = res.data || [];
        const combined = [...customPresets, ...official];
        setPresets(combined);

        // If no saved state, load the first available preset
        if (!hasLoadedSavedState && combined.length > 0) {
          loadPresetData(combined[0]);
        }
      } catch (err) {
        console.warn('Could not load official presets:', err);
      }
    };
    fetchPresets();
  }, []); // Run on mount

  // Auto-save workspace state to localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stateToSave = {
          questions,
          activeQuestionIndex,
          subject,
          academicLevel,
          answerText,
          selectedPresetId,
          evaluationResult,
          layoutMode,
        };
        localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (e) {
        console.warn('Failed to auto-save workspace state:', e);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    questions,
    activeQuestionIndex,
    subject,
    academicLevel,
    answerText,
    selectedPresetId,
    evaluationResult,
    layoutMode,
  ]);

  const handleSelectPreset = (presetId) => {
    const found = presets.find((p) => p.id === presetId);
    if (found) {
      loadPresetData(found);
    }
  };

  const handleResetWorkspace = () => {
    setQuestions([
      {
        question_number: 1,
        question_text: '',
        marking_scheme: '',
        max_score: 2.0,
      },
    ]);
    setActiveQuestionIndex(0);
    setFiles([]);
    setAnswerText('');
    setEvaluationResult(null);
    setErrorMessage(null);
    setSelectedPresetId('');
    try {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    } catch {}
    handleStageNavigation(0);
    toast.info('Workspace reset to blank state.');
  };

  // Upload Question Paper PDF and extract questions with LLM structuring
  const handleExtractQuestionPaper = async (file) => {
    setIsExtractingPaper(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subject', subject);
      formData.append('academic_level', academicLevel);

      const res = await extractQuestionPaper(formData);
      if (res.data && res.data.questions && res.data.questions.length > 0) {
        const cleanQs = res.data.questions.map((q, idx) => ({
          question_number: q.question_number || idx + 1,
          question_text: q.question_text || '',
          marking_scheme: q.marking_scheme || '',
          max_score: parseFloat(q.max_score) || 2.0,
          question_type: q.question_type || '',
          section: q.section || '',
        }));

        setQuestions(cleanQs);
        setActiveQuestionIndex(0);
        setEvaluationResult(null);
        setFiles([]);
        setAnswerText('');

        // Calculate total marks
        const totalMarks =
          res.data.total_marks ||
          cleanQs.reduce((sum, q) => sum + (parseFloat(q.max_score) || 0), 0);

        // Create structured Question Paper preset entry for the dropdown
        const newPaper = {
          id: `uploaded_qp_${Date.now()}`,
          title: res.data.title || `Uploaded Question Paper (${file.name})`,
          subject: subject,
          academic_level: academicLevel,
          max_score: totalMarks,
          questions: cleanQs,
          isUploaded: true,
          uploadedAt: new Date().toISOString(),
          filename: file.name,
        };

        // Add to customPresets and persist in localStorage
        const updatedCustom = [newPaper, ...customPresets.filter((p) => p.title !== newPaper.title)];
        setCustomPresets(updatedCustom);
        try {
          localStorage.setItem(CUSTOM_PAPERS_STORAGE_KEY, JSON.stringify(updatedCustom));
        } catch (e) {
          console.warn('Failed to save custom question paper:', e);
        }

        // Prepend to presets and select it in the Question Paper dropdown
        setPresets((prev) => [newPaper, ...prev.filter((p) => p.id !== newPaper.id)]);
        setSelectedPresetId(newPaper.id);

        toast.success(
          `Extracted ${cleanQs.length} questions and added "${newPaper.title}" to Question Paper dropdown!`
        );
      } else {
        toast.error('Could not parse questions from the uploaded question paper.');
      }
    } catch (err) {
      const msg = formatErrorMessage(err);
      toast.error(msg);
    } finally {
      setIsExtractingPaper(false);
    }
  };

  // Delete uploaded question paper preset
  const handleDeleteCustomPaper = useCallback(
    (paperId) => {
      const paperToDelete = customPresets.find((p) => p.id === paperId);
      const paperTitle = paperToDelete?.title || 'Question Paper';

      const updatedCustom = customPresets.filter((p) => p.id !== paperId);
      setCustomPresets(updatedCustom);
      try {
        localStorage.setItem(CUSTOM_PAPERS_STORAGE_KEY, JSON.stringify(updatedCustom));
      } catch (e) {
        console.warn('Failed to update custom question papers after deletion:', e);
      }

      setPresets((prev) => prev.filter((p) => p.id !== paperId));

      // If deleted paper is currently selected, switch to another preset or reset
      if (selectedPresetId === paperId) {
        const remainingPresets = presets.filter((p) => p.id !== paperId);
        if (remainingPresets.length > 0) {
          loadPresetData(remainingPresets[0]);
          setSelectedPresetId(remainingPresets[0].id);
        } else {
          handleResetWorkspace();
        }
      }

      toast.success(`Deleted question paper: "${paperTitle}"`);
    },
    [customPresets, presets, selectedPresetId, loadPresetData, handleResetWorkspace, toast]
  );

  // Run AI Evaluation with Real-time SSE Streaming
  const handleEvaluate = async () => {
    setErrorMessage(null);

    // Validation
    const emptyQ = questions.find((q) => !q.question_text || !q.question_text.trim());
    if (emptyQ) {
      toast.error(`Question #${emptyQ.question_number} is missing prompt text.`);
      return;
    }

    if (files.length === 0 && !answerText.trim()) {
      toast.error('Please upload a student answer sheet (PDF/Image) or provide typed answer text.');
      return;
    }

    setIsLoading(true);
    setLoadingStep(1);
    setRealtimeStatus({
      stage: 'init',
      status: 'running',
      title: 'Initializing AI Evaluation Pipeline',
      message: `Configured ${questions.length} questions for ${academicLevel} ${subject}`,
      progress: 5,
      step: 1,
      logs: [`[${new Date().toLocaleTimeString()}] Pipeline started for ${questions.length} questions`],
    });
    handleStageNavigation(2); // Move to /evaluate

    const formData = new FormData();
    formData.append('questions_json', JSON.stringify(questions));
    formData.append('subject', subject);
    formData.append('academic_level', academicLevel);

    if (answerText.trim()) {
      formData.append('student_answer_text', answerText.trim());
    }

    files.forEach((item) => {
      formData.append('files', item.file);
    });

    try {
      // Connect to Real-time SSE Streaming Pipeline
      await evaluateDirectStream(formData, {
        onEvent: (event) => {
          if (event) {
            if (event.step) setLoadingStep(event.step);
            setRealtimeStatus((prev) => ({
              ...prev,
              stage: event.stage || prev.stage,
              status: event.status || prev.status,
              title: event.title || prev.title,
              message: event.message || prev.message,
              progress: typeof event.progress === 'number' ? event.progress : prev.progress,
              step: event.step || prev.step,
              logs: event.message
                ? [...(prev.logs || []), `[${new Date().toLocaleTimeString()}] ${event.title ? `${event.title}: ` : ''}${event.message}`]
                : prev.logs,
            }));
          }
        },
        onComplete: (result) => {
          setEvaluationResult(result);
          handleStageNavigation(3); // Move to /results
          toast.success(
            `Exam graded! Total Score: ${result.total_score}/${result.total_max_score} (${result.percentage}%)`
          );
        },
        onError: (err) => {
          throw new Error(err);
        },
      });
    } catch (streamErr) {
      console.warn('Real-time SSE reader encounter, falling back to direct evaluate:', streamErr);
      try {
        const response = await evaluateDirect(formData);
        setEvaluationResult(response.data);
        handleStageNavigation(3);
        toast.success(
          `Exam graded! Total Score: ${response.data.total_score}/${response.data.total_max_score} (${response.data.percentage}%)`
        );
      } catch (directErr) {
        const msg = formatErrorMessage(directErr || streamErr);
        setErrorMessage(msg);
        toast.error(msg);
        handleStageNavigation(1); // Return to /upload on error
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Examiner Score Override
  const handleOverrideScore = async (overrideData) => {
    const res = await overrideEvaluationScore(overrideData);
    if (res.data) {
      setEvaluationResult((prev) => {
        if (!prev) return null;
        const qNum = overrideData.question_number;
        const updatedQuestions = (prev.questions || []).map((q) => {
          if (q.question_number === qNum) {
            return {
              ...q,
              score: res.data.adjusted_score,
              percentage: res.data.percentage,
              status: res.data.status,
              overall_feedback: `${q.overall_feedback}\n\n[Examiner Note]: ${res.data.examiner_notes}`,
            };
          }
          return q;
        });

        const newTotalScore = updatedQuestions.reduce((sum, q) => sum + (q.score || 0), 0);
        const newMaxScore = prev.total_max_score || prev.max_score || 1.0;
        const newPct = Math.round((newTotalScore / newMaxScore) * 1000) / 10;

        return {
          ...prev,
          total_score: newTotalScore,
          score: newTotalScore,
          percentage: newPct,
          questions: updatedQuestions,
        };
      });
      toast.success(`Marks adjusted for Question #${overrideData.question_number}!`);
    }
  };

  const totalPaperMarks = questions.reduce((sum, q) => sum + (parseFloat(q.max_score) || 0), 0);

  // Stepper Stages configuration
  const stages = [
    { label: 'Question Paper Setup', path: '/setup', description: `${questions.length} Questions (${totalPaperMarks}m)` },
    { label: 'Student Answer Upload', path: '/upload', description: files.length > 0 ? `${files.length} Pages Uploaded` : (answerText ? 'Typed text ready' : 'Awaiting upload') },
    { label: 'Pipeline Execution', path: '/evaluate', description: isLoading ? `Step ${loadingStep}/5 Running` : (evaluationResult ? 'Completed' : 'Ready') },
    { label: 'Diagnostic Report', path: '/results', description: evaluationResult ? `${evaluationResult.total_score}/${evaluationResult.total_max_score} (${evaluationResult.percentage}%)` : 'Pending' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      {/* ─────────────────────────────────────────────────────────────
       * 1. EXECUTIVE HEADER
       * ───────────────────────────────────────────────────────────── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          color: '#0F172A',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 }, minHeight: 64 }}>
          {/* Logo & System Brand */}
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box
              component="img"
              src="/logo.png"
              alt="Application Logo"
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                objectFit: 'contain',
                p: 0.5,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
              }}
            />

            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontSize: '0.875rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
                  Context-Aware Automated Grading of Written Exams
                </Typography>
                <Chip
                  size="small"
                  label="Qdrant + LLM"
                  sx={{
                    bgcolor: '#EFF6FF',
                    color: '#1E40AF',
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    border: '1px solid #BFDBFE',
                  }}
                />
              </Stack>
              <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 700, fontSize: '0.6875rem', display: { xs: 'none', md: 'block' } }}>
                USING QDRANT VECTOR SEARCH AND LARGE LANGUAGE MODEL
              </Typography>
            </Box>
          </Stack>

          {/* Studio View Mode Switcher */}
          <Tabs
            value={currentStudioView}
            onChange={(e, val) => {
              if (val === 'history') {
                navigate('/history');
                return;
              }
              setCurrentStudioView(val);
              if (val === 'textbooks') navigate('/textbooks');
              else handleStageNavigation(activeStage);
            }}
            sx={{
              minHeight: 40,
              bgcolor: '#F1F5F9',
              borderRadius: 2.5,
              p: 0.5,
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab
              value="evaluator"
              label="Exam Evaluator"
              icon={<ExamIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              sx={{
                minHeight: 32,
                py: 0.5,
                px: 2,
                fontSize: '0.8125rem',
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#FFFFFF', color: '#1E40AF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
              }}
            />
            <Tab
              value="history"
              label="Previous Evaluations"
              icon={<HistoryIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              sx={{
                minHeight: 32,
                py: 0.5,
                px: 2,
                fontSize: '0.8125rem',
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#FFFFFF', color: '#0F766E', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
              }}
            />
            <Tab
              value="textbooks"
              label="Textbook Vectors"
              icon={<TextbookIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              sx={{
                minHeight: 32,
                py: 0.5,
                px: 2,
                fontSize: '0.8125rem',
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: '#FFFFFF', color: '#6366F1', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
              }}
            />
          </Tabs>

          {/* Engine Status Badges */}
          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', lg: 'flex' } }}>
            <Chip
              size="small"
              icon={<CheckIcon sx={{ fontSize: 14, color: '#059669 !important' }} />}
              label="DeepSeek-V3 Active"
              sx={{ bgcolor: '#ECFDF5', color: '#065F46', fontWeight: 700, border: '1px solid #A7F3D0', fontSize: '0.6875rem' }}
            />
            <Chip
              size="small"
              icon={<BrainIcon sx={{ fontSize: 14, color: '#4F46E5 !important' }} />}
              label="Qdrant RAG Grounding"
              sx={{ bgcolor: '#EEF2FF', color: '#3730A3', fontWeight: 700, border: '1px solid #C7D2FE', fontSize: '0.6875rem' }}
            />
            <Chip
              size="small"
              icon={<SparklesIcon sx={{ fontSize: 14, color: '#2563EB !important' }} />}
              label="Gemini Vision OCR"
              sx={{ bgcolor: '#EFF6FF', color: '#1E40AF', fontWeight: 700, border: '1px solid #BFDBFE', fontSize: '0.6875rem' }}
            />
          </Stack>
        </Toolbar>
      </AppBar>

      {/* ─────────────────────────────────────────────────────────────
       * 2. MAIN WORKSPACE CONTAINER
       * ───────────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, py: 3, px: { xs: 2, md: 4 }, maxWidth: 1440, mx: 'auto', width: '100%' }}>
        {currentStudioView === 'textbooks' ? (
          <TextbookVectorStudio onBackToEvaluation={() => handleStageNavigation(0)} />
        ) : (
          <Stack spacing={3}>
            {/* Error Notification */}
            {errorMessage && (
              <Alert
                severity="error"
                onClose={() => setErrorMessage(null)}
                sx={{ borderRadius: 2.5, border: '1px solid #FECACA' }}
              >
                {errorMessage}
              </Alert>
            )}

            {/* ─────────────────────────────────────────────────────────
             * PROMINENT STAGING STEPPER BAR WITH URL SYNC
             * ───────────────────────────────────────────────────────── */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1 }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Evaluation Pipeline Stages
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500, fontSize: '0.8125rem' }}>
                    Persistent URL routes: /setup • /upload • /evaluate • /results (Refreshes stay on exact stage)
                  </Typography>
                </Box>

                {/* View Switcher: Split Studio vs Guided Flow */}
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={layoutMode}
                  onChange={(e, val) => val && setLayoutMode(val)}
                  sx={{ height: 32 }}
                >
                  <ToggleButton value="split" sx={{ px: 1.5, fontSize: '0.75rem', fontWeight: 700 }}>
                    <SplitIcon sx={{ fontSize: 16, mr: 0.75 }} /> Split Studio View
                  </ToggleButton>
                  <ToggleButton value="guided" sx={{ px: 1.5, fontSize: '0.75rem', fontWeight: 700 }}>
                    <NextIcon sx={{ fontSize: 16, mr: 0.75 }} /> Guided Stepper Flow
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Stepper activeStep={activeStage} alternativeLabel sx={{ pt: 1 }}>
                {stages.map((stage, index) => (
                  <Step key={stage.label} completed={activeStage > index || (index === 3 && Boolean(evaluationResult))}>
                    <StepButton onClick={() => handleStageNavigation(index)}>
                      <StepLabel
                        optional={
                          <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.6875rem' }}>
                            {stage.description}
                          </Typography>
                        }
                      >
                        {stage.label}
                      </StepLabel>
                    </StepButton>
                  </Step>
                ))}
              </Stepper>
            </Paper>

            {/* ─────────────────────────────────────────────────────────
             * WORKSPACE VIEW: SPLIT STUDIO VS GUIDED FLOW
             * ───────────────────────────────────────────────────────── */}
            {layoutMode === 'split' ? (
              /* SPLIT STUDIO VIEW (Side-by-Side) */
              <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
                {/* Left Column: Stage 1 (Setup) & Stage 2 (Upload) */}
                <Grid size={{ xs: 12, lg: 6 }}>
                  <Stack spacing={3}>
                    <QuestionConfigPanel
                      questions={questions}
                      setQuestions={setQuestions}
                      activeQuestionIndex={activeQuestionIndex}
                      setActiveQuestionIndex={setActiveQuestionIndex}
                      subject={subject}
                      setSubject={setSubject}
                      academicLevel={academicLevel}
                      setAcademicLevel={setAcademicLevel}
                      presets={presets}
                      selectedPresetId={selectedPresetId}
                      onSelectPreset={handleSelectPreset}
                      onReset={handleResetWorkspace}
                      onExtractQuestionPaper={handleExtractQuestionPaper}
                      isExtractingPaper={isExtractingPaper}
                      onDeleteCustomPaper={handleDeleteCustomPaper}
                    />

                    <AnswerUploadDropzone
                      files={files}
                      setFiles={setFiles}
                      answerText={answerText}
                      setAnswerText={setAnswerText}
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                    />

                    {/* Run Multi-Question AI Evaluation CTA */}
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      fullWidth
                      disabled={isLoading}
                      onClick={handleEvaluate}
                      startIcon={
                        isLoading ? <CircularProgress size={20} color="inherit" /> : <BoltIcon sx={{ fontSize: 22 }} />
                      }
                      sx={{
                        py: 1.75,
                        fontSize: '0.9375rem',
                        fontWeight: 800,
                        borderRadius: 3,
                        boxShadow: '0 4px 14px rgba(30,64,175,0.25)',
                      }}
                    >
                      {isLoading ? (
                        'Evaluating Exam Paper with Qdrant RAG & DeepSeek...'
                      ) : (
                        `Run AI Examination Evaluation (${questions.length} Qs • ${totalPaperMarks} Marks • ${subject.toUpperCase()})`
                      )}
                    </Button>
                  </Stack>
                </Grid>

                {/* Right Column: Stage 3 (Live Pipeline) & Stage 4 (Diagnostic Report) */}
                <Grid size={{ xs: 12, lg: 6 }} sx={{ position: { lg: 'sticky' }, top: { lg: 84 } }}>
                  <EvaluationReportView
                    evaluation={evaluationResult}
                    isLoading={isLoading}
                    loadingStep={loadingStep}
                    realtimeStatus={realtimeStatus}
                    onOverrideScore={handleOverrideScore}
                    questionPaperTitle={presets.find((p) => p.id === selectedPresetId)?.title || (questions.length > 0 ? `${academicLevel} ${subject.toUpperCase()} Paper` : 'Examination Paper')}
                    totalQuestions={questions.length}
                    totalMarks={totalPaperMarks}
                    subject={subject}
                    academicLevel={academicLevel}
                  />
                </Grid>
              </Grid>
            ) : (
              /* GUIDED STEPPER FLOW (Step-by-Step Focus by Route / Stage) */
              <Box>
                {activeStage === 0 && (
                  <Stack spacing={2.5}>
                    <QuestionConfigPanel
                      questions={questions}
                      setQuestions={setQuestions}
                      activeQuestionIndex={activeQuestionIndex}
                      setActiveQuestionIndex={setActiveQuestionIndex}
                      subject={subject}
                      setSubject={setSubject}
                      academicLevel={academicLevel}
                      setAcademicLevel={setAcademicLevel}
                      presets={presets}
                      selectedPresetId={selectedPresetId}
                      onSelectPreset={handleSelectPreset}
                      onReset={handleResetWorkspace}
                      onExtractQuestionPaper={handleExtractQuestionPaper}
                      isExtractingPaper={isExtractingPaper}
                      onDeleteCustomPaper={handleDeleteCustomPaper}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleStageNavigation(1)}
                        endIcon={<NextIcon />}
                        sx={{ px: 3, py: 1.25, fontWeight: 700 }}
                      >
                        Proceed to Stage 2: Upload Student Answer
                      </Button>
                    </Box>
                  </Stack>
                )}

                {activeStage === 1 && (
                  <Stack spacing={2.5}>
                    <AnswerUploadDropzone
                      files={files}
                      setFiles={setFiles}
                      answerText={answerText}
                      setAnswerText={setAnswerText}
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Button
                        variant="outlined"
                        onClick={() => handleStageNavigation(0)}
                        startIcon={<BackIcon />}
                        sx={{ color: '#475569', borderColor: '#CBD5E1' }}
                      >
                        Back to Stage 1: Question Setup
                      </Button>

                      <Button
                        variant="contained"
                        color="primary"
                        disabled={isLoading || (files.length === 0 && !answerText.trim())}
                        onClick={handleEvaluate}
                        startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <BoltIcon />}
                        sx={{ px: 3.5, py: 1.25, fontWeight: 800 }}
                      >
                        Execute Stage 3 & 4: Evaluate Paper
                      </Button>
                    </Box>
                  </Stack>
                )}

                {(activeStage === 2 || activeStage === 3) && (
                  <Stack spacing={2.5}>
                    <EvaluationReportView
                      evaluation={evaluationResult}
                      isLoading={isLoading}
                      loadingStep={loadingStep}
                      realtimeStatus={realtimeStatus}
                      onOverrideScore={handleOverrideScore}
                      questionPaperTitle={presets.find((p) => p.id === selectedPresetId)?.title || (questions.length > 0 ? `${academicLevel} ${subject.toUpperCase()} Paper` : 'Examination Paper')}
                      totalQuestions={questions.length}
                      totalMarks={totalPaperMarks}
                      subject={subject}
                      academicLevel={academicLevel}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Button
                        variant="outlined"
                        onClick={() => handleStageNavigation(1)}
                        startIcon={<BackIcon />}
                        sx={{ color: '#475569', borderColor: '#CBD5E1' }}
                      >
                        Back to Upload
                      </Button>

                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => handleStageNavigation(0)}
                        startIcon={<RefreshIcon />}
                      >
                        Edit Question Configuration
                      </Button>
                    </Box>
                  </Stack>
                )}
              </Box>
            )}
          </Stack>
        )}
      </Box>

      {/* ─────────────────────────────────────────────────────────────
       * 3. EXECUTIVE FOOTER
       * ───────────────────────────────────────────────────────────── */}
      <Box
        component="footer"
        sx={{
          mt: 'auto',
          py: 2.5,
          px: { xs: 2, md: 4 },
          bgcolor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          textAlign: 'center',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ maxWidth: 1440, mx: 'auto', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
            CONTEXT-AWARE AUTOMATED GRADING OF WRITTEN EXAMS USING QDRANT VECTOR SEARCH AND LARGE LANGUAGE MODEL • Sathyabama Institute of Science and Technology • 2026
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>
            Qdrant Vector DB (all-mpnet-base-v2 / 768d) • Multi-Provider LLM Grading
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default EvaluationStudio;
