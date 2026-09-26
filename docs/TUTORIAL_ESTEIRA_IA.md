# 🎬 Tutorial Passo a Passo: Esteira IA (Gerar 9 Criativos a partir de 1 Briefing)

> **Para:** Cliente de social media que quer entender como geramos 9 variações de criativos em minutos.
> **Tempo de execução real:** ~5 minutos para configurar + ~80 segundos para a IA gerar tudo.

---

## O que é a Esteira IA?

É um **canvas visual** onde você conecta blocos (como se fossem peças de LEGO) para criar uma linha de produção automatizada de criativos. Você configura **uma vez** o briefing, fotos e textos, e a IA gera **N criativos prontos** para postar.

```
┌──────────────────────────────────────────────────────┐
│  Blocos de ENTRADA            Bloco OUTPUT           │
│  ┌─────┐  ┌─────┐  ┌─────┐        ┌────────────┐     │
│  │Brief│  │ Logo │  │Copys│ ────→  │  🚀 Lote N │     │
│  │ ing │  └─────┘  │ (9) │        │  count=9   │     │
│  └─────┘          └─────┘        └────────────┘     │
│                                                       │
│  Resultado: 9 criativos únicos em ZIP                │
└──────────────────────────────────────────────────────┘
```

---

## 📍 ETAPA 1 — Abrir a Esteira IA

No menu superior do Robô Studio, clique na aba **"Esteira IA"**.

![Tela inicial da Esteira IA]

Você verá um canvas em branco com a mensagem *"Comece criando seu fluxo"* e uma barra de ferramentas no topo com botões para cada tipo de bloco.

---

## 📍 ETAPA 2 — Adicionar o Briefing (Bloco Azul)

Na barra de ferramentas, clique no botão **"Briefing"** (ícone azul com letra).

Um bloco azul aparece no canvas. Dentro dele, escreva o briefing do produto:

```
Produto: Consórcio imobiliário para classe média
Público: 30-50 anos, querem casa própria sem juros
Dor: Juros abusivos de financiamento bancário
Objetivo: Captar leads qualificados para simulação
```

**Dica:** quanto mais detalhado o briefing, melhor o resultado da IA.

---

## 📍 ETAPA 3 — Adicionar a Logo do Cliente (Opcional)

Clique no botão **"Logo"** (roxo). Faça upload da logo do cliente em PNG com fundo transparente. A IA vai posicionar a logo automaticamente nos criativos.

---

## 📍 ETAPA 4 — Adicionar a Foto do Expert/Apresentador (Opcional)

Clique no botão **"Foto Expert"** (rosa/rose).

Faça upload da foto recortada do expert (PNG com fundo transparente). Marque o checkbox **"Preservar identidade facial"** — a IA vai gerar 9 variações mantendo o mesmo rosto e roupa do expert em diferentes cenários.

---

## 📍 ETAPA 5 — Adicionar as Copys (O PASSO MAIS IMPORTANTE)

### Opção A — Colar tudo de uma vez (RECOMENDADO)

1. Clique no botão **"Copys"** (amarelo) na barra de ferramentas.
2. No bloco amarelo criado, clique em **"📋 Colar"** (no canto superior direito do bloco).
3. Cole suas 9 linhas no formato:

```
Mude sua vida com consórcio | Sem juros abusivos | SIMULAR AGORA
Casa própria sem dívida de 35 anos | Cartas de R$300k a R$1.5M | FALAR COM ESPECIALISTA
Seu score alto te prende nos juros | Alavancagem inteligente | VER COMPARATIVO
Multiplique seu capital imobiliário | Sem descapitalizar caixa | RECEBER PROPOSTA
A sua casa própria não precisa de dívida | Planeje sem juros | QUERO SIMULAR
Construa patrimônio com inteligência | Investidores experientes | VER DEMONSTRAÇÃO
Fuja dos juros compostos | Pague em parcelas inteligentes | COMPARAR AGORA
Seu sonho em 5 anos, não 35 | Sem comprometer renda | SIMULAR GRÁTIS
Estratégia dos milionários | Use o consórcio a seu favor | FALAR COM CONSULTOR
```

4. Veja o preview ao vivo (3 copys detectadas, 9 copys detectadas, etc).
5. Clique em **"Aplicar 9 copys"**.

✅ Pronto! O bloco agora mostra **"9 copys"** e cada copy aparece em uma linha com Headline, Destaque e CTA.

### Opção B — Adicionar manualmente

