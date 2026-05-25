import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { subscriptionsApi } from '../../api/endpoints';
import type { InvoiceStatus } from '../../types';

const STATUS_COLOR: Record<InvoiceStatus, 'success' | 'warning' | 'error' | 'default'> = {
  PAGADA: 'success',
  PENDIENTE: 'warning',
  FALLIDA: 'error',
  REEMBOLSADA: 'default',
};

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('es-MX');
}

export default function InvoicesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => subscriptionsApi.invoices(),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) return <Alert severity="error">No se pudieron cargar tus facturas</Alert>;

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 3 }}>
        Mis facturas
      </Typography>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Periodo</TableCell>
              <TableCell>Monto</TableCell>
              <TableCell>Método</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((inv) => (
              <TableRow key={inv.id} hover>
                <TableCell>{formatDate(inv.createdAt)}</TableCell>
                <TableCell>{inv.plan}</TableCell>
                <TableCell>
                  {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                </TableCell>
                <TableCell>${inv.amount}</TableCell>
                <TableCell>{inv.paymentMethodLast4 ? `•••• ${inv.paymentMethodLast4}` : '—'}</TableCell>
                <TableCell>
                  <Chip label={inv.status} color={STATUS_COLOR[inv.status]} size="small" />
                </TableCell>
              </TableRow>
            ))}
            {data && data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Aún no tienes facturas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
