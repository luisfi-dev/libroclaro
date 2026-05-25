import { Box } from '@mui/material';

/**
 * Renderiza markdown como HTML simple sin librería externa.
 * Soporta: **negrita**, *itálica*, `código`, encabezados, listas, párrafos, [texto](url).
 * No quita los marcadores: los muestra atenuados para que el editor vea el formato.
 */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c,
  );
}

function renderMarkdown(src: string, keepMarkers: boolean): string {
  const lines = src.split('\n');
  const out: string[] = [];
  let inList = false;

  const marker = (s: string) =>
    keepMarkers ? `<span style="color:#9ca3af">${escapeHtml(s)}</span>` : '';

  const inline = (text: string): string => {
    let t = escapeHtml(text);
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, url: string) =>
      `${marker('[')}<a href="${url}" target="_blank" rel="noreferrer">${label}</a>${marker(`](${url})`)}`,
    );
    t = t.replace(/\*\*([^*]+)\*\*/g, (_m, inner: string) => `${marker('**')}<strong>${inner}</strong>${marker('**')}`);
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, (_m, pre: string, inner: string) => `${pre}${marker('*')}<em>${inner}</em>${marker('*')}`);
    t = t.replace(/`([^`]+)`/g, (_m, inner: string) => `${marker('`')}<code style="background:#f3f4f6;padding:0 4px;border-radius:3px">${inner}</code>${marker('`')}`);
    return t;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      const level = heading[1].length;
      out.push(
        `<h${level} style="margin:0.4em 0;font-weight:600">${marker(`${heading[1]} `)}${inline(heading[2])}</h${level}>`,
      );
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!inList) {
        out.push('<ul style="padding-left:1.3em;margin:0.3em 0">');
        inList = true;
      }
      out.push(`<li>${marker('- ')}${inline(bullet[1])}</li>`);
      continue;
    }

    if (inList) {
      out.push('</ul>');
      inList = false;
    }

    if (line === '') {
      out.push('<div style="height:0.4em"></div>');
    } else {
      out.push(`<p style="margin:0.3em 0">${inline(line)}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

interface Props {
  source: string;
  /** Si true, se muestran los marcadores de formato atenuados (modo edición) */
  keepMarkers?: boolean;
}

export function MarkdownPreview({ source, keepMarkers = false }: Props) {
  return (
    <Box
      sx={{ '& a': { color: 'primary.main' }, fontSize: '0.95rem', lineHeight: 1.5 }}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source, keepMarkers) }}
    />
  );
}
