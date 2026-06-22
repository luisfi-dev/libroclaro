import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Document } from 'react-pdf';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadIcon from '@mui/icons-material/Download';
import LockIcon from '@mui/icons-material/Lock';
import { annotationsApi, booksApi, materialsApi } from '../api/endpoints';
import PdfPageWithAnnotations from '../components/PdfPageWithAnnotations';
import { MarkdownPreview } from '../components/MarkdownPreview';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, getToken } from '../api/client';
import type { AnnotationMeta } from '../types';

const PAGE_WIDTH = 720;

export default function BookReaderPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const requestingRef = useRef<Set<string>>(new Set());

  const bookQuery = useQuery({
    queryKey: ['book', id],
    queryFn: () => booksApi.get(id),
  });

  const pdfFile = useMemo(() => {
    const token = getToken();
    return {
      url: booksApi.pdfUrl(id),
      httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
      withCredentials: false,
    };
  }, [id]);

  const annotationsQuery = useQuery({
    queryKey: ['annotations', id, pageNumber],
    queryFn: () => annotationsApi.listForBook(id, pageNumber),
    enabled: numPages > 0,
  });

  const materialsQuery = useQuery({
    queryKey: ['materials', id, pageNumber],
    queryFn: () => materialsApi.listForBook(id, pageNumber),
    enabled: numPages > 0,
  });

  const quota = annotationsQuery.data?.quota;

  // Para EDITOR, el contenido ya viene incluido y no se descuenta cuota
  useEffect(() => {
    if (!annotationsQuery.data) return;
    const next: Record<string, string> = {};
    for (const a of annotationsQuery.data.annotations) {
      if (a.content) next[a.id] = a.content;
    }
    if (Object.keys(next).length > 0) {
      setRevealed((r) => ({ ...r, ...next }));
    }
  }, [annotationsQuery.data]);

  const handleAnnotationHover = async (annotationId: string) => {
    if (revealed[annotationId]) return;
    if (requestingRef.current.has(annotationId)) return;
    if (user?.role === 'EDITOR') return;
    requestingRef.current.add(annotationId);
    try {
      const data = await annotationsApi.reveal(annotationId);
      setRevealed((r) => ({ ...r, [annotationId]: data.annotation.content ?? '' }));
      queryClient.setQueryData(['annotations', id, pageNumber], (prev: typeof annotationsQuery.data) =>
        prev ? { ...prev, quota: data.quota } : prev,
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      requestingRef.current.delete(annotationId);
    }
  };

  const handleDownload = async (annotated: boolean) => {
    try {
      const token = getToken();
      const url = booksApi.pdfUrl(id, annotated);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'No se pudo descargar' }));
        throw new Error(json.error || 'No se pudo descargar');
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${bookQuery.data?.title || 'libro'}${annotated ? ' (anotado)' : ''}.pdf`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de descarga');
    }
  };

  const canAnnotatedDownload = user?.plan !== 'GRATUITO' || user?.role === 'EDITOR';

  if (bookQuery.isError || !bookQuery.data) {
    return <Alert severity="error">No se pudo cargar el libro</Alert>;
  }

  const book = bookQuery.data;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h2">{book.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {book.subject} · {book.gradeLevel} · Ciclo {book.schoolYear}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Descargar PDF original">
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => handleDownload(false)}
              variant="outlined"
              data-testid="reader-download-original"
            >
              Original
            </Button>
          </Tooltip>
          <Tooltip title={canAnnotatedDownload ? 'Descargar con anotaciones' : 'Requiere plan Pro o Institucional'}>
            <span>
              <Button
                startIcon={canAnnotatedDownload ? <DownloadIcon /> : <LockIcon />}
                onClick={() => handleDownload(true)}
                variant="contained"
                disabled={!canAnnotatedDownload}
                data-testid="reader-download-annotated"
              >
                Anotado
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {quota && !quota.unlimited && (
        <Box sx={{ mb: 2 }} data-testid="reader-quota">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Correcciones consultadas este mes: {quota.used} / {quota.limit}
            </Typography>
            {quota.remaining === 0 && (
              <Button size="small" onClick={() => navigate('/subscriptions')} data-testid="reader-upgrade">
                Mejorar a Pro
              </Button>
            )}
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (quota.used / quota.limit) * 100)}
            sx={{ mt: 0.5 }}
            color={quota.remaining === 0 ? 'error' : 'primary'}
          />
        </Box>
      )}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
        <Paper sx={{ p: 2, flex: '0 0 auto' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <IconButton onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="body2">
              Página {pageNumber} {numPages > 0 && `de ${numPages}`}
            </Typography>
            <IconButton
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={numPages > 0 && pageNumber >= numPages}
            >
              <ChevronRightIcon />
            </IconButton>
          </Stack>

          <Document
            file={pdfFile}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={(err) => setError(err.message)}
            loading={
              <Box sx={{ width: PAGE_WIDTH, height: PAGE_WIDTH * 1.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            }
          >
            {numPages > 0 && (
              <PdfPageWithAnnotations
                pageNumber={pageNumber}
                width={PAGE_WIDTH}
                annotations={annotationsQuery.data?.annotations ?? []}
                contentByAnnotationId={revealed}
                onAnnotationHover={handleAnnotationHover}
              />
            )}
          </Document>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, alignSelf: 'stretch', minWidth: 280 }}>
          <Typography variant="h3" sx={{ mb: 1 }}>
            Material complementario
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Para la página actual
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {materialsQuery.isLoading && <CircularProgress size={24} />}

          {materialsQuery.data && materialsQuery.data.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No hay material complementario para esta página.
            </Typography>
          )}

          <Stack spacing={2}>
            {materialsQuery.data?.map((m) => (
              <Paper key={m.id} variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {m.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Págs. {m.fromPage}–{m.toPage}
                </Typography>
                {m.locked ? (
                  <Alert severity="info" icon={<LockIcon fontSize="small" />} sx={{ py: 0 }}>
                    Disponible con plan Pro o Institucional
                  </Alert>
                ) : (
                  m.content && <MarkdownPreview source={m.content} />
                )}
              </Paper>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}

export type { AnnotationMeta };
