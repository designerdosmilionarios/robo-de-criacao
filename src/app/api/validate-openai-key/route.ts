import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';

    if (!apiKey || !apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { valid: false, message: 'Informe uma chave OpenAI válida.' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });

    if (response.ok) {
      return NextResponse.json({
        valid: true,
        message:
          'Chave autenticada pela OpenAI. Saldo e acesso aos modelos de imagem são verificados somente durante a geração.',
      });
    }

    if (response.status === 401) {
      return NextResponse.json(
        { valid: false, message: 'A OpenAI rejeitou esta chave. Confira se ela foi copiada por inteiro.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        valid: false,
        message: `A OpenAI não conseguiu validar a chave neste momento (erro ${response.status}).`,
      },
      { status: response.status >= 400 && response.status < 600 ? response.status : 502 }
    );
  } catch (error) {
    console.error('Erro ao validar chave OpenAI:', error);
    return NextResponse.json(
      { valid: false, message: 'Não foi possível concluir a validação. Tente novamente.' },
      { status: 500 }
    );
  }
}
