/**
 * Local media proxy for Beeper bridge media files.
 *
 * Beeper stores media (images, voice messages, videos) as local files under:
 *   ~/Library/Application Support/BeeperTexts/media/<platform>/<mediaId>
 *
 * The message body contains either:
 *   - localmxc://local-whatsapp/<mediaId>  → ?beeper=localhostlocal-whatsapp/<mediaId>
 *   - file:///absolute/path/to/file         → ?path=/absolute/path/to/file
 *
 * This route reads the file from disk and serves it with the correct Content-Type.
 * Security: only serves files under the BeeperTexts media dir or /tmp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join, resolve, extname } from 'path';
import { homedir } from 'os';

const BEEPER_MEDIA_DIR = join(homedir(), 'Library', 'Application Support', 'BeeperTexts', 'media');
const ALLOWED_PREFIXES = [BEEPER_MEDIA_DIR, '/tmp'];

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    // Audio / voice messages
    '.ogg': 'audio/ogg',
    '.oga': 'audio/ogg',
    '.opus': 'audio/ogg; codecs=opus',
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.caf': 'audio/x-caf', // Apple voice memos
    // Video
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    // Generic
    '.pdf': 'application/pdf',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

function isPathAllowed(resolvedPath: string): boolean {
  return ALLOWED_PREFIXES.some(prefix => resolvedPath.startsWith(prefix));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const beeperParam = searchParams.get('beeper');
  const pathParam = searchParams.get('path');

  let filePath: string;

  if (beeperParam) {
    // Supported formats:
    //  - ?beeper=localhostlocal-whatsapp/<mediaId>  → media/whatsapp/<mediaId>
    //  - ?beeper=local-whatsapp/<mediaId>           → media/local-whatsapp/<mediaId>
    //  - ?beeper=local.beeper.com/<mediaId>         → media/local.beeper.com/<mediaId>
    //  - ?beeper=local.beeper.com/<mediaId>         (from mxc://local.beeper.com/...)
    const decoded = decodeURIComponent(beeperParam);
    let relative: string;
    if (decoded.startsWith('localhostlocal-')) {
      // Old bridge format: strip prefix → platform/mediaId
      relative = decoded.replace(/^localhostlocal-/, '');
    } else {
      // New format: server/mediaId used as-is (e.g. local.beeper.com/<id>, local-whatsapp/<id>)
      relative = decoded;
    }
    filePath = resolve(join(BEEPER_MEDIA_DIR, relative));
  } else if (pathParam) {
    // ?path=/absolute/path/to/file
    filePath = resolve(decodeURIComponent(pathParam));
  } else {
    return NextResponse.json({ error: 'Missing beeper or path parameter' }, { status: 400 });
  }

  // Security: only serve files in allowed directories
  if (!isPathAllowed(filePath)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    await stat(filePath);
    const data = await readFile(filePath);
    const mimeType = getMimeType(filePath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Length': data.length.toString(),
      },
    });
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found', path: filePath }, { status: 404 });
    }
    console.error('[media/local] Error reading file:', filePath, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
