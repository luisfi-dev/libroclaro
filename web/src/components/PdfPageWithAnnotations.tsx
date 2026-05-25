import { MouseEvent as ReactMouseEvent, ReactNode, useEffect, useRef } from 'react';
import { Page } from 'react-pdf';
import { Box, Tooltip, Typography } from '@mui/material';
import { ANNOTATION_COLORS } from '../theme';
import { MarkdownPreview } from './MarkdownPreview';
import type { AnnotationMeta } from '../types';

export interface DraftRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  pageNumber: number;
  width: number;
  annotations: AnnotationMeta[];
  onAnnotationHover?: (id: string) => void;
  contentByAnnotationId: Record<string, string | undefined>;
  drawing?: boolean;
  draft?: DraftRect | null;
  onDraftChange?: (rect: DraftRect | null) => void;
  /** Dispara cuando el usuario suelta el botón tras dibujar un rectángulo con tamaño suficiente */
  onDraftCommit?: (rect: DraftRect) => void;
  onAnnotationClick?: (a: AnnotationMeta) => void;
  renderAnnotationExtra?: (a: AnnotationMeta) => ReactNode;
}

const MIN_DRAFT_SIZE = 0.01;

export default function PdfPageWithAnnotations({
  pageNumber,
  width,
  annotations,
  contentByAnnotationId,
  drawing = false,
  draft = null,
  onDraftChange,
  onDraftCommit,
  onAnnotationHover,
  onAnnotationClick,
  renderAnnotationExtra,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Si se desactiva el modo dibujo o cambia de página, limpiamos el punto de inicio
  // para que la próxima sesión empiece desde donde el usuario hace clic.
  useEffect(() => {
    if (!drawing) {
      dragStartRef.current = null;
    }
  }, [drawing, pageNumber]);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!drawing || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    dragStartRef.current = { x, y };
    onDraftChange?.({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!drawing || !start || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const newRect: DraftRect = {
      x: Math.max(0, Math.min(start.x, x)),
      y: Math.max(0, Math.min(start.y, y)),
      width: Math.min(1, Math.abs(x - start.x)),
      height: Math.min(1, Math.abs(y - start.y)),
    };
    onDraftChange?.(newRect);
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    const wasDragging = dragStartRef.current !== null;
    dragStartRef.current = null;
    if (wasDragging && draft && draft.width >= MIN_DRAFT_SIZE && draft.height >= MIN_DRAFT_SIZE) {
      onDraftCommit?.(draft);
    } else if (wasDragging) {
      // Click sin arrastrar suficiente: descartamos el borrador
      onDraftChange?.(null);
    }
  };

  const handleMouseLeave = () => {
    // Si el usuario suelta el botón fuera del overlay, cancelamos el drag activo
    // para no continuarlo en la próxima entrada del puntero.
    dragStartRef.current = null;
    if (draft) onDraftChange?.(null);
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-block', boxShadow: 3 }}>
      <Page pageNumber={pageNumber} width={width} renderTextLayer={false} renderAnnotationLayer={false} />
      <Box
        ref={overlayRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        sx={{
          position: 'absolute',
          inset: 0,
          cursor: drawing ? 'crosshair' : 'default',
        }}
      >
        {annotations.map((a) => {
          const colors = ANNOTATION_COLORS[a.kind];
          const content = contentByAnnotationId[a.id];
          const box = (
            <Box
              key={a.id}
              onMouseEnter={() => onAnnotationHover?.(a.id)}
              onClick={(e) => {
                e.stopPropagation();
                onAnnotationClick?.(a);
              }}
              sx={{
                position: 'absolute',
                left: `${a.x * 100}%`,
                top: `${a.y * 100}%`,
                width: `${a.width * 100}%`,
                height: `${a.height * 100}%`,
                bgcolor: colors.fill,
                border: `2px solid ${colors.border}`,
                borderRadius: 0.5,
                cursor: onAnnotationClick ? 'pointer' : 'help',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: colors.fill.replace('0.25', '0.4') },
              }}
            >
              {renderAnnotationExtra?.(a)}
            </Box>
          );
          if (!content) return box;
          return (
            <Tooltip
              key={a.id}
              arrow
              placement="top"
              componentsProps={{
                tooltip: {
                  sx: { bgcolor: 'background.paper', color: 'text.primary', boxShadow: 3, maxWidth: 360, p: 1.5 },
                },
                arrow: { sx: { color: 'background.paper' } },
              }}
              title={
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    {a.kind === 'ERROR' ? 'Error' : 'Error parcial'}
                  </Typography>
                  <MarkdownPreview source={content} />
                </Box>
              }
            >
              {box}
            </Tooltip>
          );
        })}

        {draft && (
          <Box
            sx={{
              position: 'absolute',
              left: `${draft.x * 100}%`,
              top: `${draft.y * 100}%`,
              width: `${draft.width * 100}%`,
              height: `${draft.height * 100}%`,
              border: '2px dashed #1e3a8a',
              bgcolor: 'rgba(30, 58, 138, 0.15)',
              pointerEvents: 'none',
            }}
          />
        )}
      </Box>
    </Box>
  );
}
