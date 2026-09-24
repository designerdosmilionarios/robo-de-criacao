import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Garante que a rota seja sempre dinâmica (lê arquivos do disco)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Endpoint que retorna as fontes instaladas no Windows lendo diretamente de C:\Windows\Fonts
// Aceita um parâmetro opcional `path` na query string para ler de uma pasta customizada
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customPath = searchParams.get('path');

    // Caminhos candidatos onde o Windows costuma armazenar fontes
    const candidates: string[] = [];

    if (customPath && customPath.trim().length > 0) {
      candidates.push(customPath);
    }

    if (os.platform() === 'win32') {
      // Caminho padrão no Windows
      const winDir = process.env.WINDIR || process.env.SystemRoot || 'C:\\Windows';
      candidates.push(path.join(winDir, 'Fonts'));

      // Pasta de usuário (fontes instaladas pelo usuário)
      const localAppData = process.env.LOCALAPPDATA;
      if (localAppData) {
        candidates.push(path.join(localAppData, 'Microsoft', 'Windows', 'Fonts'));
      }
    } else {
      // Linux / Mac
      candidates.push('/usr/share/fonts');
      candidates.push('/System/Library/Fonts');
      candidates.push(path.join(os.homedir(), '.fonts'));
      candidates.push(path.join(os.homedir(), 'Library', 'Fonts'));
    }

    let foundDir: string | null = null;
    let files: string[] = [];

    for (const dir of candidates) {
      try {
        if (fs.existsSync(dir)) {
          const entries = fs.readdirSync(dir);
          // Filtrar apenas arquivos de fonte
          const fontFiles = entries.filter((f) =>
            /\.(ttf|otf|woff2?)$/i.test(f)
          );
          if (fontFiles.length > 0) {
            foundDir = dir;
            files = fontFiles.map((f) => path.join(dir, f));
            break;
          }
        }
      } catch (e) {
        // Continua tentando o próximo caminho
        continue;
      }
    }

    if (!foundDir || files.length === 0) {
      return NextResponse.json(
        {
          error: `Nenhuma pasta de fontes encontrada. Tentamos: ${candidates.join(' | ')}. Use o botão "Selecionar arquivos" para escolher manualmente.`,
          tried: candidates,
        },
        { status: 404 }
      );
    }

    // Limitar para evitar timeout e exceder quota do navegador
    const MAX_FONTS = 80;
    const limited = files.slice(0, MAX_FONTS);
    const truncated = files.length > MAX_FONTS;

    const fonts: Array<{
      filename: string;
      family: string;
      format: string;
      weight: string;
      italic: boolean;
      base64: string;
      sizeKB: number;
    }> = [];

    for (const fullPath of limited) {
      try {
        const buffer = fs.readFileSync(fullPath);
        const base64 = `data:${getMime(fullPath)};base64,${buffer.toString('base64')}`;
        const filename = path.basename(fullPath);
        fonts.push({
          filename,
          family: inferFamily(filename),
          format: inferFormat(filename),
          weight: inferWeight(filename),
          italic: inferItalic(filename),
          base64,
          sizeKB: Math.round(buffer.length / 1024),
        });
      } catch (e) {
        // Pula arquivo que não pôde ser lido
        continue;
      }
    }

    return NextResponse.json({
      sourceDir: foundDir,
      count: fonts.length,
      totalFound: files.length,
      truncated,
      fonts,
    });
  } catch (error: any) {
    console.error('Erro ao listar fontes do sistema:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao ler fontes do sistema.' },
      { status: 500 }
    );
  }
}

function getMime(p: string): string {
  const ext = p.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ttf':
      return 'font/ttf';
    case 'otf':
      return 'font/otf';
    case 'woff':
      return 'font/woff';
    case 'woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

function inferFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ttf':
      return 'truetype';
    case 'otf':
      return 'opentype';
    case 'woff':
      return 'woff';
    case 'woff2':
      return 'woff2';
    default:
      return 'truetype';
  }
}

function inferFamily(filename: string): string {
  return filename
    .replace(/\.(ttf|otf|woff2?)$/i, '')
    .replace(/[-_](regular|bold|light|medium|semibold|extrabold|black|thin|italic|variable|book|heavy|demibold|extralight|ultralight)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferWeight(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('thin')) return '100';
  if (lower.includes('extralight') || lower.includes('ultralight')) return '200';
  if (lower.includes('light')) return '300';
  if (lower.includes('medium')) return '500';
  if (lower.includes('semibold') || lower.includes('demibold')) return '600';
  if (lower.includes('extrabold')) return '800';
  if (lower.includes('bold')) return '700';
  if (lower.includes('black') || lower.includes('heavy')) return '900';
  if (lower.includes('regular') || lower.includes('normal')) return '400';
  return '400';
}

function inferItalic(filename: string): boolean {
  return filename.toLowerCase().includes('italic') || filename.toLowerCase().includes('oblique');
}
