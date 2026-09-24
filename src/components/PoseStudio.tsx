import React, { useState, useRef, useEffect } from 'react';
import { BrandKit, LocalFont } from '@/types';
import {
  User,
  Upload,
  Sparkles,
  Loader2,
  X,
  Download,
  ArrowRight,
  Camera,
  Briefcase,
  Smartphone,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  Save,
} from 'lucide-react';
import saveAs from 'file-saver';

interface PoseStudioProps {
  brand: BrandKit;
  apiKey: string;
  provider: 'openai' | 'Opus 4.8';
  onSendToCreative: (imageUrl: string) => void;
  onRegisterControls?: (controls: { state: any; load: (data: any) => void }) => void;
  onSaveRequest?: () => void;
}

const PRESET_POSES = [
  {
    id: 'pointing-left',
    label: '👉 Apontando para o lado',
    desc: 'Ideal para direcionar o olhar para a headline ou botão',
    promptPart: 'pointing finger confidently towards the left side of the frame, engaging eye contact with viewer',
  },
  {
    id: 'arms-crossed',
    label: '💼 Braços cruzados (Autoridade)',
    desc: 'Transmite segurança, profissionalismo e liderança',
    promptPart: 'standing with arms crossed, confident and friendly smile, executive posture, looking directly into the camera',
  },
  {
    id: 'holding-phone',
    label: '📱 Segurando celular',
    desc: 'Mostrando resultados, aplicativo ou notificações',
    promptPart: 'holding a modern smartphone showing screen slightly towards camera, excited and positive expression',
  },
  {
    id: 'laptop-working',
    label: '💻 No notebook',
    desc: 'Trabalho remoto, escala digital e produtividade',
    promptPart: 'sitting at a sleek modern desk working on a high-end laptop, glancing up with a welcoming confident smile',
  },
  {
    id: 'shocked-surprised',
    label: '😲 Surpreso / Revelação',
    desc: 'Gatilho de curiosidade para anúncios de alto CTR',
    promptPart: 'amazed facial expression, hands near face or holding head in surprise, wide eyes, conveying unbelievable news',
  },
  {
    id: 'speaking-podcast',
    label: '🎙️ Palestra / Podcast',
    desc: 'Posicionamento de mentor, autoridade e especialista',
    promptPart: 'speaking dynamically with hands gesturing naturally, wearing a minimalist lapel mic or near studio microphone',
  },
  {
    id: 'thinking-solution',
    label: '🤔 Reflexivo / Estratégico',
    desc: 'Mão no queixo analisando soluções e métricas',
    promptPart: 'hand touching chin thoughtfully, intelligent focused look, looking slightly off-camera then smiling',
  },
  {
    id: 'thumbs-up',
    label: '👍 Aprovando / Positivo',
    desc: 'Validação, depoimento ou recomendação',
    promptPart: 'giving a confident thumbs up gesture with right hand, warm approachable smile, approved concept',
  },
];

const ATTIRE_OPTIONS = [
  { id: 'executive', label: '👔 Terno / Alfaiataria Executiva', prompt: 'wearing an impeccably tailored modern suit, elegant and luxurious' },
  { id: 'smart-casual', label: '👕 Casual Elegante / Tech', prompt: 'wearing a clean premium dark fitted crewneck t-shirt or modern blazer with neutral shirt' },
  { id: 'medical', label: '🩺 Jaleco / Saúde', prompt: 'wearing a pristine professional white medical lab coat or modern scrub' },
  { id: 'streetwear', label: '🧢 Criativo / Despojado', prompt: 'wearing a stylish streetwear hoodie or minimalist oversized jacket, contemporary aesthetic' },
];

const BACKGROUND_OPTIONS = [
  { id: 'transparent', label: '✂️ Fundo Neutro / Estúdio (Fácil de Recortar)', prompt: 'solid studio gray seamless backdrop, clean edge lighting, isolated character' },
  { id: 'office-luxury', label: '🏢 Escritório Moderno de Alto Padrão', prompt: 'in a modern high-end minimalist corporate office with soft bokeh and ambient warm lights in background' },
  { id: 'dark-cyber', label: '🌌 Tech Dark com Neon Suave', prompt: 'in a moody dark cinematic studio with subtle cyan and purple rim lighting, cinematic depth of field' },
  { id: 'home-office', label: '🛋️ Home Office Aconchegante', prompt: 'in a clean aesthetic cozy modern home office with warm interior design and soft natural light' },
];

