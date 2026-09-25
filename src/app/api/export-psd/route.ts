import { NextRequest, NextResponse } from 'next/server';
import { writePsd, writePsdBuffer } from 'ag-psd';
import sharp from 'sharp';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Endpoint que gera PSD com camadas separadas para Photoshop
// Usa sharp (nativo Node) para gerar as imagens base

interface LayerData {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
  useUppercase?: boolean;
  backgroundColor?: string;
  borderLeft?: string;
  paddingX?: number;
  paddingY?: number;
  borderRadius?: number;
  textShadow?: string;
  visible?: boolean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[2], 'base64');
}

function escapePsdText(s: string): string {
  return s.replace(/[\r\n\t]/g, ' ').substring(0, 200);
}

// Gerar imagem de fundo (gradiente ou cor sólida)
async function generateBackground(width: number, height: number, useGradient: boolean, gradColor1: string, gradColor2: string, gradAngle: number, bgColor: string): Promise<Buffer> {
  if (!useGradient) {
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .composite([{
        input: Buffer.from(
          `<svg width="${width}" height="${height}"><rect width="100%" height="100%" fill="${bgColor}"/></svg>`
        ),
        top: 0,
        left: 0,
      }])
      .png()
      .toBuffer();
  }

  // Calcular pontos de início e fim do gradiente baseado no ângulo
  let x0 = 0, y0 = 0, x1 = width, y1 = height;
  if (gradAngle === 0) { x1 = width; y1 = 0; }
  else if (gradAngle === 90) { x0 = 0; y0 = height; x1 = width; y1 = 0; }
  else if (gradAngle === 180) { x0 = width; y0 = 0; x1 = 0; y1 = height; }
  else if (gradAngle === 270) { x0 = width; y0 = height; x1 = 0; y1 = 0; }
  else {
    const rad = (gradAngle * Math.PI) / 180;
    x0 = 0; y0 = 0;
    x1 = width * Math.cos(rad);
    y1 = height * Math.sin(rad);
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${gradColor1}"/>
        <stop offset="100%" stop-color="${gradColor2}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#grad)"/>
  </svg>`;

  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}

// Renderizar texto como PNG usando SVG + sharp
async function renderTextAsPng(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: string,
  color: string,
  textAlign: 'left' | 'center' | 'right',
  letterSpacing: number,
  useUppercase: boolean,
  width: number,
  height: number,
): Promise<Buffer> {
  const finalText = useUppercase ? text.toUpperCase() : text;
  const weight = ['700', '800', '900'].includes(fontWeight) ? 'bold' : 'normal';
  const anchor = textAlign;
  const xPos = textAlign === 'center' ? width / 2 : textAlign === 'right' ? width - 20 : 20;
  const yPos = height / 2;

  // Quebrar texto em múltiplas linhas se necessário
  const maxCharsPerLine = Math.floor(width / (fontSize * 0.55));
  const words = finalText.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.3;
  const totalHeight = lines.length * lineHeight;
  const startY = (height - totalHeight) / 2 + lineHeight * 0.75;

  const tspans = lines.map((line, i) =>
    `<tspan x="${xPos}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  const letterSpacingPx = letterSpacing || 0;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text
      x="${xPos}"
      y="${startY}"
      font-family="${fontFamily}, Inter, sans-serif"
      font-size="${fontSize}"
      font-weight="${weight}"
      fill="${color}"
      text-anchor="${anchor}"
      letter-spacing="${letterSpacingPx}"
    >${tspans}</text>
  </svg>`;

  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Renderizar texto com background (tag, cta button)
async function renderTextWithBg(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: string,
  color: string,
  textAlign: 'left' | 'center' | 'right',
  letterSpacing: number,
  useUppercase: boolean,
  bgColor: string,
  borderRadius: number,
  paddingX: number,
  paddingY: number,
  width: number,
  height: number,
): Promise<Buffer> {
  const finalText = useUppercase ? text.toUpperCase() : text;
  const weight = ['700', '800', '900'].includes(fontWeight) ? 'bold' : 'normal';
  const xPos = textAlign === 'center' ? width / 2 : textAlign === 'right' ? width - paddingX : paddingX;
  const anchor = textAlign === 'center' ? 'middle' : textAlign === 'right' ? 'end' : 'start';
  const yPos = height / 2 + fontSize * 0.35;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" rx="${borderRadius}" ry="${borderRadius}" fill="${bgColor}"/>
    <text
      x="${xPos}"
      y="${yPos}"
      font-family="${fontFamily}, Inter, sans-serif"
      font-size="${fontSize}"
      font-weight="${weight}"
      fill="${color}"
      text-anchor="${anchor}"
      letter-spacing="${letterSpacing || 0}"
      dominant-baseline="middle"
    >${escapeXml(finalText)}</text>
  </svg>`;

  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}

// Redimensionar imagem mantendo aspect ratio dentro de maxWidth/maxHeight
async function fitImage(imageBuffer: Buffer, maxWidth: number, maxHeight: number): Promise<{ buffer: Buffer; width: number; height: number }> {
  const meta = await sharp(imageBuffer).metadata();
  if (!meta.width || !meta.height) {
    return { buffer: imageBuffer, width: maxWidth, height: maxHeight };
  }
  const ratio = Math.min(maxWidth / meta.width, maxHeight / meta.height);
  const newW = Math.round(meta.width * ratio);
  const newH = Math.round(meta.height * ratio);
  const buffer = await sharp(imageBuffer)
    .resize(newW, newH, { fit: 'inside' })
    .png()
    .toBuffer();
  return { buffer, width: newW, height: newH };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      width = 1080,
      height = 1080,
      format = '4:5',
      backgroundImage = null,
      backgroundColor = '#0a0b10',
      gradientColor1 = '#0a1f1a',
      gradientColor2 = '#0a0b10',
      gradientAngle = 135,
      useGradient = true,
      logoImage = null,
      logoPosition = 'top-left',
      logoScale = 100,
      personImage = null,
      personPosition = 'right',
      personScale = 100,
      personFlipped = false,
      tag,
      headline,
      highlight,
      subline,
      cta,
      brandName = 'Criativo',
    } = body;

    // Containers para os layers gerados
    const layers: Array<{
      name: string;
      png: Buffer;
      left: number;
      top: number;
    }> = [];

    // === LAYER 1: FUNDO ===
    const bgPng = await generateBackground(width, height, useGradient, gradientColor1, gradientColor2, gradientAngle, backgroundColor);
    layers.push({ name: 'Fundo - ' + (useGradient ? 'Gradiente' : 'Cor Sólida'), png: bgPng, left: 0, top: 0 });

    // === LAYER 2: IMAGEM DE FUNDO ===
    if (backgroundImage && backgroundImage.startsWith('data:')) {
      const buf = dataUrlToBuffer(backgroundImage);
      if (buf) {
        layers.push({ name: 'Imagem de Fundo', png: buf, left: 0, top: 0 });
      }
    }

    // === LAYER 3: PESSOA REAL ===
    if (personImage && personImage.startsWith('data:')) {
      const buf = dataUrlToBuffer(personImage);
      if (buf) {
        // Calcular tamanho proporcional
        const personW = (personScale / 100) * (format === '16:9' ? width * 0.55 : width * 0.85);
        const maxH = height;
        const fitted = await fitImage(buf, personW, maxH);
        let personX = 0;
        if (personFlipped) {
          personX = width - fitted.width;
        } else if (personPosition !== 'left' && personPosition !== 'center') {
          personX = width - fitted.width;
        } else if (personPosition === 'center') {
          personX = (width - fitted.width) / 2;
        }
        layers.push({
          name: 'Pessoa Real',
          png: fitted.buffer,
          left: personX,
          top: height - fitted.height,
        });
      }
    }

    // === LAYER: TAG ===
    if (tag && tag.text && tag.visible !== false) {
      const tagPng = await renderTextAsPng(
        tag.text,
        tag.fontFamily || 'Inter',
        tag.fontSize || 16,
        tag.fontWeight || '700',
        tag.color || '#10b981',
        tag.textAlign || 'left',
        tag.letterSpacing || 0,
        tag.useUppercase || true,
        Math.floor(width * 0.9),
        50
      );
      layers.push({ name: 'TAG - ' + tag.text.substring(0, 25), png: tagPng, left: Math.floor(width * 0.05), top: Math.floor(height * 0.04) });
    }

    // === LAYER: HEADLINE ===
    if (headline && headline.text && headline.visible !== false) {
      const headPng = await renderTextAsPng(
        headline.text,
        headline.fontFamily || 'Inter',
        headline.fontSize || 48,
        headline.fontWeight || '900',
        headline.color || '#ffffff',
        headline.textAlign || 'left',
        headline.letterSpacing || -1,
        headline.useUppercase || false,
        Math.floor(width * 0.9),
        180
      );
      layers.push({ name: 'HEADLINE', png: headPng, left: Math.floor(width * 0.05), top: Math.floor(height * 0.45) });
    }

    // === LAYER: DESTAQUE ===
    if (highlight && highlight.text && highlight.visible !== false) {
      const highPng = await renderTextAsPng(
        highlight.text,
        highlight.fontFamily || 'Inter',
        highlight.fontSize || 28,
        highlight.fontWeight || '700',
        highlight.color || '#10b981',
        highlight.textAlign || 'left',
        highlight.letterSpacing || 0,
        highlight.useUppercase || false,
        Math.floor(width * 0.9),
        100
      );
      layers.push({ name: 'DESTAQUE', png: highPng, left: Math.floor(width * 0.05), top: Math.floor(height * 0.65) });
    }

    // === LAYER: SUBTÍTULO ===
    if (subline && subline.text && subline.visible !== false) {
      const subPng = await renderTextAsPng(
        subline.text,
        subline.fontFamily || 'Inter',
        subline.fontSize || 16,
        subline.fontWeight || '400',
        subline.color || '#94a3b8',
        subline.textAlign || 'left',
        subline.letterSpacing || 0,
        subline.useUppercase || false,
        Math.floor(width * 0.9),
        60
      );
      layers.push({ name: 'SUBTITULO', png: subPng, left: Math.floor(width * 0.05), top: Math.floor(height * 0.78) });
    }

    // === LAYER: CTA (botão com fundo) ===
    if (cta && cta.text && cta.visible !== false) {
      const ctaW = Math.min(600, Math.floor(width * 0.7));
      const ctaH = Math.max(60, Math.floor(cta.fontSize * 2.8));
      const ctaPng = await renderTextWithBg(
        cta.text,
        cta.fontFamily || 'Inter',
        cta.fontSize || 16,
        cta.fontWeight || '700',
        '#0a0b10',
        cta.textAlign || 'center',
        cta.letterSpacing || 0,
        cta.useUppercase !== false,
        cta.color || '#10b981',
        cta.borderRadius || 8,
        28,
        16,
        ctaW,
        ctaH
      );
      const ctaX = cta.textAlign === 'right' ? width - ctaW - 20 : cta.textAlign === 'center' ? (width - ctaW) / 2 : 20;
      layers.push({ name: 'CTA - ' + cta.text.substring(0, 25), png: ctaPng, left: ctaX, top: Math.floor(height * 0.88) });
    }

    // === LAYER: LOGO (sempre por último = topo) ===
    if (logoImage && logoImage.startsWith('data:')) {
      const buf = dataUrlToBuffer(logoImage);
      if (buf) {
        const logoH = Math.max(30, Math.floor((logoScale / 100) * 60));
        const fitted = await fitImage(buf, logoH * 4, logoH);
        let logoX = 0, logoY = 0;
        if (logoPosition.includes('left')) logoX = 30;
        else if (logoPosition.includes('right')) logoX = width - fitted.width - 30;
        else logoX = (width - fitted.width) / 2;

        if (logoPosition.includes('top')) logoY = 30;
        else if (logoPosition.includes('bottom')) logoY = height - fitted.height - 30;
        else logoY = (height - fitted.height) / 2;

        layers.push({
          name: 'Logo Cliente',
          png: fitted.buffer,
          left: logoX,
          top: logoY,
        });
      }
    }

    // Inverter para ordem PSD (back to front no Photoshop)
    const reversedLayers = [...layers].reverse();

    // Gerar o PSD usando ag-psd (já instalou)
    const psdChildren = reversedLayers.map((l) => ({
      name: escapePsdText(l.name),
      left: l.left,
      top: l.top,
      right: l.left + 1, // ag-psd precisa de right/bottom
      bottom: l.top + 1,
      image: {
        data: l.png,
        width: 1,
        height: 1,
      },
    }));

    // Renderizar o PSD usando sharp para cada layer e gerar o PSD final
    let writePsdFn;
    try {
      const mod = await import('ag-psd');
      writePsdFn = mod.writePsd || mod.default?.writePsd;
    } catch (e) {
      console.log('ag-psd nao disponivel');
    }

    let psdBuffer: Buffer;
    if (writePsdFn) {
      // Calcular dimensões reais de cada layer
      const layersWithDims = await Promise.all(
        reversedLayers.map(async (l) => {
          const meta = await sharp(l.png).metadata();
          return {
            name: escapePsdText(l.name),
            left: l.left,
            top: l.top,
            right: l.left + (meta.width || 1),
            bottom: l.top + (meta.height || 1),
            image: l.png,
          };
        })
      );

      psdBuffer = Buffer.from(writePsdFn({
        width,
        height,
        channels: 4,
        bitsPerChannel: 8,
        colorMode: 3,
        children: layersWithDims,
      }));
    } else {
      // Fallback: ZIP com PNGs separados (sem PSD)
      psdBuffer = Buffer.from([]);
    }

    // Gerar ZIP final
    const zip = new JSZip();
    const safeName = brandName.toLowerCase().replace(/[^a-z0-9_-]/gi, '_');

    if (psdBuffer.length > 0) {
      zip.file(`${safeName}.psd`, psdBuffer);
    }

    // Adicionar PNGs individuais de cada layer
    const layersFolder = zip.folder('layers');
    if (layersFolder) {
      for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        const safeLayerName = l.name.replace(/[^a-z0-9_-]/gi, '_').substring(0, 50);
        layersFolder.file(`${String(i + 1).padStart(2, '0')}-${safeLayerName}.png`, l.png);
      }
    }

    // Gerar PNG final (todos os layers combinados)
    const finalImage = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });

    // Compor cada layer no canvas final
    const composites = reversedLayers.map((l) => ({
      input: l.png,
      top: l.top,
      left: l.left,
    }));

    const finalPng = await finalImage.composite(composites).png().toBuffer();
    zip.file(`${safeName}.png`, finalPng);

    // README
    const readme = `# Pacote de Exportacao PSD - ${brandName}

Conteudo deste ZIP:

${psdBuffer.length > 0 ? `1. **${safeName}.psd** - Arquivo Photoshop com todas as camadas separadas` : '1. NOTA: PSD nao foi gerado (use os PNGs abaixo)'}
${psdBuffer.length > 0 ? '2' : '1'}. **layers/** - PNGs individuais de cada camada (${layers.length} arquivos)
${psdBuffer.length > 0 ? '3' : '2'}. **${safeName}.png** - PNG final pronto para postar

## Camadas (de baixo para cima no Photoshop):

${layers.map((l, i) => `${i + 1}. ${l.name}`).join('\n')}

## Como usar no Photoshop:

1. Abra o arquivo .psd (se incluido)
2. Cada elemento (texto, logo, imagem) esta em uma camada separada
3. Edite cores, fontes, posicoes livremente
4. Exporte como PNG/JPG quando terminar

Gerado pelo Robo Studio em ${new Date().toLocaleString('pt-BR')}
`;
    zip.file('LEIA-ME.txt', readme);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeName}-camadas.zip"`,
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('Erro no export PSD:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar PSD' },
      { status: 500 }
    );
  }
}
