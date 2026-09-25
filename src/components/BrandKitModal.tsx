import React, { useState, useRef } from 'react';
import { BrandKit } from '@/types';
import {
  Palette,
  Check,
  Plus,
  Trash2,
  Type,
  Upload,
  Mail,
  Phone,
  Globe,
  Building2,
  Tag,
  Sparkles,
  MessageSquare,
  Eye,
  Save,
} from 'lucide-react';

interface BrandKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: BrandKit[];
  activeBrandId: string;
  onSelectBrand: (id: string) => void;
  onSaveBrand: (brand: BrandKit) => void;
  onDeleteBrand: (id: string) => void;
}

const FONT_OPTIONS_HEADLINE = [
  'Plus Jakarta Sans',
  'Montserrat',
  'Syne',
  'Inter',
  'Poppins',
  'Bebas Neue',
  'Archivo Black',
  'Anton',
  'Playfair Display',
];

const FONT_OPTIONS_BODY = [
  'Inter',
  'Plus Jakarta Sans',
  'Montserrat',
  'Poppins',
  'Roboto',
  'Nunito',
  'Lato',
];

const STYLE_OPTIONS = [
  { value: 'modern', label: '🚀 Moderno' },
  { value: 'minimalist', label: '◯ Minimalista' },
  { value: 'bold', label: '💥 Bold/Ousado' },
  { value: 'elegant', label: '✨ Elegante' },
  { value: 'playful', label: '🎨 Divertido' },
];

const TONE_OPTIONS = [
  { value: 'urgente', label: '🔥 Urgente' },
  { value: 'inspirador', label: '✨ Inspirador' },
  { value: 'profissional', label: '💼 Profissional' },
  { value: 'casual', label: '😄 Casual' },
  { value: 'luxo', label: '👑 Luxo' },
];

