import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { subscriptionsApi, type SubscribePayload } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';
import type { SubscriptionPlan } from '../../types';

const PLANS: Array<{
  key: SubscriptionPlan;
  name: string;
  price: string;
  highlight?: boolean;
  features: string[];
}> = [
  {
    key: 'GRATUITO',
    name: 'Gratuito',
    price: '$0',
    features: [
      'Acceso a todos los libros',
      'Hasta 20 correcciones al mes',
      'Sin material complementario',
      'Descarga del PDF original',
    ],
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: '$100 / mes',
    highlight: true,
    features: [
      'Correcciones ilimitadas',
      'Material complementario completo',
      'Descarga de PDF con anotaciones integradas',
    ],
  },
  {
    key: 'INSTITUCIONAL',
    name: 'Institucional',
    price: '$2,500 / mes',
    features: [
      'Crea tu propia institución',
      'Gestiona los docentes desde un panel',
      'Beneficios Pro para todos los miembros',
    ],
  },
];

export default function SubscriptionsPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => subscriptionsApi.status(),
  });

  const subscribeMut = useMutation({
    mutationFn: (payload: SubscribePayload) => subscriptionsApi.subscribe(payload),
    onSuccess: (data) => {
      setUser(data.user);
      setSelectedPlan(null);
      setSuccess(
        data.invoice
          ? `Plan ${data.user.plan} activado. Factura por $${data.invoice.amount}.`
          : `Plan ${data.user.plan} activado.`,
      );
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (user?.role === 'EDITOR') {
    return <Alert severity="info">Los editores no contratan planes de suscripción.</Alert>;
  }

  const currentPlan = statusQuery.data?.plan ?? user?.plan;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h1">Planes de suscripción</Typography>
        <Button
          variant="text"
          onClick={() => navigate('/subscriptions/invoices')}
          data-testid="subscriptions-invoices-link"
        >
          Ver mis facturas
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)} data-testid="subscriptions-error">
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)} data-testid="subscriptions-success">
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {PLANS.map((plan) => (
          <Grid item xs={12} md={4} key={plan.key}>
            <Card
              elevation={plan.highlight ? 6 : 1}
              data-testid={`plan-card-${plan.key}`}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: plan.highlight ? '2px solid' : '1px solid',
                borderColor: plan.highlight ? 'primary.main' : 'divider',
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="h2">{plan.name}</Typography>
                  {currentPlan === plan.key && <Chip label="Actual" color="primary" size="small" />}
                </Stack>
                <Typography variant="h3" color="primary" sx={{ mb: 2 }}>
                  {plan.price}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1}>
                  {plan.features.map((f) => (
                    <Stack direction="row" spacing={1} key={f}>
                      <CheckIcon color="success" fontSize="small" />
                      <Typography variant="body2">{f}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
              <CardActions sx={{ p: 2 }}>
                <Button
                  fullWidth
                  variant={plan.highlight ? 'contained' : 'outlined'}
                  disabled={currentPlan === plan.key}
                  onClick={() => setSelectedPlan(plan.key)}
                  data-testid={`plan-select-${plan.key}`}
                >
                  {currentPlan === plan.key ? 'Plan actual' : 'Cambiar a este plan'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <CheckoutDialog
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onConfirm={(payload) => subscribeMut.mutate(payload)}
        submitting={subscribeMut.isPending}
      />
    </Box>
  );
}

interface CheckoutDialogProps {
  plan: SubscriptionPlan | null;
  onClose: () => void;
  onConfirm: (payload: SubscribePayload) => void;
  submitting: boolean;
}

function CheckoutDialog({ plan, onClose, onConfirm, submitting }: CheckoutDialogProps) {
  const [institutionName, setInstitutionName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  if (!plan) return null;

  const needsCard = plan !== 'GRATUITO';
  const needsInstitution = plan === 'INSTITUCIONAL';

  const handleConfirm = () => {
    onConfirm({
      plan,
      institutionName: needsInstitution ? institutionName : undefined,
      cardNumber: needsCard ? cardNumber.replace(/\s+/g, '') : undefined,
      cardHolder: needsCard ? cardHolder : undefined,
      cardExpiry: needsCard ? cardExpiry : undefined,
      cardCvc: needsCard ? cardCvc : undefined,
    });
  };

  return (
    <Dialog open={Boolean(plan)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Cambiar a plan {plan}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {plan === 'GRATUITO' && (
            <Alert severity="info">
              Cambiar al plan Gratuito cancelará tu suscripción actual. Si eras administrador de
              una institución, esta y sus miembros se desvincularán.
            </Alert>
          )}
          {needsInstitution && (
            <TextField
              label="Nombre de tu institución"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              fullWidth
              required
              inputProps={{ 'data-testid': 'checkout-institution' }}
            />
          )}
          {needsCard && (
            <>
              <Typography variant="caption" color="text.secondary">
                Pago simulado: no se procesa ningún cargo real.
              </Typography>
              <TextField
                label="Número de tarjeta"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4242 4242 4242 4242"
                fullWidth
                inputProps={{ 'data-testid': 'checkout-card-number' }}
              />
              <TextField
                label="Titular de la tarjeta"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                fullWidth
                inputProps={{ 'data-testid': 'checkout-card-holder' }}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Vencimiento (MM/AA)"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="12/29"
                  fullWidth
                  inputProps={{ 'data-testid': 'checkout-card-expiry' }}
                />
                <TextField
                  label="CVC"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  placeholder="123"
                  sx={{ width: 120 }}
                  inputProps={{ 'data-testid': 'checkout-card-cvc' }}
                />
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={submitting} data-testid="checkout-confirm">
          {submitting ? 'Procesando...' : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
