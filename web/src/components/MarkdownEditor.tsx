import { Box, Stack, TextField, Typography } from '@mui/material';
import { MarkdownPreview } from './MarkdownPreview';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  rows?: number;
  helperText?: string;
}

export function MarkdownEditor({ value, onChange, label = 'Contenido (Markdown)', rows = 6, helperText }: Props) {
  return (
    <Stack spacing={1}>
      <TextField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        multiline
        rows={rows}
        fullWidth
        helperText={helperText ?? 'Usa **negrita**, *itálica*, `código`, # encabezados, - listas, [enlace](url).'}
      />
      {value && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            Vista previa:
          </Typography>
          <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'grey.50' }}>
            <MarkdownPreview source={value} keepMarkers />
          </Box>
        </Box>
      )}
    </Stack>
  );
}
