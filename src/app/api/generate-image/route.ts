import { NextRequest, NextResponse } from 'next/server';

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
        size: size === '1024x1792' || size === '1024x1536' ? '1024x1792' : '1024x1024',
        quality: 'standard',
        response_format: 'b64_json',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || 'Falha ao gerar imagem com a OpenAI.';
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    const b64 = data.data?.[0]?.b64_json;
    const imageUrl = `data:image/png;base64,${b64}`;

    return NextResponse.json({ imageUrl, revisedPrompt: data.data?.[0]?.revised_prompt });
  } catch (error: any) {
    console.error('Erro na geração de imagem:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
