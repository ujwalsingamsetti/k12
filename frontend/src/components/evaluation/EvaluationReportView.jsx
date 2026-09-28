import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Paper,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  CircularProgress,
  Divider,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  CheckCircleOutlined as CheckIcon,
  WarningAmber as WarningIcon,
  ErrorOutlined as ErrorIcon,
  AutoAwesome as SparklesIcon,
  Psychology as BrainIcon,
  FindInPage as SearchIcon,
  Print as PrintIcon,
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  MenuBook as BookIcon,
  Tune as FilterIcon,
  Layers as PagesIcon,
  AssignmentTurnedIn as RubricIcon,
  Lightbulb as BulbIcon,
  Bolt as BoltIcon,
  Terminal as TerminalIcon,
} from '@mui/icons-material';

const EvaluationReportView = ({
  evaluation,
  isLoading,
  loadingStep,
  realtimeStatus,
  onOverrideScore,
  questionPaperTitle,
  totalQuestions,
  totalMarks,
  subject,
  academicLevel,
}) => {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [overrideScoreVal, setOverrideScoreVal] = useState('');
  const [overrideNotesVal, setOverrideNotesVal] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showFullRagTrace, setShowFullRagTrace] = useState(true);
  const [showRawAnswerMap, setShowRawAnswerMap] = useState({});
  const [showLiveLogs, setShowLiveLogs] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 1. LIVE RAG & EVALUATION PROGRESS LOADER
  // ─────────────────────────────────────────────────────────────
  if (isLoading) {
    const activeProgress = typeof realtimeStatus?.progress === 'number' && realtimeStatus.progress > 0
      ? realtimeStatus.progress
      : Math.min(loadingStep * 20, 95);

    const pipelineStages = [
      { id: 1, key: 'ocr', title: 'Multimodal OCR & Handwriting Extraction', desc: 'Gemini Vision OCR transcription & diagram extraction' },
      { id: 2, key: 'normalizing', title: 'LLM OCR Normalization & Multi-Page Collation', desc: 'Cleaning spelling/formatting and collating scattered answers across pages' },
      { id: 3, key: 'rag', title: 'Targeted Vector Retrieval in Qdrant', desc: 'Querying textbook vectors strictly filtered by subject and class_level' },
      { id: 4, key: 'evaluating', title: 'DeepSeek-V3 Step-wise Rubric Evaluation', desc: 'Parallel multi-criteria reasoning, misconception diagnosis & feedback' },
      { id: 5, key: 'completed', title: 'Synthesis & Diagnostic Report Generation', desc: 'Compiling criteria breakdowns, remedial guidance & score telemetry' },
    ];

    const currentStepNum = realtimeStatus?.step || loadingStep || 1;

    return (
      <Card elevation={1} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: '#FFFFFF', minHeight: 480, p: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 4 }, width: '100%', maxWidth: 640, mx: 'auto' }}>
          <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress size={68} thickness={4} sx={{ color: '#1E40AF' }} />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BrainIcon sx={{ color: '#1E40AF', fontSize: 30 }} />
              </Box>
            </Box>

            <Box sx={{ width: '100%' }}>
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center', mb: 1 }}>
                <Chip
                  icon={<BoltIcon sx={{ fontSize: '1rem !important' }} />}
                  label="REAL-TIME BACKEND STREAM"
                  size="small"
                  sx={{
                    bgcolor: '#EFF6FF',
                    color: '#1D4ED8',
                    fontWeight: 800,
                    fontSize: '0.6875rem',
                    border: '1px solid #BFDBFE',
                  }}
                />
                <Chip
                  label={`${activeProgress}% COMPLETE`}
                  size="small"
                  sx={{
                    bgcolor: '#F1F5F9',
                    color: '#0F172A',
                    fontWeight: 800,
                    fontSize: '0.6875rem',
                  }}
                />
              </Stack>

              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
                {realtimeStatus?.title || 'AI Examination Pipeline Active'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', minHeight: 40, px: 2 }}>
                {realtimeStatus?.message || 'Executing multimodal OCR, answer collation, targeted Qdrant RAG, and DeepSeek grading...'}
              </Typography>

              {/* Live Smooth Progress Bar */}
              <Box sx={{ width: '100%', mt: 2, px: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={activeProgress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#E2E8F0',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#1E40AF',
                      borderRadius: 4,
                      transition: 'transform 0.4s ease',
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Pipeline Stage Indicators */}
            <Stack spacing={1.5} sx={{ width: '100%', textAlign: 'left' }}>
              {pipelineStages.map((stage) => {
                const isDone = currentStepNum > stage.id;
                const isCurrent = currentStepNum === stage.id;
                return (
                  <Box
                    key={stage.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: isCurrent ? '#93C5FD' : isDone ? '#A7F3D0' : '#F1F5F9',
                      bgcolor: isCurrent ? '#EFF6FF' : isDone ? '#ECFDF5' : '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      opacity: isDone || isCurrent ? 1 : 0.45,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        bgcolor: isDone ? '#059669' : isCurrent ? '#1E40AF' : '#E2E8F0',
                        color: isDone || isCurrent ? '#FFFFFF' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {isDone ? '✓' : stage.id}
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#0F172A', display: 'block' }} noWrap>
                        {stage.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.6875rem', display: 'block' }} noWrap>
                        {stage.desc}
                      </Typography>
                    </Box>

                    {isCurrent && (
                      <CircularProgress size={16} thickness={5} sx={{ color: '#1E40AF', flexShrink: 0 }} />
                    )}
                  </Box>
                );
              })}
            </Stack>

            {/* Real-time Streaming Event Log Drawer */}
            {realtimeStatus?.logs && realtimeStatus.logs.length > 0 && (
              <Box sx={{ width: '100%', mt: 1 }}>
                <Button
                  size="small"
                  startIcon={<TerminalIcon fontSize="small" />}
                  onClick={() => setShowLiveLogs((prev) => !prev)}
                  sx={{ textTransform: 'none', color: '#64748B', fontSize: '0.75rem' }}
                >
                  {showLiveLogs ? 'Hide Live Telemetry Stream' : `View Live Telemetry Stream (${realtimeStatus.logs.length} events)`}
                </Button>

                {showLiveLogs && (
                  <Box
                    sx={{
                      mt: 1.5,
                      p: 2,
                      bgcolor: '#0F172A',
                      color: '#38BDF8',
                      borderRadius: 2,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      maxHeight: 180,
                      overflowY: 'auto',
                      textAlign: 'left',
                      border: '1px solid #1E293B',
                    }}
                  >
                    {realtimeStatus.logs.map((logMsg, lIdx) => (
                      <Box key={lIdx} sx={{ py: 0.25, borderBottom: '1px solid #1E293B', color: '#E2E8F0' }}>
                        <Typography variant="inherit" sx={{ wordBreak: 'break-word' }}>
                          {logMsg}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. EMPTY STATE
  // ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  // 2. INITIAL STUDIO OVERVIEW STATE (Awaiting Evaluation)
  // ─────────────────────────────────────────────────────────────
  if (!evaluation) {
    return (
      <Card
        elevation={0}
        sx={{
          border: '1px solid #CBD5E1',
          borderRadius: 3,
          bgcolor: '#FFFFFF',
          minHeight: 520,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            borderBottom: '1px solid #F1F5F9',
            background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2.5,
                  bgcolor: '#EFF6FF',
                  color: '#1E40AF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #BFDBFE',
                }}
              >
                <SchoolIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                  Examination Evaluation Studio
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                  Autonomous K-12 Answer Evaluation & Pedagogical Diagnostic Engine
                </Typography>
              </Box>
            </Stack>
            <Chip
              size="small"
              label="Awaiting Evaluation"
              sx={{
                bgcolor: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #FDE68A',
                fontWeight: 700,
                fontSize: '0.6875rem',
              }}
            />
          </Box>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {/* Active Question Paper Summary */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#F8FAFC',
                border: '1px solid #E2E8F0',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                📋 Current Examination Paper Setup
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    Paper Title:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E40AF', noWrap: true }}>
                    {questionPaperTitle || 'Science Examination Paper'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    Questions Configured:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                    {totalQuestions || 0} Questions
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    Total Max Marks:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#059669' }}>
                    {totalMarks || 0} Marks
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Evaluation Pipeline Overview */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1.5 }}>
                ⚡ Automated Grading Pipeline
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      bgcolor: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      height: '100%',
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                      <SparklesIcon sx={{ fontSize: 18, color: '#2563EB' }} />
                      <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1E40AF' }}>
                        1. Multimodal OCR
                      </Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.5, display: 'block' }}>
                      Transcribes handwritten answers, preserves formulas, and normalizes student text.
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      bgcolor: '#EEF2FF',
                      border: '1px solid #E0E7FF',
                      height: '100%',
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                      <BrainIcon sx={{ fontSize: 18, color: '#4F46E5' }} />
                      <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#3730A3' }}>
                        2. Qdrant RAG
                      </Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.5, display: 'block' }}>
                      Grounds evaluation with official textbook curriculum modules & knowledge graphs.
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      bgcolor: '#ECFDF5',
                      border: '1px solid #D1FAE5',
                      height: '100%',
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                      <RubricIcon sx={{ fontSize: 18, color: '#059669' }} />
                      <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#065F46' }}>
                        3. DeepSeek Scoring
                      </Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.5, display: 'block' }}>
                      Step-wise rubric grading, marks allocation, and misconception identification.
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Instruction Banner */}
            <Alert
              severity="info"
              icon={<BoltIcon sx={{ color: '#2563EB' }} />}
              sx={{
                borderRadius: 2.5,
                bgcolor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                '& .MuiAlert-message': { fontSize: '0.8125rem', color: '#1E40AF', lineHeight: 1.6 },
              }}
            >
              <strong>Ready for Evaluation:</strong> Upload the student's handwritten answer sheet in <strong>Stage 2 (Upload)</strong> or enter sample answer text, then click <strong>"Run AI Examination Evaluation"</strong> below. Real-time pipeline telemetry and the complete diagnostic report will appear here.
            </Alert>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // Multi-Question vs Single Question data resolution
  const questionsList = evaluation.questions && evaluation.questions.length > 0
    ? evaluation.questions
    : [
        {
          question_number: 1,
          question_text: evaluation.overall_feedback || 'Question 1',
          marking_scheme: 'Standard Rubric',
          max_score: evaluation.max_score || evaluation.total_max_score || 2.0,
          score: evaluation.score || evaluation.total_score || 0.0,
          percentage: evaluation.percentage || 0.0,
          status: evaluation.status || 'PASS',
          breakdown: evaluation.breakdown || {},
          correct_points: evaluation.correct_points || [],
          misconceptions: evaluation.misconceptions || [],
          missing_concepts: evaluation.missing_concepts || [],
          improvement_guidance: evaluation.improvement_guidance || [],
          overall_feedback: evaluation.overall_feedback || '',
          student_answer_text: evaluation.extracted_text || '',
          rag_trace: evaluation.rag_trace || null,
        },
      ];

  const activeQ = questionsList[selectedQuestionIndex] || questionsList[0];
  const activeRagTrace = activeQ.rag_trace || evaluation.rag_trace || null;

  // Handle Score Override Submit
  const handleApplyOverride = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(overrideScoreVal);
    if (isNaN(parsed) || parsed < 0 || parsed > activeQ.max_score) {
      alert(`Score must be a number between 0 and ${activeQ.max_score}`);
      return;
    }
    setIsOverriding(true);
    try {
      await onOverrideScore({
        evaluation_id: evaluation.evaluation_id,
        question_number: activeQ.question_number,
        adjusted_score: parsed,
        max_score: activeQ.max_score,
        examiner_notes: overrideNotesVal || `Manual adjustment on Q${activeQ.question_number}`,
      });
      setShowOverridePanel(false);
    } catch (err) {
      alert('Failed to apply override: ' + (err.message || 'Unknown error'));
    } finally {
      setIsOverriding(false);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(evaluation, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getStatusBadge = (status, pct) => {
    if (pct >= 80 || status === 'EXEMPLARY') {
      return {
        color: 'success',
        label: 'Exemplary Mastery',
      };
    }
    if (pct >= 50 || status === 'PASS') {
      return {
        color: 'primary',
        label: 'Passed / Competent',
      };
    }
    if (pct >= 30 || status === 'NEEDS_IMPROVEMENT') {
      return {
        color: 'warning',
        label: 'Needs Revision',
      };
    }
    return {
      color: 'error',
      label: 'Below Passing Standard',
    };
  };

  const paperStatus = getStatusBadge(evaluation.status, evaluation.percentage);
  const qStatus = getStatusBadge(activeQ.status, activeQ.percentage);
  const qbd = activeQ.breakdown || {};

  return (
    <Card elevation={1} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: '#FFFFFF' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          {/* ─────────────────────────────────────────────────────────
           * A. EXAM PAPER OVERVIEW HERO
           * ───────────────────────────────────────────────────────── */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  Exam Paper Evaluation
                </Typography>
                <Chip
                  size="small"
                  label={paperStatus.label}
                  color={paperStatus.color}
                  sx={{ fontWeight: 700, fontSize: '0.6875rem' }}
                />
              </Stack>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                {questionsList.length} Questions Evaluated • DeepSeek-V3 Reasoning • Qdrant RAG Grounded
              </Typography>
            </Box>

            {/* Total Paper Score Box */}
            <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', display: 'block' }}>
                  Total Paper Score
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'baseline', justifyContent: 'flex-end' }}>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#1E40AF', fontFamily: 'monospace' }}>
                    {evaluation.total_score ?? evaluation.score}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'monospace' }}>
                    / {evaluation.total_max_score ?? evaluation.max_score} pts
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669' }}>
                  {evaluation.percentage}% Overall
                </Typography>
              </Box>

              <Stack direction="column" spacing={0.75} sx={{ pl: 2, borderLeft: '1px solid #E2E8F0' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleCopyJson}
                  startIcon={<CopyIcon sx={{ fontSize: 14 }} />}
                  sx={{ fontSize: '0.6875rem', py: 0.25, px: 1, color: '#475569', borderColor: '#CBD5E1' }}
                >
                  {copiedJson ? 'Copied' : 'JSON'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => window.print()}
                  startIcon={<PrintIcon sx={{ fontSize: 14 }} />}
                  sx={{ fontSize: '0.6875rem', py: 0.25, px: 1, color: '#475569', borderColor: '#CBD5E1' }}
                >
                  Print
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* OCR Normalization & Multi-Page Collation Summary Banner */}
          {evaluation.ocr_cleaning_summary && (
            <Alert
              severity="info"
              icon={<SparklesIcon sx={{ color: '#4F46E5' }} />}
              sx={{
                bgcolor: '#EEF2FF',
                border: '1px solid #C7D2FE',
                borderRadius: 2,
                '& .MuiAlert-message': { width: '100%' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#312E81', textTransform: 'uppercase' }}>
                  LLM OCR Normalization & Multi-Page Collation
                </Typography>
                <Chip
                  size="small"
                  icon={<PagesIcon sx={{ fontSize: 12 }} />}
                  label={`${evaluation.pages_processed || 1} Pages Processed`}
                  sx={{ height: 20, fontSize: '0.6875rem', bgcolor: '#E0E7FF', color: '#3730A3', fontWeight: 700 }}
                />
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#4338CA', lineHeight: 1.5 }}>
                {evaluation.ocr_cleaning_summary}
              </Typography>
            </Alert>
          )}

          {/* ─────────────────────────────────────────────────────────
           * B. QUESTION NAVIGATOR (PILLS)
           * ───────────────────────────────────────────────────────── */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Question Breakdown Navigator
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Select to inspect criteria, misconceptions & RAG grounding
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', pb: 0.5 }}>
              {questionsList.map((q, idx) => {
                const isSel = idx === selectedQuestionIndex;
                const qPct = q.percentage || 0;
                return (
                  <Button
                    key={idx}
                    variant={isSel ? 'contained' : 'outlined'}
                    color={isSel ? 'primary' : 'inherit'}
                    size="small"
                    onClick={() => {
                      setSelectedQuestionIndex(idx);
                      setShowOverridePanel(false);
                    }}
                    sx={{
                      minWidth: 100,
                      py: 0.5,
                      px: 1.5,
                      borderRadius: 2,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderColor: isSel ? 'primary.main' : '#E2E8F0',
                      bgcolor: isSel ? '#1E40AF' : '#F8FAFC',
                      color: isSel ? '#FFFFFF' : '#334155',
                    }}
                  >
                    Q#{q.question_number || idx + 1}
                    <Chip
                      size="small"
                      label={`${q.score}/${q.max_score}m`}
                      sx={{
                        ml: 0.75,
                        height: 18,
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        bgcolor: isSel ? 'rgba(255,255,255,0.2)' : qPct >= 80 ? '#D1FAE5' : qPct >= 50 ? '#DBEAFE' : '#FEF3C7',
                        color: isSel ? '#FFFFFF' : qPct >= 80 ? '#065F46' : qPct >= 50 ? '#1E40AF' : '#92400E',
                      }}
                    />
                  </Button>
                );
              })}
            </Box>
          </Box>

          {/* ─────────────────────────────────────────────────────────
           * C. ACTIVE QUESTION DETAILS CARD
           * ───────────────────────────────────────────────────────── */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: '#FFFFFF',
              border: '1px solid #CBD5E1',
            }}
          >
            <Stack spacing={2}>
              {/* Question Header & Examiner Override */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, pb: 1.5, borderBottom: '1px solid #F1F5F9' }}>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', textTransform: 'uppercase' }}>
                      Question #{activeQ.question_number} Diagnostic Report
                    </Typography>
                    <Chip
                      size="small"
                      label={`${activeQ.score}/${activeQ.max_score} Marks (${activeQ.percentage}%)`}
                      color={qStatus.color}
                      sx={{ fontWeight: 700, fontSize: '0.6875rem' }}
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#475569', mt: 0.5, fontStyle: 'italic', fontSize: '0.8125rem' }}>
                    "{activeQ.question_text}"
                  </Typography>
                </Box>

                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => setShowOverridePanel(!showOverridePanel)}
                  startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                  sx={{ fontSize: '0.6875rem', fontWeight: 700 }}
                >
                  Override Marks
                </Button>
              </Box>

              {/* Examiner Override Form */}
              {showOverridePanel && (
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <form onSubmit={handleApplyOverride}>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#92400E' }}>
                          Examiner Score Adjustment for Question #{activeQ.question_number}
                        </Typography>
                        <Button size="small" onClick={() => setShowOverridePanel(false)} sx={{ fontSize: '0.6875rem', color: '#92400E' }}>
                          Cancel
                        </Button>
                      </Box>

                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label={`Adjusted Score (Max: ${activeQ.max_score})`}
                            slotProps={{ htmlInput: { min: 0, max: activeQ.max_score, step: 0.5 } }}
                            value={overrideScoreVal}
                            onChange={(e) => setOverrideScoreVal(e.target.value)}
                            required
                            placeholder={activeQ.score.toString()}
                            sx={{ bgcolor: '#FFFFFF' }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 8 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Examiner Remarks / Rationale"
                            value={overrideNotesVal}
                            onChange={(e) => setOverrideNotesVal(e.target.value)}
                            placeholder="Reason for adjustment..."
                            sx={{ bgcolor: '#FFFFFF' }}
                          />
                        </Grid>
                      </Grid>

                      <Button
                        type="submit"
                        variant="contained"
                        color="warning"
                        size="small"
                        disabled={isOverriding}
                        sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
                      >
                        {isOverriding ? 'Saving...' : 'Save Adjusted Marks'}
                      </Button>
                    </Stack>
                  </form>
                </Box>
              )}

              {/* Criteria Progress Meters */}
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>Correctness</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#1E40AF', fontFamily: 'monospace' }}>
                        {qbd.factual_correctness ?? '–'} pts
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, ((qbd.factual_correctness || 0) / (activeQ.max_score * 0.5 || 1)) * 100)}
                      sx={{ height: 6, borderRadius: 3, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: '#1E40AF' } }}
                    />
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>Completeness</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#6366F1', fontFamily: 'monospace' }}>
                        {qbd.structural_completeness ?? '–'} pts
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, ((qbd.structural_completeness || 0) / (activeQ.max_score * 0.3 || 1)) * 100)}
                      sx={{ height: 6, borderRadius: 3, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: '#6366F1' } }}
                    />
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>Understanding</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>
                        {qbd.conceptual_understanding ?? '–'} pts
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, ((qbd.conceptual_understanding || 0) / (activeQ.max_score * 0.2 || 1)) * 100)}
                      sx={{ height: 6, borderRadius: 3, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: '#059669' } }}
                    />
                  </Box>
                </Grid>
              </Grid>

              {/* Student Answer Segment with Cleaned vs Raw OCR Toggle */}
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Student Answer (Q{activeQ.question_number})
                    </Typography>
                    {activeQ.sources_found_on_pages && activeQ.sources_found_on_pages.length > 0 && (
                      <Chip
                        size="small"
                        icon={<PagesIcon sx={{ fontSize: 12 }} />}
                        label={`Pages: ${activeQ.sources_found_on_pages.join(', ')}`}
                        sx={{ height: 20, fontSize: '0.6875rem', bgcolor: '#EFF6FF', color: '#1E40AF', fontWeight: 700 }}
                      />
                    )}
                    {activeQ.cleaning_notes && (
                      <Chip
                        size="small"
                        icon={<SparklesIcon sx={{ fontSize: 12 }} />}
                        label={activeQ.cleaning_notes}
                        sx={{ height: 20, fontSize: '0.6875rem', bgcolor: '#F5F3FF', color: '#6D28D9', fontWeight: 600 }}
                      />
                    )}
                  </Stack>

                  {activeQ.raw_student_answer && activeQ.raw_student_answer !== (activeQ.cleaned_student_answer || activeQ.student_answer_text) && (
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={showRawAnswerMap[activeQ.question_number] ? 'raw' : 'cleaned'}
                      onChange={(e, val) => {
                        if (val) {
                          setShowRawAnswerMap((prev) => ({ ...prev, [activeQ.question_number]: val === 'raw' }));
                        }
                      }}
                      sx={{ height: 26 }}
                    >
                      <ToggleButton value="cleaned" sx={{ px: 1, fontSize: '0.6875rem', fontWeight: 700 }}>
                        ✨ Cleaned & Collated
                      </ToggleButton>
                      <ToggleButton value="raw" sx={{ px: 1, fontSize: '0.6875rem', fontWeight: 700 }}>
                        📝 Raw OCR Fragment
                      </ToggleButton>
                    </ToggleButtonGroup>
                  )}
                </Box>

                <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.8125rem',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                      color: '#0F172A',
                    }}
                  >
                    {showRawAnswerMap[activeQ.question_number]
                      ? (activeQ.raw_student_answer || activeQ.student_answer_text || 'No raw fragment recorded')
                      : (activeQ.cleaned_student_answer || activeQ.student_answer_text || '[Not attempted by student in submitted sheet]')}
                  </Typography>
                </Box>
              </Box>

              {/* Strengths & Correct Points */}
              {activeQ.correct_points && activeQ.correct_points.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#065F46', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <CheckIcon sx={{ fontSize: 16, color: '#059669' }} /> Correct Steps Demonstrated
                  </Typography>
                  <Grid container spacing={1}>
                    {activeQ.correct_points.map((pt, i) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={i}>
                        <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', gap: 1 }}>
                          <CheckIcon sx={{ fontSize: 14, color: '#059669', mt: 0.25, flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ color: '#064E3B', fontWeight: 600 }}>
                            {pt}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Misconceptions & Conceptual Errors */}
              {activeQ.misconceptions && activeQ.misconceptions.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <ErrorIcon sx={{ fontSize: 16, color: '#DC2626' }} /> Conceptual Errors & Misconceptions
                  </Typography>
                  <Stack spacing={1}>
                    {activeQ.misconceptions.map((item, i) => (
                      <Box key={i} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#FEF2F2', border: '1px solid #FECACA' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#991B1B' }}>
                            {item.concept || 'Conceptual Flaw'}
                          </Typography>
                          {item.impact && (
                            <Chip size="small" label={item.impact} sx={{ height: 18, fontSize: '0.625rem', bgcolor: '#FEE2E2', color: '#991B1B', fontWeight: 700 }} />
                          )}
                        </Box>
                        {item.student_claim && (
                          <Typography variant="caption" sx={{ color: '#7F1D1D', display: 'block', mb: 0.5 }}>
                            <strong>Student Claim:</strong> "{item.student_claim}"
                          </Typography>
                        )}
                        {item.correction && (
                          <Box sx={{ p: 1, borderRadius: 1, bgcolor: '#FFFFFF', border: '1px solid #FCA5A5' }}>
                            <Typography variant="caption" sx={{ color: '#065F46', fontWeight: 600 }}>
                              <strong>Curriculum Correction:</strong> {item.correction}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Missing Concepts */}
              {activeQ.missing_concepts && activeQ.missing_concepts.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#92400E', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                    <WarningIcon sx={{ fontSize: 16, color: '#D97706' }} /> Missing Concepts / Unaddressed Criteria
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                    {activeQ.missing_concepts.map((mc, i) => (
                      <Chip
                        key={i}
                        size="small"
                        label={`• ${mc}`}
                        sx={{ bgcolor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', fontWeight: 600, fontSize: '0.6875rem' }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Targeted Textbook Revision */}
              {activeQ.improvement_guidance && activeQ.improvement_guidance.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <BookIcon sx={{ fontSize: 16, color: '#1E40AF' }} /> Targeted Textbook Revision
                  </Typography>
                  <Stack spacing={1}>
                    {activeQ.improvement_guidance.map((g, i) => (
                      <Box key={i} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#1E3A8A', display: 'block' }}>
                          {g.resource || 'NCERT Textbook Reference'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#1E40AF', display: 'block' }}>
                          {g.suggestion}
                        </Typography>
                        {g.practice && (
                          <Typography variant="caption" sx={{ color: '#4338CA', fontFamily: 'monospace', fontWeight: 600, mt: 0.25, display: 'block' }}>
                            🎯 Practice: {g.practice}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* ─────────────────────────────────────────────────────────
           * D. RAG PIPELINE & CURRICULUM GROUNDING INSPECTOR
           * ───────────────────────────────────────────────────────── */}
          <Accordion
            expanded={showFullRagTrace}
            onChange={() => setShowFullRagTrace(!showFullRagTrace)}
            elevation={0}
            sx={{
              border: '1px solid #C7D2FE',
              borderRadius: '12px !important',
              bgcolor: '#F5F7FF',
              '&::before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#4338CA' }} />}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: '#E0E7FF', color: '#4338CA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BrainIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#312E81', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    Qdrant RAG Grounding & Telemetry Inspector
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6366F1' }}>
                    Targeted vector search results for Question #{activeQ.question_number}
                  </Typography>
                </Box>
              </Stack>
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0, px: 2.5, pb: 2.5 }}>
              <Stack spacing={2}>
                <Divider sx={{ borderColor: '#E0E7FF' }} />

                {/* Metrics Grid */}
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, display: 'block' }}>Vector DB</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                        Qdrant ({activeRagTrace?.qdrant_collection || 'k12_textbooks'})
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, display: 'block' }}>Embeddings</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                        MiniLM-L6-v2 (384d)
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, display: 'block' }}>Retrieved Chunks</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                        {activeRagTrace?.chunks?.length || 0} Grounded
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, display: 'block' }}>Status</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
                        {activeRagTrace?.retrieval_status || 'ACTIVE'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Metadata Filter Display */}
                {activeRagTrace?.filter_subject && (
                  <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#312E81' }}>
                      🎯 Qdrant Metadata Filter Applied:
                    </Typography>
                    <Chip size="small" label={`subject: ${activeRagTrace.filter_subject}`} sx={{ bgcolor: '#FFFFFF', color: '#1E40AF', fontWeight: 700, fontSize: '0.6875rem' }} />
                    {activeRagTrace.filter_academic_level && (
                      <Chip size="small" label={`class_level: ${activeRagTrace.filter_academic_level}`} sx={{ bgcolor: '#FFFFFF', color: '#1E40AF', fontWeight: 700, fontSize: '0.6875rem' }} />
                    )}
                    <Typography variant="caption" sx={{ color: '#6366F1' }}>
                      (Strict curriculum isolation active)
                    </Typography>
                  </Box>
                )}

                {/* Formulated Query */}
                {activeRagTrace?.query && (
                  <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', mb: 0.25 }}>
                      Search Query Dispatched to Qdrant:
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#0F172A', display: 'block' }} noWrap>
                      "{activeRagTrace.query}"
                    </Typography>
                    {activeRagTrace.keywords && activeRagTrace.keywords.length > 0 && (
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.625rem' }}>Keywords:</Typography>
                        {activeRagTrace.keywords.map((kw, i) => (
                          <Chip key={i} size="small" label={kw} sx={{ height: 18, fontSize: '0.625rem', bgcolor: '#F1F5F9', color: '#475569' }} />
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}

                {/* Retrieved Textbook Chunks */}
                {activeRagTrace?.chunks && activeRagTrace.chunks.length > 0 ? (
                  <Stack spacing={1.5}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Authoritative Textbook Chunks Grounded:
                    </Typography>
                    {activeRagTrace.chunks.map((chunk, i) => (
                      <Box key={i} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <BookIcon sx={{ fontSize: 14, color: '#1E40AF' }} /> {chunk.chapter}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${chunk.match_percentage}% Cosine Match`}
                            color="success"
                            sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 800 }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#334155', fontStyle: 'italic', bgcolor: '#F8FAFC', p: 1.25, borderRadius: 1, border: '1px solid #F1F5F9', mb: 0.5 }}>
                          "{chunk.text}"
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.625rem', display: 'block' }}>
                          Source: {chunk.source}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontStyle: 'italic' }}>
                    Standard rubric & heuristic evaluation applied for this question.
                  </Typography>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default EvaluationReportView;
