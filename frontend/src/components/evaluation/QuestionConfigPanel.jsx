import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Divider,
  Alert,
  Tooltip,
  Stack,
  CircularProgress,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  School as SchoolIcon,
  MenuBook as BookIcon,
  Add as AddIcon,
  DeleteOutlined as DeleteIcon,
  CloudUpload as UploadIcon,
  Description as DescriptionIcon,
  AutoAwesome as SparklesIcon,
  Tune as TuneIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  RestartAlt as ResetIcon,
  CheckCircle as CheckCircleIcon,
  AttachFile as FileIcon,
} from '@mui/icons-material';

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
  questions,
  setQuestions,
  activeQuestionIndex,
  setActiveQuestionIndex,
  subject,
  setSubject,
  academicLevel,
  setAcademicLevel,
  presets,
  selectedPresetId,
  onSelectPreset,
  onReset,
  onExtractQuestionPaper,
  isExtractingPaper,
  onDeleteCustomPaper,
}) => {
  const [panelMode, setPanelMode] = useState('builder'); // 'builder' | 'upload_qp'
  const [qpFile, setQpFile] = useState(null);
  const [paperToDelete, setPaperToDelete] = useState(null);
  const qpInputRef = useRef(null);

  const activePreset = presets.find((p) => p.id === selectedPresetId);
  const isUploadedPaperActive = Boolean(activePreset && activePreset.isUploaded);

  const activeQ = questions[activeQuestionIndex] || questions[0] || {
    question_number: 1,
    question_text: '',
    marking_scheme: '',
    max_score: 2.0,
  };

  const totalPaperMarks = questions.reduce((sum, q) => sum + (parseFloat(q.max_score) || 0), 0);

  const handleUpdateActiveQ = (field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      if (updated[activeQuestionIndex]) {
        updated[activeQuestionIndex] = {
          ...updated[activeQuestionIndex],
          [field]: value,
        };
      }
      return updated;
    });
  };

  const handleAddQuestion = () => {
    const nextNum = questions.length > 0 ? Math.max(...questions.map((q) => q.question_number || 1)) + 1 : 1;
    const newQ = {
      question_number: nextNum,
      question_text: '',
      marking_scheme: '',
      max_score: 2.0,
    };
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleDeleteQuestion = (indexToDelete) => {
    if (questions.length <= 1) {
      return;
    }
    setQuestions((prev) => {
      const filtered = prev.filter((_, idx) => idx !== indexToDelete);
      return filtered.map((q, idx) => ({ ...q, question_number: idx + 1 }));
    });
    if (activeQuestionIndex >= indexToDelete && activeQuestionIndex > 0) {
      setActiveQuestionIndex(activeQuestionIndex - 1);
    }
  };

  const handleQpFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setQpFile(e.target.files[0]);
    }
  };

  const handleTriggerExtract = async () => {
    if (!qpFile) return;
    try {
      await onExtractQuestionPaper(qpFile);
      setQpFile(null);
      setPanelMode('builder');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card elevation={1} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: '#FFFFFF' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header & Mode Switcher */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'between', gap: 2, pb: 2, mb: 2.5, borderBottom: '1px solid #F1F5F9' }}>
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  bgcolor: '#EFF6FF',
                  color: '#1E40AF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  border: '1px solid #DBEAFE',
                }}
              >
                1
              </Box>
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                    Exam Question Paper Setup
                  </Typography>
                  <Chip
                    size="small"
                    label={`${questions.length} Qs • ${totalPaperMarks} Marks`}
                    sx={{ bgcolor: '#EFF6FF', color: '#1E40AF', fontWeight: 700, border: '1px solid #BFDBFE' }}
                  />
                </Stack>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                  Target academic standard, official questions, and step-wise marking rubrics
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Mode Switcher Tabs */}
          <Tabs
            value={panelMode}
            onChange={(e, val) => setPanelMode(val)}
            sx={{
              minHeight: 38,
              bgcolor: '#F1F5F9',
              borderRadius: 2,
              p: 0.5,
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab
              value="builder"
              label="Paper Builder"
              icon={<DescriptionIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              sx={{
                minHeight: 32,
                py: 0.5,
                px: 1.5,
                fontSize: '0.75rem',
                borderRadius: 1.5,
                '&.Mui-selected': { bgcolor: '#FFFFFF', color: '#1E40AF', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' },
              }}
            />
            <Tab
              value="upload_qp"
              label="Upload Paper (PDF)"
              icon={<SparklesIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              sx={{
                minHeight: 32,
                py: 0.5,
                px: 1.5,
                fontSize: '0.75rem',
                borderRadius: 1.5,
                '&.Mui-selected': { bgcolor: '#FFFFFF', color: '#1E40AF', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' },
              }}
            />
          </Tabs>
        </Box>

        {/* Subject & Academic Standard Selectors */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="subject-select-label" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                Subject / Curriculum Discipline
              </InputLabel>
              <Select
                labelId="subject-select-label"
                value={subject}
                label="Subject / Curriculum Discipline"
                onChange={(e) => setSubject(e.target.value)}
                sx={{ fontSize: '0.8125rem', fontWeight: 500 }}
              >
                {SUBJECT_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.8125rem' }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="academic-level-label" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                Academic Standard / Level
              </InputLabel>
              <Select
                labelId="academic-level-label"
                value={academicLevel}
                label="Academic Standard / Level"
                onChange={(e) => setAcademicLevel(e.target.value)}
                sx={{ fontSize: '0.8125rem', fontWeight: 500 }}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.8125rem' }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* VIEW A: UPLOAD QUESTION PAPER PDF */}
        {panelMode === 'upload_qp' ? (
          <Box
            sx={{
              p: 3,
              borderRadius: 2.5,
              bgcolor: '#F8FAFC',
              border: '1px dashed #CBD5E1',
              textAlign: 'center',
            }}
          >
            <Stack spacing={2} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  bgcolor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.12)',
                }}
              >
                <UploadIcon sx={{ fontSize: 28 }} />
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
                  Extract Questions from Official Exam Paper
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', maxWidth: 460, display: 'block', mx: 'auto' }}>
                  Upload any CBSE, ICSE, or Board Question Paper PDF. Gemini Multimodal AI will automatically parse question numbers, prompts, and marks into the configuration panel.
                </Typography>
              </Box>

              <Box
                onClick={() => qpInputRef.current && qpInputRef.current.click()}
                sx={{
                  width: '100%',
                  p: 2.5,
                  borderRadius: 2,
                  border: '1px dashed #94A3B8',
                  bgcolor: '#FFFFFF',
                  cursor: 'pointer',
                  '&:hover': { borderColor: '#2563EB', bgcolor: '#F8FAFC' },
                  transition: 'all 0.2s',
                }}
              >
                <input
                  ref={qpInputRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleQpFileChange}
                  style={{ display: 'none' }}
                />
                {qpFile ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                    <FileIcon sx={{ color: '#2563EB' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                      {qpFile.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      ({(qpFile.size / 1024).toFixed(0)} KB)
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: '#64748B' }}>
                    Click or drop Question Paper PDF (supports SQP 2023-24, 2024-25, etc.)
                  </Typography>
                )}
              </Box>

              {qpFile && (
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={isExtractingPaper}
                  onClick={handleTriggerExtract}
                  startIcon={isExtractingPaper ? <CircularProgress size={16} color="inherit" /> : <SparklesIcon />}
                  sx={{ py: 1.25, fontWeight: 700 }}
                >
                  {isExtractingPaper ? 'Extracting Questions with Multimodal AI...' : 'Extract Questions from Paper'}
                </Button>
              )}
            </Stack>
          </Box>
        ) : (
          /* VIEW B: MULTI-QUESTION BUILDER */
          <Stack spacing={2}>
            {/* Presets Toolbar */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 220 }}>
                {presets && presets.length > 0 && (
                  <FormControl fullWidth size="small">
                    <Select
                      displayEmpty
                      value={selectedPresetId || ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          onSelectPreset(e.target.value);
                        }
                      }}
                      renderValue={(selectedId) => {
                        if (!selectedId) {
                          return (
                            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                              ⚡ Select or Load Question Paper...
                            </Typography>
                          );
                        }
                        const p = presets.find((item) => item.id === selectedId);
                        if (!p) return 'Select Question Paper';
                        const marks = p.max_score || p.questions?.reduce((s, q) => s + (q.max_score || 0), 0) || 0;
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, overflow: 'hidden' }}>
                            <span>{p.isUploaded ? '📄' : '⚡'}</span>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: p.isUploaded ? '#4338CA' : '#1E40AF',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.title} ({marks} Marks)
                            </Typography>
                          </Box>
                        );
                      }}
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#1E40AF',
                        bgcolor: '#FFFFFF',
                        '& .MuiSelect-select': {
                          py: 1,
                          display: 'flex',
                          alignItems: 'center',
                        },
                      }}
                    >
                      <MenuItem value="" disabled sx={{ fontSize: '0.75rem' }}>
                        ⚡ Select or Load Question Paper...
                      </MenuItem>
                      {/* Uploaded / Custom Question Papers */}
                      {presets.filter((p) => p.isUploaded).length > 0 && (
                        <MenuItem disabled sx={{ fontSize: '0.6875rem', fontWeight: 800, color: '#6366F1', bgcolor: '#F5F3FF' }}>
                          ── 📄 UPLOADED QUESTION PAPERS ──
                        </MenuItem>
                      )}
                      {presets
                        .filter((p) => p.isUploaded)
                        .map((preset) => (
                          <MenuItem
                            key={preset.id}
                            value={preset.id}
                            sx={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#4338CA',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 1,
                              px: 1.5,
                            }}
                          >
                            <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mr: 1, flex: 1 }}>
                              📄 {preset.title} ({preset.max_score} Marks)
                            </Box>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setPaperToDelete(preset);
                              }}
                              sx={{
                                color: '#EF4444',
                                p: 0.5,
                                ml: 1,
                                '&:hover': { bgcolor: '#FEE2E2' },
                              }}
                              title="Delete this question paper"
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </MenuItem>
                        ))}

                      {/* Official Verified Presets */}
                      {presets.filter((p) => p.isUploaded).length > 0 && (
                        <MenuItem disabled sx={{ fontSize: '0.6875rem', fontWeight: 800, color: '#1E40AF', bgcolor: '#EFF6FF' }}>
                          ── ⚡ OFFICIAL CBSE EXAM PAPERS ──
                        </MenuItem>
                      )}
                      {presets
                        .filter((p) => !p.isUploaded)
                        .map((preset) => (
                          <MenuItem key={preset.id} value={preset.id} sx={{ fontSize: '0.75rem' }}>
                            ⚡ {preset.title} ({preset.max_score} Marks)
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                )}
              </Box>

              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {isUploadedPaperActive && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => setPaperToDelete(activePreset)}
                    startIcon={<DeleteIcon />}
                    sx={{ fontSize: '0.75rem', py: 0.75, fontWeight: 700 }}
                  >
                    Delete Paper
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={handleAddQuestion}
                  startIcon={<AddIcon />}
                  sx={{ fontSize: '0.75rem', py: 0.75 }}
                >
                  Add Question
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onReset}
                  startIcon={<ResetIcon />}
                  sx={{ fontSize: '0.75rem', py: 0.75, color: '#64748B', borderColor: '#CBD5E1' }}
                >
                  Clear
                </Button>
              </Stack>
            </Box>

            {/* Question Pills Navigator */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                overflowX: 'auto',
                py: 0.75,
                px: 0.5,
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 3 },
                '&::-webkit-scrollbar-thumb:hover': { bgcolor: '#94A3B8' },
              }}
            >
              {questions.map((q, idx) => {
                const isActive = idx === activeQuestionIndex;
                const marks = q.max_score ?? 1;
                return (
                  <Button
                    key={idx}
                    variant={isActive ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setActiveQuestionIndex(idx)}
                    sx={{
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      minWidth: 'auto',
                      px: 1.5,
                      py: 0.6,
                      borderRadius: 2,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      borderColor: isActive ? '#1E40AF' : '#CBD5E1',
                      bgcolor: isActive ? '#1E40AF' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#334155',
                      boxShadow: isActive ? '0 2px 6px rgba(30,64,175,0.25)' : 'none',
                      '&:hover': {
                        bgcolor: isActive ? '#1D4ED8' : '#F8FAFC',
                        borderColor: isActive ? '#1D4ED8' : '#94A3B8',
                      },
                    }}
                  >
                    <span>Q{q.question_number || idx + 1}</span>
                    <Chip
                      size="small"
                      label={`${marks}m`}
                      sx={{
                        height: 18,
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: isActive ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                        color: isActive ? '#FFFFFF' : '#475569',
                        border: isActive ? 'none' : '1px solid #E2E8F0',
                      }}
                    />
                  </Button>
                );
              })}
            </Box>

            {/* Active Question Editor Card */}
            <Card
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                border: '1px solid #CBD5E1',
                bgcolor: '#FFFFFF',
              }}
            >
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E40AF' }}>
                    Editing Question #{activeQ.question_number || activeQuestionIndex + 1}
                  </Typography>
                  {(activeQ.section || activeQ.question_type) && (
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.25 }}>
                      {activeQ.section && (
                        <Chip size="small" label={activeQ.section} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }} />
                      )}
                      {activeQ.question_type && (
                        <Chip size="small" label={activeQ.question_type} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }} />
                      )}
                    </Stack>
                  )}
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B' }}>
                        Marks:
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        slotProps={{ htmlInput: { min: 0.5, max: 50, step: 0.5 } }}
                        value={activeQ.max_score}
                        onChange={(e) => handleUpdateActiveQ('max_score', parseFloat(e.target.value) || 1)}
                        sx={{
                          width: 72,
                          '& .MuiInputBase-input': {
                            py: 0.5,
                            px: 1,
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            textAlign: 'center',
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#94A3B8' }}>
                        PTS
                      </Typography>
                    </Stack>

                    {questions.length > 1 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteQuestion(activeQuestionIndex)}
                        title="Delete Question"
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    )}
                  </Stack>
                </Box>

                {/* Question Prompt */}
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Question Prompt"
                  placeholder="Enter the official question prompt, derivation, or problem text..."
                  value={activeQ.question_text}
                  onChange={(e) => handleUpdateActiveQ('question_text', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true, sx: { fontWeight: 600, fontSize: '0.875rem' } } }}
                  sx={{
                    '& .MuiInputBase-root': { fontSize: '0.8125rem', lineHeight: 1.6 },
                  }}
                />

                {/* Marking Scheme */}
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Step-wise Marking Scheme / Rubric"
                  placeholder="1. Correct definition or formula [1 Mark]&#10;2. Step-by-step derivation [1 Mark]"
                  value={activeQ.marking_scheme}
                  onChange={(e) => handleUpdateActiveQ('marking_scheme', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true, sx: { fontWeight: 600, fontSize: '0.875rem' } } }}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: '0.8125rem',
                      fontFamily: '"JetBrains Mono", monospace',
                      lineHeight: 1.5,
                      bgcolor: '#F8FAFC',
                    },
                  }}
                />

                {/* Question Navigation */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
                  <Button
                    size="small"
                    variant="text"
                    disabled={activeQuestionIndex === 0}
                    onClick={() => setActiveQuestionIndex(activeQuestionIndex - 1)}
                    startIcon={<PrevIcon />}
                    sx={{ fontSize: '0.75rem', color: '#475569' }}
                  >
                    Previous Question
                  </Button>

                  <Button
                    size="small"
                    variant="text"
                    disabled={activeQuestionIndex === questions.length - 1}
                    onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)}
                    endIcon={<NextIcon />}
                    sx={{ fontSize: '0.75rem', color: '#475569' }}
                  >
                    Next Question
                  </Button>
                </Box>
              </Stack>
            </Card>
          </Stack>
        )}

        {/* Delete Question Paper Confirmation Dialog */}
        <Dialog
          open={Boolean(paperToDelete)}
          onClose={() => setPaperToDelete(null)}
          maxWidth="xs"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', pb: 1 }}>
            Delete Question Paper?
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: '#475569' }}>
              Are you sure you want to delete <strong>{paperToDelete?.title}</strong>? This will remove this question paper from your saved question papers.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setPaperToDelete(null)}
              sx={{ textTransform: 'none', color: '#64748B', borderColor: '#CBD5E1' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                if (paperToDelete && onDeleteCustomPaper) {
                  onDeleteCustomPaper(paperToDelete.id);
                }
                setPaperToDelete(null);
              }}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Delete Question Paper
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default QuestionConfigPanel;
