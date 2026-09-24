import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Endpoint que lista imagens de uma pasta de referencias visuais (REFERENCIAS/)
// Quando rodando localmente: retorna as imagens em base64
// Quando em Vercel/online: retorna apenas os nomes dos arquivos (sem base64)

const REFERENCE_PATHS: string[] = [];

if (os.platform() === 'win32') {
  // Caminho padrao: pasta REFERENCIAS dentro do projeto
  REFERENCE_PATHS.push(
    path.join(process.cwd(), 'REFERENCIAS'),
    path.join(process.cwd(), 'REFERÊNCIAS'),
    'C:\\Users\\bruni\\OneDrive\\Creative Cloud Files\\Documentos\\01_CLIENTES_E_PROJETOS\\ROBÔ_DE_CRIAÇÃO\\REFERÊNCIAS'
  );
}

export async function GET(req: NextRequest) {
  try {
    // Tenta encontrar a pasta de referencias
    let foundDir: string | null = null;
    for (const dir of REFERENCE_PATHS) {
      try {
        if (fs.existsSync(dir)) {
          const entries = fs.readdirSync(dir);
          const imageFiles = entries.filter((f) => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f));
          if (imageFiles.length > 0) {
            foundDir = dir;
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!foundDir) {
      return NextResponse.json(
        {
          error:
            'Pasta de referencias nao encontrada no servidor. Use o Upload Manual no FlowCanvas para adicionar referencias individuais.',
        },
        { status: 404 }
      );
    }

    // Lista todos os arquivos de imagem
    const allFiles = fs.readdirSync(foundDir);
    const imageFiles = allFiles
      .filter((f) => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f))
      .sort();

    // Limita para evitar timeout (max 30 imagens em base64)
    const MAX_RETURN = 30;
    const limitedFiles = imageFiles.slice(0, MAX_RETURN);

    // Detecta se estamos em ambiente sem filesystem (Vercel)
    // Se chegamos aqui, achamos a pasta local; retorna os arquivos
    const references: Array<{
      filename: string;
      path: string;
      base64?: string; // so presente no local
      sizeKB: number;
    }> = [];

    for (const filename of limitedFiles) {
      try {
        const fullPath = path.join(foundDir, filename);
        const buffer = fs.readFileSync(fullPath);
        const mime = getMime(fullPath);
        references.push({
          filename,
          path: fullPath,
          base64: `data:${mime};base64,${buffer.toString('base64')}`,
          sizeKB: Math.round(buffer.length / 1024),
        });
      } catch (e) {
        // pula
      }
    }

    return NextResponse.json({
      sourceDir: foundDir,
      total: imageFiles.length,
      returned: references.length,
      truncated: imageFiles.length > MAX_RETURN,
      references,
    });
  } catch (error: any) {
    console.error('Erro ao listar referencias:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}

function getMime(p: string): string {
  const ext = p.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}
