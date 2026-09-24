import { useState, useEffect, useCallback } from 'react';
import { LocalFont } from '@/types';
import {
  loadFontsFromDB,
  saveFontToDB,
  deleteFontFromDB,
  clearAllFontsFromDB,
  migrateFontsFromLocalStorage,
  getStorageStats,
} from '@/lib/storage';

export function useLocalFonts() {
  const [fonts, setFonts] = useState<LocalFont[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [migratedCount, setMigratedCount] = useState(0);
  const [storageStats, setStorageStats] = useState({ fontCount: 0, totalBytes: 0, estimatedLimitMB: 50 });

  // Carregar fontes do IndexedDB ao montar (com migracao do localStorage)
  useEffect(() => {
    (async () => {
      try {
        // 1) Migra fontes antigas do localStorage (se existirem)
        const migrated = await migrateFontsFromLocalStorage();
        setMigratedCount(migrated);

        // 2) Carrega fontes do IndexedDB
        const stored = await loadFontsFromDB();
        const mapped: LocalFont[] = stored.map((s) => ({
          family: s.family,
          base64: s.base64,
          format: s.format,
          weight: s.weight,
          italic: s.italic,
        }));
        setFonts(mapped);
        const stats = await getStorageStats();
        setStorageStats(stats);
      } catch (e) {
        console.error('Erro ao carregar fontes:', e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Adicionar fonte
  const addFont = useCallback(async (font: LocalFont) => {
    try {
      await saveFontToDB({
        family: font.family,
        base64: font.base64,
        format: font.format,
        weight: font.weight || '400',
        italic: !!font.italic,
      });
      // Atualiza estado local
      setFonts((prev) => {
        const filtered = prev.filter(
          (f) => !(f.family === font.family && (f.weight || '400') === (font.weight || '400') && !!f.italic === !!font.italic)
        );
        return [...filtered, font];
      });
      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError' || e?.message?.includes('quota') || e?.message?.includes('Quota')) {
        throw new Error('Limite de armazenamento atingido mesmo no IndexedDB. Remova algumas fontes para liberar espaço.');
      }
      throw e;
    }
  }, []);

  // Remover fonte por familia
  const removeFont = useCallback(async (family: string) => {
    await deleteFontFromDB(family);
    setFonts((prev) => prev.filter((f) => f.family !== family));
    const stats = await getStorageStats();
    setStorageStats(stats);
  }, []);

  // Limpar tudo
  const clearAllFonts = useCallback(async () => {
    await clearAllFontsFromDB();
    setFonts([]);
    const stats = await getStorageStats();
    setStorageStats(stats);
  }, []);

  return {
    fonts,
    isLoaded,
    addFont,
    removeFont,
    clearAllFonts,
    storageStats,
    migratedCount,
  };
}
