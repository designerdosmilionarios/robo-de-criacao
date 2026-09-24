'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_BRANDS, INITIAL_CAROUSEL } from '@/lib/constants';
import { BrandKit, CarouselProject, CarouselSlide, LocalFont, SavedProject } from '@/types';
import { SlideCanvas } from '@/components/SlideCanvas';
import { SlideEditor } from '@/components/SlideEditor';
import { BrandKitModal } from '@/components/BrandKitModal';
import { AiAssistantModal } from '@/components/AiAssistantModal';
import { AdBatchGenerator } from '@/components/AdBatchGenerator';
import { SettingsModal } from '@/components/SettingsModal';
import { SingleImageCreator } from '@/components/SingleImageCreator';
import { PoseStudio } from '@/components/PoseStudio';
import { FontManager, LocalFont as FontManagerLocalFont } from '@/components/FontManager';
import { MyProjects } from '@/components/MyProjects';
import { SaveProjectModal } from '@/components/SaveProjectModal';
import { FlowCanvas } from '@/components/FlowCanvas';
import { useProjects } from '@/lib/useProjects';
import { useLocalFonts } from '@/lib/useLocalFonts';
import {
  Sparkles,
  Palette,
  Layers,
  Wand2,
  ChevronLeft,
  ChevronRight,
  FolderDown,
  LayoutGrid,
  FileImage,
  Key,
  Type,
  ImageIcon,
  User,
  FolderOpen,
  Save,
  CheckCircle2,
  GitBranch,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import saveAs from 'file-saver';

type AIProvider = 'openai';
type ActiveTab = 'carousel' | 'single-image' | 'poses' | 'batch-ads' | 'fonts' | 'projects' | 'flow';

export default function Home() {
  const [brands, setBrands] = useState<BrandKit[]>(DEFAULT_BRANDS);
  const [activeBrandId, setActiveBrandId] = useState<string>(DEFAULT_BRANDS[0].id);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [project, setProject] = useState<CarouselProject>(INITIAL_CAROUSEL);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  // Modais
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFontManagerOpen, setIsFontManagerOpen] = useState(false);

  // Estado de chaves
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [provider, setProvider] = useState<AIProvider>('openai');

  // Fontes locais (migrado para IndexedDB para suportar GBs ao invés de 5MB)
  const {
    fonts: localFonts,
    addFont: addLocalFont,
    removeFont: removeLocalFont,
    clearAllFonts,
    storageStats: fontStorageStats,
  } = useLocalFonts();

  // Abas principais
  const [activeTab, setActiveTab] = useState<ActiveTab>('single-image');
  const [personImageForCreative, setPersonImageForCreative] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Sistema de projetos salvos
  const {
    projects: savedProjects,
    saveProject,
    deleteProject,
    duplicateProject,
    importProjects,
  } = useProjects();

  // Modal de salvar projeto
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalType, setSaveModalType] = useState<'carousel' | 'single-image' | 'pose' | 'batch-ads'>('carousel');
  const [saveModalDefaultName, setSaveModalDefaultName] = useState('');
  const [saveModalExistingId, setSaveModalExistingId] = useState<string | undefined>(undefined);

  // Notificação rápida após salvar
  const [lastSavedName, setLastSavedName] = useState<string | null>(null);

  // Cliente atual
  const activeBrand = brands.find((b) => b.id === activeBrandId) || brands[0];
  const activeSlide = project.slides[activeSlideIndex] || project.slides[0];

  // Carregar configurações salvas
  useEffect(() => {
    setOpenaiApiKey(localStorage.getItem('openai_api_key') || '');
    try {
      const savedBrands = JSON.parse(localStorage.getItem('brand_kits') || 'null');
      if (Array.isArray(savedBrands) && savedBrands.length > 0) setBrands(savedBrands);
      const savedActiveBrand = localStorage.getItem('active_brand_id');
      if (savedActiveBrand) setActiveBrandId(savedActiveBrand);
    } catch (error) {
      console.error('Erro ao carregar as marcas:', error);
    } finally {
      setBrandsLoaded(true);
    }
    // Limpar chave antiga do Google/Claude se existir (não usa mais)
    localStorage.removeItem('claude_api_key');
    // As fontes agora sao gerenciadas pelo hook useLocalFonts (IndexedDB)
  }, []);

  useEffect(() => {
    if (!brandsLoaded) return;
    localStorage.setItem('brand_kits', JSON.stringify(brands));
    localStorage.setItem('active_brand_id', activeBrandId);
  }, [brands, activeBrandId, brandsLoaded]);

  // Salvar preferências sempre que mudarem
  useEffect(() => {
    localStorage.setItem('provider', provider);
  }, [provider]);

  // Sincronizar activeBrandId com project.brandId
  useEffect(() => {
    setProject((prev) => ({ ...prev, brandId: activeBrandId }));
  }, [activeBrandId]);

  // Injetar @font-face das fontes locais no head do documento
  useEffect(() => {
    let styleEl = document.getElementById('local-fonts-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'local-fonts-style';
      document.head.appendChild(styleEl);
    }

    const fontFaces = localFonts
      .map(
        (f) => `
@font-face {
  font-family: '${f.family}';
  src: url('${f.base64}') format('${f.format}');
  font-weight: ${f.weight || '400'};
  font-style: ${f.italic ? 'italic' : 'normal'};
  font-display: swap;
}
`
      )
      .join('\n');

    styleEl.textContent = fontFaces;
  }, [localFonts]);

  // Funções de slides
  const handleUpdateSlide = (updated: CarouselSlide) => {
    setProject((prev) => {
      const slides = [...prev.slides];
      slides[activeSlideIndex] = updated;
      return { ...prev, slides };
    });
  };

  const handleAddSlide = () => {
    const newSlide: CarouselSlide = {
      id: `slide-${Date.now()}`,
      type: 'content',
      tag: 'NOVO TÓPICO',
      title: 'Título do seu novo slide',
      highlightText: 'Destaque visual importante',
      subtitle: 'Explicação rápida e objetiva dos pontos que seu cliente precisa saber.',
      bodyList: [
        'Primeiro ponto de interesse visual',
        'Segundo detalhe estratégico para prender a atenção',
      ],
    };
    setProject((prev) => ({ ...prev, slides: [...prev.slides, newSlide] }));
    setActiveSlideIndex(project.slides.length);
  };

  const handleDeleteSlide = (id: string) => {
    if (project.slides.length <= 1) return;
    setProject((prev) => ({ ...prev, slides: prev.slides.filter((s) => s.id !== id) }));
    setActiveSlideIndex(Math.max(0, activeSlideIndex - 1));
  };

  const handleApplyAiSlides = (title: string, slides: CarouselSlide[]) => {
    setProject((prev) => ({ ...prev, title, slides }));
    setActiveSlideIndex(0);
  };

  // Exportações
  const carouselExportSize = project.aspectRatio === '4:5'
    ? { width: 1080, height: 1350 }
    : project.aspectRatio === '1:1'
    ? { width: 1080, height: 1080 }
    : { width: 1080, height: 1920 };

  const handleDownloadSingleSlide = async () => {
    const el = document.getElementById(`carousel-slide-${activeSlide.id}`);
    if (!el) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 1,
        canvasWidth: carouselExportSize.width,
        canvasHeight: carouselExportSize.height,
        cacheBust: true,
      });
      saveAs(
        dataUrl,
        `${project.title.toLowerCase().replace(/\s+/g, '-')}-slide-${activeSlideIndex + 1}.png`
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllSlidesZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(project.title.replace(/[^\w\s-]/gi, '')) || zip;

      for (let i = 0; i < project.slides.length; i++) {
        const slide = project.slides[i];
        const el = document.getElementById(`carousel-slide-${slide.id}`);
        if (el) {
          const dataUrl = await toPng(el, {
            pixelRatio: 1,
            canvasWidth: carouselExportSize.width,
            canvasHeight: carouselExportSize.height,
            cacheBust: true,
          });
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          folder.file(`slide-0${i + 1}.png`, base64Data, { base64: true });
        }
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${project.title.toLowerCase().replace(/\s+/g, '-')}-carrossel-completo.zip`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // Gerenciamento de Fontes (usando IndexedDB atraves do hook useLocalFonts)
  const handleAddLocalFont = async (font: FontManagerLocalFont) => {
    try {
      await addLocalFont(font);
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar fonte.');
    }
  };

  const handleRemoveLocalFont = async (family: string) => {
    try {
      await removeLocalFont(family);
    } catch (err: any) {
      console.error('Erro ao remover fonte:', err);
    }
  };

  // =========================================
  // SISTEMA DE SALVAR/CARREGAR PROJETOS
  // =========================================

  // Handlers unificados para abrir o modal de salvar projeto a partir de cada aba
  const openSaveProjectModal = useCallback(
    (type: 'carousel' | 'single-image' | 'pose' | 'batch-ads', defaultName: string) => {
      setSaveModalType(type);
      setSaveModalDefaultName(defaultName);
      setSaveModalExistingId(undefined);
      setSaveModalOpen(true);
    },
    []
  );

  // Salvar projeto de CARROSSEL
  const handleSaveCarouselProject = useCallback(
    async (name: string) => {
      // Gera thumbnail do primeiro slide
      const firstSlide = project.slides[0];
      const el = firstSlide ? document.getElementById(`carousel-slide-${firstSlide.id}`) : null;
      let thumbDataUrl: string | undefined;
      if (el) {
        try {
          thumbDataUrl = await toPng(el, { pixelRatio: 0.5, cacheBust: true });
        } catch (e) {
          console.warn('Falha ao gerar thumbnail:', e);
        }
      }

      const saved: SavedProject = {
        id: `carousel-${Date.now()}`,
        name,
        type: 'carousel',
        brandId: activeBrandId,
        brandName: activeBrand.name,
        thumbnail: thumbDataUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: { project: { ...project, brandId: activeBrandId } },
      };
      const didSave = await saveProject(saved);
      if (didSave) {
        setLastSavedName(name);
        setTimeout(() => setLastSavedName(null), 3000);
      }
      return didSave;
    },
    [project, activeBrandId, activeBrand, saveProject]
  );

  // Salvar projeto de CRIATIVO ÚNICO
  const singleImageStateRef = useRef<any>(null);
  const pendingSingleLoadRef = useRef<any>(null);
  const setSingleImageRef = useCallback((controls: any) => {
    singleImageStateRef.current = controls;
    if (pendingSingleLoadRef.current) {
      controls.load(pendingSingleLoadRef.current);
      pendingSingleLoadRef.current = null;
    }
  }, []);

  // Salvar projeto de POSE
  const poseStateRef = useRef<any>(null);
  const pendingPoseLoadRef = useRef<any>(null);
  const setPoseRef = useCallback((controls: any) => {
    poseStateRef.current = controls;
    if (pendingPoseLoadRef.current) {
      controls.load(pendingPoseLoadRef.current);
      pendingPoseLoadRef.current = null;
    }
  }, []);

  const batchAdsStateRef = useRef<any>(null);
  const pendingBatchLoadRef = useRef<any>(null);
  const setBatchAdsRef = useCallback((controls: any) => {
    batchAdsStateRef.current = controls;
    if (pendingBatchLoadRef.current) {
      controls.load(pendingBatchLoadRef.current);
      pendingBatchLoadRef.current = null;
    }
  }, []);

  // Função genérica chamada pelo modal
  const handleSaveProjectWithName = useCallback(
    async (name: string) => {
      const now = new Date().toISOString();

      const buildAndSave = async (project: SavedProject) => {
        const didSave = await saveProject(project);
        if (didSave) {
          setLastSavedName(name);
          setTimeout(() => setLastSavedName(null), 3000);
        }
        return didSave;
      };

      if (saveModalType === 'carousel') {
        return handleSaveCarouselProject(name);
      }

      if (saveModalType === 'single-image' && singleImageStateRef.current) {
        const state = singleImageStateRef.current.state;
        const el = document.getElementById('single-creative-canvas');
        let thumbnail: string | undefined;
        if (el) {
          try {
            thumbnail = await toPng(el, { pixelRatio: 0.5, cacheBust: true });
          } catch (e) {
            console.warn('Falha ao gerar thumbnail:', e);
          }
        }
        return buildAndSave({
          id: `single-${Date.now()}`,
          name,
          type: 'single-image',
          brandId: activeBrandId,
          brandName: activeBrand.name,
          thumbnail,
          createdAt: now,
          updatedAt: now,
          data: { ...state },
        });
      }

      if (saveModalType === 'pose' && poseStateRef.current) {
        const state = poseStateRef.current.state;
        const firstImage = state.generatedPoses?.[0];
        return buildAndSave({
          id: `pose-${Date.now()}`,
          name,
          type: 'pose',
          brandId: activeBrandId,
          brandName: activeBrand.name,
          thumbnail: firstImage,
          createdAt: now,
          updatedAt: now,
          data: { ...state },
        });
      }

      if (saveModalType === 'batch-ads' && batchAdsStateRef.current) {
        const state = batchAdsStateRef.current.state;
        return buildAndSave({
          id: `batch-${Date.now()}`,
          name,
          type: 'batch-ads',
          brandId: activeBrandId,
          brandName: activeBrand.name,
          createdAt: now,
          updatedAt: now,
          data: { ...state },
        });
      }

      return false;
    },
    [saveModalType, handleSaveCarouselProject, activeBrandId, activeBrand, saveProject]
  );

  // Carregar projeto salvo (vai pra aba certa e aplica os dados)
  const handleLoadProject = useCallback(
    (project: SavedProject) => {
      switch (project.type) {
        case 'carousel': {
          setActiveTab('carousel');
          const data = project.data as { project: CarouselProject };
          if (data.project) setProject(data.project);
          setActiveBrandId(project.brandId);
          break;
        }
        case 'single-image':
          setActiveTab('single-image');
          pendingSingleLoadRef.current = project.data;
          setActiveBrandId(project.brandId);
          break;
        case 'pose':
          setActiveTab('poses');
          pendingPoseLoadRef.current = project.data;
          setActiveBrandId(project.brandId);
          break;
        case 'batch-ads':
          setActiveTab('batch-ads');
          pendingBatchLoadRef.current = project.data;
          setActiveBrandId(project.brandId);
          break;
      }
    },
    []
  );

  const apiKey = openaiApiKey;
  const hasApiKey = !!apiKey;

  return (
    <main className="min-h-screen pb-16">
      {/* NAVBAR SUPERIOR */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#07090e]/80 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-500 to-emerald-400 flex items-center justify-center text-dark-900 font-extrabold shadow-lg shadow-brand-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  ROBÔ STUDIO
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  v2.0 PRO
                </span>
              </div>
              <p className="text-xs text-gray-400 hidden sm:block">
                Sua própria esteira de criação sem mensalidades
              </p>
            </div>
          </div>

          {/* ABAS */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 flex-wrap">
            <button
              onClick={() => setActiveTab('single-image')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'single-image' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ImageIcon size={13} /> Criativo Único
            </button>
            <button
              onClick={() => setActiveTab('poses')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'poses' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <User size={13} /> Estúdio de Poses
            </button>
            <button
              onClick={() => setActiveTab('carousel')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'carousel' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers size={13} /> Carrosséis
            </button>
            <button
              onClick={() => setActiveTab('batch-ads')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'batch-ads' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={13} /> Lote Meta Ads
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'projects' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <FolderOpen size={13} /> Meus Projetos ({savedProjects.length})
            </button>
            <button
              onClick={() => setActiveTab('flow')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'flow' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <GitBranch size={13} /> Esteira IA
            </button>
            <button
              onClick={() => setActiveTab('fonts')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'fonts' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Type size={13} /> Fontes ({localFonts.length})
            </button>
          </div>

          {/* SELETOR DE CLIENTE + API */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Removido: Provider Switcher (só OpenAI agora) */}

            <button
              onClick={() => setIsBrandModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
            >
              <div
                className="w-3 h-3 rounded-full border border-white/20"
                style={{ backgroundColor: activeBrand.primaryColor }}
              />
              <span className="max-w-[120px] truncate">{activeBrand.name}</span>
              <Palette size={14} className="text-gray-400" />
            </button>

            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
              title="Configurar Chaves de API"
            >
              <Key size={14} className={hasApiKey ? 'text-emerald-400' : 'text-amber-400'} />
              <span className="hidden sm:inline">{hasApiKey ? 'Conectada' : 'API'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
        {activeTab === 'carousel' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#0e111a] border border-white/10 shadow-lg">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={project.title}
                  onChange={(e) => setProject({ ...project, title: e.target.value })}
                  className="bg-transparent font-extrabold text-base sm:text-lg text-white border-b border-transparent hover:border-white/20 focus:border-brand-500 focus:outline-none px-1 py-0.5 max-w-md"
                  placeholder="Nome do projeto..."
                />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-all"
                >
                  <Wand2 size={15} /> Roteiro com IA
                </button>

                <button
                  onClick={() => openSaveProjectModal('carousel', project.title || 'Carrossel')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
                >
                  <Save size={15} /> Salvar Projeto
                </button>

                <button
                  onClick={handleDownloadSingleSlide}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all disabled:opacity-50"
                >
                  <FileImage size={15} /> Baixar Slide Atual
                </button>

                <button
                  onClick={handleDownloadAllSlidesZip}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-brand-500 text-dark-900 hover:bg-brand-400 transition-all shadow-xl shadow-brand-500/20 disabled:opacity-50"
                >
                  <FolderDown size={16} />
                  {isExporting ? 'Renderizando...' : 'Exportar Carrossel Completo (ZIP)'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="w-full max-w-md mx-auto">
                  <SlideCanvas
                    id={`carousel-slide-${activeSlide.id}`}
                    slide={activeSlide}
                    brand={activeBrand}
                    index={activeSlideIndex}
                    totalSlides={project.slides.length}
                    aspectRatio={project.aspectRatio}
                    templateStyle={project.templateStyle}
                  />

                  <div className="flex items-center justify-between mt-5 p-3 rounded-2xl bg-white/5 border border-white/10">
                    <button
                      onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                      disabled={activeSlideIndex === 0}
                      className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <div className="flex items-center gap-1.5 overflow-x-auto px-2">
                      {project.slides.map((s, idx) => (
                        <button
                          key={s.id}
                          onClick={() => setActiveSlideIndex(idx)}
                          className={`w-8 h-8 rounded-xl font-bold font-mono text-xs flex items-center justify-center transition-all ${
                            activeSlideIndex === idx
                              ? 'bg-brand-500 text-dark-900 shadow-md shadow-brand-500/20 scale-105'
                              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() =>
                        setActiveSlideIndex((prev) => Math.min(project.slides.length - 1, prev + 1))
                      }
                      disabled={activeSlideIndex === project.slides.length - 1}
                      className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                <div className="fixed left-[-9999px] top-[-9999px]">
                  {project.slides.map((s, idx) => (
                    <div key={`hidden-${s.id}`} style={{ width: '1080px' }}>
                      <SlideCanvas
                        id={`carousel-slide-${s.id}`}
                        slide={s}
                        brand={activeBrand}
                        index={idx}
                        totalSlides={project.slides.length}
                        aspectRatio={project.aspectRatio}
                        templateStyle={project.templateStyle}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5">
                <SlideEditor
                  slide={activeSlide}
                  index={activeSlideIndex}
                  totalSlides={project.slides.length}
                  onUpdateSlide={handleUpdateSlide}
                  onAddSlide={handleAddSlide}
                  onDeleteSlide={handleDeleteSlide}
                  templateStyle={project.templateStyle}
                  onChangeTemplateStyle={(style) => setProject({ ...project, templateStyle: style })}
                  aspectRatio={project.aspectRatio}
                  onChangeAspectRatio={(ratio) => setProject({ ...project, aspectRatio: ratio })}
                  apiKey={apiKey}
                  provider={provider}
                  onOpenSettings={() => setIsSettingsModalOpen(true)}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'single-image' && (
          <SingleImageCreator
            brand={activeBrand}
            apiKey={apiKey}
            provider={provider}
            localFonts={localFonts}
            externalPersonImage={personImageForCreative}
            onClearExternalPerson={() => setPersonImageForCreative(null)}
            onRegisterControls={setSingleImageRef}
            onSaveRequest={() => openSaveProjectModal('single-image', 'Criativo Único')}
          />
        )}

        {activeTab === 'poses' && (
          <PoseStudio
            brand={activeBrand}
            apiKey={apiKey}
            provider={provider}
            onSendToCreative={(imgUrl) => {
              setPersonImageForCreative(imgUrl);
              setActiveTab('single-image');
            }}
            onRegisterControls={setPoseRef}
            onSaveRequest={() => openSaveProjectModal('pose', 'Pose / Pessoa')}
          />
        )}

        {activeTab === 'batch-ads' && (
          <AdBatchGenerator
            brand={activeBrand}
            onRegisterControls={setBatchAdsRef}
            onSaveRequest={(payload) =>
              openSaveProjectModal('batch-ads', payload?.name || 'Lote Meta Ads')
            }
          />
        )}

        {activeTab === 'projects' && (
          <MyProjects
            projects={savedProjects}
            onLoadProject={handleLoadProject}
            onDeleteProject={deleteProject}
            onDuplicateProject={duplicateProject}
            onImportProjects={importProjects}
          />
        )}

        {activeTab === 'flow' && (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-transparent border border-brand-500/20">
              <h2 className="text-xl font-extrabold text-white mb-2 flex items-center gap-2">
                <GitBranch size={20} className="text-brand-400" />
                Esteira IA — Estúdio de Produção com IA
              </h2>
              <p className="text-sm text-gray-400 max-w-3xl">
                Monte a sua linha de produção visual com blocos conectados. Comece com um <strong className="text-blue-400">Briefing</strong> descrevendo o produto e a dor, adicione <strong className="text-pink-400">Estilo</strong> e <strong className="text-purple-400">Logo</strong> como referência, e dispare <strong className="text-amber-400">Copy</strong> + <strong className="text-emerald-400">Imagem</strong> encadeados. Clique no <strong>▶</strong> de cada bloco para executar e ver o resultado aparecer na tela.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                💡 <strong>Como conectar:</strong> arraste os blocos para organizar. Clique na bolinha colorida à direita do bloco de origem e depois no ponto verde à esquerda do bloco de destino. As linhas verdes pontilhadas mostram o fluxo dos dados.
              </p>
            </div>
            <FlowCanvas
              apiKey={apiKey}
              provider={provider}
              brand={{
                name: activeBrand.name,
                primaryColor: activeBrand.primaryColor,
              }}
            />
          </div>
        )}

        {activeTab === 'fonts' && (
          <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-[#0e111a] border border-white/10 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
              <Type size={28} className="text-brand-400" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Biblioteca de Fontes Locais</h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Importe arquivos .TTF, .OTF, .WOFF ou .WOFF2 do seu PC para usar nos designs de todos os clientes.
              Helvetica Neue, Monument, Roboto, qualquer uma que você já comprou.
            </p>
            <button
              onClick={() => setIsFontManagerOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-500 to-emerald-400 text-dark-900 hover:opacity-95 transition-all shadow-lg"
            >
              <Type size={16} /> Abrir Gerenciador de Fontes
            </button>
            <div className="text-xs text-gray-500 pt-2">
              {localFonts.length === 0
                ? 'Nenhuma fonte local importada ainda.'
                : `${localFonts.length} fonte${localFonts.length > 1 ? 's' : ''} importada${localFonts.length > 1 ? 's' : ''}.`}
            </div>
          </div>
        )}
      </div>

      {/* MODAIS */}
      <BrandKitModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        brands={brands}
        activeBrandId={activeBrandId}
        onSelectBrand={(id) => setActiveBrandId(id)}
        onSaveBrand={(updated) => {
          setBrands((prev) => {
            const idx = prev.findIndex((b) => b.id === updated.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = updated;
              return copy;
            }
            return [...prev, updated];
          });
        }}
        onDeleteBrand={(id) => {
          setBrands((prev) => {
            const next = prev.filter((b) => b.id !== id);
            if (activeBrandId === id && next[0]) setActiveBrandId(next[0].id);
            return next;
          });
        }}
      />

      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplySlides={handleApplyAiSlides}
        brandName={activeBrand.name}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        openaiApiKey={openaiApiKey}
        claudeApiKey=""
        provider="openai"
        onSaveApiKey={(key) => {
          setOpenaiApiKey(key);
          localStorage.setItem('openai_api_key', key);
        }}
      />

      <FontManager
        isOpen={isFontManagerOpen}
        onClose={() => setIsFontManagerOpen(false)}
        localFonts={localFonts}
        onAddFont={handleAddLocalFont}
        onRemoveFont={handleRemoveLocalFont}
        activeFont={activeBrand.fontHeadline}
        storageStats={fontStorageStats}
        onSelectFont={(family) => {
          setBrands((prev) =>
            prev.map((b) => (b.id === activeBrandId ? { ...b, fontHeadline: family, fontBody: family } : b))
          );
        }}
      />

      {/* Modal unificado para salvar projeto */}
      <SaveProjectModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveProjectWithName}
        type={saveModalType}
        defaultName={saveModalDefaultName}
        existingId={saveModalExistingId}
      />

      {/* Notificação flutuante: projeto salvo com sucesso */}
      {lastSavedName && (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold">Projeto "{lastSavedName}" salvo!</span>
        </div>
      )}
    </main>
  );
}
