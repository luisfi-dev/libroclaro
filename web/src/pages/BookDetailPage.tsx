import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EditIcon from '@mui/icons-material/Edit';
import { booksApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { AuthedImage } from '../components/AuthedImage';

export default function BookDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const bookQuery = useQuery({
    queryKey: ['book', id],
    queryFn: () => booksApi.get(id),
  });

  if (bookQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (bookQuery.isError || !bookQuery.data) {
    return <Alert severity="error">No se pudo cargar el libro</Alert>;
  }

  const book = bookQuery.data;
  const canEdit = user?.role === 'EDITOR';

  return (
    <Paper sx={{ p: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          {book.coverUrl ? (
            <AuthedImage
              src={book.coverUrl}
              alt={book.title}
              sx={{ width: '100%', borderRadius: 1, boxShadow: 2, display: 'block' }}
              fallback={<Box sx={{ width: '100%', aspectRatio: '3/4', bgcolor: 'grey.200', borderRadius: 1 }} />}
            />
          ) : (
            <Box sx={{ width: '100%', aspectRatio: '3/4', bgcolor: 'grey.200', borderRadius: 1 }} />
          )}
        </Grid>
        <Grid item xs={12} md={8}>
          <Typography variant="h1" sx={{ mb: 2 }}>
            {book.title}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Chip label={book.subject} />
            <Chip label={book.gradeLevel} variant="outlined" />
            <Chip label={`Ciclo ${book.schoolYear}`} variant="outlined" />
            <Chip label={`${book.pageCount} pág.`} variant="outlined" />
            {book.hidden && <Chip label="Oculto" color="warning" />}
          </Stack>
          <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
            {book.description}
          </Typography>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<MenuBookIcon />}
              onClick={() => navigate(`/books/${book.id}/read`)}
              size="large"
              data-testid="book-open"
            >
              Abrir libro
            </Button>
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/editor/books/${book.id}`)}
                data-testid="book-edit"
              >
                Editar libro
              </Button>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}
