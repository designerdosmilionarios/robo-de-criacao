import React, { useState, useRef, useEffect } from 'react';
import { BrandKit } from '@/types';
import { Sparkles, Loader2, Download, RefreshCw, Wand2, Image as ImageIcon, Type, Zap } from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { toPng } from 'html-to-image';

interface CampaignCreatorProps {
  brand: BrandKit;
  apiKey: string;
}

interface CopyVariation {
  id: string;
  headline: string;
  support: string;
  cta: string;
  visualAngle: 'pessoa' | 'dashboard' | 'ambiente' | 'mockup';
  visualPrompt: string;
  imageUrl?: string;
  status: 'idle' | 'generating-copy' | 'generating-image' | 'done' | 'error';
  errorMessage?: string;
}

const VISUAL_ANGLES: Array<{
  id: CopyVariation['visualAngle'];
  label: string;
  emoji: string;
  description: string;
  template: string;
}> = [
  {
    id: 'pessoa',
    label: 'Pessoa',
    emoji: '👤',
    description: 'Foto editorial de pessoa (médico, paciente, especialista)',
    template: 'Cinematic editorial portrait of {subject}, natural warm smile, soft studio rim lighting, 85mm portrait lens f/2.0, shallow depth of field, premium magazine photography.',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    emoji: '📊',
    description: 'Mockup de dashboard/analytics com números',
    template: 'Premium dark dashboard mockup with {subject}, glass morphism panels, elegant chart visualization, soft ambient lighting, premium SaaS product design aesthetic.',
  },
  {
    id: 'ambiente',
    label: 'Ambiente',
    emoji: '🏛️',
    description: 'Ambiente/cenário arquitetônico moderno',
    template: 'Cinematic environment shot of {subject}, modern architectural space, dramatic natural lighting, clean minimalist aesthetic, editorial architecture photography.',
  },
  {
    id: 'mockup',
    label: 'Mockup',
    emoji: '📱',
    description: 'Mockup de smartphone/produto',
    template: 'Premium product mockup of {subject}, floating with soft shadows, studio lighting with rim light, sophisticated gradient background, Apple-style product photography.',
  },
];

// Tipografia padrao (igual ao bloco Tipografia da Esteira IA)
const DEFAULT_TYPOGRAPHY = {
  fontFamily: 'Manrope',
  headline: {
    weight: '800', size: 56, color: '#ffffff', letterSpacing: -0.5,
    italic: false, uppercase: true,
    box: { enabled: false, color: '#000000', opacity: 60 },
    shadow: { enabled: true, color: '#000000', opacity: 80 },
    stroke: { enabled: false, color: '#000000', width: 2 },
    gradient: { enabled: false, from: '#fbbf24', to: '#10b981', angle: 90 },
  },
  support: {
    weight: '400', size: 22, color: '#f5f5f5', letterSpacing: 0,
    italic: false, uppercase: false,
    box: { enabled: false, color: '#000000', opacity: 50 },
    shadow: { enabled: true, color: '#000000', opacity: 70 },
    stroke: { enabled: false, color: '#000000', width: 1 },
    gradient: { enabled: false, from: '#10b981', to: '#34d399', angle: 90 },
  },
  cta: {
    weight: '700', size: 14, color: '#0a0b10', bgColor: '#10b981', letterSpacing: 1,
    gradient: { enabled: false, from: '#10b981', to: '#34d399', angle: 90 },
  },
  highlight: { color: '#10b981', underline: true, shadow: true },
};

