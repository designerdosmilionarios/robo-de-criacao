# 🎨 Como usar a Direção Artística

## Onde encontrar

A Direção Artística aparece em **duas telas**:

1. **Criativo Único** (`SingleImageCreator`) → na aba "Diretor Criativo IA"
2. **Carrossel** (`SlideEditor`) → dentro de cada slide, no card "Direção Artística deste slide"

---

## 🖼️ No Criativo Único

### Passo 1: Abrir o painel
Role a página até ver o card com bordas **rosa/roxo** chamado **"Direção Artística · NOVO"**.
Ele vem **expandido por padrão** com todos os campos visíveis.

### Passo 2: Preencher o Briefing (opcional, mas recomendado)
No campo **"✍️ Briefing / Tema"**, escreva o tema específico deste criativo. Exemplo:

```
Lançamento do Migração de Carreira 2026 em Goiânia,
público 30-50 anos, tom aspiracional
```

### Passo 3: Escolher o Nível (4 opções)
Em **"🎚️ Nível de Direção (4)"**, clique em um dos cards:

| Nível | Quando usar |
|---|---|
| ◻️ **Limpo** | Tipografia grande, fundo neutro, foco total no texto |
| ▤ **Editorial** | Composição de revista: tag, headline, subtexto, CTA bem estruturados |
| ◐ **Dramático** | Pessoa em cena cinematográfica, iluminação moody, emoção em primeiro plano |
| 🎬 **Cinema** | Hero shot cinematográfico, cenário urbano/personagem, magazine-style |

> Logo abaixo do nível aparece a **paleta base sugerida** (ex: `#F5F5F0 / #2C2C2C` para Editorial).

### Passo 4: Escolher a Categoria Visual (7 opções)
Em **"🎨 Categoria Visual (7)"**, clique no formato do criativo:

| Categoria | Melhor com níveis |
|---|---|
| 💬 **Citação / Frase** | Limpo, Editorial, Dramático |
| 🎯 **Quiz / Você está?** | Limpo, Editorial |
| 🗣️ **Depoimento** | Editorial, Dramático |
| 📅 **Agenda / Programação** | Editorial, Cinema |
| 🎭 **Personagem dramático** | Dramático, Cinema |
| 🌆 **Cidade em destaque** | Cinema |
| 🚀 **Lançamento / Hero** | Dramático, Cinema |

> Categorias incompatíveis com o nível escolhido ficam **esmaecidas** e bloqueadas.

### Passo 5: Copiar templates (opcional)
Aparece **"💡 Copy sugerido"** com 3 frases prontas. Clique em qualquer uma para aplicar no `bgPrompt`.

### Passo 6: Ver o Prompt Composto
Clique em **"Ver Prompt Composto"**. Aparece um textarea com o prompt final (~600 chars) já montado combinando todos os blocos. Você pode **editar livremente** antes de aplicar.

Para enviar à API, basta clicar em **"Gerar"** no card "Cenário de Fundo (IA)" — o `bgPrompt` já estará preenchido automaticamente com o composto.

---

## 🎬 No Carrossel (por slide)

A lógica é a mesma do Criativo Único, mas **cada slide tem sua própria direção**:

1. Abra o carrossel, clique em qualquer slide na régua horizontal (1, 2, 3, 4, 5).
2. Role até o card **"Direção Artística deste slide ▤ Editorial · 💬"**.
3. Clique para expandir → mostra o briefing, 4 níveis e 7 categorias.
4. Cada mudança persiste **naquele slide específico**.

### 🆕 Upload de Foto do Personagem (Níveis Dramático/Cinema)

Quando o nível é **Dramático** ou **Cinema**, aparece o card **"Foto do Personagem"**:

- Clique em **"+ Anexar foto do personagem"** para enviar um PNG recortado
- Aparece preview com label **"Foto ativa"** + botão remover
- Automaticamente injeta `"featuring the same person from the reference photo, preserving facial identity, clothing style and overall mood"` no prompt
- A foto é **enviada como `imageBase64`** para a API junto com o prompt

> ⚠️ Em níveis Limpo/Editorial o botão fica **desabilitado** com aviso "Só injeta no prompt em níveis Dramático/Cinema".

---

## 📍 Onde fica cada elemento (mapa visual do Criativo Único)

```
┌─────────────────────────────────────────────────────┐
│  Criador de Anúncio Único & Thumbnails              │
│  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │              │  │ Estilo & Formato             │ │
│  │   PREVIEW    │  │                              │ │
│  │   (canvas)   │  │ Degradê / Fundo Sólido       │ │
│  │              │  │                              │ │
│  │              │  │ Degradê de Contraste         │ │
│  └──────────────┘  │                              │ │
│                    │ ╔════════════════════════════╗│ │
│                    │ ║ DIREÇÃO ARTÍSTICA [NOVO]  ║│ │ ← AQUI
│                    │ ║  Briefing / Tema          ║│ │
│                    │ ║  Nível (4 opções)         ║│ │
│                    │ ║  Categoria Visual (7)     ║│ │
│                    │ ║  Copy sugerido            ║│ │
│                    │ ║  [Ver Prompt Composto]    ║│ │
│                    │ ╚════════════════════════════╝│ │
│                    │                              │ │
│                    │ Pessoa Real no Criativo       │ │ ← Upload de pessoa
│                    │  [+ Anexar Foto PNG]          │ │
│                    │                              │ │
│                    │ Cenário de Fundo (IA)         │ │
│                    │  [Campo de prompt] [Gerar]   │ │
│                    └──────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Teste rápido (30 segundos)

1. Abra o app → **Criativo Único**
2. Role até **"Direção Artística · NOVO"**
3. Digite no Briefing: `Lançamento do evento X em São Paulo`
4. Clique em **🎬 Cinema**
5. Clique em **🌆 Cidade em destaque**
6. Clique em **Ver Prompt Composto**
7. Veja o prompt final com `BRIEFING` + `urban hero shot composition` + `hero shot cinematic composition` + mood épico + tipografia magazine

Pronto! Esse prompt será enviado automaticamente ao clicar em **Gerar** no card "Cenário de Fundo".
