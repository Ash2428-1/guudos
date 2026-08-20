import 'server-only';
import { inflateRawSync } from 'node:zlib';

/**
 * Extract visible text from a .docx buffer WITHOUT any third-party zip library.
 * A .docx is a ZIP archive; we walk its central directory, inflate
 * `word/document.xml` with Node's built-in zlib, then pull the run text out of
 * the `<w:t>` elements. Paragraph (`<w:p>`) boundaries become newlines so the
 * layout survives well enough for the LLM to read fields off it.
 */
export function docxToText(buf: Buffer): string {
  const xml = readZipEntry(buf, 'word/document.xml');
  if (!xml) return '';
  const withBreaks = xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab\b[^>]*\/?>/g, '\t')
    .replace(/<w:br\b[^>]*\/?>/g, '\n');
  const parts: string[] = [];
  const re = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(withBreaks)) !== null) parts.push(decodeEntities(m[1]));
  // Re-derive paragraph breaks: split on the literal newlines we injected.
  const text = withBreaks.replace(re, (_all, t) => decodeEntities(t));
  const stripped = text.replace(/<[^>]+>/g, '');
  return (stripped.trim() || parts.join(' ')).replace(/\n{3,}/g, '\n\n').trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Read one file out of a ZIP archive via its central directory. */
function readZipEntry(buf: Buffer, wantName: string): string | null {
  // Locate End Of Central Directory record (0x06054b50), scanning from the end.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const cdCount = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16); // central directory offset

  for (let n = 0; n < cdCount; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break; // central dir header sig
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    if (name === wantName) {
      // Jump to the local file header to find where the data actually starts.
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const comp = buf.subarray(dataStart, dataStart + compSize);
      const raw = method === 0 ? comp : inflateRawSync(comp);
      return raw.toString('utf8');
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}
