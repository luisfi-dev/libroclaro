import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from 'pdf-lib';

export interface MdFonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  mono: PDFFont;
}

export async function embedMarkdownFonts(pdf: PDFDocument): Promise<MdFonts> {
  return {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
    mono: await pdf.embedFont(StandardFonts.Courier),
  };
}

interface InlineStyle {
  bold: boolean;
  italic: boolean;
  code: boolean;
  link?: string;
}

interface InlineSegment {
  text: string;
  style: InlineStyle;
}

const LINK_COLOR = rgb(0.12, 0.31, 0.66);
const CODE_BG = rgb(0.95, 0.96, 0.97);
const TEXT_COLOR = rgb(0.05, 0.05, 0.1);

function styleOf(base: InlineStyle, patch: Partial<InlineStyle>): InlineStyle {
  return { ...base, ...patch };
}

/** Parse inline markdown into styled segments. Supports **bold**, *italic*, `code`, [text](url). */
function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let buffer = '';
  let i = 0;
  const stack: InlineStyle[] = [{ bold: false, italic: false, code: false }];
  const current = () => stack[stack.length - 1];

  const flush = () => {
    if (buffer.length === 0) return;
    segments.push({ text: buffer, style: current() });
    buffer = '';
  };

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    // Inline code: take everything between backticks literally
    if (ch === '`') {
      flush();
      const end = text.indexOf('`', i + 1);
      if (end > i) {
        segments.push({ text: text.slice(i + 1, end), style: styleOf(current(), { code: true }) });
        i = end + 1;
        continue;
      }
    }

    // Link: [text](url)
    if (ch === '[') {
      const closeBracket = text.indexOf(']', i + 1);
      if (closeBracket > i && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen > closeBracket) {
          flush();
          const label = text.slice(i + 1, closeBracket);
          const url = text.slice(closeBracket + 2, closeParen);
          for (const seg of parseInline(label)) {
            segments.push({ text: seg.text, style: { ...seg.style, link: url } });
          }
          i = closeParen + 1;
          continue;
        }
      }
    }

    // Bold (**...**)
    if (ch === '*' && next === '*') {
      flush();
      if (current().bold) stack.pop();
      else stack.push(styleOf(current(), { bold: true }));
      i += 2;
      continue;
    }

    // Italic (*...*) — single asterisk
    if (ch === '*') {
      flush();
      if (current().italic) stack.pop();
      else stack.push(styleOf(current(), { italic: true }));
      i += 1;
      continue;
    }

    buffer += ch;
    i += 1;
  }
  flush();
  return segments;
}

function pickFont(style: InlineStyle, fonts: MdFonts): PDFFont {
  if (style.code) return fonts.mono;
  if (style.bold && style.italic) return fonts.boldItalic;
  if (style.bold) return fonts.bold;
  if (style.italic) return fonts.italic;
  return fonts.regular;
}

interface WrappedToken {
  text: string;
  style: InlineStyle;
  width: number;
}

/** Break inline segments into space-delimited tokens, measuring each one. */
function tokenize(segments: InlineSegment[], fonts: MdFonts, fontSize: number): WrappedToken[] {
  const tokens: WrappedToken[] = [];
  for (const seg of segments) {
    if (seg.text.length === 0) continue;
    // Keep the spaces so we can rebuild lines naturally
    const parts = seg.text.split(/(\s+)/);
    for (const part of parts) {
      if (part.length === 0) continue;
      const font = pickFont(seg.style, fonts);
      const width = font.widthOfTextAtSize(part, fontSize);
      tokens.push({ text: part, style: seg.style, width });
    }
  }
  return tokens;
}

interface RenderLineCursor {
  page: PDFPage;
  y: number;
}

interface RenderContext {
  pdf: PDFDocument;
  fonts: MdFonts;
  marginX: number;
  marginY: number;
  contentWidth: () => number;
  /** Adds a fresh page and returns it, resetting cursor near the top */
  newPage: () => RenderLineCursor;
}

function ensureSpace(ctx: RenderContext, cursor: RenderLineCursor, needed: number): RenderLineCursor {
  if (cursor.y - needed < ctx.marginY) {
    return ctx.newPage();
  }
  return cursor;
}

