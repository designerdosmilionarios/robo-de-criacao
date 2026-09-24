import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Mapeia formatos solicitados para os tamanhos aceitos pelo DALL-E 3
    let dalleSize: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024';
    if (size === '1920x1080' || size === '1792x1024' || size === '1536x1024') {
      dalleSize = '1792x1024'; // paisagem
    } else if (size === '1080x1920' || size === '1024x1792' || size === '1024x1536') {
      dalleSize = '1024x1792'; // retrato
    } else {
      dalleSize = '1024x1024'; // quadrado
    }

    // DALL-E 3: Sem response_format (descontinuado). Retorna URL por padrão.
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
        size: dalleSize,
        quality: 'standard',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || 'Falha ao gerar imagem com a OpenAI.';
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    const imageUrlFromApi = data.data?.[0]?.url;

    if (!imageUrlFromApi) {
      return NextResponse.json(
        { error: 'A OpenAI não retornou uma URL de imagem válida.' },
        { status: 502 }
      );
    }

    // DALL-E 3 retorna apenas URL temporária. Fazemos o download server-side
    // e convertemos para base64 para o frontend poder exibir sem problemas de CORS/expiração.
    let imageUrl = imageUrlFromApi;
    try {
      const imgRes = await fetch(imageUrlFromApi);
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mime = imgRes.headers.get('content-type') || 'image/png';
        imageUrl = `data:${mime};base64,${buffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Falha ao converter URL para base64, retornando URL:', e);
      // Mantém a URL pública se falhar a conversão
    }

    return NextResponse.json({
      imageUrl,
      revisedPrompt: data.data?.[0]?.revised_prompt,
    });
  } catch (error: any) {
    console.error('Erro na geração de imagem:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
