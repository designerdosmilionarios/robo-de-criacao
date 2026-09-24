export async function optimizeImageDataUrl(
  dataUrl: string,
  maxDimension = 1536,
  quality = 0.82
): Promise<string> {
  if (typeof window === 'undefined' || !dataUrl.startsWith('data:image/')) return dataUrl;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Nao foi possivel preparar a imagem de referencia.'));
    element.src = dataUrl;
  });

  const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const hasSupportedFormat = /^data:image\/(?:png|jpe?g|webp);base64,/i.test(dataUrl);
  if (hasSupportedFormat && largestSide <= maxDimension && dataUrl.length <= 900_000) {
    return dataUrl;
  }

  const scale = Math.min(1, maxDimension / largestSide);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext('2d');
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const optimized = canvas.toDataURL('image/webp', quality);
  return optimized.length < dataUrl.length ? optimized : dataUrl;
}