function drawTokens(
  ctx: RenderContext,
  cursor: RenderLineCursor,
  tokens: WrappedToken[],
  fontSize: number,
  lineHeight: number,
  indent = 0,
): RenderLineCursor {
  const maxWidth = ctx.contentWidth() - indent;
  let line: WrappedToken[] = [];
  let lineWidth = 0;
  let current = cursor;

  const flushLine = (isLastLine: boolean) => {
    // Strip trailing whitespace tokens
    while (line.length > 0 && /^\s+$/.test(line[line.length - 1].text)) {
      lineWidth -= line[line.length - 1].width;
      line.pop();
    }
    if (line.length === 0) return;

    current = ensureSpace(ctx, current, lineHeight);
    let x = ctx.marginX + indent;
    for (const tok of line) {
      const font = pickFont(tok.style, ctx.fonts);
      const color = tok.style.link ? LINK_COLOR : TEXT_COLOR;

      if (tok.style.code) {
        current.page.drawRectangle({
          x: x - 1,
          y: current.y - 2,
          width: tok.width + 2,
          height: fontSize + 2,
          color: CODE_BG,
        });
      }

      current.page.drawText(tok.text, {
        x,
        y: current.y,
        size: fontSize,
        font,
        color,
      });

      if (tok.style.link) {
        // Underline
        current.page.drawLine({
          start: { x, y: current.y - 1 },
          end: { x: x + tok.width, y: current.y - 1 },
          thickness: 0.6,
          color: LINK_COLOR,
        });
      }

      x += tok.width;
    }
    current.y -= lineHeight;
    line = [];
    lineWidth = 0;
    void isLastLine;
  };

  for (const tok of tokens) {
    const isSpace = /^\s+$/.test(tok.text);

    if (isSpace) {
      // Avoid leading whitespace on a new line
      if (line.length === 0) continue;
      line.push(tok);
      lineWidth += tok.width;
      continue;
    }

    if (lineWidth + tok.width > maxWidth && line.length > 0) {
      flushLine(false);
    }

    // Token wider than the line by itself: drop it as-is on its own line
    line.push(tok);
    lineWidth += tok.width;
  }
  flushLine(true);
  return current;
}

interface MarkdownOptions {
  baseFontSize?: number;
  baseLineHeight?: number;
}

/**
 * Render a Markdown document onto pages of the given PDF, starting at the cursor.
 * Returns the cursor positioned below the last rendered block.
 */
export function renderMarkdown(
  ctx: RenderContext,
  cursor: RenderLineCursor,
  source: string,
  options: MarkdownOptions = {},
): RenderLineCursor {
  const fontSize = options.baseFontSize ?? 11;
  const lineHeight = options.baseLineHeight ?? fontSize + 3;
  // Normalize to NFC so accented letters arrive as single code points. The
  // standard PDF fonts use WinAnsi, which can encode "á" (U+00E1) but not the
  // decomposed form "a" + combining accent (U+0301) that macOS often produces.
  const lines = source.normalize('NFC').replace(/\r\n/g, '\n').split('\n');

  let current = cursor;
  let inList = false;

  const blockGap = () => {
    current.y -= 4;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line === '') {
      if (inList) inList = false;
      blockGap();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      inList = false;
      const level = heading[1].length;
      const size = Math.max(fontSize + 1, fontSize + 9 - level); // h1 ≈ 19, h6 ≈ fontSize+1
      const lh = size + 4;
      const segments = parseInline(heading[2]);
      const tokens = tokenize(segments, ctx.fonts, size).map((t) => ({
        ...t,
        // Force bold for headings
        style: { ...t.style, bold: true },
      }));
      // Recompute widths with bold font
      for (const t of tokens) {
        t.width = pickFont(t.style, ctx.fonts).widthOfTextAtSize(t.text, size);
      }
      current.y -= 4;
      current = drawTokens(ctx, current, tokens, size, lh);
      current.y -= 2;
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      inList = true;
      const indent = 14;
      // Bullet symbol
      current = ensureSpace(ctx, current, lineHeight);
      current.page.drawText('•', {
        x: ctx.marginX + 2,
        y: current.y,
        size: fontSize,
        font: ctx.fonts.regular,
        color: TEXT_COLOR,
      });
      const segments = parseInline(bullet[1]);
      const tokens = tokenize(segments, ctx.fonts, fontSize);
      current = drawTokens(ctx, current, tokens, fontSize, lineHeight, indent);
      continue;
    }

    // Plain paragraph line
    const segments = parseInline(line);
    const tokens = tokenize(segments, ctx.fonts, fontSize);
    current = drawTokens(ctx, current, tokens, fontSize, lineHeight);
  }

  return current;
}

export type { RenderLineCursor };
export { TEXT_COLOR };
