import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1e3a8a' },
    secondary: { main: '#f59e0b' },
    error: { main: '#dc2626' },
    warning: { main: '#f59e0b' },
    background: { default: '#f5f7fb' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: 'Roboto, system-ui, -apple-system, sans-serif',
    h1: { fontSize: '2rem', fontWeight: 700 },
    h2: { fontSize: '1.5rem', fontWeight: 700 },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
  },
});

export const ANNOTATION_COLORS = {
  ERROR: { fill: 'rgba(220, 38, 38, 0.25)', border: '#dc2626' },
  ERROR_PARCIAL: { fill: 'rgba(245, 158, 11, 0.25)', border: '#f59e0b' },
};