export const CampaignCreator: React.FC<CampaignCreatorProps> = ({ brand, apiKey }) => {
  const [briefing, setBriefing] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copies, setCopies] = useState<CopyVariation[]>([]);
  const canvasRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Persistir briefing no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('campaign_briefing');
      if (saved) setBriefing(saved);
      const savedCopies = localStorage.getItem('campaign_copies');
      if (savedCopies) {
        const parsed = JSON.parse(savedCopies);
        if (Array.isArray(parsed)) setCopies(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('campaign_briefing', briefing); } catch {}
  }, [briefing]);

  useEffect(() => {
    try { localStorage.setItem('campaign_copies', JSON.stringify(copies)); } catch {}
  }, [copies]);

  // Gerar 3 copias a partir do briefing
  const generateCopies = async () => {
    if (!briefing.trim()) {
      alert('Digite um briefing primeiro.');
      return;
    }
    if (!apiKey.trim()) {
      alert('Configure sua chave OpenAI no botão API antes de gerar.');
      return;
    }

    setGenerating(true);
    setCopies((prev) => prev.map((c) => ({ ...c, status: 'generating-copy' as const })));

    try {
      const res = await fetch('/api/master-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: `Gere 3 variacoes de copy (angulos diferentes) para a seguinte campanha de marketing:
"${briefing}"

Para cada variacao, retorne no formato:
VARIACAO 1:
HEADLINE: [headline curta, max 50 chars]
APOIO: [apoio/subheadline, max 80 chars]
CTA: [call to action, max 30 chars]
ANGULO: [pessoa | dashboard | ambiente | mockup]
SUBJECT: [descricao do que aparecera na imagem para o angulo escolhido]

VARIACAO 2:
[mesmo formato]

VARIACAO 3:
[mesmo formato]

Cada variacao deve ter um ANGULO VISUAL diferente para gerar imagens distintas.`,
          apiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar copies.');

      // Parse das 3 variacoes
      const parsed = parseVariations(data.prompt || '');
      setCopies(parsed);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const parseVariations = (text: string): CopyVariation[] => {
    const result: CopyVariation[] = [];
    const blocks = text.split(/VARIACAO\s*\d+/i).slice(1);
    for (let i = 0; i < Math.min(3, blocks.length); i++) {
      const block = blocks[i];
      const headline = extractField(block, 'HEADLINE');
      const support = extractField(block, 'APOIO');
      const cta = extractField(block, 'CTA');
      const angulo = extractField(block, 'ANGULO').toLowerCase();
      const subject = extractField(block, 'SUBJECT');
      const visualAngle: CopyVariation['visualAngle'] =
        ['pessoa', 'dashboard', 'ambiente', 'mockup'].find((a) => angulo.includes(a)) as any || 'pessoa';

      // Construir prompt visual a partir do template do angulo + subject
      const angleConfig = VISUAL_ANGLES.find((a) => a.id === visualAngle)!;
      const visualPrompt = angleConfig.template.replace('{subject}', subject || `professional ${brand.name} ${visualAngle} scene`);

      result.push({
        id: `copy-${Date.now()}-${i}`,
        headline: headline || `Variacao ${i + 1}`,
        support: support || '',
        cta: cta || '',
        visualAngle,
        visualPrompt,
        status: 'idle',
      });
    }
    // Se nao parseou, gerar placeholders
    while (result.length < 3) {
      result.push({
        id: `copy-${Date.now()}-${result.length}`,
        headline: `Variacao ${result.length + 1}`,
        support: '',
        cta: '',
        visualAngle: ['pessoa', 'dashboard', 'ambiente'][result.length] as any,
        visualPrompt: VISUAL_ANGLES[result.length].template.replace('{subject}', `${briefing} - ${VISUAL_ANGLES[result.length].label.toLowerCase()}`),
        status: 'idle',
      });
    }
    return result;
  };

  const extractField = (text: string, field: string): string => {
    const regex = new RegExp(`${field}\\s*:?\\s*(.+?)(?=\\n\\s*[A-Z]+:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  // Gerar imagem para uma copia especifica
  const generateImage = async (copyId: string) => {
    const copy = copies.find((c) => c.id === copyId);
    if (!copy) return;
    if (!apiKey.trim()) {
      alert('Configure sua chave OpenAI antes.');
      return;
    }

    setCopies((prev) => prev.map((c) => c.id === copyId ? { ...c, status: 'generating-image', errorMessage: undefined } : c));

    try {
      // Adicionar instrucao de "no text" e direcionar o angulo visual
      const finalPrompt = `${copy.visualPrompt} IMPORTANT: Do NOT add any text, words, letters, numbers or watermarks to the image. Typography will be overlaid separately. Vertical 1080x1350 format (4:5). Premium quality, magazine cover aesthetic. NO busy backgrounds, NO generic stock photo feel.`;

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          size: '1024x1536',
          aspectRatio: '4:5',
          provider: 'openai',
          preferredModel: 'gpt-image-2.5-sunburst',
          apiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar imagem.');
      if (!data.imageUrl) throw new Error('IA nao retornou imagem.');

      setCopies((prev) => prev.map((c) => c.id === copyId ? { ...c, status: 'done', imageUrl: data.imageUrl } : c));
    } catch (err: any) {
      setCopies((prev) => prev.map((c) => c.id === copyId ? { ...c, status: 'error', errorMessage: err.message } : c));
    }
  };

  // Gerar todas as imagens em paralelo (mas com delay para nao estourar rate limit)
  const generateAllImages = async () => {
    if (!apiKey.trim()) {
      alert('Configure sua chave OpenAI antes.');
      return;
    }
    for (let i = 0; i < copies.length; i++) {
      const copy = copies[i];
      if (copy.status !== 'done') {
        await generateImage(copy.id);
        // Pequeno delay entre geracoes
        if (i < copies.length - 1) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }
  };

  // Refazer uma copia especifica
  const regenerateCopy = async (copyId: string) => {
    await generateImage(copyId);
  };

  // Download de uma imagem especifica
  const downloadOne = async (copyId: string) => {
    const copy = copies.find((c) => c.id === copyId);
    if (!copy?.imageUrl) return;
    const el = canvasRefs.current[copyId];
    if (!el) return;
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 1,
        canvasWidth: 1080,
        canvasHeight: 1350,
        cacheBust: true,
      });
      saveAs(dataUrl, `campanha-${brand.name.toLowerCase().replace(/\s+/g, '-')}-${copy.id}.png`);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Download ZIP com todos
  const downloadAllZip = async () => {
    const doneCopies = copies.filter((c) => c.imageUrl);
    if (doneCopies.length === 0) {
      alert('Nenhuma imagem pronta para download.');
      return;
    }
    try {
      const zip = new JSZip();
      for (let i = 0; i < doneCopies.length; i++) {
        const c = doneCopies[i];
        const el = canvasRefs.current[c.id];
        if (!el) continue;
        const dataUrl = await toPng(el, {
          pixelRatio: 1,
          canvasWidth: 1080,
          canvasHeight: 1350,
          cacheBust: true,
        });
        const base64 = dataUrl.split(',')[1];
        zip.file(`campanha-${String(i + 1).padStart(2, '0')}-${c.visualAngle}.png`, base64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `campanha-${brand.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.zip`);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Limpar tudo
  const clearAll = () => {
    if (!confirm('Limpar tudo?')) return;
    setCopies([]);
    setBriefing('');
    localStorage.removeItem('campaign_copies');
    localStorage.removeItem('campaign_briefing');
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="p-6 2xl:p-8 rounded-3xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 shadow-2xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/20">
              <Zap size={28} className="text-dark-900" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">Campanha 3x</h2>
              <p className="text-sm text-gray-400">
                1 briefing → 3 cópias + 3 visuais diferentes, prontos em segundos
              </p>
            </div>
          </div>
          {copies.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-rose-400 transition-all"
            >
              🗑 Limpar tudo
            </button>
          )}
        </div>

        {/* BRIEFING INPUT */}
        <div className="mt-6 space-y-3">
          <label className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            📝 Briefing da Campanha
          </label>
          <textarea
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
            rows={4}
            placeholder={`Ex: Lancar servico de consultoria em marketing medico para clinicas de estetica em Sao Paulo. Publico: medicos e donos de clinicas 30-50 anos. Dor: perda de pacientes para concorrentes. Objetivo: captar leads qualificados.`}
            className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-amber-500/30 text-white text-sm placeholder-gray-500 focus:border-amber-400 focus:outline-none resize-none"
          />
          <button
            onClick={generateCopies}
            disabled={generating || !briefing.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-amber-400 to-orange-400 text-dark-900 hover:opacity-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Gerando 3 cópias...
              </>
            ) : (
              <>
                <Wand2 size={18} /> Gerar 3 Cópias
              </>
            )}
          </button>
        </div>
      </div>

      {/* COPIES */}
      {copies.length === 0 && (
        <div className="p-10 text-center rounded-3xl bg-[#0a0b10] border border-white/10">
          <Sparkles size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500 text-sm">
            Digite um briefing acima e clique <strong>Gerar 3 Cópias</strong> para começar.
          </p>
        </div>
      )}

      {copies.length > 0 && (
        <>
          {/* BOTAO GERAR TODAS */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-sm text-emerald-300 font-bold">
              ✅ {copies.length} cópias geradas · {copies.filter((c) => c.status === 'done').length}/{copies.length} imagens prontas
            </div>
            <button
              onClick={generateAllImages}
              disabled={copies.some((c) => c.status === 'generating-image')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-dark-900 font-bold text-xs hover:bg-emerald-400 disabled:opacity-50 shadow-lg"
            >
              <ImageIcon size={14} /> Gerar Imagens dos 3
            </button>
          </div>

          {/* GRID 3 COLUNAS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {copies.map((copy, idx) => (
              <div
                key={copy.id}
                className="rounded-3xl bg-[#0a0b10] border border-white/10 overflow-hidden shadow-2xl"
              >
                {/* HEADER DO CARD */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {VISUAL_ANGLES.find((a) => a.id === copy.visualAngle)?.emoji}
                    </span>
                    <div>
                      <div className="text-xs font-extrabold text-white">
                        Copy {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                        {copy.visualAngle}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    copy.status === 'done' ? 'bg-emerald-500/20 text-emerald-300' :
                    copy.status === 'generating-image' ? 'bg-amber-500/20 text-amber-300 animate-pulse' :
                    copy.status === 'error' ? 'bg-rose-500/20 text-rose-300' :
                    'bg-white/5 text-gray-400'
                  }`}>
                    {copy.status === 'idle' ? '⏸ Aguardando' :
                     copy.status === 'generating-image' ? '⚡ Gerando...' :
                     copy.status === 'done' ? '✓ Pronto' :
                     copy.status === 'error' ? '✗ Erro' : copy.status}
                  </span>
                </div>

                {/* PREVIEW / LOADING */}
                <div className="p-4">
                  {copy.status === 'generating-image' ? (
                    <div className="aspect-[4/5] rounded-2xl bg-black/30 border border-white/5 flex flex-col items-center justify-center gap-2">
                      <Loader2 size={32} className="text-amber-400 animate-spin" />
                      <span className="text-xs text-amber-300 font-bold">Gerando imagem...</span>
                      <span className="text-[10px] text-gray-500">Nano Banana 2 + Sunburst</span>
                    </div>
                  ) : copy.imageUrl ? (
                    <div
                      ref={(el) => { canvasRefs.current[copy.id] = el; }}
                      className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-black"
                    >
                      <img src={copy.imageUrl} alt={copy.headline} className="absolute inset-0 w-full h-full object-cover" />
                      {/* Headline */}
                      <h3
                        className="absolute uppercase leading-[0.95] tracking-[-0.03em] drop-shadow-2xl"
                        style={{
                          left: `${idx === 1 ? 56 : 6}%`,
                          top: '12%',
                          width: '40%',
                          maxWidth: '40%',
                          fontFamily: 'Manrope, sans-serif',
                          fontWeight: 800,
                          fontSize: '38px',
                          color: '#ffffff',
                          textShadow: 'rgba(0,0,0,0.85) 0 4px 24px',
                        }}
                      >
                        {copy.headline}
                      </h3>
                      {/* Suporte */}
                      {copy.support && (
                        <p
                          className="absolute leading-tight drop-shadow-2xl"
                          style={{
                            left: `${idx === 1 ? 56 : 6}%`,
                            top: '55%',
                            width: '40%',
                            maxWidth: '40%',
                            fontFamily: 'Manrope, sans-serif',
                            fontWeight: 400,
                            fontSize: '14px',
                            color: '#f5f5f5',
                            textShadow: 'rgba(0,0,0,0.85) 0 2px 14px',
                          }}
                        >
                          {copy.support}
                        </p>
                      )}
                      {/* CTA */}
                      {copy.cta && (
                        <span
                          className="absolute inline-flex rounded-full px-4 py-2 uppercase tracking-wider shadow-2xl"
                          style={{
                            left: `${idx === 1 ? 56 : 6}%`,
                            top: '82%',
                            fontFamily: 'Manrope, sans-serif',
                            fontWeight: 700,
                            fontSize: '11px',
                            color: '#0a0b10',
                            background: 'linear-gradient(135deg, #10b981, #34d399)',
                            boxShadow: '0 8px 24px rgba(16,185,129,0.5)',
                          }}
                        >
                          {copy.cta}
                        </span>
                      )}
                    </div>
                  ) : copy.status === 'error' ? (
                    <div className="aspect-[4/5] rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col items-center justify-center gap-2 p-4">
                      <p className="text-xs text-rose-300 text-center font-bold">⚠ Erro</p>
                      <p className="text-[10px] text-rose-200 text-center">{copy.errorMessage || 'Tente novamente'}</p>
                      <button
                        onClick={() => regenerateCopy(copy.id)}
                        className="mt-2 text-[10px] bg-rose-500/30 px-3 py-1 rounded-full text-white font-bold"
                      >
                        <RefreshCw size={10} className="inline" /> Tentar de novo
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-[4/5] rounded-2xl bg-black/30 border border-white/5 flex flex-col items-center justify-center gap-2 p-4">
                      <ImageIcon size={32} className="text-gray-600" />
                      <span className="text-xs text-gray-500">Clique abaixo para gerar</span>
                      <span className="text-[10px] text-gray-600">{VISUAL_ANGLES.find((a) => a.id === copy.visualAngle)?.label}</span>
                    </div>
                  )}
                </div>

                {/* TEXTOS EDITAVEIS */}
                <div className="px-4 pb-4 space-y-1.5">
                  <input
                    type="text"
                    value={copy.headline}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCopies((prev) => prev.map((c) => c.id === copy.id ? { ...c, headline: v } : c));
                    }}
                    placeholder="Headline"
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={copy.support}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCopies((prev) => prev.map((c) => c.id === copy.id ? { ...c, support: v } : c));
                    }}
                    placeholder="Apoio / Subheadline"
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={copy.cta}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCopies((prev) => prev.map((c) => c.id === copy.id ? { ...c, cta: v } : c));
                    }}
                    placeholder="CTA (opcional)"
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* ACOES */}
                <div className="px-4 pb-4 flex items-center gap-2">
                  <button
                    onClick={() => regenerateCopy(copy.id)}
                    disabled={copy.status === 'generating-image'}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold disabled:opacity-50"
                  >
                    <RefreshCw size={12} /> {copy.imageUrl ? 'Refazer' : 'Gerar'}
                  </button>
                  <button
                    onClick={() => downloadOne(copy.id)}
                    disabled={!copy.imageUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-dark-900 text-xs font-extrabold disabled:opacity-50"
                  >
                    <Download size={12} /> PNG
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DOWNLOAD ZIP */}
          {copies.some((c) => c.imageUrl) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                {copies.filter((c) => c.imageUrl).length} de 3 criativos prontos
              </span>
              <button
                onClick={downloadAllZip}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-dark-900 font-extrabold text-sm shadow-xl hover:opacity-95"
              >
                <Download size={16} /> Baixar Todos (ZIP)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
