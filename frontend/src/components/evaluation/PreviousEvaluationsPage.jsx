import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Stack,
  Typography,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Assignment as ExamIcon,
  MenuBook as TextbookIcon,
  History as HistoryIcon,
  School as SchoolIcon,
  Storage as DbIcon,
  CheckCircle as CheckIcon,
  Psychology as BrainIcon,
} from '@mui/icons-material';

import PreviousEvaluationsView from './PreviousEvaluationsView';
import { getEvaluationHistoryDetails } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const WORKSPACE_STORAGE_KEY = 'k12_studio_workspace_state_v2';

const PreviousEvaluationsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Handler to re-open a historical evaluation into the Evaluation Studio
  const handleOpenInStudio = async (item) => {
    try {
      let reportData = item.full_report;
      if (!reportData && item.id) {
        toast.info('Fetching complete diagnostic report from PostgreSQL...');
        const res = await getEvaluationHistoryDetails(item.id);
        reportData = res.data;
      }

      if (reportData) {
        // Load into studio workspace state in localStorage
        try {
          const currentRaw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
          const current = currentRaw ? JSON.parse(currentRaw) : {};
          const updatedState = {
            ...current,
            evaluationResult: reportData,
            subject: reportData.subject || current.subject || 'science',
            academicLevel: reportData.academic_level || current.academicLevel || 'Class 10',
          };
          localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(updatedState));
        } catch (e) {
          console.warn('Could not persist opened report to workspace state:', e);
        }

        toast.success(`Loaded evaluation into Studio (${reportData.total_score}/${reportData.total_max_score} marks)`);
        navigate('/results');
      } else {
        toast.error('Could not load report data for this evaluation.');
      }
    } catch (err) {
      console.error('Failed to open evaluation in studio:', err);
      toast.error('Failed to load evaluation details.');
    }
  };

  // Handler to start a fresh evaluation
  const handleNewEvaluation = () => {
    navigate('/setup');
  };

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
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
                cursor: 'pointer',
              }}
              onClick={() => navigate('/setup')}
            />

            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontSize: '0.875rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
                  Context-Aware Automated Grading of Written Exams
                </Typography>
                <Chip
                  label="Qdrant + LLM"
                  size="small"
                  sx={{
                    height: 20,
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

          {/* Navigation Tabs */}
          <Tabs
            value="history"
            onChange={(e, val) => {
              if (val === 'evaluator') navigate('/setup');
              if (val === 'textbooks') navigate('/textbooks');
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
              icon={<DbIcon sx={{ fontSize: 14, color: '#0D9488 !important' }} />}
              label="PostgreSQL Archive Active"
              sx={{ bgcolor: '#F0FDFA', color: '#0F766E', fontWeight: 700, border: '1px solid #99F6E4', fontSize: '0.6875rem' }}
            />
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
          </Stack>
        </Toolbar>
      </AppBar>

      {/* ─────────────────────────────────────────────────────────────
       * 2. MAIN CONTENT: PREVIOUS EVALUATIONS PAGE
       * ───────────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, py: 3, px: { xs: 2, md: 4 }, maxWidth: 1440, mx: 'auto', width: '100%' }}>
        <PreviousEvaluationsView
          onOpenInStudio={handleOpenInStudio}
          onNewEvaluation={handleNewEvaluation}
        />
      </Box>

      {/* ─────────────────────────────────────────────────────────────
       * 3. EXECUTIVE FOOTER
       * ───────────────────────────────────────────────────────────── */}
      <Box
        component="footer"
        sx={{
          py: 2.5,
          px: { xs: 2, md: 4 },
          bgcolor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          mt: 'auto',
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
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            Qdrant Vector DB • DeepSeek-V3 / Gemini • PostgreSQL Persistent Archive
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default PreviousEvaluationsPage;
