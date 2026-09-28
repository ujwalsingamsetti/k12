import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButtonGroup,
  ToggleButton,
  Pagination,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  DeleteOutlined as DeleteIcon,
  Visibility as ViewIcon,
  OpenInNew as LaunchIcon,
  Download as DownloadIcon,
  Assessment as AssessmentIcon,
  CheckCircle as PassIcon,
  EmojiEvents as TrophyIcon,
  WarningAmber as WarningIcon,
  ErrorOutlined as FailIcon,
  ViewModule as GridViewIcon,
  ViewList as TableViewIcon,
  Close as CloseIcon,
  School as SchoolIcon,
  MenuBook as BookIcon,
  ContentCopy as CopyIcon,
  Add as AddIcon,
  DeleteSweep as ClearIcon,
} from '@mui/icons-material';

import {
  getEvaluationHistory,
  getEvaluationHistoryDetails,
  deleteEvaluationHistory,
  clearEvaluationHistory,
  downloadBlob,
  overrideEvaluationScore,
} from '../../services/api';
import { useToast } from '../../context/ToastContext';
import EvaluationReportView from './EvaluationReportView';

const STATUS_CONFIG = {
  EXEMPLARY: {
    label: 'Exemplary',
    bg: '#ECFDF5',
    color: '#065F46',
    border: '#A7F3D0',
    barColor: '#10B981',
    icon: <TrophyIcon sx={{ fontSize: 15, color: '#059669' }} />,
  },
  PASS: {
    label: 'Pass / Competent',
    bg: '#EFF6FF',
    color: '#1E40AF',
    border: '#BFDBFE',
    barColor: '#3B82F6',
    icon: <PassIcon sx={{ fontSize: 15, color: '#2563EB' }} />,
  },
  NEEDS_IMPROVEMENT: {
    label: 'Needs Remediation',
    bg: '#FFFBEB',
    color: '#92400E',
    border: '#FDE68A',
    barColor: '#F59E0B',
    icon: <WarningIcon sx={{ fontSize: 15, color: '#D97706' }} />,
  },
  FAIL: {
    label: 'Critical Gaps',
    bg: '#FEF2F2',
    color: '#991B1B',
    border: '#FECACA',
    barColor: '#EF4444',
    icon: <FailIcon sx={{ fontSize: 15, color: '#DC2626' }} />,
  },
};

