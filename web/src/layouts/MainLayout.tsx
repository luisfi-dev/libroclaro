import { useState, MouseEvent } from 'react';
import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useAuth } from '../context/AuthContext';

const PLAN_LABEL: Record<string, string> = {
  GRATUITO: 'Gratuito',
  PRO: 'Pro',
  INSTITUCIONAL: 'Institucional',
};

const ROLE_LABEL: Record<string, string> = {
  DOCENTE: 'Docente',
  ADMIN_INSTITUCION: 'Admin. Institución',
  EDITOR: 'Editor',
};

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  const initials = user?.fullName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" color="primary" elevation={1}>
        <Toolbar>
          <MenuBookIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 0, color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
          >
            LibroClaro
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, ml: 4 }}>
            <Button component={RouterLink} to="/" color="inherit">
              Catálogo
            </Button>
            <Button component={RouterLink} to="/subscriptions" color="inherit">
              Planes
            </Button>
            {user?.role === 'EDITOR' && (
              <Button component={RouterLink} to="/editor" color="inherit">
                Panel del editor
              </Button>
            )}
            {user?.role === 'ADMIN_INSTITUCION' && (
              <Button component={RouterLink} to="/institution" color="inherit">
                Mi institución
              </Button>
            )}
          </Box>

          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${ROLE_LABEL[user.role]} · ${PLAN_LABEL[user.plan]}`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white' }}
              />
              <IconButton onClick={handleOpen} sx={{ p: 0, ml: 1 }} data-testid="nav-user-menu">
                <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>{initials}</Avatar>
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                <MenuItem
                  onClick={() => {
                    navigate('/profile');
                    handleClose();
                  }}
                  data-testid="nav-profile"
                >
                  Mi perfil
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    navigate('/subscriptions/invoices');
                    handleClose();
                  }}
                >
                  Mis facturas
                </MenuItem>
                <MenuItem onClick={handleLogout} data-testid="nav-logout">
                  Cerrar sesión
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
        <Outlet />
      </Container>

      <Box component="footer" sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="caption">LibroClaro · Libros SEP con correcciones verificadas</Typography>
      </Box>
    </Box>
  );
}
