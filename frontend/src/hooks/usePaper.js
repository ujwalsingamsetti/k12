import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPaper, getPaperDetails, getPaperSubmissions } from '../services/api';
import { useToast } from './useToast';

/**
 * Custom hook to load, manage, and inspect a Question Paper
 */
export function usePaper(paperId, options = {}) {
  const { isTeacher = false, autoFetch = true } = options;
  const [paper, setPaper] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(Boolean(paperId && autoFetch));
  const [error, setError] = useState(null);
  const toast = useToast();

  const fetchPaper = useCallback(async () => {
    if (!paperId) return;
    setLoading(true);
    setError(null);
    try {
      if (isTeacher) {
        const [paperRes, subsRes] = await Promise.all([
          getPaper(paperId),
          getPaperSubmissions(paperId).catch(() => ({ data: [] })),
        ]);
        setPaper(paperRes.data);
        setSubmissions(subsRes.data || []);
      } else {
        const paperRes = await getPaperDetails(paperId);
        setPaper(paperRes.data);
      }
    } catch (err) {
      setError(err);
      toast?.error(err.response?.data?.detail || 'Failed to load question paper');
    } finally {
      setLoading(false);
    }
  }, [paperId, isTeacher, toast]);

  useEffect(() => {
    if (autoFetch && paperId) {
      fetchPaper();
    }
  }, [autoFetch, paperId, fetchPaper]);

  const totalMarks = useMemo(() => {
    if (!paper) return 0;
    if (paper.total_marks) return paper.total_marks;
    return (paper.questions || []).reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
  }, [paper]);

  const questionCount = useMemo(() => {
    return paper?.questions?.length || 0;
  }, [paper]);

  return {
    paper,
    submissions,
    loading,
    error,
    totalMarks,
    questionCount,
    reload: fetchPaper,
  };
}

export default usePaper;
