import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
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
  Stack,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  PhotoCamera as CameraIcon,
  Create as PenIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  DeleteOutlined as DeleteIcon,
  Visibility as ViewIcon,
  Layers as PagesIcon,
} from '@mui/icons-material';

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
    const filtered = newFiles.filter(
      (f) => validTypes.includes(f.type) || f.name.match(/\.(png|jpe?g|webp|pdf)$/i)
    );

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

  const handleRemoveAll = () => {
    files.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
  };

  return (
    <Card elevation={1} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: '#FFFFFF' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header with Step Indicator & Mode Switcher */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, pb: 2, mb: 2.5, borderBottom: '1px solid #F1F5F9' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                bgcolor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.875rem',
                border: '1px solid #A7F3D0',
              }}
            >
              2
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                  Student Answer Submission
                </Typography>
                {files.length > 0 && (
                  <Chip
                    size="small"
                    icon={<PagesIcon sx={{ fontSize: 14 }} />}
                    label={`${files.length} Pages Attached`}
                    sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 700, border: '1px solid #6EE7B7' }}
                  />
                )}
              </Stack>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                Upload handwritten answer sheet (PDF or images) or provide typed text
              </Typography>
            </Box>
          </Stack>

          {/* Mode Switcher Tabs */}
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            sx={{
              minHeight: 38,
              bgcolor: '#F1F5F9',
              borderRadius: 2,
              p: 0.5,
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab
              value="upload"
              label={`Handwritten Sheets ${files.length > 0 ? `(${files.length})` : ''}`}
              icon={<CameraIcon sx={{ fontSize: 16 }} />}
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
              value="text"
              label="Typed Text"
              icon={<PenIcon sx={{ fontSize: 16 }} />}
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

        {activeTab === 'upload' ? (
          <Stack spacing={2.5}>
            {/* Drag and Drop Zone */}
            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              sx={{
                p: 3.5,
                borderRadius: 2.5,
                border: '2px dashed',
                borderColor: isDragging ? '#2563EB' : '#CBD5E1',
                bgcolor: isDragging ? '#EFF6FF' : '#F8FAFC',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#3B82F6',
                  bgcolor: '#F1F5F9',
                },
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />

              <Stack spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    bgcolor: '#EFF6FF',
                    color: '#1E40AF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UploadIcon sx={{ fontSize: 28 }} />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
                    Click to browse or drag & drop student answer sheets
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    Supports multi-page CBSE answer sheets (PDF, PNG, JPG, JPEG)
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Chip size="small" label="Gemini Vision OCR" sx={{ fontSize: '0.6875rem', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }} />
                  <Chip size="small" label="Auto Multi-Page Collation" sx={{ fontSize: '0.6875rem', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }} />
                  <Chip size="small" label="Handwriting Correction" sx={{ fontSize: '0.6875rem', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }} />
                </Stack>
              </Stack>
            </Box>

            {/* Uploaded Files Gallery */}
            {files.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Uploaded Answer Pages ({files.length})
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={handleRemoveAll}
                    sx={{ fontSize: '0.6875rem', fontWeight: 600, py: 0 }}
                  >
                    Remove all
                  </Button>
                </Box>

                <Grid container spacing={1.5}>
                  {files.map((item, index) => (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={item.id}>
                      <Card
                        elevation={0}
                        sx={{
                          border: '1px solid #E2E8F0',
                          borderRadius: 2,
                          overflow: 'hidden',
                          bgcolor: '#FFFFFF',
                          position: 'relative',
                        }}
                      >
                        {item.isPdf ? (
                          <Box
                            sx={{
                              height: 96,
                              bgcolor: '#FEF2F2',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              p: 1.5,
                            }}
                          >
                            <PdfIcon sx={{ fontSize: 32, color: '#DC2626', mb: 0.5 }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#991B1B', textAlign: 'center' }} noWrap>
                              PDF Document
                            </Typography>
                          </Box>
                        ) : (
                          <Box
                            onClick={() => setPreviewModalUrl(item.previewUrl)}
                            sx={{
                              height: 96,
                              bgcolor: '#F8FAFC',
                              cursor: 'zoom-in',
                              position: 'relative',
                              '&:hover .zoom-overlay': { opacity: 1 },
                            }}
                          >
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <Box
                              className="zoom-overlay"
                              sx={{
                                position: 'absolute',
                                inset: 0,
                                bgcolor: 'rgba(15, 23, 42, 0.4)',
                                opacity: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'opacity 0.2s',
                                color: '#FFFFFF',
                              }}
                            >
                              <ZoomInIcon sx={{ fontSize: 24 }} />
                            </Box>
                          </Box>
                        )}

                        <Box sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ minWidth: 0, flex: 1, pr: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#0F172A', display: 'block' }} noWrap>
                              P.{index + 1} {item.file.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.625rem' }}>
                              {(item.file.size / 1024).toFixed(0)} KB
                            </Typography>
                          </Box>

                          <IconButton
                            size="small"
                            onClick={() => handleRemoveFile(item.id)}
                            sx={{ color: '#94A3B8', '&:hover': { color: '#DC2626' } }}
                          >
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Stack>
        ) : (
          /* Typed Answer Text View */
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>
                Student Transcribed / Typed Answer Text
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>
                {answerText.trim().split(/\s+/).filter(Boolean).length} words
              </Typography>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder="Paste or type student handwritten responses here if not uploading image scans..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  bgcolor: '#F8FAFC',
                },
              }}
            />
          </Box>
        )}

        {/* Full Image Preview Modal */}
        <Dialog
          open={Boolean(previewModalUrl)}
          onClose={() => setPreviewModalUrl(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Answer Sheet Inspection (High Resolution)
            </Typography>
            <IconButton size="small" onClick={() => setPreviewModalUrl(null)}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 2, textAlign: 'center', bgcolor: '#F8FAFC' }}>
            {previewModalUrl && (
              <img
                src={previewModalUrl}
                alt="Enlarged student answer sheet"
                style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 1 }}>
            <Button onClick={() => setPreviewModalUrl(null)} size="small">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AnswerUploadDropzone;
