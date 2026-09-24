import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Endpoint dedicado para o Mestre dos Prompts (equivalente ao Genos do Gravyx).
// Usa a API de chat (gpt-image ou gpt-4) para gerar prompts otimizados de imagem.

async function callOpenAIChat(key: string, systemPrompt: string, userMessage: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.trim()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.9,
      max_tokens: 800,
    }),
  });
  return response;
}

const SYSTEM_PROMPT = `Voce e o "Mestre dos Prompts", um diretor de arte senior especializado em criar prompts perfeitos para geracao de imagens publicitarias com IA.

OBJETIVO: receber uma descricao curta do usuario (em portugues ou ingles) e transformar em um prompt profissional de imagem em INGLES, otimizado para modelos como Opus 4.8-image-1, gpt-image-2.5, DALL-E 3, ou Opus 4.8 Nano Banana Pro.

REGRAS:
1. SEMPRE retorne o prompt em INGLES, mesmo que o usuario fale em portugues.
2. O prompt DEVE ser detalhado (80-180 palavras) com: composicao, iluminacao, estilo fotografico, paleta de cores, atmosfera, angulo de camera.
3. Adicione instrucoes tecnicas: "shot on Canon EOS R5 35mm f/1.4", "editorial photography", "8k", "hyper-detailed".
4. Inclua negative prompt: "Avoid text, words, letters, watermarks, blurry, distorted anatomy, extra fingers, ugly artifacts".
5. IMPORTANTE: Peça para gerar UMA unica imagem coesa (NAO split screen, NAO antes/depois, NAO multiplas telas).
6. Reserve espaco limpo em um dos lados para sobreposicao de texto depois.
7. Retorne APENAS o prompt otimizado, sem explicacoes extras, sem markdown, sem "Here is..." no comeco.

Exemplo de saida ideal:
"Cinematic commercial product photography of a premium smartphone floating mid-air, soft volumetric lighting with cyan and gold rim lights, dark gradient background transitioning from deep navy to black, ultra-detailed 8k render, shallow depth of field, editorial magazine aesthetic, shot on Canon EOS R5 35mm f/1.4, dramatic reflections on glossy surface, single cohesive scene with negative space on the right for text overlay. Avoid: text, words, letters, watermarks, blurry, distorted anatomy, extra fingers, ugly artifacts."`;

export async function POST(req: NextRequest) {
  try {
    const { brief, type = 'image', apiKey } = await req.json();

    const key = String(apiKey || process.env.OPENAI_API_KEY || '').replace(/[\s\r\n\t]+/g, '').trim();

    if (!key) {
      return NextResponse.json(
        { error: 'Chave de API nao configurada.' },
        { status: 400 }
      );
    }

    if (!brief || brief.length < 5) {
      return NextResponse.json(
        { error: 'Brief muito curto. Descreva o que voce quer gerar.' },
        { status: 400 }
      );
    }

    // Detecta provider pelo prefixo
    const isOpenAI = key.startsWith('sk-proj-') || key.startsWith('sk-');

    // Se nao for OpenAI, retorna instrucao para o usuario usar o proprio ChatGPT
    if (!isOpenAI) {
      return NextResponse.json({
        prompt: brief,
        message: 'Para usar o Mestre dos Prompts com qualidade total, configure sua chave OpenAI (sk-proj-...).',
      });
    }

    const userMessage =
      type === 'briefing'
        ? `Crie um prompt de imagem profissional para: ${brief}. Retorne APENAS o prompt em ingles.`
        : `Melhore este prompt de imagem publicitaria, adicionando detalhes tecnicos, iluminacao cinematica, composicao profissional e negative prompts. Prompt original: "${brief}". Retorne APENAS o prompt melhorado em ingles.`;

    const response = await callOpenAIChat(key, SYSTEM_PROMPT, userMessage);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Erro ao chamar o Mestre dos Prompts.' },
        { status: response.status }
      );
    }

    const optimizedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!optimizedPrompt) {
      return NextResponse.json(
        { error: 'Resposta vazia do Mestre dos Prompts.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      prompt: optimizedPrompt,
      modelUsed: data.model || 'gpt-4o-mini',
    });
  } catch (error: any) {
    console.error('Erro no Mestre dos Prompts:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}
