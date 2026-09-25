import React, { useState, useRef, useEffect } from 'react';
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
  Plus,
  Image as ImageIcon,
  Save,
  Search,
} from 'lucide-react';
import { usePersistedState } from '@/lib/usePersistedState';
import { BrandKit } from '@/types';

interface PoseStudioProps {
  brand: BrandKit;
  apiKey: string;
  provider: 'openai' | 'Opus 4.8';
  onSendToCreative: (imageUrl: string) => void;
  onRegisterControls?: (controls: { state: any; load: (data: any) => void }) => void;
  onSaveRequest?: () => void;
}

// =====================================
// 15 POSES PROFISSIONAIS
// Inclui corpo inteiro, meio corpo e rosto
// =====================================
const PRESET_POSES = [
  {
    id: 'pointing-left',
    label: '👉 Apontando para o lado',
    desc: 'Direciona o olhar para headline/botão',
    promptPart: 'pointing finger confidently towards the left side of the frame, engaging eye contact with viewer',
    category: 'meio-corpo',
  },
  {
    id: 'arms-crossed',
    label: '💼 Braços cruzados',
    desc: 'Autoridade, segurança e liderança',
    promptPart: 'standing with arms crossed, confident and friendly smile, executive posture, looking directly into the camera',
    category: 'meio-corpo',
  },
  {
    id: 'holding-phone',
    label: '📱 Segurando celular',
    desc: 'Mostrando resultados, app ou notificação',
    promptPart: 'holding a modern smartphone showing screen slightly towards camera, excited and positive expression',
    category: 'meio-corpo',
  },
  {
    id: 'laptop-working',
    label: '💻 No notebook',
    desc: 'Trabalho remoto, produtividade',
    promptPart: 'sitting at a sleek modern desk working on a high-end laptop, glancing up with a welcoming confident smile',
    category: 'meio-corpo',
  },
  {
    id: 'shocked-surprised',
    label: '😲 Surpreso / Revelação',
    desc: 'Gatilho de curiosidade para alto CTR',
    promptPart: 'amazed facial expression, hands near face or holding head in surprise, wide eyes, conveying unbelievable news',
    category: 'rosto',
  },
  {
    id: 'speaking-podcast',
    label: '🎙️ Palestra / Podcast',
    desc: 'Mentor, autoridade, especialista',
    promptPart: 'speaking dynamically with hands gesturing naturally, wearing a minimalist lapel mic or near studio microphone',
    category: 'meio-corpo',
  },
  {
    id: 'thinking-solution',
    label: '🤔 Reflexivo / Estratégico',
    desc: 'Analisando soluções e métricas',
    promptPart: 'hand touching chin thoughtfully, intelligent focused look, looking slightly off-camera then smiling',
    category: 'rosto',
  },
  {
    id: 'thumbs-up',
    label: '👍 Aprovando / Positivo',
    desc: 'Validação, depoimento',
    promptPart: 'giving a confident thumbs up gesture with right hand, warm approachable smile, approved concept',
    category: 'meio-corpo',
  },
  // ===== NOVAS POSES DE CORPO INTEIRO =====
  {
    id: 'fullbody-walking',
    label: '🚶 Andando com confiança',
    desc: 'Corpo inteiro, postura profissional dinâmica',
    promptPart: 'full body shot walking confidently towards camera with purposeful stride, modern business attire, modern architectural background, dynamic composition',
    category: 'corpo-inteiro',
  },
  {
    id: 'fullbody-handoff',
    label: '🤝 Estendendo a mão',
    desc: 'Corpo inteiro, chamado para ação',
    promptPart: 'full body shot extending right hand forward in handshake or offering gesture, welcoming smile, professional attire, clean studio environment',
    category: 'corpo-inteiro',
  },
  {
    id: 'fullbody-confident',
    label: '🕴️ Pose de poder',
    desc: 'Corpo inteiro, posição de autoridade',
    promptPart: 'full body shot with hands in pockets or arms crossed in confident power pose, executive stance, modern office with city view through window',
    category: 'corpo-inteiro',
  },
  {
    id: 'fullbody-laptop-sitting',
    label: '💻 Sentado no laptop (café)',
    desc: 'Corpo inteiro, lifestyle trabalho remoto',
    promptPart: 'full body shot sitting casually at a trendy cafe table with laptop and coffee cup, relaxed confident pose, natural light streaming through window, work-life balance vibe',
    category: 'corpo-inteiro',
  },
  {
    id: 'fullbody-stairs',
    label: '🏛️ Subindo escada',
    desc: 'Corpo inteiro, ascensão profissional',
    promptPart: 'full body shot walking up modern architectural stairs with confidence, low angle camera looking up at subject, success and growth metaphor, dynamic composition',
    category: 'corpo-inteiro',
  },
  // ===== POSES ESPECIAIS =====
  {
    id: 'pointing-up',
    label: '☝️ Apontando para cima',
    desc: 'Para chamar atenção para elementos acima',
    promptPart: 'pointing finger confidently upward, eye contact with camera, suggesting look up or growth, dynamic and energetic pose',
    category: 'rosto',
  },
  {
    id: 'reading-book',
    label: '📚 Lendo livro',
    desc: 'Educador, autor, referência',
    promptPart: 'reading a book holding it open with both hands, looking up thoughtfully towards camera, intellectual and welcoming, soft warm lighting',
    category: 'meio-corpo',
  },
];

