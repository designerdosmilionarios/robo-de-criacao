// Wrapper de IndexedDB com fallback para localStorage.
// Resolve o problema de limite de 5MB do localStorage (IndexedDB tem 50MB-1GB).

const DB_NAME = 'robo-studio-db';
const DB_VERSION = 1;
const STORE_FONTS = 'local-fonts';
const STORE_PROJECTS = 'saved-projects';

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      reject(new Error('IndexedDB nao suportado neste navegador.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FONTS)) {
        db.createObjectStore(STORE_FONTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbClear(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// =============================
// API PUBLICA: FONTES LOCAIS
// =============================

export interface StoredFont {
  id: string; // family + weight + italic (gerado)
  family: string;
  base64: string;
  format: string;
  weight?: string;
  italic?: boolean;
  createdAt: string;
}

function fontId(family: string, weight?: string, italic?: boolean): string {
  return `${family}-${weight || '400'}-${italic ? 'i' : 'n'}`;
}

const FONT_KEY_PREFIX = 'local-fonts:';

export async function loadFontsFromDB(): Promise<StoredFont[]> {
  try {
    return await idbGetAll<StoredFont>(STORE_FONTS);
  } catch (e) {
    // Fallback: tenta ler do localStorage antigo
    try {
      const raw = localStorage.getItem('local_fonts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export async function saveFontToDB(font: Omit<StoredFont, 'id' | 'createdAt'>): Promise<void> {
  const stored: StoredFont = {
    ...font,
    id: fontId(font.family, font.weight, font.italic),
    createdAt: new Date().toISOString(),
  };
  try {
    await idbPut(STORE_FONTS, stored);
    // Tambem espelha em localStorage como backup secundario (somente metadata)
    try {
      const meta = { family: stored.family, format: stored.format, weight: stored.weight, italic: stored.italic };
      localStorage.setItem(`${FONT_KEY_PREFIX}meta:${stored.id}`, JSON.stringify(meta));
    } catch {
      // Ignora se localStorage encher (metadata eh pequena, mas pode falhar em casos extremos)
    }
  } catch (e) {
    throw new Error(`Erro ao salvar fonte no IndexedDB: ${(e as Error).message}`);
  }
}

export async function deleteFontFromDB(family: string, weight?: string, italic?: boolean): Promise<void> {
  const id = fontId(family, weight, italic);
  try {
    await idbDelete(STORE_FONTS, id);
  } catch (e) {
    console.warn('Falha ao deletar do IndexedDB:', e);
  }
  // Tambem remove TODAS as variacoes dessa familia
  try {
    const all = await idbGetAll<StoredFont>(STORE_FONTS);
    const toDelete = all.filter((f) => f.family === family);
    for (const f of toDelete) {
      await idbDelete(STORE_FONTS, f.id).catch(() => {});
    }
  } catch {
    // ignora
  }
}

export async function clearAllFontsFromDB(): Promise<void> {
  try {
    await idbClear(STORE_FONTS);
  } catch (e) {
    console.warn('Falha ao limpar IndexedDB:', e);
  }
}

// Migra fontes do localStorage antigo (pre-IndexedDB) para IndexedDB
export async function migrateFontsFromLocalStorage(): Promise<number> {
  try {
    const raw = localStorage.getItem('local_fonts');
    if (!raw) return 0;
    const fonts: any[] = JSON.parse(raw);
    if (!Array.isArray(fonts)) return 0;

    let migrated = 0;
    for (const f of fonts) {
      if (!f || !f.family || !f.base64) continue;
      try {
        await saveFontToDB({
          family: f.family,
          base64: f.base64,
          format: f.format || 'truetype',
          weight: f.weight || '400',
          italic: !!f.italic,
        });
        migrated++;
      } catch (e) {
        console.warn('Falha ao migrar fonte', f.family, e);
      }
    }
    if (migrated > 0) {
      // Limpa o localStorage antigo para liberar espaco
      try {
        localStorage.removeItem('local_fonts');
      } catch {}
    }
    return migrated;
  } catch {
    return 0;
  }
}

// =============================
// ESTATISTICAS DE USO
// =============================

export async function getStorageStats(): Promise<{ fontCount: number; totalBytes: number; estimatedLimitMB: number }> {
  try {
    const fonts = await idbGetAll<StoredFont>(STORE_FONTS);
    const totalBytes = fonts.reduce((sum, f) => sum + (f.base64?.length || 0) * 0.75, 0);
    return {
      fontCount: fonts.length,
      totalBytes,
      estimatedLimitMB: 50, // Chrome tipicamente permite ate ~60MB por origem
    };
  } catch {
    return { fontCount: 0, totalBytes: 0, estimatedLimitMB: 50 };
  }
}
