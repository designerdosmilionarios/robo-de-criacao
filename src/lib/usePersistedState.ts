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
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const saved = localStorage.getItem(`studio_${key}`);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch (e) {
      console.warn(`Erro ao carregar ${key} do localStorage:`, e);
    }
    return defaultValue;
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
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
  }, [key, state, debounceMs]);

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
