import { FormEvent, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!birthDate) {
      setError('Indica tu fecha de nacimiento');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName,
        email,
        birthDate: birthDate.toISOString().slice(0, 10),
        password,
        passwordConfirmation,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: 4 }} elevation={3}>
        <Typography variant="h1" sx={{ fontSize: '1.75rem', mb: 1 }}>
          Crear cuenta
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Debes tener al menos 18 años para registrarte.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} data-testid="register-error">
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              fullWidth
              inputProps={{ 'data-testid': 'register-fullname' }}
            />
            <TextField
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="email"
              inputProps={{ 'data-testid': 'register-email' }}
            />
            <DatePicker
              label="Fecha de nacimiento"
              value={birthDate}
              onChange={(d) => setBirthDate(d)}
              disableFuture
              format="dd/MM/yyyy"
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  inputProps: { 'data-testid': 'register-birthdate' },
                },
              }}
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              helperText="Mínimo 8 caracteres"
              autoComplete="new-password"
              inputProps={{ 'data-testid': 'register-password' }}
            />
            <TextField
              label="Confirmar contraseña"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              fullWidth
              autoComplete="new-password"
              inputProps={{ 'data-testid': 'register-password-confirm' }}
            />
            <Button type="submit" variant="contained" size="large" disabled={loading} data-testid="register-submit">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" align="center" sx={{ mt: 3 }}>
          ¿Ya tienes cuenta?{' '}
          <Link component={RouterLink} to="/login">
            Inicia sesión
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}
