import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Tenta gerar imagem com vários modelos de imagem da OpenAI em ordem de preferência
async function tryGenerate(key: string, model: string, prompt: string, size: string) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.trim()}`,
    },
    body: JSON.stringify({ model, prompt, n: 1, size }),
  });
  return response;
}

// Faz upgrade automático do prompt do usuário para gerar imagens profissionais de marketing.
// - Sempre entrega uma única imagem cinematográfica (sem composições divididas)
// - Bloqueia o modo "comparação" ou "antes/depois"
// - Reforça qualidade de anúncio / thumb
function enhancePromptForAd(rawPrompt: string): string {
  const base = String(rawPrompt || '').trim();
  // Se o usuário já digitou algo, usa como núcleo. Se não, gera um placeholder neutro.
  const core = base.length > 4
    ? base.replace(/\.+$/, '').replace(/\s+/g, ' ')
    : 'premium dark cinematic background for advertising';

  return [
    core,
    'A single cohesive cinematic scene, professional commercial advertising background, editorial photography, magazine quality, ultra-detailed, 8k, shot on Canon EOS R5 35mm f/1.4, cinematic color grading, dramatic rim lighting, deep depth of field',
    'IMPORTANT: Generate ONE single unified image, NOT a side-by-side comparison, NOT before/after, NOT split screen, NOT multiple panels. The entire frame must be a single continuous scene with one consistent lighting and composition.',
    'Avoid: text, words, letters, numbers, watermarks, signatures, logos, ugly artifacts, plastic skin, oversaturated colors, low resolution, blurry, distorted anatomy, extra fingers, deformed hands, multiple viewpoints',
    'Aspect ratio composition should leave clean space on the right or left side for text overlay to be added later',
  ].filter(Boolean).join('. ');
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, size = '1024x1024', apiKey } = await req.json();

    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key) {
      return NextResponse.json(
        { error: 'Chave da API da OpenAI não configurada. Insira sua chave nas Configurações do Studio.' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt de imagem é obrigatório.' },
        { status: 400 }
      );
    }

    // Aplica o upgrade de prompt (sempre, independente do modelo)
    const finalPrompt = enhancePromptForAd(prompt);

    // Mapeia o formato solicitado para o tamanho mais próximo aceito
    let requestedSize = '1024x1024';
    if (size === '1920x1080' || size === '1792x1024' || size === '1536x1024') {
      requestedSize = '1536x1024'; // paisagem
    } else if (size === '1080x1920' || size === '1024x1792' || size === '1024x1536') {
      requestedSize = '1024x1536'; // retrato
    }

    // Lista de modelos para tentar, do melhor/mais novo para o mais antigo
    const modelAttempts = [
      { name: 'gpt-image-1.5', size: requestedSize, supportsB64: true },
      { name: 'gpt-image-1', size: requestedSize, supportsB64: true },
      { name: 'gpt-image-2.5', size: requestedSize, supportsB64: true },
      { name: 'dall-e-3', size: requestedSize === '1024x1536' ? '1024x1792' : requestedSize === '1536x1024' ? '1792x1024' : '1024x1024', supportsB64: false },
      { name: 'dall-e-2', size: '1024x1024', supportsB64: true },
    ];

    let lastError: any = null;
    for (const attempt of modelAttempts) {
      try {
        const response = await tryGenerate(key, attempt.name, finalPrompt, attempt.size);

        const data = await response.json();

        if (!response.ok) {
          lastError = data.error?.message || `Falha com modelo ${attempt.name} (status ${response.status})`;
          console.warn(`[generate-image] ${attempt.name} falhou:`, lastError);
          if (response.status === 400 || response.status === 404) {
            continue;
          }
          return NextResponse.json({ error: lastError }, { status: response.status });
        }

        const item = data.data?.[0];
        if (!item) {
          lastError = `Modelo ${attempt.name} retornou resposta vazia.`;
          continue;
        }

        let imageUrl: string;
        let revisedPrompt: string | undefined;

        if (item.b64_json) {
          imageUrl = `data:image/png;base64,${item.b64_json}`;
        } else if (item.url) {
          try {
            const imgRes = await fetch(item.url);
            if (imgRes.ok) {
              const arrayBuffer = await imgRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const mime = imgRes.headers.get('content-type') || 'image/png';
              imageUrl = `data:${mime};base64,${buffer.toString('base64')}`;
            } else {
              imageUrl = item.url;
            }
          } catch (e) {
            console.warn('Falha ao converter URL para base64:', e);
            imageUrl = item.url;
          }
          revisedPrompt = item.revised_prompt;
        } else {
          lastError = `Modelo ${attempt.name} não retornou imagem.`;
          continue;
        }

        return NextResponse.json({
          imageUrl,
          revisedPrompt,
          modelUsed: attempt.name,
        });
      } catch (err: any) {
        console.error(`[generate-image] Erro com ${attempt.name}:`, err);
        lastError = err.message || 'Erro desconhecido';
      }
    }

    return NextResponse.json(
      {
        error:
          lastError ||
          'Nenhum modelo de imagem da OpenAI está disponível para esta conta. Sua chave parece não ter acesso a GPT Image ou DALL-E. Tente usar o Opus 4.8 (Anthropic) no seletor superior.',
      },
      { status: 502 }
    );
  } catch (error: any) {
    console.error('Erro na geração de imagem:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
