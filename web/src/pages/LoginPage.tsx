import { FormEvent, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }} elevation={3}>
        <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <MenuBookIcon color="primary" sx={{ fontSize: 48 }} />
          <Typography variant="h1" sx={{ fontSize: '1.75rem' }}>
            Iniciar sesión
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Accede a tu cuenta de LibroClaro
          </Typography>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="email"
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
            />
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" align="center" sx={{ mt: 3 }}>
          ¿No tienes cuenta?{' '}
          <Link component={RouterLink} to="/register">
            Regístrate
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}
