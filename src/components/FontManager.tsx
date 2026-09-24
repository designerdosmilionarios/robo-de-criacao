import React, { useState, useRef } from 'react';
import {
  Type,
  Upload,
  Check,
  Trash2,
  Plus,
  Monitor,
  Loader2,
  HardDrive,
  AlertCircle,
  Search,
  Download,
} from 'lucide-react';

export interface LocalFont {
  family: string;
  base64: string;
  format: string;
  weight?: string;
  italic?: boolean;
}

interface FontManagerProps {
  isOpen: boolean;
  onClose: () => void;
  localFonts: LocalFont[];
  onAddFont: (font: LocalFont) => void;
  onRemoveFont: (family: string) => void;
  activeFont: string;
  onSelectFont: (family: string) => void;
}

export const FontManager: React.FC<FontManagerProps> = ({
  isOpen,
  onClose,
  localFonts,
  onAddFont,
  onRemoveFont,
  activeFont,
  onSelectFont,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Importação automática do Windows Fonts
  const [isImportingSystem, setIsImportingSystem] = useState(false);
  const [systemProgress, setSystemProgress] = useState<{ current: number; total: number } | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [systemSourceDir, setSystemSourceDir] = useState<string | null>(null);
  const [customFontPath, setCustomFontPath] = useState<string>('C:\\Windows\\Fonts');
  const [fontSearch, setFontSearch] = useState('');

  // Importar de C:\Windows\Fonts (ou caminho customizado)
  const handleImportSystemFonts = async () => {
    setIsImportingSystem(true);
    setSystemError(null);
    setSystemProgress({ current: 0, total: 0 });
    setSystemSourceDir(null);

    try {
      const params = new URLSearchParams();
      const trimmedPath = customFontPath.trim();
      if (trimmedPath) params.set('path', trimmedPath);

      const res = await fetch(`/api/list-system-fonts?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao listar fontes do sistema.');
      }

      setSystemSourceDir(data.sourceDir);
      const fonts: any[] = data.fonts || [];
      setSystemProgress({ current: 0, total: fonts.length });

      let imported = 0;
      for (let i = 0; i < fonts.length; i++) {
        const f = fonts[i];
        // Pular família vazia
        if (!f.family) continue;
        try {
          onAddFont({
            family: f.family,
            base64: f.base64,
            format: f.format,
            weight: f.weight,
            italic: f.italic,
          });
          imported++;
        } catch (e) {
          // pode ter estourado o limite do localStorage; paramos
          setSystemError(
            `Limite do navegador atingido após ${imported} fontes. Remova algumas para liberar espaço e tente novamente.`
          );
          break;
        }
        setSystemProgress({ current: i + 1, total: fonts.length });
      }
    } catch (err: any) {
      setSystemError(err.message || 'Erro ao importar fontes do sistema.');
    } finally {
      setIsImportingSystem(false);
    }
  };

  // Filtrar lista de fontes locais pelo termo de busca
  const filteredFonts = localFonts.filter((f) =>
    f.family.toLowerCase().includes(fontSearch.toLowerCase())
  );

  if (!isOpen) return null;

  const detectFormat = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ttf': return 'truetype';
      case 'otf': return 'opentype';
      case 'woff': return 'woff';
      case 'woff2': return 'woff2';
      default: return 'truetype';
    }
  };

  const detectWeight = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes('thin')) return '100';
    if (lower.includes('extralight') || lower.includes('ultralight')) return '200';
    if (lower.includes('light')) return '300';
    if (lower.includes('medium')) return '500';
    if (lower.includes('semibold') || lower.includes('demibold')) return '600';
    if (lower.includes('extrabold')) return '800';
    if (lower.includes('bold')) return '700';
    if (lower.includes('black') || lower.includes('heavy')) return '900';
    if (lower.includes('regular') || lower.includes('normal')) return '400';
    return '400';
  };

  const detectItalic = (filename: string): boolean => {
    return filename.toLowerCase().includes('italic');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setImportError(null);

    try {
      for (const file of Array.from(files)) {
        // Validar tipo
        const validTypes = ['font/ttf', 'font/otf', 'application/font-woff', 'application/font-woff2', 'font/woff', 'font/woff2'];
        const validExts = ['.ttf', '.otf', '.woff', '.woff2'];
        const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');

        if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
          throw new Error(`Arquivo "${file.name}" não é uma fonte válida (TTF, OTF, WOFF, WOFF2).`);
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        // Inferir nome da família removendo sufixos comuns
        let family = file.name
          .replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/, '')
          .replace(/[-_](regular|bold|light|medium|semibold|extrabold|black|thin|italic|variable)$/i, '')
          .replace(/[-_]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const weight = detectWeight(file.name);
        const italic = detectItalic(file.name);

        onAddFont({
          family,
          base64,
          format: detectFormat(file.name),
          weight,
          italic,
        });
      }
    } catch (err: any) {
      setImportError(err.message || 'Erro ao importar a fonte.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0d0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Type size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Biblioteca de Fontes Locais</h2>
              <p className="text-sm text-gray-400">
                Importe fontes do seu PC para usar nos designs (TTF, OTF, WOFF, WOFF2).
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

        {/* BLOCO 1: IMPORTAÇÃO AUTOMÁTICA DAS FONTES DO WINDOWS */}
        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-brand-500/10 to-emerald-500/5 border border-brand-500/20 space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-brand-400" />
            <h3 className="text-sm font-bold text-white">Importar Fontes do Windows Automaticamente</h3>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Lê direto da pasta de fontes instaladas do seu sistema operacional e importa tudo em segundos.
          </p>

          {/* Campo opcional para customizar o caminho */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
              Caminho da pasta de fontes (padrão: C:\Windows\Fonts)
            </label>
            <input
              type="text"
              value={customFontPath}
              onChange={(e) => setCustomFontPath(e.target.value)}
              placeholder="C:\Windows\Fonts"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:border-brand-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleImportSystemFonts}
            disabled={isImportingSystem}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-500 to-emerald-400 text-dark-900 hover:opacity-95 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            {isImportingSystem ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Importando Fontes do Sistema...
              </>
            ) : (
              <>
                <Download size={16} /> Importar Fontes do Windows
              </>
            )}
          </button>

          {/* Progresso */}
          {isImportingSystem && systemProgress && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold">
                <span>{systemProgress.current} / {systemProgress.total} fontes</span>
                <span>{systemProgress.total > 0 ? Math.round((systemProgress.current / systemProgress.total) * 100) : 0}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all"
                  style={{
                    width: `${systemProgress.total > 0 ? (systemProgress.current / systemProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {systemSourceDir && !isImportingSystem && (
            <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
              <Check size={13} /> Importadas de: <span className="font-mono text-gray-300">{systemSourceDir}</span>
            </p>
          )}

          {systemError && (
            <p className="text-xs text-red-400 font-medium flex items-start gap-1.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {systemError}
            </p>
          )}
        </div>

        {/* BLOCO 2: SELEÇÃO MANUAL DE ARQUIVOS */}
        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all disabled:opacity-50"
          >
            <Upload size={14} />
            {isImporting ? 'Importando...' : 'Ou selecione arquivos individuais'}
          </button>
          {importError && (
            <p className="text-xs text-red-400 mt-2 font-medium">{importError}</p>
          )}
        </div>

        {/* Lista de Fontes Locais */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Monitor size={14} /> Fontes Importadas ({localFonts.length})
            </h3>
          </div>

          {/* Campo de busca */}
          {localFonts.length > 0 && (
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={fontSearch}
                onChange={(e) => setFontSearch(e.target.value)}
                placeholder="Buscar fonte por nome..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}

          {localFonts.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02]">
              <Type size={32} className="text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-medium">Nenhuma fonte local importada ainda.</p>
              <p className="text-xs text-gray-500 mt-1">
                Clique em "Importar Fontes do Windows" acima para carregar todas de uma vez.
              </p>
            </div>
          ) : filteredFonts.length === 0 ? (
            <p className="text-xs text-gray-500 italic text-center py-6">
              Nenhuma fonte corresponde a "{fontSearch}".
            </p>
          ) : (
            <div className="space-y-2">
              {filteredFonts.map((font) => {
                const isActive = activeFont === font.family;
                return (
                  <div
                    key={`${font.family}-${font.weight}-${font.italic}`}
                    onClick={() => onSelectFont(font.family)}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isActive
                        ? 'border-brand-500/50 bg-brand-500/10 shadow-lg'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {font.family}{' '}
                        <span className="text-[10px] text-gray-500 font-mono ml-1">
                          ({font.weight}{font.italic ? 'i' : ''})
                        </span>
                      </p>
                      <p
                        className="text-lg text-white/80 mt-1 truncate"
                        style={{
                          fontFamily: `'${font.family}', sans-serif`,
                          fontWeight: font.weight,
                          fontStyle: font.italic ? 'italic' : 'normal',
                        }}
                      >
                        Aa Bb Cc - 123
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isActive && <Check size={16} className="text-brand-400" />}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFont(font.family);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Remover esta fonte"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-brand-500 text-dark-900 hover:bg-brand-400 transition-all shadow-lg"
          >
            Pronto
          </button>
        </div>
      </div>
    </div>
  );
};
