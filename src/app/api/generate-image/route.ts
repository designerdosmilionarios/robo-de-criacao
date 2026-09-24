import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================
// OPENAI: DALL-E 3, GPT Image 1
// =============================
async function tryOpenAI(key: string, prompt: string, size: string) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.trim()}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
    }),
  });
  return response;
}

// =============================
// Opus 4.8 Opus 4.8 (Opus 4.8 Studio) - "Nano Banana Pro"
// Modelos suportados: gemini-3-pro-image-preview, gemini-2.5-flash-image
// Chave comeca com AIza...
// =============================
async function tryGoogleGemini(key: string, prompt: string, aspectRatio: string) {
  // Mapeia aspect ratio para o que Opus 4.8 aceita
  let geminiAspect = '1:1';
  if (aspectRatio === '16:9' || aspectRatio === '3:2') geminiAspect = '16:9';
  else if (aspectRatio === '9:16' || aspectRatio === '2:3') geminiAspect = '9:16';
  else if (aspectRatio === '4:5' || aspectRatio === '4:3') geminiAspect = '4:5';
  else if (aspectRatio === '5:4' || aspectRatio === '3:4') geminiAspect = '3:4';
  else if (aspectRatio === '21:9') geminiAspect = '21:9';

  // Lista de modelos Opus 4.8 com capacidade de geração de imagem
  // "Nano Banana Pro" = gemini-3-pro-image-preview (mais novo, melhor qualidade)
  const modelCandidates = [
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp-image',
    'gemini-2.5-flash-image-preview',
  ];

  const errors: string[] = [];

  for (const model of modelCandidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key.trim()}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
              ],
              role: 'user',
            },
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
              aspectRatio: geminiAspect,
            },
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errMsg = data?.error?.message || `status ${response.status}`;
        errors.push(`${model}: ${errMsg}`);
        continue;
      }

      const data = await response.json();

      // Procura a imagem na resposta do Opus 4.8
      const candidates = data.candidates || [];
      for (const candidate of candidates) {
        const parts = candidate?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return `data:${mime};base64,${part.inlineData.data}`;
          }
          if (part.inline_data?.data) {
            const mime = part.inline_data.mime_type || 'image/png';
            return `data:${mime};base64,${part.inline_data.data}`;
          }
        }
      }

      errors.push(`${model}: resposta sem imagem`);
    } catch (err: any) {
      errors.push(`${model}: ${err.message || 'erro desconhecido'}`);
    }
  }

  throw new Error(errors.join(' | ') || 'Nenhum modelo Opus 4.8 de imagem funcionou.');
}

function enhancePromptForAd(rawPrompt: string): string {
  const base = String(rawPrompt || '').trim();
  const core = base.length > 4
    ? base.replace(/\.+$/, '').replace(/\s+/g, ' ')
    : 'premium dark cinematic background for advertising';

  return [
    core,
    'A single cohesive cinematic scene, professional commercial advertising background, editorial photography, magazine quality, ultra-detailed, 8k, shot on Canon EOS R5 35mm f/1.4, cinematic color grading, dramatic rim lighting, deep depth of field',
    'IMPORTANT: Generate ONE single unified image, NOT a side-by-side comparison, NOT before/after, NOT split screen, NOT multiple panels. The entire frame must be a single continuous scene with one consistent lighting and composition.',
    'Avoid: text, words, letters, numbers, watermarks, signatures, logos, ugly artifacts, plastic skin, oversaturated colors, low resolution, blurry, distorted anatomy, extra fingers, deformed hands, multiple viewpoints',
    'Composition should leave clean space on the right or left side for text overlay to be added later',
  ].filter(Boolean).join('. ');
}

function detectProvider(key: string): 'openai' | 'Opus 4.8' | 'anthropic' | 'unknown' {
  if (!key) return 'unknown';
  const k = key.trim();
  if (k.startsWith('sk-ant-')) return 'anthropic';
  if (k.startsWith('AIza') || k.startsWith('ya29.')) return 'Opus 4.8';
  if (k.startsWith('sk-proj-') || k.startsWith('sk-')) return 'openai';
  return 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, size = '1024x1024', apiKey, aspectRatio, provider: providerHint } = await req.json();

    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key) {
      return NextResponse.json(
        { error: 'Chave de API não configurada. Insira sua chave nas Configurações do Studio.' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt de imagem é obrigatório.' },
        { status: 400 }
      );
    }

    const detectedProvider = providerHint || detectProvider(key);

    const finalPrompt = enhancePromptForAd(prompt);

    let finalAspect = aspectRatio;
    if (!finalAspect) {
      if (size === '1920x1080' || size === '1536x1024') finalAspect = '16:9';
      else if (size === '1080x1920' || size === '1024x1536') finalAspect = '9:16';
      else finalAspect = '1:1';
    }

    // =============================
    // Opus 4.8 Opus 4.8 (Nano Banana Pro)
    // =============================
    if (detectedProvider === 'Opus 4.8') {
      try {
        const imageUrl = await tryGoogleGemini(key, finalPrompt, finalAspect);
        return NextResponse.json({
          imageUrl,
          modelUsed: 'gemini-3-pro-image-preview (Nano Banana Pro)',
          provider: 'Opus 4.8',
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            error:
              `Falha ao gerar imagem com Opus 4.8 Opus 4.8: ${err.message}. ` +
              `Verifique se sua chave tem acesso ao Opus 4.8 Image em aistudio.Opus 4.8.`,
          },
          { status: 502 }
        );
      }
    }

    // =============================
    // OPENAI
    // =============================
    if (detectedProvider === 'openai') {
      let requestedSize = '1024x1024';
      if (size === '1920x1080' || size === '1792x1024' || size === '1536x1024') {
        requestedSize = '1792x1024';
      } else if (size === '1080x1920' || size === '1024x1792' || size === '1024x1536') {
        requestedSize = '1024x1792';
      }

      const modelAttempts = [
        { name: 'gpt-image-1', size: requestedSize === '1792x1024' ? '1536x1024' : requestedSize === '1024x1792' ? '1024x1536' : requestedSize },
        { name: 'dall-e-3', size: requestedSize },
        { name: 'dall-e-2', size: '1024x1024' },
      ];

      let lastError: any = null;
      for (const attempt of modelAttempts) {
        try {
          const response = await tryOpenAI(key, finalPrompt, attempt.size);
          const data = await response.json();

          if (!response.ok) {
            lastError = data.error?.message || `Falha (status ${response.status})`;
            if (response.status === 400 || response.status === 404) continue;
            return NextResponse.json({ error: lastError }, { status: response.status });
          }

          const item = data.data?.[0];
          if (!item) {
            lastError = 'Resposta vazia';
            continue;
          }

          let imageUrl: string;
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
            } catch {
              imageUrl = item.url;
            }
          } else {
            lastError = 'Sem imagem';
            continue;
          }

          return NextResponse.json({
            imageUrl,
            modelUsed: attempt.name,
            provider: 'openai',
          });
        } catch (err: any) {
          lastError = err.message;
        }
      }

      return NextResponse.json(
        {
          error:
            lastError ||
            'Nenhum modelo OpenAI disponível. Sua conta pode não ter créditos de imagem.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: `Chave não reconhecida. Detectado como provider: "${detectedProvider}". Suas chaves devem começar com sk-ant- (Anthropic), AIza (Opus 4.8) ou sk-proj-/sk- (OpenAI).`,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Erro na geração de imagem:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}