Clique em **"+ Adicionar copy"** para cada nova linha e preencha os 3 campos (Headline, Destaque, CTA).

---

## 📍 ETAPA 6 — Adicionar o Bloco Lote N

Clique no botão **"🚀 Lote N"** (violeta) na barra de ferramentas.

Configure o número **9** no campo "Quantidade (1-12)".

Estimativa de tempo: **~72 segundos** (9 × 8s por imagem).

---

## 📍 ETAPA 7 — Conectar os Blocos

Cada bloco tem:
- **Bolinha colorida à direita (Saída)** → de onde saem os dados
- **Bolinha verde à esquerda (Entrada)** → onde os dados chegam

Conecte nesta ordem:

1. Clique na bolinha **🔌 Saída** do bloco **Briefing** → fica verde pulsando
2. Clique na bolinha **📥 Entrada** do bloco **Lote N** → linha verde pontilhada aparece
3. Repita para **Foto Expert** → **Lote N**
4. Repita para **Copys** → **Lote N** (importante: isso ativa o emparelhamento)
5. Repita para **Logo** → **Lote N**

Resultado: 4 linhas verdes pontilhadas convergem para o bloco **Lote N**.

---

## 📍 ETAPA 8 — Executar

Clique no botão **▶** (verde) do bloco **Lote N**.

O progresso aparece em tempo real:
```
Gerando 1/9...
Gerando 2/9...
Gerando 3/9...
...
Gerando 9/9...
```

⏱️ **Tempo total: ~72 segundos** (depende da velocidade da OpenAI).

---

## 📍 ETAPA 9 — Modal de Preview

Quando termina, abre automaticamente o modal **"Resultado Gerado pela IA"** com 9 cards em grid 2x2.

Cada card mostra:
- 🖼️ A imagem gerada
- 📝 **"Copy N: ..."** com a copy correspondente (na ordem)
- ⏬ Botão **"Baixar PNG"** individual

### Ajustar posição dos textos (opcional)

No topo do modal, ajuste os **sliders X/Y** para mover Headline, Destaque e CTA. A posição se aplica a **todos os 9 cards** simultaneamente.

Botão **"Resetar"** restaura posição padrão.

---

## 📍 ETAPA 10 — Baixar Tudo em ZIP

No canto superior direito do modal, clique em **"📦 Baixar Todos (ZIP)"**.

Download automático: `esteira-criativos-{timestamp}.zip` contendo:
- `criativo-1.png` (com Copy 1)
- `criativo-2.png` (com Copy 2)
- ...
- `criativo-9.png` (com Copy 9)

**Cada PNG tem a copy correspondente já renderizada sobre a imagem.**

---

## ✅ Resultado Final

Em **menos de 5 minutos**, você tem:
- 9 criativos únicos prontos para postar
- Cada um com foto do expert preservada
- Cada um com sua copy correspondente
- Tudo em um único ZIP de 9 PNGs

---

## 💡 Dicas Avançadas

- **Variação de cenários**: o briefing instrui a IA a variar cenários (ex: "varie entre: escritório, praia, café, academia, etc") e ela distribui entre os 9.
- **Identidade consistente**: com Foto Expert + Logo + briefing fixo, todos os 9 ficam visualmente coerentes.
- **Edição rápida**: se uma copy específica ficou ruim, edite o texto dela no bloco Copys e regenere **apenas aquele** (criando 1 bloco "Gerar Imagem" sozinho conectado só ao Briefing e Copys).
- **Modo híbrido**: você pode usar o bloco `Gerar Copy` (IA) para gerar 9 ideias automaticamente, copiar as melhores para o bloco `Copys` manual, e refinar.

---

## 🎯 Resumo do Fluxo

| Etapa | Ação | Tempo |
|---|---|---|
| 1 | Abrir aba Esteira IA | 5s |
| 2 | Briefing | 60s |
| 3 | Logo (opcional) | 15s |
| 4 | Foto Expert (opcional) | 15s |
| 5 | Colar 9 copys | 60s |
| 6 | Adicionar Lote N (count=9) | 5s |
| 7 | Conectar 4 blocos | 30s |
| 8 | Clicar ▶ | 72s |
| 9 | Ajustar posição (opcional) | 30s |
| 10 | Baixar ZIP | 5s |
| **TOTAL** | | **~5 minutos** |

**Vs. processo manual:** criar 9 criativos no Photoshop/Canva levaria **2-4 horas**.
