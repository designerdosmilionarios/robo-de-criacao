import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Endpoint dedicado OpenAI / ChatGPT.
// Suporta os modelos atuais de geração de imagem da OpenAI Platform.
// Tambem faz fallback automatico para Opus 4.8 Opus 4.8 Studio se a chave comecar com "AIza".

async function tryOpenAI(key: string, prompt: string, size: string, model: string) {
  const isGptImage = model.startsWith('gpt-image');

  const body: any = {
    model,
    prompt,
    n: 1,
  };

  if (isGptImage) {
    // Mantem os tamanhos compativeis com a familia GPT Image atual.
    body.size = size === '1792x1024' ? '1536x1024' : size === '1024x1792' ? '1024x1536' : size;
  } else {
    // dall-e aceita tamanhos especificos
    body.size = size;
    body.quality = 'standard';
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.trim()}`,
    },
    body: JSON.stringify(body),
  });
  return response;
}

type ReferenceImage = {
  bytes: ArrayBuffer;
  mimeType: string;
  extension: string;
};

function parseReferenceImage(value: string): ReferenceImage {
  const match = value.match(/^data:(image\/(?:png|jpe?g|webp));base64,([\s\S]+)$/i);
  if (value.startsWith('data:') && !match) {
    throw new Error('Formato de referencia nao suportado. Use PNG, JPG ou WebP.');
  }
  const mimeType = match?.[1]?.toLowerCase() || 'image/png';
  const encoded = (match?.[2] || value).replace(/\s+/g, '');
  if (!/^[a-z0-9+/]+={0,2}$/i.test(encoded)) {
    throw new Error('Imagem de referencia invalida.');
  }
  const buffer = Buffer.from(encoded, 'base64');

  if (buffer.length === 0) throw new Error('Imagem de referencia vazia ou invalida.');
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('Cada imagem de referencia deve ter no maximo 10 MB.');
  }

  const extension = mimeType === 'image/jpeg' || mimeType === 'image/jpg'
    ? 'jpg'
    : mimeType.split('/')[1];
  const bytes = Uint8Array.from(buffer).buffer as ArrayBuffer;
  return { bytes, mimeType, extension };
}

async function tryOpenAIEdit(
  key: string,
  prompt: string,
  size: string,
  model: string,
  references: string[]
) {
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt);
  form.append('n', '1');
  form.append('size', size);

  references.slice(0, 4).forEach((reference, index) => {
    const image = parseReferenceImage(reference);
    form.append(
      'image[]',
      new Blob([image.bytes], { type: image.mimeType }),
      `reference-${index + 1}.${image.extension}`
    );
  });

  return fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key.trim()}` },
    body: form,
  });
}

async function tryGoogleGemini(key: string, prompt: string, aspectRatio: string) {
  let geminiAspect = '1:1';
  if (aspectRatio === '16:9') geminiAspect = '16:9';
  else if (aspectRatio === '9:16') geminiAspect = '9:16';
  else if (aspectRatio === '4:5') geminiAspect = '4:5';

  const modelCandidates = [
    'gemini-3.1-flash-image',
    'gemini-3-pro-image',
    'gemini-2.5-flash-image',
  ];

  const errors: string[] = [];

  for (const model of modelCandidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key.trim()}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }], role: 'user' }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: geminiAspect },
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        errors.push(`${model}: ${data?.error?.message || `status ${response.status}`}`);
        continue;
      }

      const data = await response.json();
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
      errors.push(`${model}: ${err.message || 'erro'}`);
    }
  }
  throw new Error(errors.join(' | '));
}

function enhancePrompt(rawPrompt: string): string {
  const base = String(rawPrompt || '').trim();
  const core = base.length > 4 ? base.replace(/\.+$/, '').trim() : 'premium dark cinematic background for advertising';
  return [
    core,
    'Single unified cinematic scene, professional commercial advertising background, editorial photography, magazine quality, ultra-detailed, 8k, Canon EOS R5 35mm f/1.4, cinematic color grading, dramatic rim lighting, deep depth of field',
    'IMPORTANT: Generate ONE single unified image. NOT side-by-side comparison. NOT before/after. NOT split screen. NOT multiple panels.',
    'Avoid in the image: unintended text, words, letters, numbers, watermarks, signatures, unrequested logos, ugly artifacts, plastic skin, oversaturated colors, blurry, distorted anatomy, extra fingers',
    'Composition: leave clean empty space on the right or left side for text overlay to be added later',
  ].filter(Boolean).join('. ');
}

