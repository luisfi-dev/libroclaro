import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
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
import { institutionsApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import type { User } from '../../types';

export default function InstitutionPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [memberDialog, setMemberDialog] = useState<{ mode: 'create' | 'edit' | 'existing'; user?: User } | null>(null);

  const institutionQuery = useQuery({ queryKey: ['institution'], queryFn: () => institutionsApi.getMine() });
  const membersQuery = useQuery({ queryKey: ['institution-members'], queryFn: () => institutionsApi.listMembers() });

  useEffect(() => {
    if (institutionQuery.data) setEditName(institutionQuery.data.name);
  }, [institutionQuery.data]);

  const updateNameMut = useMutation({
    mutationFn: (name: string) => institutionsApi.updateMine(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institution'] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  const removeMemberMut = useMutation({
    mutationFn: (uid: string) => institutionsApi.removeMember(uid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institution-members'] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (institutionQuery.isError) {
    return <Alert severity="error">No eres administrador de ninguna institución</Alert>;
  }

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 3 }}>
        Mi institución
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="flex-end">
          <TextField
            label="Nombre de la institución"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            disabled={!editName.trim() || editName === institutionQuery.data?.name}
            onClick={() => updateNameMut.mutate(editName)}
          >
            Guardar
          </Button>
        </Stack>
      </Paper>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h2">Miembros docentes</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setMemberDialog({ mode: 'existing' })}>
            Añadir existente
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setMemberDialog({ mode: 'create' })}>
            Nuevo docente
          </Button>
        </Stack>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell>Fecha nacimiento</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {membersQuery.data?.map((m) => (
              <TableRow key={m.id} hover>
                <TableCell>{m.fullName}</TableCell>
                <TableCell>{m.email}</TableCell>
                <TableCell>{m.birthDate}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => setMemberDialog({ mode: 'edit', user: m })}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => {
                      if (confirm(`¿Eliminar a ${m.fullName}?`)) removeMemberMut.mutate(m.id);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {membersQuery.data && membersQuery.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Aún no hay miembros en tu institución.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <MemberDialog
        config={memberDialog}
        onClose={() => setMemberDialog(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['institution-members'] });
          setMemberDialog(null);
        }}
      />
    </Box>
  );
}

interface MemberDialogProps {
  config: { mode: 'create' | 'edit' | 'existing'; user?: User } | null;
  onClose: () => void;
  onSaved: () => void;
}

function MemberDialog({ config, onClose, onSaved }: MemberDialogProps) {
  const open = Boolean(config);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config?.user) {
      setFullName(config.user.fullName);
      setEmail(config.user.email);
      setBirthDate(config.user.birthDate);
    } else {
      setFullName('');
      setEmail('');
      setBirthDate('');
    }
    setPassword('');
    setError(null);
  }, [config]);

  if (!config) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (config.mode === 'existing') {
        await institutionsApi.addExisting(email);
      } else if (config.mode === 'edit' && config.user) {
        const data: Record<string, string> = {};
        if (fullName !== config.user.fullName) data.fullName = fullName;
        if (email !== config.user.email) data.email = email;
        if (birthDate !== config.user.birthDate) data.birthDate = birthDate;
        if (password) data.password = password;
        await institutionsApi.updateMember(config.user.id, data);
      } else {
        await institutionsApi.createMember({ fullName, email, birthDate, password });
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const titles = {
    create: 'Crear nuevo docente',
    edit: 'Editar docente',
    existing: 'Añadir docente existente por correo',
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{titles[config.mode]}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {config.mode !== 'existing' && (
            <TextField label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth />
          )}
          <TextField
            label="Correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            disabled={config.mode === 'existing' ? false : false}
          />
          {config.mode !== 'existing' && (
            <>
              <TextField
                label="Fecha de nacimiento"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label={config.mode === 'edit' ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