export const PoseStudio: React.FC<PoseStudioProps> = ({
  brand,
  apiKey,
  provider,
  onSendToCreative,
  onRegisterControls,
  onSaveRequest,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [selectedPose, setSelectedPose] = useState(PRESET_POSES[0].id);
  const [selectedAttire, setSelectedAttire] = useState(ATTIRE_OPTIONS[0].id);
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_OPTIONS[0].id);
  const [customDetails, setCustomDetails] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPoses, setGeneratedPoses] = useState<string[]>([]);

  // Registrar estado + função de load para o componente pai poder salvar/carregar projetos
  useEffect(() => {
    if (!onRegisterControls) return;
    onRegisterControls({
      state: {
        selectedPose,
        selectedAttire,
        selectedBg,
        customDetails,
        generatedPoses,
      },
      load: (data: any) => {
        if (data.selectedPose) setSelectedPose(data.selectedPose);
        if (data.selectedAttire) setSelectedAttire(data.selectedAttire);
        if (data.selectedBg) setSelectedBg(data.selectedBg);
        if ('customDetails' in data) setCustomDetails(data.customDetails || '');
        if (Array.isArray(data.generatedPoses)) setGeneratedPoses(data.generatedPoses);
      },
    });
  }, [
    onRegisterControls,
    selectedPose,
    selectedAttire,
    selectedBg,
    customDetails,
    generatedPoses,
  ]);

  const handleUploadFace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFaceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGeneratePose = async () => {
    if (!apiKey) {
      setError('Configure sua chave de API no botão "Chave API" no topo antes de continuar.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const poseObj = PRESET_POSES.find((p) => p.id === selectedPose);
      const attireObj = ATTIRE_OPTIONS.find((a) => a.id === selectedAttire);
      const bgObj = BACKGROUND_OPTIONS.find((b) => b.id === selectedBg);

      // Construir prompt avançado com foco em consistência facial de pessoa real
      const fullPrompt = [
        'Masterpiece ultra-realistic 8k medium shot photograph of a real person.',
        faceImage
          ? 'Maintain exact facial features, bone structure, skin texture, ethnicity, facial hair, and likeness of the person in the reference image.'
          : 'Realistic professional Brazilian person in their 30s with natural skin texture and authentic look.',
        `Pose and action: ${poseObj?.promptPart || 'standing confidently'}.`,
        `Attire: ${attireObj?.prompt}.`,
        `Environment: ${bgObj?.prompt}.`,
        customDetails ? `Additional details: ${customDetails}.` : '',
        'Cinematic lighting, Canon EOS R5 85mm f/1.4 lens, natural skin pores, hyper-realistic, professional commercial grade, photorealistic, no cartoon, no airbrushed doll look.',
      ]
        .filter(Boolean)
        .join(' ');

      const endpoint = provider === 'Opus 4.8' ? '/api/generate-image' : '/api/generate-image';

      const requestBody: any = {
        prompt: fullPrompt,
        size: '1024x1024',
        aspectRatio: '1:1',
        provider: provider === 'Opus 4.8' ? 'Opus 4.8' : 'openai',
        apiKey,
      };

      if (faceImage) {
        requestBody.imageBase64 = faceImage.replace(/^data:image\/\w+;base64,/, '');
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar nova pose.');

      setGeneratedPoses((prev) => [data.imageUrl, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com a IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER DA ABA */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0e111a] border border-white/10 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-brand-500/20 text-brand-400 border border-brand-500/30 shadow-lg">
              <User size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Estúdio de Pessoas & Novas Poses</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Face Consistency AI
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Envie uma foto do rosto e gere a mesma pessoa em dezenas de poses para seus anúncios.
              </p>
            </div>
          </div>
        </div>

        {/* GRID DE CONFIGURAÇÃO */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* COLUNA ESQUERDA: FOTO DE ROSTO DE REFERÊNCIA (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Camera size={14} className="text-brand-400" /> 1. Foto do Rosto (Referência)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadFace}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-white/15 hover:border-brand-500/50 rounded-2xl p-6 flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.04] transition-all min-h-[220px]"
              >
                {faceImage ? (
                  <div className="relative w-full text-center">
                    <img
                      src={faceImage}
                      alt="Rosto de Referência"
                      className="w-36 h-36 mx-auto rounded-full object-cover border-4 border-brand-500/30 shadow-2xl"
                    />
                    <p className="text-xs text-brand-400 font-bold mt-3">Foto anexada com sucesso!</p>
                    <p className="text-[11px] text-gray-400">Clique para trocar a imagem</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFaceImage(null);
                      }}
                      className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                      title="Remover foto"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-full bg-white/5 text-gray-400 mb-3">
                      <Upload size={24} />
                    </div>
                    <p className="text-sm font-semibold text-gray-200">Anexe uma foto do cliente/rosto</p>
                    <p className="text-xs text-gray-500 mt-1 text-center max-w-xs">
                      Selfie, foto do Instagram ou imagem corporativa bem iluminada
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Dica PRO */}
            <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/15 flex items-start gap-3">
              <Lightbulb size={18} className="text-brand-400 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-300 leading-relaxed">
                <strong className="text-brand-400">Dica de Direção de Arte:</strong> Fotos com rosto olhando pra frente e boa iluminação garantem o melhor resultado na hora da IA recriar o rosto na pose escolhida.
              </p>
            </div>
          </div>

          {/* COLUNA DIREITA: SELETOR DE POSES, ROUPA E CENÁRIO (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Poses */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2.5 uppercase tracking-wider">
                2. Escolha a Nova Pose da Pessoa
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRESET_POSES.map((pose) => (
                  <button
                    key={pose.id}
                    onClick={() => setSelectedPose(pose.id)}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      selectedPose === pose.id
                        ? 'bg-brand-500/10 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                        : 'bg-white/[0.03] border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{pose.label}</span>
                      {selectedPose === pose.id && (
                        <CheckCircle2 size={15} className="text-brand-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{pose.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Vestimenta e Cenário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase size={14} className="text-brand-400" /> 3. Roupa / Vestimenta
                </label>
                <select
                  value={selectedAttire}
                  onChange={(e) => setSelectedAttire(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
                >
                  {ATTIRE_OPTIONS.map((att) => (
                    <option key={att.id} value={att.id} className="bg-[#11131a]">
                      {att.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand-400" /> 4. Cenário de Fundo
                </label>
                <select
                  value={selectedBg}
                  onChange={(e) => setSelectedBg(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
                >
                  {BACKGROUND_OPTIONS.map((bg) => (
                    <option key={bg.id} value={bg.id} className="bg-[#11131a]">
                      {bg.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Detalhes extras opcionais */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">
                Detalhe Extra / Instrução Livre (Opcional)
              </label>
              <input
                type="text"
                value={customDetails}
                onChange={(e) => setCustomDetails(e.target.value)}
                placeholder="Ex: segurando cartão de crédito preto, óculos de grau modernos, iluminação dourada..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Botão de Ação */}
            <div className="pt-2">
              <button
                onClick={handleGeneratePose}
                disabled={isGenerating}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-500 to-emerald-400 text-dark-900 hover:opacity-95 transition-all shadow-xl shadow-brand-500/20 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Criando Pessoa na Nova Pose com IA...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Gerar Pessoa Nesta Pose ({provider === 'Opus 4.8' ? 'Opus 4.8' : 'OpenAI'})
                  </>
                )}
              </button>
              {error && <p className="text-xs text-red-400 font-medium mt-2 text-center">{error}</p>}

              {/* Botão Salvar Projeto */}
              {onSaveRequest && (
                <button
                  onClick={onSaveRequest}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
                >
                  <Save size={14} /> Salvar Projeto
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GALERIA DE RESULTADOS GERADOS */}
      {generatedPoses.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0e111a] border border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-brand-400" /> Poses Criadas para seus Anúncios
              </h3>
              <p className="text-xs text-gray-400">
                Clique em "Usar no Criativo Único" para montar o anúncio com essa pessoa.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-white/5 text-gray-300 border border-white/10">
              {generatedPoses.length} {generatedPoses.length === 1 ? 'pose gerada' : 'poses geradas'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {generatedPoses.map((img, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-xl flex flex-col"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={img}
                    alt={`Pose gerada ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="p-3.5 space-y-2 bg-[#0d0f17] border-t border-white/10">
                  <button
                    onClick={() => onSendToCreative(img)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-brand-500 text-dark-900 hover:bg-brand-400 transition-all shadow-md"
                  >
                    Usar no Criativo <ArrowRight size={13} />
                  </button>

                  <button
                    onClick={() => saveAs(img, `pose-pessoa-${idx + 1}.png`)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Download size={12} /> Baixar Imagem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