const ATTIRE_OPTIONS = [
  { id: 'executive', label: '👔 Terno / Alfaiataria Executiva', prompt: 'wearing an impeccably tailored modern suit, elegant and luxurious' },
  { id: 'smart-casual', label: '👕 Casual Elegante / Tech', prompt: 'wearing a clean premium dark fitted crewneck t-shirt or modern blazer with neutral shirt' },
  { id: 'medical', label: '🩺 Jaleco / Saúde', prompt: 'wearing a pristine professional white medical lab coat or modern scrub' },
  { id: 'streetwear', label: '🧢 Criativo / Despojado', prompt: 'wearing a stylish streetwear hoodie or minimalist oversized jacket, contemporary aesthetic' },
  { id: 'fitness', label: '💪 Fitness / Esportivo', prompt: 'wearing athletic sportswear with fitted performance shirt, healthy and energetic appearance' },
  { id: 'wedding-elegant', label: '👰 Noiva / Cerimônia', prompt: 'wearing an elegant sophisticated white or champagne dress, formal ceremony look' },
];

const BACKGROUND_OPTIONS = [
  { id: 'transparent', label: '✂️ Fundo Neutro / Estúdio', prompt: 'solid studio gray seamless backdrop, clean edge lighting, isolated character' },
  { id: 'office-luxury', label: '🏢 Escritório Moderno Premium', prompt: 'in a modern high-end minimalist corporate office with soft bokeh and ambient warm lights in background' },
  { id: 'dark-cyber', label: '🌌 Tech Dark com Neon Suave', prompt: 'in a moody dark cinematic studio with subtle cyan and purple rim lighting, cinematic depth of field' },
  { id: 'home-office', label: '🛋️ Home Office Aconchegante', prompt: 'in a clean aesthetic cozy modern home office with warm interior design and soft natural light' },
  { id: 'urban-street', label: '🌆 Rua Urbana / Cidade', prompt: 'in a modern city street with soft bokeh of buildings and lights behind, urban lifestyle' },
  { id: 'nature-park', label: '🌳 Parque / Natureza', prompt: 'in a lush green park with trees and natural soft sunlight, lifestyle and wellness aesthetic' },
  { id: 'cafe-rustic', label: '☕ Café Rústico', prompt: 'in a cozy rustic coffee shop with warm wood tones, plants and natural lighting' },
];

// =====================================
// RESOLUCOES DISPONIVEIS
// =====================================
const RESOLUTIONS = [
  { value: '1024x1024', label: '1:1 Quadrado (1080x1080)', for: 'Instagram Feed Quadrado' },
  { value: '1024x1536', label: '2:3 Vertical (1080x1620)', for: 'Pinterest, Stories' },
  { value: '1536x1024', label: '3:2 Horizontal (1620x1080)', for: 'Banner, Capa Facebook' },
  { value: '1080x1350', label: '4:5 Feed IG Portrait (1080x1350)', for: '⭐ Instagram Feed Portrait' },
];

