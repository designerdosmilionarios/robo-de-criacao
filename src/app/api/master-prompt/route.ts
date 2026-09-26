import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Endpoint dedicado para prompts de imagem e variacoes de copy.

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

OBJETIVO: receber uma descricao curta do usuario (em portugues ou ingles) e transformar em um prompt profissional de imagem em INGLES, otimizado para modelos de geracao de imagem.

REGRAS:
1. SEMPRE retorne o prompt em INGLES, mesmo que o usuario fale em portugues.
2. O prompt DEVE ser detalhado (80-180 palavras) com: sujeito especifico, ambiente coerente, composicao, iluminacao, paleta, atmosfera e linguagem visual.
3. Converta o beneficio do briefing em uma cena concreta e reconhecivel. A imagem precisa parecer feita para esse cliente, nao para qualquer anuncio.
4. Inclua negative prompt: "Avoid text, words, letters, watermarks, blurry, distorted anatomy, extra fingers, ugly artifacts".
5. IMPORTANTE: Peça para gerar UMA unica imagem coesa (NAO split screen, NAO antes/depois, NAO multiplas telas).
6. Reserve uma area limpa, escura ou de baixo detalhe para sobreposicao de texto depois, mantendo rostos, produtos e pontos focais fora dessa area.
7. Evite cliches de marketing: celulares, dashboards, graficos, icones sociais, apertos de mao, lampadas e escritorios genericos, exceto quando forem essenciais ao briefing.
8. Retorne APENAS o prompt otimizado, sem explicacoes extras, sem markdown, sem "Here is..." no comeco.

Exemplo de saida ideal:
"Premium editorial advertising photograph of a nutrition professional preparing a personalized consultation table in a warm contemporary clinic, authentic human details and believable materials, subject framed on the right third, restrained olive and cream palette, soft directional window light, calm aspirational mood, clean low-detail negative space on the left for campaign typography, single cohesive scene. Avoid: text, words, letters, dashboards, generic stock-photo poses, watermarks, plastic skin, distorted anatomy and visual clutter."`;

const buildCopySystemPrompt = (count: number) => `Voce e um diretor criativo e redator publicitario brasileiro especializado em campanhas de performance com linguagem humana, especifica e memoravel.

Crie exatamente ${count} conceitos realmente distintos a partir do briefing recebido.
Cada conceito deve ocupar uma unica linha no formato: HEADLINE | APOIO | CTA

REGRAS OBRIGATORIAS:
- HEADLINE: 4 a 7 palavras, no maximo 42 caracteres. Uma ideia forte, concreta e natural.
- APOIO: 6 a 12 palavras, no maximo 78 caracteres. Complemente a promessa sem repetir a headline.
- CTA: 2 a 4 palavras, no maximo 24 caracteres, sempre presente e com verbo de acao.
- Use detalhes reais do briefing: publico, problema, mecanismo, produto, cidade ou resultado desejado.
- Varie os angulos entre dor, desejo, contraste, curiosidade, prova e oportunidade.
- Evite frases vagas como "transforme seus resultados", "alcance o sucesso", "eleve seu negocio", "solucao inovadora" e "venha fazer parte".
- Nao invente numeros, garantias, depoimentos ou promessas que nao estejam no briefing.
- Escreva em portugues do Brasil, sem hashtags, emojis, aspas ou ponto final na headline.
- Nao use numeracao, marcadores, titulos, explicacoes ou markdown.`;

export async function POST(req: NextRequest) {
  try {
    const { brief, type = 'image', apiKey, count: requestedCount } = await req.json();
    const copyCount = Math.min(Math.max(Number.parseInt(String(requestedCount || 4), 10) || 4, 1), 12);

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
      type === 'copy'
        ? `Crie exatamente ${copyCount} conceitos de campanha para este anuncio. Extraia a tensao principal, o publico e o beneficio concreto do briefing antes de escrever, mas entregue somente as linhas finais: ${brief}`
        : type === 'briefing'
        ? `Crie um prompt de imagem profissional para: ${brief}. Retorne APENAS o prompt em ingles.`
        : `Melhore este prompt de imagem publicitaria, adicionando detalhes tecnicos, iluminacao cinematica, composicao profissional e negative prompts. Prompt original: "${brief}". Retorne APENAS o prompt melhorado em ingles.`;

    const response = await callOpenAIChat(
      key,
      type === 'copy' ? buildCopySystemPrompt(copyCount) : SYSTEM_PROMPT,
      userMessage
    );
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
