import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, size = '1024x1024', apiKey, imageBase64 } = await req.json();

    const key = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!key) {
      return NextResponse.json(
        { error: 'Chave da API do Opus 4.8 não configurada. Acesse Configurações do Studio e insira sua chave.' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt de imagem é obrigatório.' },
        { status: 400 }
      );
    }

    // Mapear tamanhos para o ratio que o Opus 4.8 Image aceita
    // Opus 4.8 Image (gemini-2.5-flash-image-preview) aceita apenas: 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
    let aspectRatio = '1:1';
    if (size === '1920x1080') aspectRatio = '16:9';
    else if (size === '1080x1920') aspectRatio = '9:16';
    else if (size === '1080x1350') aspectRatio = '4:5';
    else if (size === '1080x1080') aspectRatio = '1:1';

    // Construir o body para o Opus 4.8 Image
    // O Opus 4.8 Image Preview recebe "GenerateContentRequest" via REST
    // Documentação: https://docs.anthropic.com/en/api/messages
    // O Opus 4.8 Image Preview usa Messages API com multimodal output
    const messages: any[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: imageBase64 || '',
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ];

    // Se não houver imagem anexada, enviar só texto
    if (!imageBase64) {
      messages[0].content = [{ type: 'text', text: prompt }];
    }

    const body: any = {
      model: 'claude-sonnet-4-5',
      max_tokens: 8192,
      messages,
      // Solicitar geração de imagem na resposta
      tools: [
        {
          type: 'image_generation',
          name: 'generate_image',
          input: {
            aspect_ratio: aspectRatio,
            number_of_images: 1,
          },
        },
      ],
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || `Falha ao gerar imagem com Opus 4.8 (status ${response.status}).`;
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    // Procurar o bloco de imagem no output do Opus 4.8
    let imageUrl: string | null = null;
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'image' || block.type === 'tool_use') {
          // O Opus 4.8 Image Preview retorna imagens como base64 dentro do tool_use
          if (block.type === 'tool_use' && block.input?.images?.[0]) {
            imageUrl = `data:image/png;base64,${block.input.images[0]}`;
            break;
          }
          if (block.type === 'image' && block.source?.data) {
            imageUrl = `data:image/png;base64,${block.source.data}`;
            break;
          }
        }
      }
    }

    if (!imageUrl) {
      return NextResponse.json({
        error: 'O Opus 4.8 não retornou uma imagem nessa resposta. Tente refinar o prompt ou use OpenAI DALL-E.',
      }, { status: 502 });
    }

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error('Erro na geração de imagem Opus 4.8:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