export const BrandKitModal: React.FC<BrandKitModalProps> = ({
  isOpen,
  onClose,
  brands,
  activeBrandId,
  onSelectBrand,
  onSaveBrand,
  onDeleteBrand,
}) => {
  const [editingBrand, setEditingBrand] = useState<BrandKit | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentBrand =
    editingBrand || brands.find((b) => b.id === activeBrandId) || brands[0];

  if (!currentBrand) return null;

  const handleCreateNew = () => {
    const newBrand: BrandKit = {
      id: `brand-${Date.now()}`,
      name: 'Novo Cliente',
      handle: '@novocliente',
      segment: '',
      slogan: '',
      website: '',
      email: '',
      phone: '',
      primaryColor: '#00F59B',
      secondaryColor: '#3B82F6',
      backgroundColor: '#0A0B10',
      cardColor: '#141722',
      textColor: '#FFFFFF',
      accentTextColor: '#94A3B8',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      fontHeadline: 'Plus Jakarta Sans',
      fontBody: 'Inter',
      tone: 'profissional',
      style: 'modern',
    };
    onSaveBrand(newBrand);
    onSelectBrand(newBrand.id);
    setEditingBrand(newBrand);
  };

  const handleFieldChange = <K extends keyof BrandKit>(field: K, value: BrandKit[K]) => {
    const updated = { ...currentBrand, [field]: value };
    setEditingBrand(updated);
    onSaveBrand(updated);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleFieldChange('logoUrl', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Render field de cor (label + picker + input)
  const ColorField = ({
    field,
    label,
  }: {
    field: keyof BrandKit;
    label: string;
  }) => (
    <div>
      <label className="block text-[11px] text-gray-300 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={(currentBrand[field] as string) || '#000000'}
          onChange={(e) => handleFieldChange(field, e.target.value as any)}
          className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border-0"
        />
        <input
          type="text"
          value={(currentBrand[field] as string) || ''}
          onChange={(e) => handleFieldChange(field, e.target.value as any)}
          className="flex-1 px-2 py-1 text-[11px] rounded bg-white/5 border border-white/10 text-white uppercase font-mono"
        />
      </div>
    </div>
  );

  // Render text field
  const TextField = ({
    field,
    label,
    icon: Icon,
    placeholder,
  }: {
    field: keyof BrandKit;
    label: string;
    icon: any;
    placeholder?: string;
  }) => (
    <div>
      <label className="block text-[11px] text-gray-300 mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon size={13} />} {label}
      </label>
      <input
        type="text"
        value={(currentBrand[field] as string) || ''}
        onChange={(e) => handleFieldChange(field, e.target.value as any)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 focus:outline-none"
      />
    </div>
  );

  // Render select field
  const SelectField = ({
    field,
    label,
    icon: Icon,
    options,
  }: {
    field: keyof BrandKit;
    label: string;
    icon: any;
    options: { value: string; label: string }[];
  }) => (
    <div>
      <label className="block text-[11px] text-gray-300 mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon size={13} />} {label}
      </label>
      <select
        value={(currentBrand[field] as string) || ''}
        onChange={(e) => handleFieldChange(field, e.target.value as any)}
        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
      >
        <option value="" className="bg-[#11131a]">Selecione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#11131a]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[#0d0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10 sticky top-0 bg-[#0d0f17] z-10 -mx-6 sm:-mx-8 px-6 sm:px-8 pt-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Palette size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Central de Marcas (Brand Kits)</h2>
              <p className="text-sm text-gray-400">
                Gerencie paletas, tipografia e identidade visual completa dos seus clientes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* LISTA DE CLIENTES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Clientes
              </span>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-500 text-dark-900 hover:bg-brand-400 transition-all"
              >
                <Plus size={14} /> Novo
              </button>
            </div>

            <div className="space-y-2">
              {brands.map((b) => {
                const isActive = b.id === currentBrand.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      setEditingBrand(b);
                      onSelectBrand(b.id);
                    }}
                    className={`cursor-pointer p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-brand-500/50 bg-brand-500/10 shadow-lg'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-5 h-5 rounded-full border border-white/20 shadow-sm shrink-0"
                        style={{ backgroundColor: b.primaryColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-tight truncate">
                          {b.name}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">{b.handle}</p>
                      </div>
                      {isActive && <Check size={14} className="text-brand-400 shrink-0" />}
                    </div>
                    {b.segment && (
                      <p className="text-[10px] text-gray-500 mt-1 truncate">📁 {b.segment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* EDITOR DO CLIENTE */}
          <div className="md:col-span-3 space-y-6 bg-white/[0.02] p-5 rounded-2xl border border-white/5">
            {/* HEADER DO EDITOR + LOGO */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={currentBrand.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Nome da Marca / Cliente"
                  className="w-full text-lg font-bold text-white bg-transparent border-b-2 border-transparent hover:border-white/20 focus:border-brand-500 focus:outline-none px-1 py-1"
                />
                <input
                  type="text"
                  value={currentBrand.handle}
                  onChange={(e) => handleFieldChange('handle', e.target.value)}
                  placeholder="@instagram"
                  className="w-full text-xs text-gray-400 bg-transparent border-b border-transparent hover:border-white/10 focus:border-brand-500 focus:outline-none px-1 py-0.5 mt-0.5"
                />
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs"
              >
                {currentBrand.logoUrl ? (
                  <img
                    src={currentBrand.logoUrl}
                    alt="logo"
                    className="w-6 h-6 object-contain bg-white/5 rounded"
                  />
                ) : (
                  <Upload size={13} />
                )}
                Logo
              </button>
            </div>

            {/* SEÇÃO 1: IDENTIDADE DA MARCA */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Building2 size={13} /> Identidade da Marca
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField
                  field="segment"
                  label="Segmento / Nicho"
                  icon={Tag}
                  placeholder="Ex: Moda Feminina, SaaS B2B..."
                />
                <TextField
                  field="slogan"
                  label="Slogan / Tagline"
                  icon={MessageSquare}
                  placeholder="Ex: Transformando ideias em resultados"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <TextField
                  field="website"
                  label="Website"
                  icon={Globe}
                  placeholder="https://cliente.com.br"
                />
                <TextField
                  field="email"
                  label="E-mail de Contato"
                  icon={Mail}
                  placeholder="contato@cliente.com.br"
                />
              </div>
              <div className="mt-3">
                <TextField
                  field="phone"
                  label="WhatsApp / Telefone"
                  icon={Phone}
                  placeholder="+55 11 99999-9999"
                />
              </div>
            </div>

            {/* SEÇÃO 2: PALETA DE CORES PRINCIPAL */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Palette size={13} /> Paleta de Cores Principal
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <ColorField field="primaryColor" label="🟢 Primária (Destaque)" />
                <ColorField field="secondaryColor" label="🔵 Secundária" />
                <ColorField field="backgroundColor" label="⚫ Fundo (Background)" />
                <ColorField field="cardColor" label="🟦 Cards" />
                <ColorField field="textColor" label="⚪ Texto Principal" />
                <ColorField field="accentTextColor" label="🔘 Texto Apoio" />
              </div>
            </div>

            {/* SEÇÃO 3: CORES SEMÂNTICAS */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles size={13} /> Cores Semânticas (status / feedback)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ColorField field="successColor" label="✓ Sucesso" />
                <ColorField field="warningColor" label="⚠ Atenção" />
                <ColorField field="errorColor" label="✕ Erro" />
              </div>
            </div>

            {/* SEÇÃO 4: TIPOGRAFIA */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Type size={13} /> Tipografia (Fontes)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectField
                  field="fontHeadline"
                  label="Fonte dos Títulos (Headline)"
                  icon={Type}
                  options={FONT_OPTIONS_HEADLINE.map((f) => ({ value: f, label: f }))}
                />
                <SelectField
                  field="fontBody"
                  label="Fonte do Corpo"
                  icon={Type}
                  options={FONT_OPTIONS_BODY.map((f) => ({ value: f, label: f }))}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                💡 Você também pode importar fontes .TTF/.OTF/.WOFF/.WOFF2 do seu PC na aba <strong className="text-emerald-300">Fontes</strong>.
              </p>
            </div>

            {/* SEÇÃO 5: TOM E ESTILO DE COMUNICAÇÃO */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MessageSquare size={13} /> Tom & Estilo de Comunicação
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectField
                  field="tone"
                  label="Tom de comunicação"
                  icon={MessageSquare}
                  options={TONE_OPTIONS}
                />
                <SelectField
                  field="style"
                  label="Estilo visual"
                  icon={Eye}
                  options={STYLE_OPTIONS}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                💡 Esses valores são usados pelo <strong className="text-purple-300">Diretor Criativo IA</strong> e pelos <strong className="text-amber-300">Templates com IA</strong> para gerar criativos personalizados para o cliente.
              </p>
            </div>

            {/* BOTÃO EXCLUIR */}
            {brands.length > 1 && (
              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <p className="text-[10px] text-gray-500">
                  💾 As alterações são salvas automaticamente.
                </p>
                <button
                  onClick={() => onDeleteBrand(currentBrand.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all"
                >
                  <Trash2 size={14} /> Excluir Cliente
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-brand-500 text-dark-900 hover:bg-brand-400 transition-all shadow-lg"
          >
            Pronto / Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