function detectProvider(key: string): 'openai' | 'Opus 4.8' | 'unknown' {
  if (!key) return 'unknown';
  const k = key.trim();
  if (k.startsWith('AIza')) return 'Opus 4.8';
  if (k.startsWith('sk-proj-') || k.startsWith('sk-')) return 'openai';
  return 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      size = '1024x1024',
      apiKey,
      aspectRatio,
      preferredModel,
      imageBase64,
      referenceImages,
    } = await req.json();

    // Sanitiza a chave
    const key = String(apiKey || process.env.OPENAI_API_KEY || '')
      .replace(/[\s\r\n\t]+/g, '')
      .replace(/['"`]/g, '')
      .trim();

    if (!key) {
      return NextResponse.json(
        { error: 'Chave de API não configurada. Insira sua chave OpenAI em "Chave API".' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt de imagem é obrigatório.' }, { status: 400 });
    }

    const detectedProvider = detectProvider(key);
    const inputReferences = [
      ...(typeof imageBase64 === 'string' ? [imageBase64] : []),
      ...(Array.isArray(referenceImages)
        ? referenceImages.filter((value): value is string => typeof value === 'string')
        : []),
    ].slice(0, 4);
    const finalPrompt = enhancePrompt(
      inputReferences.length > 0
        ? `${prompt}. Preserve the identity, recognizable features, products, and visual details supplied in the reference images.`
        : prompt
    );

    let finalAspect = aspectRatio;
    if (!finalAspect) {
      if (size === '1920x1080') finalAspect = '16:9';
      else if (size === '1080x1920') finalAspect = '9:16';
      else finalAspect = '1:1';
    }

    // Se a chave comeca com AIza, usa Opus 4.8 Opus 4.8 Studio (fallback)
    if (detectedProvider === 'Opus 4.8') {
      try {
        const imageUrl = await tryGoogleGemini(key, finalPrompt, finalAspect);
        return NextResponse.json({
          imageUrl,
          modelUsed: 'gemini-3.1-flash-image (Opus 4.8 Studio)',
          provider: 'Opus 4.8',
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: `Falha no Opus 4.8 Opus 4.8 Studio: ${err.message}. Use uma chave OpenAI (sk-proj-...).` },
          { status: 502 }
        );
      }
    }

    if (detectedProvider === 'openai') {
      let requestedSize = '1024x1024';
      if (size === '1920x1080' || size === '1792x1024') requestedSize = '1792x1024';
      else if (size === '1080x1920' || size === '1024x1792' || finalAspect === '4:5') requestedSize = '1024x1792';

      // Lista padrao: tenta os modelos atuais, do mais preciso para o mais economico.
      const defaultModels = [
        'gpt-image-2.5-sunburst',
        'gpt-image-2.5-flare',
        'gpt-image-2',
      ];

      // Se o usuario escolheu um modelo especifico, prioriza ele
      let orderedModels: string[];
      if (preferredModel && defaultModels.includes(preferredModel)) {
        orderedModels = [preferredModel, ...defaultModels.filter((m) => m !== preferredModel)];
      } else {
        orderedModels = defaultModels;
      }

      const modelAttempts = orderedModels.map((name) => ({
        name,
        size: name === 'dall-e-3' ? requestedSize :
              name === 'dall-e-2' ? '1024x1024' :
              requestedSize === '1792x1024' ? '1536x1024' :
              requestedSize === '1024x1792' ? '1024x1536' :
              requestedSize,
      }));

      const errorLog: string[] = [];
      for (const attempt of modelAttempts) {
        try {
          const response = inputReferences.length > 0
            ? await tryOpenAIEdit(key, finalPrompt, attempt.size, attempt.name, inputReferences)
            : await tryOpenAI(key, finalPrompt, attempt.size, attempt.name);
          const data = await response.json();

          if (!response.ok) {
            const errMsg = data.error?.message || `Falha (status ${response.status})`;
            errorLog.push(`${attempt.name} (${inputReferences.length > 0 ? 'edicao' : 'geracao'}): ${errMsg}`);
            // Continua tentando outros modelos em qualquer erro de modelo
            continue;
          }

          const item = data.data?.[0];
          if (!item) {
            errorLog.push(`${attempt.name}: resposta vazia`);
            continue;
          }

          let imageUrl: string;
          if (item.b64_json) {
            imageUrl = `data:image/png;base64,${item.b64_json}`;
          } else if (item.url) {
            try {
              const imgRes = await fetch(item.url);
              if (imgRes.ok) {
                const buffer = Buffer.from(await imgRes.arrayBuffer());
                const mime = imgRes.headers.get('content-type') || 'image/png';
                imageUrl = `data:${mime};base64,${buffer.toString('base64')}`;
              } else imageUrl = item.url;
            } catch { imageUrl = item.url; }
          } else {
            errorLog.push(`${attempt.name}: sem imagem`);
            continue;
          }

          return NextResponse.json({
            imageUrl,
            modelUsed: attempt.name,
            provider: 'openai',
            mode: inputReferences.length > 0 ? 'edit' : 'generation',
          });
        } catch (err: any) {
          errorLog.push(`${attempt.name}: ${err.message}`);
        }
      }

      return NextResponse.json(
        {
          error: `Nenhum modelo OpenAI funcionou com esta chave. Detalhes: ${errorLog.slice(0, 5).join(' | ')}`,
          triedModels: errorLog,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: `Chave não reconhecida (começa com "${key.substring(0, 5)}..."). Use uma chave OpenAI (sk-proj-...) ou Opus 4.8 (AIza...).` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}