// Pose customizada (usuário define o prompt)
const CUSTOM_POSE = {
  id: 'custom',
  label: '✨ Prompt Personalizado',
  desc: 'Escreva sua própria descrição de pose',
  promptPart: '', // será preenchido pelo usuário
  category: 'custom',
};

export const PoseStudio: React.FC<PoseStudioProps> = ({
  brand,
  apiKey,
  provider,
  onSendToCreative,
  onRegisterControls,
  onSaveRequest,
}) => {
  const faceInputRef = useRef<HTMLInputElement>(null);
  const poseInputRef = useRef<HTMLInputElement>(null);

  // ESTADOS PERSISTIDOS (sobrevive a troca de aba)
  const [faceImages, setFaceImages] = usePersistedState<string[]>('pose_face_images', []);
  const [poseReference, setPoseReference] = usePersistedState<string | null>('pose_reference', null);
  const [selectedPose, setSelectedPose] = usePersistedState<string>('pose_selected', PRESET_POSES[0].id);
  // Prompt customizado para pose
  const [customPosePrompt, setCustomPosePrompt] = usePersistedState<string>('pose_custom_prompt', '');
  // Estado para preview em tela cheia
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedAttire, setSelectedAttire] = usePersistedState<string>('pose_attire', ATTIRE_OPTIONS[0].id);
  const [selectedBg, setSelectedBg] = usePersistedState<string>('pose_bg', BACKGROUND_OPTIONS[0].id);
  const [selectedResolution, setSelectedResolution] = usePersistedState<string>('pose_resolution', '1080x1350');
  const [customDetails, setCustomDetails] = usePersistedState<string>('pose_details', '');
  const [generatedPoses, setGeneratedPoses] = usePersistedState<string[]>('pose_generated', []);

  // ESTADOS DE SESSAO (resetam)
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registrar estado + load para o componente pai
  useEffect(() => {
    if (!onRegisterControls) return;
    onRegisterControls({
      state: {
        faceImages,
        poseReference,
        selectedPose,
        selectedAttire,
        selectedBg,
        selectedResolution,
        customDetails,
        generatedPoses,
      },
      load: (data: any) => {
        if (Array.isArray(data.faceImages)) setFaceImages(data.faceImages);
        if ('poseReference' in data) setPoseReference(data.poseReference);
        if (data.selectedPose) setSelectedPose(data.selectedPose);
        if (data.selectedAttire) setSelectedAttire(data.selectedAttire);
        if (data.selectedBg) setSelectedBg(data.selectedBg);
        if (data.selectedResolution) setSelectedResolution(data.selectedResolution);
        if ('customDetails' in data) setCustomDetails(data.customDetails || '');
        if (Array.isArray(data.generatedPoses)) setGeneratedPoses(data.generatedPoses);
      },
    });
  }, [
    onRegisterControls,
    faceImages,
    poseReference,
    selectedPose,
    selectedAttire,
    selectedBg,
    selectedResolution,
    customDetails,
    generatedPoses,
  ]);

  // Adicionar foto do rosto (multiplas)
  const handleAddFace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (faceImages.length >= 3) {
      alert('Maximo de 3 fotos de referencia do rosto.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFaceImages((prev) => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
    if (faceInputRef.current) faceInputRef.current.value = '';
  };

  // Adicionar referencia da pose
  const handleAddPoseRef = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPoseReference(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (poseInputRef.current) poseInputRef.current.value = '';
  };

  const handleRemoveFace = (idx: number) => {
    setFaceImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleGeneratePose = async () => {
    if (faceImages.length === 0) {
      alert('Adicione pelo menos uma foto do rosto para a IA manter a consistencia facial.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const poseObj = PRESET_POSES.find((p) => p.id === selectedPose);
      const attireObj = ATTIRE_OPTIONS.find((a) => a.id === selectedAttire);
      const bgObj = BACKGROUND_OPTIONS.find((b) => b.id === selectedBg);

      const fullPrompt = [
        selectedPose === 'custom' && customPosePrompt
          ? `${customPosePrompt.trim()}`
          : `Professional ${poseObj?.category === 'corpo-inteiro' ? 'full body' : poseObj?.category === 'rosto' ? 'close-up portrait' : 'medium shot'} commercial photography, ${poseObj?.promptPart || ''}`,
        `Attire: ${attireObj?.prompt || ''}`,
        `Environment: ${bgObj?.prompt || ''}`,
        customDetails ? `Additional details: ${customDetails}.` : '',
        `Maintain exact facial features, bone structure, skin texture, ethnicity, and likeness of the person in the reference image. Ultra-detailed, 8k, hyper-realistic, professional color grading, editorial quality`,
        `Composition: subject CENTERED in the frame, balanced framing with subject occupying the middle 60% of the image, leave clean space only at the edges for text overlay`,
      ]
        .filter(Boolean)
        .join('. ');

      const endpoint = '/api/generate-image';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          size: selectedResolution,
          aspectRatio: '4:5', // OpenAI usa ratios
          preferredModel: 'auto',
          apiKey,
          imageBase64: faceImages[0].replace(/^data:image\/\w+;base64,/, ''),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar pose.');

      setGeneratedPoses((prev) => [data.imageUrl, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com a IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Agrupa poses por categoria
  const posesByCategory = {
    'corpo-inteiro': PRESET_POSES.filter((p) => p.category === 'corpo-inteiro'),
    'meio-corpo': PRESET_POSES.filter((p) => p.category === 'meio-corpo'),
    rosto: PRESET_POSES.filter((p) => p.category === 'rosto'),
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="p-6 rounded-3xl bg-[#0e111a] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <User size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Estúdio de Pessoas & Novas Poses</h2>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Face Consistency AI
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Envie fotos do rosto, escolha a pose e gere dezenas de variações consistentes.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-gray-400">RESOLUÇÃO</span>
            <select
              value={selectedResolution}
              onChange={(e) => setSelectedResolution(e.target.value)}
              className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
            >
              {RESOLUTIONS.map((r) => (
                <option key={r.value} value={r.value} className="bg-[#11131a]">
                  {r.value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* GRID 2 COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUNA ESQUERDA: FOTOS DE REFERENCIA */}
        <div className="space-y-4">
          {/* FOTOS DO ROSTO (ate 3) */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera size={14} className="text-emerald-400" /> Fotos do Rosto
                <span className="text-[9px] text-gray-500">(até 3)</span>
              </h3>
              {faceImages.length < 3 && (
                <button
                  onClick={() => faceInputRef.current?.click()}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300"
                >
                  + Adicionar
                </button>
              )}
            </div>
            <input
              ref={faceInputRef}
              type="file"
              accept="image/*"
              onChange={handleAddFace}
              className="hidden"
            />
            {faceImages.length === 0 ? (
              <button
                onClick={() => faceInputRef.current?.click()}
                className="w-full border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl py-8 px-4 text-center transition-all bg-emerald-500/[0.02]"
              >
                <Upload size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">Adicionar foto do rosto</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Selfie ou foto do Instagram bem iluminada
                </p>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {faceImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img}
                      alt={`Rosto ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-xl border-2 border-emerald-500/30"
                    />
                    <button
                      onClick={() => handleRemoveFace(i)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                    <div className="absolute bottom-1 left-1 right-1 text-[9px] text-white bg-black/60 backdrop-blur-sm rounded px-1 py-0.5 text-center">
                      Foto {i + 1}
                    </div>
                  </div>
                ))}
                {faceImages.length < 3 && (
                  <button
                    onClick={() => faceInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-xl flex items-center justify-center transition-all"
                  >
                    <Plus size={20} className="text-gray-500" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* REFERENCIA DA POSE (opcional) */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon size={14} className="text-blue-400" /> Referência da Pose
                <span className="text-[9px] text-gray-500">(opcional)</span>
              </h3>
              {poseReference && (
                <button
                  onClick={() => setPoseReference(null)}
                  className="text-[10px] text-red-400"
                >
                  Remover
                </button>
              )}
            </div>
            <input
              ref={poseInputRef}
              type="file"
              accept="image/*"
              onChange={handleAddPoseRef}
              className="hidden"
            />
            {!poseReference ? (
              <button
                onClick={() => poseInputRef.current?.click()}
                className="w-full border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-2xl py-6 px-4 text-center transition-all bg-blue-500/[0.02]"
              >
                <ImageIcon size={20} className="text-blue-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-white">Foto de referência de pose</p>
                <p className="text-[10px] text-gray-400 mt-0.5">A IA vai copiar a pose dessa foto</p>
              </button>
            ) : (
              <div className="relative">
                <img
                  src={poseReference}
                  alt="Pose ref"
                  className="w-full max-h-48 object-contain rounded-xl bg-white/5"
                />
              </div>
            )}
            <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
              💡 Anexe uma foto com a pose que você quer. A IA vai manter a pose mas trocar o rosto pela sua referência.
            </p>
          </div>
        </div>

        {/* COLUNA DIREITA: CONFIGURACOES */}
        <div className="space-y-4">
          {/* ESCOLHA DA POSE - POR CATEGORIA */}
          <div className="p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400" /> Escolha a Pose
              <span className="text-[10px] text-gray-500">({PRESET_POSES.length} disponiveis)</span>
            </h3>

            {/* Corpo inteiro */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-2">
                🧍 Corpo Inteiro ({posesByCategory['corpo-inteiro'].length})
              </p>
              <div className="space-y-1.5">
                {posesByCategory['corpo-inteiro'].map((pose) => (
                  <PoseButton
                    key={pose.id}
                    pose={pose}
                    active={selectedPose === pose.id}
                    onClick={() => setSelectedPose(pose.id)}
                  />
                ))}
              </div>
            </div>

            {/* Meio corpo */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-2">
                🧑 Meio Corpo ({posesByCategory['meio-corpo'].length})
              </p>
              <div className="space-y-1.5">
                {posesByCategory['meio-corpo'].map((pose) => (
                  <PoseButton
                    key={pose.id}
                    pose={pose}
                    active={selectedPose === pose.id}
                    onClick={() => setSelectedPose(pose.id)}
                  />
                ))}
              </div>
            </div>

            {/* Rosto */}
            <div>
              <p className="text-[10px] font-bold text-fuchsia-300 uppercase tracking-wider mb-2">
                👤 Rosto / Expressões ({posesByCategory.rosto.length})
              </p>
              <div className="space-y-1.5">
                {posesByCategory.rosto.map((pose) => (
                  <PoseButton
                    key={pose.id}
                    pose={pose}
                    active={selectedPose === pose.id}
                    onClick={() => setSelectedPose(pose.id)}
                  />
                ))}
              </div>
            </div>

            {/* PROMPT PERSONALIZADO */}
            <div className="pt-2 border-t border-white/10 mt-2">
              <button
                onClick={() => setSelectedPose('custom')}
                className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                  selectedPose === 'custom'
                    ? 'bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border-fuchsia-500 text-white shadow-lg'
                    : 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {selectedPose === 'custom' && <CheckCircle2 size={14} className="text-fuchsia-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-tight">✨ Prompt Personalizado</p>
                    <p className="text-[10px] text-gray-400">Escreva sua própria descrição de pose</p>
                  </div>
                </div>
              </button>
              {selectedPose === 'custom' && (
                <textarea
                  rows={3}
                  value={customPosePrompt}
                  onChange={(e) => setCustomPosePrompt(e.target.value)}
                  placeholder="Ex: full body shot in dynamic action pose, jumping over an obstacle, sporty outfit, dynamic motion, athletic background..."
                  className="w-full mt-2 px-3 py-2 rounded-xl bg-white/5 border border-fuchsia-500/30 text-white text-xs placeholder-gray-500 focus:border-fuchsia-500 focus:outline-none resize-none"
                />
              )}
            </div>
          </div>

          {/* ROUPA + CENARIO (em 2 colunas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl">
              <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <Briefcase size={12} /> Roupa
              </h3>
              <select
                value={selectedAttire}
                onChange={(e) => setSelectedAttire(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              >
                {ATTIRE_OPTIONS.map((a) => (
                  <option key={a.id} value={a.id} className="bg-[#11131a]">
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl">
              <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <Camera size={12} /> Cenário
              </h3>
              <select
                value={selectedBg}
                onChange={(e) => setSelectedBg(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              >
                {BACKGROUND_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#11131a]">
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DETALHES EXTRAS */}
          <div className="p-4 rounded-3xl bg-[#0e111a] border border-white/10 shadow-xl">
            <h3 className="text-xs font-bold text-white mb-2">Detalhes Extras (Opcional)</h3>
            <textarea
              rows={2}
              value={customDetails}
              onChange={(e) => setCustomDetails(e.target.value)}
              placeholder="Ex: segurando cartao de credito preto, oculos de grau modernos, iluminacao dourada..."
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none resize-none"
            />
          </div>

          {/* ERRO */}
          {error && (
            <p className="text-xs text-red-400 font-medium">{error}</p>
          )}
        </div>
      </div>

      {/* BOTOES DE ACAO */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleGeneratePose}
          disabled={isGenerating}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-brand-500 to-emerald-400 text-dark-900 hover:opacity-95 transition-all shadow-xl disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Gerando Pose com IA...
            </>
          ) : (
            <>
              <Sparkles size={16} /> Gerar Pessoa Nesta Pose ({provider === 'Opus 4.8' ? 'Opus 4.8' : 'OpenAI'})
            </>
          )}
        </button>
        {onSaveRequest && (
          <button
            onClick={onSaveRequest}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
          >
            <Save size={14} /> Salvar Projeto
          </button>
        )}
      </div>

      {/* GALERIA DE POSES GERADAS */}
      {generatedPoses.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#0e111a] border border-white/10 shadow-2xl">
          <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-brand-400" /> Poses Geradas
            <span className="text-[10px] text-gray-500">({generatedPoses.length})</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {generatedPoses.map((img, idx) => (
              <div key={idx} className="group relative rounded-xl overflow-hidden border border-white/10 hover:border-brand-500/50 transition-colors">
                <img
                  src={img}
                  alt={`Pose ${idx + 1}`}
                  className="w-full aspect-square object-cover object-center group-hover:scale-105 transition-transform"
                />
                {/* Botão de preview/zoom fixo no canto */}
                <button
                  onClick={() => setPreviewImage(img)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-brand-500 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                  title="Ver em tela cheia"
                >
                  <Search size={13} />
                </button>
                <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/80 to-transparent">
                  <button
                    onClick={() => onSendToCreative(img)}
                    className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-brand-500 text-dark-900"
                  >
                    <ArrowRight size={10} /> Usar
                  </button>
                  <a
                    href={img}
                    download={`pose-${idx + 1}.png`}
                    className="mt-1 w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-white/10 text-white"
                  >
                    <Download size={10} /> Baixar
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE PREVIEW EM TELA CHEIA */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm"
            title="Fechar"
          >
            <X size={20} />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

// Componente de botão de pose (extraído para limpeza)
const PoseButton: React.FC<{
  pose: (typeof PRESET_POSES)[number];
  active: boolean;
  onClick: () => void;
}> = ({ pose, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-2.5 rounded-xl border transition-all ${
      active
        ? 'bg-brand-500/15 border-brand-500 text-white shadow-lg'
        : 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.05]'
    }`}
  >
    <div className="flex items-center gap-2">
      {active && <CheckCircle2 size={14} className="text-brand-400 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold leading-tight">{pose.label}</p>
        <p className="text-[10px] text-gray-400 truncate">{pose.desc}</p>
      </div>
    </div>
  </button>
);
