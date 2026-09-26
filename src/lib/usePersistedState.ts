import { useEffect, useState, useRef } from 'react';

// Hook para persistir estado automaticamente no localStorage.
// Quando o componente monta, le do localStorage.
// Quando o estado muda, salva no localStorage.
// Tem debounce para nao salvar a cada caractere digitado.

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  debounceMs = 500
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Use o mesmo valor no servidor e na primeira renderização do navegador.
  // O conteúdo persistido é carregado depois da hidratação para evitar diferenças
  // entre o HTML inicial do Next.js e o React no cliente.
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`studio_${key}`);
      if (saved) {
        setState(JSON.parse(saved) as T);
      }
    } catch (e) {
      console.warn(`Erro ao carregar ${key} do localStorage:`, e);
    } finally {
      setIsHydrated(true);
    }
  }, [key]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isHydrated) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`studio_${key}`, JSON.stringify(state));
      } catch (e) {
        console.warn(`Erro ao salvar ${key} no localStorage:`, e);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [key, state, debounceMs, isHydrated]);

  return [state, setState];
}

// Limpa uma chave especifica do localStorage
export function clearPersistedState(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`studio_${key}`);
}

// Limpa tudo (usado para "resetar tudo")
export function clearAllPersistedState() {
  if (typeof window === 'undefined') return;
  const prefix = 'studio_';
  const keys = Object.keys(localStorage);
  for (const k of keys) {
    if (k.startsWith(prefix)) localStorage.removeItem(k);
  }
}
