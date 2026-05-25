import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Document } from 'react-pdf';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { annotationsApi, booksApi, materialsApi } from '../../api/endpoints';
import PdfPageWithAnnotations, { type DraftRect } from '../../components/PdfPageWithAnnotations';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { MarkdownPreview } from '../../components/MarkdownPreview';
import { getErrorMessage, getToken } from '../../api/client';
import type { AnnotationKind, AnnotationMeta, SupplementaryMaterial } from '../../types';

const PAGE_WIDTH = 720;

export default function EditorBookPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const [annotationDialog, setAnnotationDialog] = useState<{
    mode: 'create' | 'edit';
    rect?: DraftRect;
    annotation?: AnnotationMeta;
  } | null>(null);
  const [materialDialog, setMaterialDialog] = useState<{
    mode: 'create' | 'edit';
    material?: SupplementaryMaterial;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bookQuery = useQuery({
    queryKey: ['book', id],
    queryFn: () => booksApi.get(id),
  });

  const pdfFile = useMemo(() => {
    const token = getToken();
    return {
      url: booksApi.pdfUrl(id),
      httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
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

  const invalidatePage = () => {
    queryClient.invalidateQueries({ queryKey: ['annotations', id] });
    queryClient.invalidateQueries({ queryKey: ['materials', id] });
  };

  const handleDraftCommit = (rect: DraftRect) => {
    setAnnotationDialog({ mode: 'create', rect });
    setDrawing(false);
  };

  const deleteAnnotationMut = useMutation({
    mutationFn: (annId: string) => annotationsApi.remove(annId),
    onSuccess: invalidatePage,
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMaterialMut = useMutation({
    mutationFn: (mId: string) => materialsApi.remove(mId),
    onSuccess: invalidatePage,
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (bookQuery.isError || !bookQuery.data) {
    return <Alert severity="error">No se pudo cargar el libro</Alert>;
  }
  const book = bookQuery.data;
  const revealed: Record<string, string> = {};
  for (const a of annotationsQuery.data?.annotations ?? []) {
    if (a.content) revealed[a.id] = a.content;
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h2">{book.title}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Chip size="small" label={book.subject} />
            <Chip size="small" label={book.gradeLevel} />
            <Chip size="small" label={book.schoolYear} />
            <Chip
              size="small"
              label={book.hidden ? 'Oculto' : 'Publicado'}
              color={book.hidden ? 'warning' : 'success'}
            />
          </Stack>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate(`/books/${book.id}/read`)}>
            Vista previa
          </Button>
          <Button
            variant={book.hidden ? 'contained' : 'outlined'}
            color={book.hidden ? 'success' : 'warning'}
            onClick={async () => {
              try {
                await booksApi.update(book.id, { hidden: !book.hidden });
                queryClient.invalidateQueries({ queryKey: ['book', id] });
                queryClient.invalidateQueries({ queryKey: ['books'] });
              } catch (err) {
                setError(getErrorMessage(err));
              }
            }}
          >
            {book.hidden ? 'Publicar' : 'Ocultar'}
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
        <Paper sx={{ p: 2, flex: '0 0 auto' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Stack direction="row" alignItems="center">
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

            <ToggleButton
              value="draw"
              selected={drawing}
              onChange={() => {
                setDrawing((v) => !v);
                setDraft(null);
              }}
              color="primary"
              size="small"
            >
              {drawing ? 'Cancelar dibujo' : 'Añadir anotación'}
            </ToggleButton>
          </Stack>

          {drawing && (
            <Alert severity="info" sx={{ mb: 1 }}>
              Arrastra sobre la página para marcar el área a corregir.
            </Alert>
          )}

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
                drawing={drawing}
                draft={draft}
                onDraftChange={setDraft}
                onDraftCommit={handleDraftCommit}
                onAnnotationClick={(a) => setAnnotationDialog({ mode: 'edit', annotation: a })}
              />
            )}
          </Document>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, alignSelf: 'stretch', minWidth: 320 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h3">Material complementario</Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setMaterialDialog({ mode: 'create' })}
            >
              Añadir
            </Button>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {materialsQuery.data?.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No hay material en esta página.
            </Typography>
          )}

          <Stack spacing={2}>
            {materialsQuery.data?.map((m) => (
              <Paper key={m.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">{m.title}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Págs. {m.fromPage}–{m.toPage}
                    </Typography>
                    {m.content && <MarkdownPreview source={m.content} />}
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => setMaterialDialog({ mode: 'edit', material: m })}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (confirm(`¿Eliminar "${m.title}"?`)) deleteMaterialMut.mutate(m.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h3" sx={{ mb: 1 }}>
            Anotaciones en esta página
          </Typography>
          {annotationsQuery.data?.annotations.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aún no hay anotaciones aquí.
            </Typography>
          )}
          <Stack spacing={1}>
            {annotationsQuery.data?.annotations.map((a) => (
              <Paper key={a.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Chip
                      size="small"
                      label={a.kind === 'ERROR' ? 'Error' : 'Error parcial'}
                      color={a.kind === 'ERROR' ? 'error' : 'warning'}
                      sx={{ mb: 0.5 }}
                    />
                    {a.content && <MarkdownPreview source={a.content} />}
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => setAnnotationDialog({ mode: 'edit', annotation: a })}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (confirm('¿Eliminar esta anotación?')) deleteAnnotationMut.mutate(a.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
      </Stack>

      <AnnotationDialog
        open={Boolean(annotationDialog)}
        onClose={() => {
          setAnnotationDialog(null);
          setDraft(null);
        }}
        bookId={id}
        page={pageNumber}
        rect={annotationDialog?.rect}
        annotation={annotationDialog?.annotation}
        onSaved={() => {
          invalidatePage();
          setAnnotationDialog(null);
          setDraft(null);
        }}
      />

      <MaterialDialog
        open={Boolean(materialDialog)}
        onClose={() => setMaterialDialog(null)}
        bookId={id}
        defaultPage={pageNumber}
        material={materialDialog?.material}
        onSaved={() => {
          invalidatePage();
          setMaterialDialog(null);
        }}
      />
    </Box>
  );
}

interface AnnotationDialogProps {
  open: boolean;
  onClose: () => void;
  bookId: string;
  page: number;
  rect?: DraftRect;
  annotation?: AnnotationMeta;
  onSaved: () => void;
}

function AnnotationDialog({ open, onClose, bookId, page, rect, annotation, onSaved }: AnnotationDialogProps) {
  const [kind, setKind] = useState<AnnotationKind>(annotation?.kind ?? 'ERROR');
  const [content, setContent] = useState(annotation?.content ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setKind(annotation?.kind ?? 'ERROR');
      setContent(annotation?.content ?? '');
      setError(null);
    }
  }, [open, annotation]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (annotation) {
        await annotationsApi.update(annotation.id, { kind, content });
      } else if (rect) {
        await annotationsApi.create(bookId, { page, kind, ...rect, content });
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{annotation ? 'Editar anotación' : 'Nueva anotación'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <ToggleButtonGroup
            value={kind}
            exclusive
            onChange={(_e, v: AnnotationKind | null) => v && setKind(v)}
            size="small"
          >
            <ToggleButton value="ERROR" sx={{ color: 'error.main' }}>
              Error (rojo)
            </ToggleButton>
            <ToggleButton value="ERROR_PARCIAL" sx={{ color: 'warning.main' }}>
              Error parcial (amarillo)
            </ToggleButton>
          </ToggleButtonGroup>
          <MarkdownEditor value={content} onChange={setContent} rows={6} label="Corrección" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !content.trim()}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface MaterialDialogProps {
  open: boolean;
  onClose: () => void;
  bookId: string;
  defaultPage: number;
  material?: SupplementaryMaterial;
  onSaved: () => void;
}

function MaterialDialog({ open, onClose, bookId, defaultPage, material, onSaved }: MaterialDialogProps) {
  const [title, setTitle] = useState('');
  const [fromPage, setFromPage] = useState(defaultPage);
  const [toPage, setToPage] = useState(defaultPage);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(material?.title ?? '');
      setFromPage(material?.fromPage ?? defaultPage);
      setToPage(material?.toPage ?? defaultPage);
      setContent(material?.content ?? '');
      setError(null);
    }
  }, [open, material, defaultPage]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (material) {
        await materialsApi.update(material.id, { title, fromPage, toPage, content });
      } else {
        await materialsApi.create(bookId, { title, fromPage, toPage, content });
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{material ? 'Editar material complementario' : 'Nuevo material complementario'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Desde página"
              type="number"
              value={fromPage}
              onChange={(e) => setFromPage(Number(e.target.value))}
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Hasta página"
              type="number"
              value={toPage}
              onChange={(e) => setToPage(Number(e.target.value))}
              inputProps={{ min: 1 }}
            />
          </Stack>
          <MarkdownEditor value={content} onChange={setContent} rows={8} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !title.trim() || !content.trim()}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

