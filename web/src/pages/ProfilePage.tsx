import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/endpoints';
import { getErrorMessage } from '../api/client';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const isLocked = user?.role === 'DOCENTE' && Boolean(user.institutionId);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [birthDate, setBirthDate] = useState<Date | null>(
    user?.birthDate ? new Date(user.birthDate) : null,
  );
  const [password, setPassword] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setSaving(true);
    setFeedback(null);
    try {
      const data: Record<string, string> = {};
      if (fullName !== user.fullName) data.fullName = fullName;
      if (email !== user.email) data.email = email;
      if (birthDate && birthDate.toISOString().slice(0, 10) !== user.birthDate)
        data.birthDate = birthDate.toISOString().slice(0, 10);
      if (password) data.password = password;

      const updated = await authApi.updateMe(data);
      setUser(updated);
      setPassword('');
      setFeedback({ type: 'success', message: 'Perfil actualizado' });
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await authApi.deleteMe();
      logout();
      navigate('/login');
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
      setConfirmOpen(false);
    }
  };

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 3 }}>
        Mi perfil
      </Typography>

      {isLocked && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Perteneces a una institución. Solo el administrador puede modificar tus datos.
        </Alert>
      )}

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLocked}
              fullWidth
            />
            <TextField
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLocked}
              fullWidth
            />
            <DatePicker
              label="Fecha de nacimiento"
              value={birthDate}
              onChange={(d) => setBirthDate(d)}
              disabled={isLocked}
              disableFuture
              format="dd/MM/yyyy"
              slotProps={{ textField: { fullWidth: true } }}
            />
            <TextField
              label="Nueva contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLocked}
              fullWidth
              helperText="Deja en blanco para no cambiar"
            />
            <Stack direction="row" spacing={2}>
              <Button type="submit" variant="contained" disabled={isLocked || saving}>
                Guardar cambios
              </Button>
              <Button
                color="error"
                variant="outlined"
                disabled={isLocked}
                onClick={() => setConfirmOpen(true)}
              >
                Eliminar cuenta
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta acción es permanente y no se puede deshacer. Perderás el acceso a todos tus datos y
            suscripciones.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={handleDelete}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
