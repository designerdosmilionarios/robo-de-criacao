import React, { useState, useRef, useMemo } from 'react';
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
  AlertTriangle,
  Info,
  X,
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
  storageStats?: {
    fontCount: number;
    totalBytes: number;
    estimatedLimitMB: number;
    remainingMB: number;
    usedPercent: number;
  };
}

// Estima o tamanho de cada fonte em KB (base64 inflates ~33%)
const estimateSize = (b64: string) => Math.round((b64.length * 0.75) / 1024);
const bytesToMB = (b: number) => (b / (1024 * 1024)).toFixed(1);

export const FontManager: React.FC<FontManagerProps> = ({
  isOpen,
  onClose,
  localFonts,
  onAddFont,
  onRemoveFont,
  activeFont,
  onSelectFont,
  storageStats,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ESTADO DO UPLOAD MANUAL
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importLog, setImportLog] = useState<string[]>([]);

  // ESTADO DA IMPORTAÇÃO DO WINDOWS
  const [isImportingSystem, setIsImportingSystem] = useState(false);
  const [systemProgress, setSystemProgress] = useState<{ current: number; total: number } | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [systemSourceDir, setSystemSourceDir] = useState<string | null>(null);
  const [systemSkipped, setSystemSkipped] = useState(0);
  const [customFontPath, setCustomFontPath] = useState<string>('C:\\Windows\\Fonts');

  // ESTADO DE BUSCA
  const [fontSearch, setFontSearch] = useState('');

  // ESTATÍSTICAS - usa storageStats real (IndexedDB) se disponivel, senao calcula local
  const stats = useMemo(() => {
    if (storageStats) {
      return {
        usedMB: storageStats.totalBytes / (1024 * 1024),
        limitMB: storageStats.estimatedLimitMB,
        remainingMB: storageStats.remainingMB,
        usedPercent: storageStats.usedPercent,
      };
    }
    // Fallback (caso nao passe storageStats)
    const totalBytes = localFonts.reduce((sum, f) => sum + (f.base64?.length || 0) * 0.75, 0);
    const usedMB = totalBytes / (1024 * 1024);
    return {
      usedMB,
      limitMB: 200,
      remainingMB: Math.max(0, 200 - usedMB),
      usedPercent: Math.min(100, Math.round((usedMB / 200) * 100)),
    };
  }, [localFonts, storageStats]);

  // Detecção automática do tamanho da fonte importada
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

  const inferFamily = (filename: string): string => {
    return filename
      .replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/, '')
      .replace(/[-_](regular|bold|light|medium|semibold|extrabold|black|thin|italic|variable|book|heavy|demibold|extralight|ultralight)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // ====== UPLOAD MANUAL DE ARQUIVOS ======
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setImportError(null);
    setImportLog([]);

    let successCount = 0;
    let errorCount = 0;

    try {
      for (const file of Array.from(files)) {
        // Validar tipo
        const validTypes = ['font/ttf', 'font/otf', 'application/font-woff', 'application/font-woff2', 'font/woff', 'font/woff2', ''];
        const validExts = ['.ttf', '.otf', '.woff', '.woff2'];
        const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');

        if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
          const msg = `❌ ${file.name}: formato não suportado (esperado TTF, OTF, WOFF ou WOFF2)`;
          setImportLog((prev) => [...prev, msg]);
          errorCount++;
          continue;
        }

        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });

          const family = inferFamily(file.name);
          const weight = detectWeight(file.name);
          const italic = detectItalic(file.name);
          const format = detectFormat(file.name);

          if (!family) {
            const msg = `⚠️ ${file.name}: não foi possível detectar o nome da família`;
            setImportLog((prev) => [...prev, msg]);
            errorCount++;
            continue;
          }

          // Verificar duplicata (mesmo family+weight+italic)
          const isDuplicate = localFonts.some(
            (f) => f.family === family && f.weight === weight && f.italic === italic
          );
          if (isDuplicate) {
            const msg = `⏭️ ${family} (${weight}${italic ? 'i' : ''}): já existe, pulando`;
            setImportLog((prev) => [...prev, msg]);
            continue;
          }

          onAddFont({ family, base64, format, weight, italic });
          const msg = `✅ ${family} (${weight}${italic ? ' italic' : ''}) - ${estimateSize(base64)}KB`;
          setImportLog((prev) => [...prev, msg]);
          successCount++;
        } catch (err: any) {
          const msg = `❌ ${file.name}: ${err.message || 'erro ao ler arquivo'}`;
          setImportLog((prev) => [...prev, msg]);
          errorCount++;
        }
      }

      if (errorCount > 0 && successCount === 0) {
        setImportError(`Nenhuma fonte foi importada. ${errorCount} erro(s). Veja o log abaixo.`);
      } else if (errorCount > 0) {
        setImportError(`${successCount} fonte(s) importada(s) com sucesso, mas ${errorCount} falharam.`);
      }
    } catch (err: any) {
      setImportError(err.message || 'Erro inesperado ao importar.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ====== IMPORTAÇÃO DO WINDOWS (C:\Windows\Fonts) ======
  const handleImportSystemFonts = async () => {
    setIsImportingSystem(true);
    setSystemError(null);
    setSystemProgress({ current: 0, total: 0 });
    setSystemSourceDir(null);
    setSystemSkipped(0);

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
      const total = fonts.length;
      setSystemProgress({ current: 0, total });

      let imported = 0;
      let skipped = 0;
      let quotaError = false;

      for (let i = 0; i < fonts.length; i++) {
        const f = fonts[i];
        if (!f.family) {
          skipped++;
          setSystemSkipped(skipped);
          setSystemProgress({ current: i + 1, total });
          continue;
        }

        // Pular duplicatas
        const isDuplicate = localFonts.some(
          (lf) => lf.family === f.family && lf.weight === f.weight && lf.italic === f.italic
        );
        if (isDuplicate) {
          skipped++;
          setSystemSkipped(skipped);
          setSystemProgress({ current: i + 1, total });
          continue;
        }

        try {
          onAddFont({
            family: f.family,
            base64: f.base64,
            format: f.format,
            weight: f.weight,
            italic: f.italic,
          });
          imported++;
        } catch (e: any) {
          if (e?.name === 'QuotaExceededError' || e?.message?.includes('quota')) {
            quotaError = true;
            setSystemError(
              `Limite de armazenamento atingido após ${imported} fontes. Remova algumas e tente novamente.`
            );
            break;
          }
          skipped++;
          setSystemSkipped(skipped);
        }
        setSystemProgress({ current: i + 1, total });
      }

      if (!quotaError && imported > 0) {
        // Sucesso - mensagem informativa
        setSystemError(null);
      }
    } catch (err: any) {
      setSystemError(err.message || 'Erro ao importar fontes do sistema.');
    } finally {
      setIsImportingSystem(false);
    }
  };

  const filteredFonts = localFonts.filter((f) =>
    f.family.toLowerCase().includes(fontSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0d0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Type size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Biblioteca de Fontes Locais</h2>
              <p className="text-sm text-gray-400">
                Importe fontes do seu PC para usar nos designs.
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

        {/* ESTATÍSTICAS DE USO - IndexedDB */}
        <div className="mb-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              💾 Armazenamento (IndexedDB)
            </span>
            <span className="text-[11px] font-mono font-bold text-white">
              {stats.usedMB.toFixed(1)} MB / ~{stats.limitMB} MB ({stats.usedPercent}%)
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                stats.usedPercent > 80 ? 'bg-red-500' :
                stats.usedPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${stats.usedPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1.5">
            {localFonts.length} {localFonts.length === 1 ? 'fonte importada' : 'fontes importadas'}.
            {' '}Restam <strong className="text-emerald-400">~{stats.remainingMB.toFixed(0)} MB</strong> disponíveis.
          </p>
        </div>

        {/* BLOCO 1: IMPORTAÇÃO AUTOMÁTICA DO WINDOWS */}
        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-brand-500/10 to-emerald-500/5 border border-brand-500/20 space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-brand-400" />
            <h3 className="text-sm font-bold text-white">Importar Fontes do Windows</h3>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Lê direto da pasta de fontes instaladas do seu sistema operacional e importa tudo em segundos.
          </p>

          {/* Campo para customizar o caminho */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
              Caminho da pasta (padrão: C:\Windows\Fonts)
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
                <Loader2 size={16} className="animate-spin" /> Importando...
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
                <span>
                  {systemProgress.current} / {systemProgress.total} fontes
                  {systemSkipped > 0 && ` (${systemSkipped} puladas)`}
                </span>
                <span>
                  {systemProgress.total > 0
                    ? Math.round((systemProgress.current / systemProgress.total) * 100)
                    : 0}
                  %
                </span>
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
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5">
                <Check size={13} /> Importação concluída de: <span className="font-mono text-gray-300">{systemSourceDir}</span>
              </p>
            </div>
          )}

          {systemError && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-300 font-medium flex items-start gap-1.5">
                <AlertCircle size={13} className="mt-0.5 shrink-0" /> {systemError}
              </p>
            </div>
          )}
        </div>

        {/* BLOCO 2: UPLOAD MANUAL */}
        <div className="mb-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-gray-400" />
            <h3 className="text-sm font-bold text-white">Upload Manual de Arquivos</h3>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,application/font-woff,application/font-woff2"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all disabled:opacity-50"
          >
            <Upload size={14} />
            {isImporting ? 'Importando...' : 'Selecionar Arquivos de Fonte do Computador'}
          </button>
          <p className="text-[10px] text-gray-500">
            💡 Dica: pode selecionar várias fontes de uma vez (Ctrl+Click no Windows).
          </p>

          {/* Log do upload manual */}
          {importLog.length > 0 && (
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  📋 Log da Importação
                </p>
                <button
                  onClick={() => setImportLog([])}
                  className="text-[10px] text-gray-500 hover:text-white"
                >
                  Limpar
                </button>
              </div>
              <div className="space-y-0.5 font-mono text-[10px]">
                {importLog.map((line, i) => (
                  <p
                    key={i}
                    className={
                      line.startsWith('✅') ? 'text-emerald-400' :
                      line.startsWith('❌') ? 'text-red-400' :
                      line.startsWith('⏭️') ? 'text-gray-500' :
                      'text-amber-400'
                    }
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          {importError && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-300 font-medium">{importError}</p>
            </div>
          )}
        </div>

        {/* BLOCO 3: DICAS DE SOLUÇÃO DE PROBLEMAS */}
        <details className="mb-4 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <summary className="text-[11px] font-bold text-amber-300 uppercase tracking-wider cursor-pointer flex items-center gap-1.5">
            <Info size={12} /> Problemas comuns e soluções
          </summary>
          <div className="mt-2 space-y-2 text-[11px] text-gray-300">
            <p>
              <strong className="text-amber-300">❓ "Não aparece nenhuma fonte depois de importar":</strong>
              <br />
              → Verifique se clicou em <em>"Pronto"</em> para fechar o gerenciador.
              <br />
              → Recarregue a página (Ctrl+F5) para o @font-face ser aplicado.
            </p>
            <p>
              <strong className="text-amber-300">❓ "Limite de armazenamento atingido":</strong>
              <br />
              → Cada fonte TTF ocupa entre 100KB e 2MB. O navegador limita a ~5MB.
              <br />
              → Remova fontes antigas (lixeira ao lado) ou importe apenas as que for usar.
            </p>
            <p>
              <strong className="text-amber-300">❓ "Arquivo não é uma fonte válida":</strong>
              <br />
              → Formatos suportados: <code className="bg-white/10 px-1 rounded">.ttf</code>,{' '}
              <code className="bg-white/10 px-1 rounded">.otf</code>,{' '}
              <code className="bg-white/10 px-1 rounded">.woff</code>,{' '}
              <code className="bg-white/10 px-1 rounded">.woff2</code>.
              <br />
              → Não suportamos: <code className="bg-white/10 px-1 rounded">.eot</code>, <code className="bg-white/10 px-1 rounded">.svg</code> ou fontes em ZIP.
            </p>
            <p>
              <strong className="text-amber-300">❓ "Importar do Windows não funciona":</strong>
              <br />
              → Esse botão só funciona <strong>no seu PC local</strong> (não na Vercel).
              <br />
              → Para hospedagem (Vercel), use o <strong>Upload Manual</strong>.
            </p>
          </div>
        </details>

        {/* LISTA DE FONTES IMPORTADAS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Monitor size={14} /> Fontes Importadas ({localFonts.length})
            </h3>
          </div>

          {/* Busca */}
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
                Use o <strong>Upload Manual</strong> acima para subir arquivos .TTF, .OTF, .WOFF ou .WOFF2 do seu PC.
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
                const sizeKB = estimateSize(font.base64);
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
                      <p className="text-[10px] text-gray-500 mt-0.5">{sizeKB} KB • {font.format.toUpperCase()}</p>
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