const SUBJECT_COLORS = {
  science: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  mathematics: { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
  physics: { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' },
  chemistry: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  computerscience: { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' },
  default: { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' },
};

const getSubjectStyle = (sub) => {
  const key = (sub || '').toLowerCase().replace(/[\s_-]+/g, '');
  return SUBJECT_COLORS[key] || SUBJECT_COLORS.default;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const PreviousEvaluationsView = ({ onOpenInStudio, onNewEvaluation }) => {
  const toast = useToast();

  // Records & Stats State
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total_evaluations: 0,
    average_percentage: 0.0,
    exemplary_count: 0,
    pass_count: 0,
    needs_improvement_count: 0,
    fail_count: 0,
    total_questions_evaluated: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected Detail Modal
  const [activeReportId, setActiveReportId] = useState(null);
  const [activeReportData, setActiveReportData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Confirm Delete Dialog
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Confirm Clear All Dialog
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Load records from PostgreSQL
  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };
      if (selectedSubject !== 'ALL') params.subject = selectedSubject;
      if (selectedLevel !== 'ALL') params.academic_level = selectedLevel;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await getEvaluationHistory(params);
      if (res.data) {
        setItems(res.data.items || []);
        setTotalCount(res.data.total_count || 0);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load evaluation history:', err);
      toast.error('Failed to load evaluation history from PostgreSQL database.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, selectedSubject, selectedLevel, selectedStatus, searchQuery, toast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Open Full Diagnostic Report Dialog
  const handleViewReport = async (item) => {
    setActiveReportId(item.id);
    setIsLoadingDetail(true);
    setIsDetailDialogOpen(true);
    try {
      const res = await getEvaluationHistoryDetails(item.id);
      setActiveReportData(res.data);
    } catch (err) {
      console.error('Failed to fetch evaluation details:', err);
      toast.error('Could not retrieve full evaluation diagnostic report.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Close report dialog
  const handleCloseReportDialog = () => {
    setIsDetailDialogOpen(false);
    setActiveReportId(null);
    setActiveReportData(null);
  };

  // Score override within the report dialog
  const handleOverrideScore = async (overrideData) => {
    try {
      const payload = {
        evaluation_id: activeReportId,
        question_number: overrideData.question_number,
        adjusted_score: overrideData.adjusted_score,
        max_score: overrideData.max_score,
        examiner_notes: overrideData.examiner_notes || 'Manual override from History view',
      };
      const res = await overrideEvaluationScore(payload);
      if (res.data) {
        toast.success(`Score adjusted for Question #${overrideData.question_number}`);
        // Refresh details
        const updatedDetails = await getEvaluationHistoryDetails(activeReportId);
        setActiveReportData(updatedDetails.data);
        // Refresh list
        fetchHistory();
      }
    } catch (err) {
      console.error('Failed to override score:', err);
      toast.error('Could not save score override.');
    }
  };

  // Open evaluation in active Studio
  const handleLaunchStudio = (item, reportPayload = null) => {
    if (onOpenInStudio) {
      if (reportPayload) {
        onOpenInStudio(reportPayload);
      } else {
        // Fetch full payload first if needed
        getEvaluationHistoryDetails(item.id)
          .then((res) => {
            onOpenInStudio(res.data);
          })
          .catch((err) => {
            console.error('Failed to fetch full report for studio:', err);
            toast.error('Failed to load evaluation into studio.');
          });
      }
    }
  };

  // Download evaluation JSON
  const handleDownloadJson = async (item) => {
    try {
      const res = await getEvaluationHistoryDetails(item.id);
      const dataStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      downloadBlob(blob, `evaluation_${item.id.slice(0, 8)}_${item.subject || 'exam'}.json`);
      toast.success('Evaluation report downloaded as JSON.');
    } catch (err) {
      console.error('Failed to export JSON:', err);
      toast.error('Failed to download evaluation report.');
    }
  };

  // Delete single evaluation record
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteEvaluationHistory(itemToDelete.id);
      toast.success('Evaluation record deleted from PostgreSQL.');
      setItemToDelete(null);
      fetchHistory();
    } catch (err) {
      console.error('Failed to delete evaluation record:', err);
      toast.error('Failed to delete evaluation record.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear all evaluations
  const handleClearAllConfirm = async () => {
    setIsClearingAll(true);
    try {
      await clearEvaluationHistory();
      toast.success('All evaluation history cleared from database.');
      setIsClearAllDialogOpen(false);
      fetchHistory();
    } catch (err) {
      console.error('Failed to clear evaluations:', err);
      toast.error('Failed to clear evaluation history.');
    } finally {
      setIsClearingAll(false);
    }
  };

  // Copy evaluation ID
  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    toast.info('Copied evaluation ID to clipboard.');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Box sx={{ pb: 6 }}>
      {/* ─────────────────────────────────────────────────────────────
       * 1. TOP HEADER & METRICS SUMMARY CARDS
       * ───────────────────────────────────────────────────────────── */}
      <Stack spacing={3}>
        {/* Header Action Bar */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ 'alignItems': 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Previous Evaluations & Archive
              </Typography>
              <Chip
                label="PostgreSQL Persistent"
                size="small"
                sx={{
                  bgcolor: '#EFF6FF',
                  color: '#1E40AF',
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                  border: '1px solid #BFDBFE',
                }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
              Review past student answer evaluations, inspect multimodal diagnostic reports, and re-open papers in the studio.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ 'alignItems': 'center' }}>
            <Button
              variant="outlined"
              size="medium"
              startIcon={<RefreshIcon />}
              onClick={fetchHistory}
              sx={{
                borderRadius: 2.5,
                borderColor: '#CBD5E1',
                color: '#334155',
                bgcolor: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#F8FAFC', borderColor: '#94A3B8' },
              }}
            >
              Refresh
            </Button>

            {items.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="medium"
                startIcon={<ClearIcon />}
                onClick={() => setIsClearAllDialogOpen(true)}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Clear History
              </Button>
            )}

            <Button
              variant="contained"
              size="medium"
              startIcon={<AddIcon />}
              onClick={onNewEvaluation}
              sx={{
                borderRadius: 2.5,
                bgcolor: '#1E40AF',
                textTransform: 'none',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(30,64,175,0.25)',
                '&:hover': { bgcolor: '#1D4ED8' },
              }}
            >
              New Evaluation
            </Button>
          </Stack>
        </Box>

        {/* Executive KPI Metric Cards */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  bgcolor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1E40AF',
                }}
              >
                <AssessmentIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Evaluations
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  {stats.total_evaluations}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  {stats.total_questions_evaluated} questions evaluated
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  bgcolor: stats.average_percentage >= 70 ? '#ECFDF5' : '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stats.average_percentage >= 70 ? '#059669' : '#2563EB',
                }}
              >
                <TrophyIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Average Score
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: stats.average_percentage >= 70 ? '#059669' : '#0F172A' }}>
                  {stats.average_percentage}%
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  Across all saved records
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  bgcolor: '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                }}
              >
                <PassIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Exemplary & Pass
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  {stats.exemplary_count + stats.pass_count}
                </Typography>
                <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                  {stats.exemplary_count} Exemplary • {stats.pass_count} Pass
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  bgcolor: stats.needs_improvement_count + stats.fail_count > 0 ? '#FFFBEB' : '#F8FAFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stats.needs_improvement_count + stats.fail_count > 0 ? '#D97706' : '#94A3B8',
                }}
              >
                <WarningIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Needs Remediation
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  {stats.needs_improvement_count + stats.fail_count}
                </Typography>
                <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600 }}>
                  {stats.needs_improvement_count} Review • {stats.fail_count} Critical
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* ─────────────────────────────────────────────────────────────
         * 2. SEARCH & FILTER TOOLBAR
         * ───────────────────────────────────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: '#FFFFFF',
            border: '1px solid #E2E8F0',
          }}
        >
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            {/* Search Input */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search examination, student snippet, or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2, bgcolor: '#F8FAFC', fontSize: '0.875rem' },
                }}
              />
            </Grid>

            {/* Subject Filter */}
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.875rem' }}>Subject</InputLabel>
                <Select
                  value={selectedSubject}
                  label="Subject"
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setPage(1);
                  }}
                  sx={{ borderRadius: 2, bgcolor: '#F8FAFC', fontSize: '0.875rem' }}
                >
                  <MenuItem value="ALL">All Subjects</MenuItem>
                  <MenuItem value="science">Science</MenuItem>
                  <MenuItem value="mathematics">Mathematics</MenuItem>
                  <MenuItem value="physics">Physics</MenuItem>
                  <MenuItem value="chemistry">Chemistry</MenuItem>
                  <MenuItem value="computer science">Computer Science</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Academic Level Filter */}
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.875rem' }}>Class / Level</InputLabel>
                <Select
                  value={selectedLevel}
                  label="Class / Level"
                  onChange={(e) => {
                    setSelectedLevel(e.target.value);
                    setPage(1);
                  }}
                  sx={{ borderRadius: 2, bgcolor: '#F8FAFC', fontSize: '0.875rem' }}
                >
                  <MenuItem value="ALL">All Classes</MenuItem>
                  <MenuItem value="Class 10">Class 10</MenuItem>
                  <MenuItem value="Class 12">Class 12</MenuItem>
                  <MenuItem value="Undergraduate">Undergraduate</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Status Filter */}
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.875rem' }}>Status</InputLabel>
                <Select
                  value={selectedStatus}
                  label="Status"
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  sx={{ borderRadius: 2, bgcolor: '#F8FAFC', fontSize: '0.875rem' }}
                >
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="EXEMPLARY">Exemplary (&ge; 85%)</MenuItem>
                  <MenuItem value="PASS">Pass (50 - 84%)</MenuItem>
                  <MenuItem value="NEEDS_IMPROVEMENT">Needs Improvement</MenuItem>
                  <MenuItem value="FAIL">Critical Fail (&lt; 30%)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Layout Toggle */}
            <Grid size={{ xs: 6, md: 2 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ToggleButtonGroup
                size="small"
                value={viewMode}
                exclusive
                onChange={(e, val) => val && setViewMode(val)}
                sx={{
                  bgcolor: '#F1F5F9',
                  p: 0.5,
                  borderRadius: 2,
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 0.5,
                    '&.Mui-selected': { bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
                  },
                }}
              >
                <ToggleButton value="table">
                  <Tooltip title="Table View">
                    <TableViewIcon sx={{ fontSize: 18, color: '#475569' }} />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="grid">
                  <Tooltip title="Grid Cards View">
                    <GridViewIcon sx={{ fontSize: 18, color: '#475569' }} />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Paper>

        {/* ─────────────────────────────────────────────────────────────
         * 3. EVALUATION RECORDS CONTENT
         * ───────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <Paper
            elevation={0}
            sx={{
              p: 8,
              textAlign: 'center',
              borderRadius: 3,
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
            }}
          >
            <CircularProgress size={40} sx={{ color: '#1E40AF', mb: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#334155' }}>
              Querying evaluation records from PostgreSQL...
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
              Connecting to saved_evaluations table
            </Typography>
          </Paper>
        ) : items.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 8,
              textAlign: 'center',
              borderRadius: 3,
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: '#EFF6FF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1E40AF',
                mb: 2,
              }}
            >
              <AssessmentIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
              No evaluations found
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 440, mx: 'auto', mb: 3 }}>
              {searchQuery || selectedSubject !== 'ALL' || selectedLevel !== 'ALL' || selectedStatus !== 'ALL'
                ? 'No evaluations match your current filter criteria. Try clearing or relaxing the search filters.'
                : 'You have not completed any evaluations yet. Evaluate student answer sheets in the Exam Evaluator to archive records in PostgreSQL.'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onNewEvaluation}
              sx={{
                borderRadius: 2.5,
                bgcolor: '#1E40AF',
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
                '&:hover': { bgcolor: '#1D4ED8' },
              }}
            >
              Start New Evaluation
            </Button>
          </Paper>
        ) : viewMode === 'table' ? (
          /* ── Table Layout ── */
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            <TableContainer>
              <Table sx={{ minWidth: 800 }}>
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8125rem' }}>
                      Date & Examination
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8125rem' }}>
                      Subject & Level
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8125rem' }}>
                      Questions
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8125rem' }}>
                      Score & Performance
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8125rem' }}>
                      Student Answer Preview
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8125rem' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => {
                    const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.PASS;
                    const subStyle = getSubjectStyle(item.subject);

                    return (
                      <TableRow
                        key={item.id}
                        hover
                        sx={{
                          '&:hover': { bgcolor: '#F8FAFC' },
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* Title & Date */}
                        <TableCell sx={{ maxWidth: 280 }}>
                          <Stack spacing={0.5}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: '#0F172A',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 260,
                              }}
                              title={item.title}
                            >
                              {item.title || 'Examination Evaluation'}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ 'alignItems': 'center' }}>
                              <Typography variant="caption" sx={{ color: '#64748B' }}>
                                {formatDate(item.evaluated_at)}
                              </Typography>
                              <Tooltip title="Click to copy evaluation ID">
                                <Chip
                                  size="small"
                                  label={item.id.slice(0, 8)}
                                  onClick={() => handleCopyId(item.id)}
                                  sx={{
                                    height: 18,
                                    fontSize: '0.625rem',
                                    fontWeight: 600,
                                    bgcolor: '#F1F5F9',
                                    color: '#475569',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: '#E2E8F0' },
                                  }}
                                />
                              </Tooltip>
                            </Stack>
                          </Stack>
                        </TableCell>

                        {/* Subject & Level */}
                        <TableCell>
                          <Stack direction="row" spacing={0.75} sx={{ 'alignItems': 'center' }}>
                            <Chip
                              size="small"
                              label={item.subject ? item.subject.toUpperCase() : 'GENERAL'}
                              sx={{
                                height: 22,
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                bgcolor: subStyle.bg,
                                color: subStyle.text,
                                border: `1px solid ${subStyle.border}`,
                              }}
                            />
                            <Chip
                              size="small"
                              label={item.academic_level || 'Class 10'}
                              sx={{
                                height: 22,
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                bgcolor: '#F8FAFC',
                                color: '#475569',
                                border: '1px solid #E2E8F0',
                              }}
                            />
                          </Stack>
                        </TableCell>

                        {/* Questions count */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                            {item.total_questions || 1} Qs
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            {item.pages_processed || 1} page(s)
                          </Typography>
                        </TableCell>

                        {/* Score & Performance Progress */}
                        <TableCell sx={{ minWidth: 160 }}>
                          <Stack spacing={0.5}>
                            <Stack direction="row" sx={{ 'alignItems': 'center', 'justifyContent': 'space-between' }}>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                                {item.total_score} / {item.total_max_score}
                              </Typography>
                              <Chip
                                size="small"
                                icon={statusMeta.icon}
                                label={`${item.percentage}%`}
                                sx={{
                                  height: 20,
                                  fontSize: '0.6875rem',
                                  fontWeight: 800,
                                  bgcolor: statusMeta.bg,
                                  color: statusMeta.color,
                                  border: `1px solid ${statusMeta.border}`,
                                }}
                              />
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(item.percentage || 0, 100)}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: '#F1F5F9',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: statusMeta.barColor,
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Stack>
                        </TableCell>

                        {/* Student Answer Snippet */}
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#64748B',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              fontFamily: 'monospace',
                              bgcolor: '#F8FAFC',
                              p: 0.75,
                              borderRadius: 1.5,
                              border: '1px solid #F1F5F9',
                            }}
                          >
                            {item.student_answer_snippet || '(OCR extracted handwriting)'}
                          </Typography>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} sx={{ 'justifyContent': 'flex-end' }}>
                            <Tooltip title="View Diagnostic Report">
                              <IconButton
                                size="small"
                                onClick={() => handleViewReport(item)}
                                sx={{
                                  color: '#1E40AF',
                                  bgcolor: '#EFF6FF',
                                  '&:hover': { bgcolor: '#DBEAFE' },
                                }}
                              >
                                <ViewIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Open in Evaluation Studio">
                              <IconButton
                                size="small"
                                onClick={() => handleLaunchStudio(item)}
                                sx={{
                                  color: '#4F46E5',
                                  bgcolor: '#EEF2FF',
                                  '&:hover': { bgcolor: '#E0E7FF' },
                                }}
                              >
                                <LaunchIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Download JSON Audit Report">
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadJson(item)}
                                sx={{
                                  color: '#059669',
                                  bgcolor: '#ECFDF5',
                                  '&:hover': { bgcolor: '#D1FAE5' },
                                }}
                              >
                                <DownloadIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete from Database">
                              <IconButton
                                size="small"
                                onClick={() => setItemToDelete(item)}
                                sx={{
                                  color: '#DC2626',
                                  bgcolor: '#FEF2F2',
                                  '&:hover': { bgcolor: '#FEE2E2' },
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : (
          /* ── Grid Cards Layout ── */
          <Grid container spacing={2.5}>
            {items.map((item) => {
              const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.PASS;
              const subStyle = getSubjectStyle(item.subject);

              return (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={item.id}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      bgcolor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#93C5FD',
                        boxShadow: '0 8px 24px rgba(30,64,175,0.08)',
                      },
                    }}
                  >
                    {/* Card Header */}
                    <Box sx={{ mb: 2 }}>
                      <Stack direction="row" sx={{  mb: 1, 'alignItems': 'flex-start', 'justifyContent': 'space-between' }}>
                        <Stack direction="row" spacing={1} sx={{ 'alignItems': 'center' }}>
                          <Chip
                            size="small"
                            label={item.subject ? item.subject.toUpperCase() : 'GENERAL'}
                            sx={{
                              height: 22,
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              bgcolor: subStyle.bg,
                              color: subStyle.text,
                              border: `1px solid ${subStyle.border}`,
                            }}
                          />
                          <Chip
                            size="small"
                            label={item.academic_level || 'Class 10'}
                            sx={{
                              height: 22,
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              bgcolor: '#F8FAFC',
                              color: '#475569',
                              border: '1px solid #E2E8F0',
                            }}
                          />
                        </Stack>
                        <Chip
                          size="small"
                          icon={statusMeta.icon}
                          label={statusMeta.label}
                          sx={{
                            height: 22,
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            bgcolor: statusMeta.bg,
                            color: statusMeta.color,
                            border: `1px solid ${statusMeta.border}`,
                          }}
                        />
                      </Stack>

                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 700,
                          color: '#0F172A',
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          height: 42,
                        }}
                      >
                        {item.title}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{  mt: 0.5, 'alignItems': 'center' }}>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          {formatDate(item.evaluated_at)}
                        </Typography>
                        <Chip
                          size="small"
                          label={`ID: ${item.id.slice(0, 8)}`}
                          onClick={() => handleCopyId(item.id)}
                          sx={{
                            height: 18,
                            fontSize: '0.625rem',
                            bgcolor: '#F1F5F9',
                            color: '#64748B',
                            cursor: 'pointer',
                          }}
                        />
                      </Stack>
                    </Box>

                    {/* Score Bar Section */}
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                      <Stack direction="row" sx={{  mb: 0.75, 'alignItems': 'center', 'justifyContent': 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                          Total Awarded Score
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                          {item.total_score} / {item.total_max_score}{' '}
                          <span style={{ color: statusMeta.color, fontWeight: 700 }}>({item.percentage}%)</span>
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(item.percentage || 0, 100)}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#E2E8F0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: statusMeta.barColor,
                            borderRadius: 3,
                          },
                        }}
                      />
                      <Stack direction="row" sx={{  mt: 1, 'justifyContent': 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          {item.total_questions || 1} Question(s)
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          {item.pages_processed || 1} Page(s) Scanned
                        </Typography>
                      </Stack>
                    </Box>

                    {/* Student snippet */}
                    <Box sx={{ flex: 1, mb: 2 }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Answer Excerpt:
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#334155',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontFamily: 'monospace',
                          bgcolor: '#F8FAFC',
                          p: 1,
                          borderRadius: 1.5,
                          border: '1px solid #F1F5F9',
                        }}
                      >
                        {item.student_answer_snippet || '(Student handwriting transcribed via OCR)'}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Card Actions */}
                    <Stack direction="row" spacing={1} sx={{ 'alignItems': 'center', 'justifyContent': 'space-between' }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleViewReport(item)}
                        sx={{
                          borderRadius: 2,
                          bgcolor: '#1E40AF',
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          flex: 1,
                          '&:hover': { bgcolor: '#1D4ED8' },
                        }}
                      >
                        View Report
                      </Button>

                      <Tooltip title="Open in Studio">
                        <IconButton
                          size="small"
                          onClick={() => handleLaunchStudio(item)}
                          sx={{
                            color: '#4F46E5',
                            bgcolor: '#EEF2FF',
                            '&:hover': { bgcolor: '#E0E7FF' },
                          }}
                        >
                          <LaunchIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Download JSON">
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadJson(item)}
                          sx={{
                            color: '#059669',
                            bgcolor: '#ECFDF5',
                            '&:hover': { bgcolor: '#D1FAE5' },
                          }}
                        >
                          <DownloadIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete Record">
                        <IconButton
                          size="small"
                          onClick={() => setItemToDelete(item)}
                          sx={{
                            color: '#DC2626',
                            bgcolor: '#FEF2F2',
                            '&:hover': { bgcolor: '#FEE2E2' },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, val) => setPage(val)}
              color="primary"
              shape="rounded"
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: 2,
                  fontWeight: 600,
                },
              }}
            />
          </Box>
        )}
      </Stack>

      {/* ─────────────────────────────────────────────────────────────
       * 4. FULL DIAGNOSTIC REPORT MODAL DIALOG
       * ───────────────────────────────────────────────────────────── */}
      <Dialog
        open={isDetailDialogOpen}
        onClose={handleCloseReportDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            maxHeight: '92vh',
            bgcolor: '#F8FAFC',
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 2.5,
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ 'alignItems': 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                Diagnostic Evaluation Report
              </Typography>
              {activeReportData && (
                <Chip
                  size="small"
                  label={`Evaluation ID: ${activeReportData.evaluation_id || activeReportId}`}
                  sx={{
                    bgcolor: '#EFF6FF',
                    color: '#1E40AF',
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    border: '1px solid #BFDBFE',
                  }}
                />
              )}
            </Stack>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Full multimodal examination audit retrieved from PostgreSQL saved_evaluations
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ 'alignItems': 'center' }}>
            {activeReportData && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<LaunchIcon />}
                onClick={() => {
                  handleLaunchStudio(null, activeReportData);
                  handleCloseReportDialog();
                }}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Open in Studio
              </Button>
            )}
            <IconButton onClick={handleCloseReportDialog} sx={{ color: '#64748B' }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
          {isLoadingDetail ? (
            <Box sx={{ py: 12, textAlign: 'center' }}>
              <CircularProgress size={44} sx={{ color: '#1E40AF', mb: 2 }} />
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#334155' }}>
                Loading full evaluation diagnostic report...
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Reconstructing multi-question rubrics and vector traces
              </Typography>
            </Box>
          ) : activeReportData ? (
            <EvaluationReportView
              evaluation={activeReportData}
              isLoading={false}
              loadingStep={5}
              realtimeStatus={{ stage: 'completed', status: 'done', progress: 100 }}
              onOverrideScore={handleOverrideScore}
            />
          ) : (
            <Alert severity="error" sx={{ borderRadius: 2.5 }}>
              Could not load evaluation report data.
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
          <Button
            onClick={handleCloseReportDialog}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, color: '#64748B' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
       * 5. CONFIRM DELETE SINGLE ITEM DIALOG
       * ───────────────────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>
          Delete Evaluation Record?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Are you sure you want to delete the evaluation record for{' '}
            <strong style={{ color: '#0F172A' }}>{itemToDelete?.title}</strong>? This action will permanently remove it from the PostgreSQL database.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setItemToDelete(null)}
            disabled={isDeleting}
            sx={{ textTransform: 'none', color: '#64748B', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            {isDeleting ? <CircularProgress size={20} color="inherit" /> : 'Delete Record'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
       * 6. CONFIRM CLEAR ALL HISTORY DIALOG
       * ───────────────────────────────────────────────────────────── */}
      <Dialog
        open={isClearAllDialogOpen}
        onClose={() => setIsClearAllDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#991B1B' }}>
          Clear All Evaluation History?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            This will permanently delete all <strong style={{ color: '#0F172A' }}>{totalCount}</strong> archived evaluations from the PostgreSQL database. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setIsClearAllDialogOpen(false)}
            disabled={isClearingAll}
            sx={{ textTransform: 'none', color: '#64748B', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleClearAllConfirm}
            disabled={isClearingAll}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            {isClearingAll ? <CircularProgress size={20} color="inherit" /> : 'Clear All History'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PreviousEvaluationsView;
