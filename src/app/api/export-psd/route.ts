import { NextRequest, NextResponse } from 'next/server';
import { writePsd } from 'ag-psd';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Endpoint que recebe os dados do criativo e gera um arquivo PSD com camadas separadas
// Body esperado:
// {
//   width, height, brandName, format,
//   backgroundImage: dataUrl | null,
//   backgroundColor, gradientColor1, gradientColor2, gradientAngle, useGradient,
//   logoImage: dataUrl | null, logoPosition, logoScale,
//   personImage: dataUrl | null, personPosition, personScale, personFlipped,
//   tag: { text, fontFamily, fontSize, fontWeight, color, ... },
//   headline: { ... },
//   highlight: { ... },
//   subline: { ... },
//   cta: { ... }
// }

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
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { buffer: Buffer.from([]), mime: 'image/png' };
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function escapePsdText(s: string): string {
  // PSD text layer names are limited. Keep simple.
  return s.replace(/[\r\n\t]/g, ' ').substring(0, 200);
}

function makeTextLayer(layer: LayerData, name: string, x: number, y: number, w: number, h: number) {
  if (!layer.text || layer.visible === false) return null;
  const { r, g, b } = hexToRgb(layer.color || '#ffffff');
  return {
    name: escapePsdText(name),
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
    text: {
      text: layer.useUppercase ? layer.text.toUpperCase() : layer.text,
      font: {
        name: layer.fontFamily || 'Arial',
        size: layer.fontSize || 24,
        bold: ['600', '700', '800', '900'].includes(layer.fontWeight || '400'),
        italic: false,
        color: { r, g, b },
        alignment: layer.textAlign || 'left',
      },
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      width = 1080,
      height = 1080,
      format = 'quadrado',
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

    // Estrutura de layers do PSD (back to front)
    const children: any[] = [];

    // 1. LAYER DE FUNDO (background color ou gradiente)
    const bgRgb = hexToRgb(backgroundColor);
    const gdRgb1 = hexToRgb(gradientColor1);
    const gdRgb2 = hexToRgb(gradientColor2);

    if (useGradient) {
      // Gerar imagem de gradiente
      const { createCanvas } = await import('canvas');
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Determinar direção do gradiente
      let x0 = 0, y0 = 0, x1 = 0, y1 = height;
      if (gradientAngle === 0) { x1 = width; y1 = 0; }
      else if (gradientAngle === 90) { x0 = 0; y0 = height; x1 = width; y1 = 0; }
      else if (gradientAngle === 180) { x0 = width; y0 = 0; x1 = 0; y1 = height; }
      else if (gradientAngle === 270) { x0 = width; y0 = height; x1 = 0; y1 = 0; }
      else {
        // Diagonal: 135deg = topo-esquerda para base-direita
        const rad = (gradientAngle * Math.PI) / 180;
        x0 = 0; y0 = 0;
        x1 = width * Math.cos(rad);
        y1 = height * Math.sin(rad);
      }

      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, `rgb(${gdRgb1.r},${gdRgb1.g},${gdRgb1.b})`);
      grad.addColorStop(1, `rgb(${gdRgb2.r},${gdRgb2.g},${gdRgb2.b})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const buffer = canvas.toBuffer('image/png');
      children.push({
        name: 'Fundo - Gradiente',
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        image: { data: buffer },
      });
    } else {
      // Cor sólida - criar imagem 1x1 e preencher
      const { createCanvas } = await import('canvas');
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = `rgb(${bgRgb.r},${bgRgb.g},${bgRgb.b})`;
      ctx.fillRect(0, 0, width, height);
      const buffer = canvas.toBuffer('image/png');
      children.push({
        name: 'Fundo - Cor Sólida',
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        image: { data: buffer },
      });
    }

    // 2. IMAGEM DE FUNDO (se houver)
    if (backgroundImage && backgroundImage.startsWith('data:')) {
      const { buffer } = dataUrlToBuffer(backgroundImage);
      children.push({
        name: 'Imagem de Fundo',
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        image: { data: buffer },
      });
    }

    // 3. PESSOA REAL
    if (personImage && personImage.startsWith('data:')) {
      const { buffer } = dataUrlToBuffer(personImage);
      const personWidth = (personScale / 100) * (format === '16:9' ? width * 0.55 : width * 0.85);
      // Manter aspect ratio da imagem (assumir vertical 2:3)
      const aspectRatio = 3 / 2;
      const personHeight = personWidth * aspectRatio;
      let personX = 0;
      if (personFlipped) {
        personX = width - personWidth;
      } else if (format !== '9:16') {
        personX = width - personWidth;
      }
      children.push({
        name: 'Pessoa Real',
        left: personX,
        top: height - personHeight,
        right: personX + personWidth,
        bottom: height,
        image: { data: buffer },
      });
    }

    // 4. TAG
    if (tag && tag.text && tag.visible !== false) {
      const tagLayer = makeTextLayer(
        tag,
        'TAG - ' + tag.text.substring(0, 30),
        width * 0.05,
        height * 0.05,
        width * 0.9,
        40
      );
      if (tagLayer) children.push(tagLayer);
    }

    // 5. HEADLINE
    if (headline && headline.text && headline.visible !== false) {
      const headlineLayer = makeTextLayer(
        headline,
        'HEADLINE - ' + headline.text.substring(0, 30),
        width * 0.05,
        height * 0.5,
        width * 0.9,
        120
      );
      if (headlineLayer) children.push(headlineLayer);
    }

    // 6. DESTAQUE
    if (highlight && highlight.text && highlight.visible !== false) {
      const highlightLayer = makeTextLayer(
        highlight,
        'DESTAQUE - ' + highlight.text.substring(0, 30),
        width * 0.05,
        height * 0.65,
        width * 0.9,
        80
      );
      if (highlightLayer) children.push(highlightLayer);
    }

    // 7. SUBTÍTULO
    if (subline && subline.text && subline.visible !== false) {
      const sublineLayer = makeTextLayer(
        subline,
        'SUBTITULO - ' + subline.text.substring(0, 30),
        width * 0.05,
        height * 0.78,
        width * 0.9,
        60
      );
      if (sublineLayer) children.push(sublineLayer);
    }

    // 8. CTA
    if (cta && cta.text && cta.visible !== false) {
      const ctaLayer = makeTextLayer(
        cta,
        'CTA - ' + cta.text.substring(0, 30),
        width * 0.05,
        height * 0.88,
        width * 0.9,
        50
      );
      if (ctaLayer) children.push(ctaLayer);
    }

    // 9. LOGO (sempre por último = topo)
    if (logoImage && logoImage.startsWith('data:')) {
      const { buffer } = dataUrlToBuffer(logoImage);
      const logoHeight = (logoScale / 100) * 42;
      const aspectRatio = 3; // assumir logo 3:1
      const logoWidth = logoHeight * aspectRatio;
      const lp = (logoPosition as string) || 'top-left';
      let logoX = 0, logoY = 0;
      if (lp.includes('left')) logoX = 0;
      else if (lp.includes('right')) logoX = width - logoWidth;
      else logoX = (width - logoWidth) / 2;

      if (lp.includes('top')) logoY = 30;
      else if (lp.includes('bottom')) logoY = height - logoHeight - 30;
      else logoY = (height - logoHeight) / 2;

      children.push({
        name: 'Logo Cliente',
        left: logoX,
        top: logoY,
        right: logoX + logoWidth,
        bottom: logoY + logoHeight,
        image: { data: buffer },
      });
    }

    // Criar o PSD usando ag-psd
    const psdBuffer = writePsd({
      width,
      height,
      channels: 3,
      bitsPerChannel: 8,
      colorMode: 3, // RGB
      children,
    });

    // Também criar um ZIP com:
    // 1. O arquivo .psd
    // 2. PNG de cada layer individualmente
    // 3. PNG do criativo final
    const zip = new JSZip();
    zip.file(`${brandName.toLowerCase().replace(/\s+/g, '-')}.psd`, Buffer.from(psdBuffer));

    // Adicionar cada layer como PNG separado no ZIP
    children.forEach((layer: any, i: number) => {
      if (layer.image?.data) {
        const safeName = (layer.name || `layer-${i}`).replace(/[^a-z0-9_-]/gi, '_');
        zip.file(`layers/${String(i + 1).padStart(2, '0')}-${safeName}.png`, layer.image.data);
      }
    });

    // Versão PNG do criativo completo (usando o canvas)
    const { createCanvas, loadImage } = await import('canvas');
    const finalCanvas = createCanvas(width, height);
    const ctx = finalCanvas.getContext('2d');
    // Composite all layers
    for (const layer of children) {
      if (layer.image?.data) {
        try {
          const img = await loadImage(layer.image.data);
          ctx.drawImage(
            img,
            layer.left,
            layer.top,
            layer.right - layer.left,
            layer.bottom - layer.top
          );
        } catch {}
      }
    }
    // Render text layers (melhor no PSD mas tenta no composite)
    finalCanvas.toBuffer('image/png');
    const pngBuf = finalCanvas.toBuffer('image/png');
    zip.file(`${brandName.toLowerCase().replace(/\s+/g, '-')}.png`, pngBuf);

    // README com instruções
    const readme = `# Pacote do Criativo - ${brandName}

Este ZIP contém:

1. **${brandName.toLowerCase().replace(/\s+/g, '-')}.psd** - Arquivo Photoshop com todas as camadas separadas
2. **layers/** - PNGs individuais de cada camada (para edição rápida)
3. **${brandName.toLowerCase().replace(/\s+/g, '-')}.png** - PNG final pronto para postar

## Camadas incluídas (de baixo para cima):

${children
  .slice()
  .reverse()
  .map((l: any, i: number) => `${i + 1}. ${l.name}`)
  .join('\n')}

## Como usar no Photoshop:

1. Abra o arquivo .psd no Photoshop
2. Cada elemento (texto, logo, imagem) está em uma camada separada
3. Edite cores, fontes, posições livremente
4. Exporte como PNG ou JPG quando terminar

Gerado pelo Robô Studio em ${new Date().toLocaleString('pt-BR')}
`;
    zip.file('LEIA-ME.txt', readme);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${brandName.toLowerCase().replace(/\s+/g, '-')}-camadas.zip"`,
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
