import { Box, BoxProps } from '@mui/material';
import { useEffect, useState } from 'react';
import { apiBaseURL, getToken } from '../api/client';

const blobCache = new Map<string, string>();

interface Props extends Omit<BoxProps<'img'>, 'src' | 'component'> {
  /** Path relativo a la API (ej. "/api/books/123/cover") o URL absoluta */
  src: string;
  alt: string;
  fallback?: React.ReactNode;
}

/**
 * Carga una imagen protegida enviando el header Authorization. Convierte la
 * respuesta a un blob URL para que `<img>` pueda mostrarla. Cachea el blob URL
 * por src para evitar refetch entre navegaciones.
 */
export function AuthedImage({ src, alt, fallback, ...rest }: Props) {
  const fullUrl = src.startsWith('http') ? src : `${apiBaseURL}${src}`;
  const [objectUrl, setObjectUrl] = useState<string | null>(() => blobCache.get(fullUrl) ?? null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (blobCache.has(fullUrl)) {
      setObjectUrl(blobCache.get(fullUrl)!);
      return;
    }
    let cancelled = false;
    const token = getToken();
    fetch(fullUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobCache.set(fullUrl, url);
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fullUrl]);

  if (error && fallback) return <>{fallback}</>;
  if (!objectUrl) return <>{fallback ?? null}</>;
  return <Box component="img" src={objectUrl} alt={alt} {...rest} />;
}
