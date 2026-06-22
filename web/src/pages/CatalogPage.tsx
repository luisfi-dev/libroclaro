import { useMemo, useState, type HTMLAttributes } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { booksApi, catalogApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { AuthedImage } from '../components/AuthedImage';
import type { Book, GradeLevel } from '../types';

export default function CatalogPage() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [gradeLevelId, setGradeLevelId] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [includeHidden, setIncludeHidden] = useState(false);

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.listSubjects(),
  });
  const gradesQuery = useQuery({
    queryKey: ['gradeLevels'],
    queryFn: () => catalogApi.listGradeLevels(),
  });

  const booksQuery = useQuery({
    queryKey: ['books', { q, subjectId, gradeLevelId, schoolYear, includeHidden }],
    queryFn: () =>
      booksApi.list({
        q: q || undefined,
        subjectId: subjectId || undefined,
        gradeLevelId: gradeLevelId || undefined,
        schoolYear: schoolYear || undefined,
        includeHidden: user?.role === 'EDITOR' ? includeHidden : undefined,
      }),
  });

  const grouped = useMemo(() => {
    const books = booksQuery.data ?? [];
    const grades = gradesQuery.data ?? [];
    const byGradeId = new Map<string, GradeLevel>();
    grades.forEach((g) => byGradeId.set(g.id, g));

    const map = new Map<string, Book[]>();
    for (const book of books) {
      const key = book.gradeLevel || 'Sin nivel';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(book);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const oa = grades.find((g) => g.name === a[0])?.order ?? 999;
      const ob = grades.find((g) => g.name === b[0])?.order ?? 999;
      return oa - ob;
    });
  }, [booksQuery.data, gradesQuery.data]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h1">Catálogo de libros</Typography>
        {user?.role === 'EDITOR' && (
          <Chip
            label={includeHidden ? 'Mostrando libros ocultos' : 'Ocultar libros no publicados'}
            color={includeHidden ? 'secondary' : 'default'}
            onClick={() => setIncludeHidden((v) => !v)}
            clickable
            data-testid="catalog-toggle-hidden"
          />
        )}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Buscar"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          fullWidth
          placeholder="Título, materia, grado o ciclo (2023-2024)"
          inputProps={{ 'data-testid': 'catalog-search' }}
        />
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Materia</InputLabel>
          <Select
            label="Materia"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            SelectDisplayProps={{ 'data-testid': 'catalog-filter-subject' } as HTMLAttributes<HTMLDivElement>}
          >
            <MenuItem value="">Todas</MenuItem>
            {subjectsQuery.data?.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Grado</InputLabel>
          <Select
            label="Grado"
            value={gradeLevelId}
            onChange={(e) => setGradeLevelId(e.target.value)}
            SelectDisplayProps={{ 'data-testid': 'catalog-filter-grade' } as HTMLAttributes<HTMLDivElement>}
          >
            <MenuItem value="">Todos</MenuItem>
            {gradesQuery.data?.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Ciclo escolar"
          value={schoolYear}
          onChange={(e) => setSchoolYear(e.target.value)}
          placeholder="2023-2024"
          sx={{ minWidth: 160 }}
          inputProps={{ 'data-testid': 'catalog-filter-year' }}
        />
      </Stack>

      {booksQuery.isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {booksQuery.isError && <Alert severity="error">No se pudo cargar el catálogo</Alert>}

      {booksQuery.data && booksQuery.data.length === 0 && (
        <Alert severity="info" data-testid="catalog-empty">
          No se encontraron libros con esos filtros
        </Alert>
      )}

      {grouped.map(([gradeName, books]) => (
        <Box key={gradeName} sx={{ mb: 4 }}>
          <Typography variant="h2" sx={{ mb: 2 }}>
            {gradeName}
          </Typography>
          <Grid container spacing={2}>
            {books.map((book) => (
              <Grid item xs={6} sm={4} md={3} key={book.id}>
                <BookCard book={book} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}

function BookCard({ book }: { book: Book }) {
  return (
    <Card sx={{ height: '100%' }} data-testid="book-card" data-book-id={book.id}>
      <CardActionArea component={RouterLink} to={`/books/${book.id}`}>
        {book.coverUrl ? (
          <AuthedImage
            src={book.coverUrl}
            alt={book.title}
            sx={{ height: 260, width: '100%', objectFit: 'cover', display: 'block', bgcolor: 'grey.200' }}
            fallback={<Box sx={{ height: 260, bgcolor: 'grey.200' }} />}
          />
        ) : (
          <Box sx={{ height: 260, bgcolor: 'primary.light' }} />
        )}
        <CardContent>
          <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
            <Chip size="small" label={book.subject} />
            <Chip size="small" label={book.schoolYear} variant="outlined" />
            {book.hidden && <Chip size="small" label="Oculto" color="warning" />}
          </Stack>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {book.title}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
