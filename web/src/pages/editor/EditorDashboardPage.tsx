import { useState, type HTMLAttributes } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { booksApi, catalogApi, editorsApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';

export default function EditorDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editorDialogOpen, setEditorDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const booksQuery = useQuery({
    queryKey: ['books', { includeHidden: true }],
    queryFn: () => booksApi.list({ includeHidden: true }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => booksApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  const togglePublishMut = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      booksApi.update(id, { hidden }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h1">Panel del editor</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setEditorDialogOpen(true)} data-testid="editor-manage-editors">
            Gestionar editores
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setUploadOpen(true)}
            data-testid="editor-new-book"
          >
            Nuevo libro
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Título</TableCell>
              <TableCell>Materia</TableCell>
              <TableCell>Grado</TableCell>
              <TableCell>Ciclo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {booksQuery.data?.map((book) => (
              <TableRow key={book.id} hover data-testid="book-row" data-book-id={book.id}>
                <TableCell>
                  <Typography
                    component={RouterLink}
                    to={`/editor/books/${book.id}`}
                    sx={{ color: 'primary.main', fontWeight: 500, textDecoration: 'none' }}
                  >
                    {book.title}
                  </Typography>
                </TableCell>
                <TableCell>{book.subject}</TableCell>
                <TableCell>{book.gradeLevel}</TableCell>
                <TableCell>{book.schoolYear}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={book.hidden ? 'Oculto' : 'Publicado'}
                    color={book.hidden ? 'warning' : 'success'}
                    onClick={() => togglePublishMut.mutate({ id: book.id, hidden: !book.hidden })}
                    clickable
                    data-testid="book-toggle-hidden"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => navigate(`/editor/books/${book.id}`)} data-testid="book-edit-link">
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => {
                      if (confirm(`¿Eliminar "${book.title}"?`)) deleteMut.mutate(book.id);
                    }}
                    data-testid="book-delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {booksQuery.data && booksQuery.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Aún no hay libros en el catálogo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <UploadBookDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <EditorAdminDialog open={editorDialogOpen} onClose={() => setEditorDialogOpen(false)} />
    </Box>
  );
}

function UploadBookDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: () => catalogApi.listSubjects() });
  const gradesQuery = useQuery({ queryKey: ['gradeLevels'], queryFn: () => catalogApi.listGradeLevels() });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [gradeLevelId, setGradeLevelId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setSchoolYear('');
    setSubjectId('');
    setGradeLevelId('');
    setFile(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Adjunta el archivo PDF del libro');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', description);
      fd.append('schoolYear', schoolYear);
      fd.append('subjectId', subjectId);
      fd.append('gradeLevelId', gradeLevelId);
      fd.append('pdf', file);
      await booksApi.create(fd);
      await queryClient.invalidateQueries({ queryKey: ['books'] });
      reset();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Subir nuevo libro</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            inputProps={{ 'data-testid': 'upload-title' }}
          />
          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            fullWidth
            multiline
            rows={3}
            inputProps={{ 'data-testid': 'upload-description' }}
          />
          <TextField
            label="Ciclo escolar"
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            placeholder="2023-2024"
            required
            fullWidth
            inputProps={{ 'data-testid': 'upload-year' }}
          />
          <FormControl fullWidth required>
            <InputLabel>Materia</InputLabel>
            <Select
              label="Materia"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              SelectDisplayProps={{ 'data-testid': 'upload-subject' } as HTMLAttributes<HTMLDivElement>}
            >
              {subjectsQuery.data?.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required>
            <InputLabel>Grado</InputLabel>
            <Select
              label="Grado"
              value={gradeLevelId}
              onChange={(e) => setGradeLevelId(e.target.value)}
              SelectDisplayProps={{ 'data-testid': 'upload-grade' } as HTMLAttributes<HTMLDivElement>}
            >
              {gradesQuery.data?.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" component="label">
            {file ? file.name : 'Seleccionar archivo PDF'}
            <input
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              data-testid="upload-file"
            />
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting} data-testid="upload-submit">
          {submitting ? 'Subiendo...' : 'Subir libro'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditorAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'create' | 'promote'>('create');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [promoteEmail, setPromoteEmail] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleCreate = async () => {
    setFeedback(null);
    try {
      const user = await editorsApi.createEditor({ fullName, email, birthDate, password });
      setFeedback({ type: 'success', message: `Editor ${user.email} creado` });
      setFullName('');
      setEmail('');
      setBirthDate('');
      setPassword('');
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
    }
  };

  const handlePromote = async () => {
    setFeedback(null);
    try {
      const user = await editorsApi.promote(promoteEmail);
      setFeedback({ type: 'success', message: `${user.email} promovido a editor` });
      setPromoteEmail('');
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Gestionar editores</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button variant={tab === 'create' ? 'contained' : 'outlined'} onClick={() => setTab('create')}>
            Crear editor
          </Button>
          <Button variant={tab === 'promote' ? 'contained' : 'outlined'} onClick={() => setTab('promote')}>
            Promover docente
          </Button>
        </Stack>

        {feedback && (
          <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        )}

        {tab === 'create' ? (
          <Stack spacing={2}>
            <TextField label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth />
            <TextField label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            <TextField
              label="Fecha de nacimiento"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={handleCreate}>
              Crear editor
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Sólo se pueden promover docentes que no pertenezcan a una institución.
            </Typography>
            <TextField
              label="Correo del docente"
              value={promoteEmail}
              onChange={(e) => setPromoteEmail(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={handlePromote}>
              Promover a editor
            </Button>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
