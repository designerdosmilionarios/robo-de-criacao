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

    // Mapeia o formato solicitado para o tamanho mais próximo aceito pelo modelo
    let requestedSize = '1024x1024';
    if (size === '1920x1080' || size === '1792x1024' || size === '1536x1024') {
      requestedSize = '1536x1024'; // paisagem (gpt-image-1)
    } else if (size === '1080x1920' || size === '1024x1792' || size === '1024x1536') {
      requestedSize = '1024x1536'; // retrato (gpt-image-1)
    }

    // Lista de modelos para tentar, do melhor/mais novo para o mais antigo
    const modelAttempts = [
      { name: 'gpt-image-1', size: requestedSize, supportsB64: true },
      { name: 'dall-e-3', size: requestedSize === '1024x1536' ? '1024x1792' : requestedSize === '1536x1024' ? '1792x1024' : '1024x1024', supportsB64: false },
      { name: 'dall-e-2', size: '1024x1024', supportsB64: true },
    ];

    let lastError: any = null;
    for (const attempt of modelAttempts) {
      try {
        const response = await tryGenerate(key, attempt.name, prompt, attempt.size);

        const data = await response.json();

        if (!response.ok) {
          lastError = data.error?.message || `Falha com modelo ${attempt.name} (status ${response.status})`;
          console.warn(`[generate-image] ${attempt.name} falhou:`, lastError);
          // Se for erro 400 (parâmetro inválido) ou 404 (modelo não existe), tenta o próximo
          if (response.status === 400 || response.status === 404) {
            continue;
          }
          // Para outros erros (401, 429, 500), propaga
          return NextResponse.json({ error: lastError }, { status: response.status });
        }

        // Resposta bem-sucedida
        const item = data.data?.[0];
        if (!item) {
          lastError = `Modelo ${attempt.name} retornou resposta vazia.`;
          continue;
        }

        let imageUrl: string;
        let revisedPrompt: string | undefined;

        // gpt-image-1 e dall-e-2 retornam b64_json por padrão
        if (item.b64_json) {
          imageUrl = `data:image/png;base64,${item.b64_json}`;
        } else if (item.url) {
          // dall-e-3 retorna URL temporária
          // Faz download server-side para converter em base64
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
          'Nenhum modelo de imagem da OpenAI está disponível para esta conta. Tente usar a chave do Opus 4.8 (Anthropic) ou verifique os créditos em platform.openai.com.',
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
