import { useState, useEffect, useCallback } from 'react';
import { SavedProject } from '@/types';

const STORAGE_KEY = 'saved_projects';

export function useProjects() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar projetos salvos do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setProjects(parsed);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar projetos salvos:', e);
    }
    setIsLoaded(true);
  }, []);

  // Salvar lista no localStorage sempre que mudar
  const persist = useCallback((newProjects: SavedProject[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
      setProjects(newProjects);
    } catch (e: any) {
      // QuotaExceededError ou similar
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
        alert(
          'Limite de armazenamento atingido. O localStorage do navegador não cabe todos os projetos com imagens. Remova alguns projetos antigos ou exporte um backup e importe em outro navegador.'
        );
      } else {
        console.error('Erro ao salvar projetos:', e);
        alert('Erro ao salvar projeto. Tente remover projetos antigos.');
      }
    }
  }, []);

  // Adicionar/atualizar projeto
  const saveProject = useCallback(
    (project: SavedProject) => {
      const newProjects = [...projects];
      const existingIndex = newProjects.findIndex((p) => p.id === project.id);
      if (existingIndex >= 0) {
        newProjects[existingIndex] = { ...project, updatedAt: new Date().toISOString() };
      } else {
        newProjects.push(project);
      }
      persist(newProjects);
    },
    [projects, persist]
  );

  // Excluir projeto
  const deleteProject = useCallback(
    (id: string) => {
      persist(projects.filter((p) => p.id !== id));
    },
    [projects, persist]
  );

  // Duplicar projeto
  const duplicateProject = useCallback(
    (id: string) => {
      const original = projects.find((p) => p.id === id);
      if (!original) return;
      const copy: SavedProject = {
        ...original,
        id: `${original.id}-copy-${Date.now()}`,
        name: `${original.name} (cópia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persist([copy, ...projects]);
    },
    [projects, persist]
  );

  // Importar lista de projetos (merge com existentes, evita duplicar por id)
  const importProjects = useCallback(
    (newOnes: SavedProject[]) => {
      const existingIds = new Set(projects.map((p) => p.id));
      const merged = [...projects];
      let imported = 0;
      for (const p of newOnes) {
        if (!existingIds.has(p.id)) {
          merged.unshift(p);
          imported++;
        }
      }
      persist(merged);
      alert(`${imported} projeto(s) importado(s) com sucesso!`);
    },
    [projects, persist]
  );

  // Atualizar dados de um projeto sem mudar updatedAt
  const updateProjectData = useCallback(
    (id: string, dataUpdate: Partial<SavedProject>) => {
      const newProjects = projects.map((p) =>
        p.id === id ? { ...p, ...dataUpdate, updatedAt: new Date().toISOString() } : p
      );
      persist(newProjects);
    },
    [projects, persist]
  );

  return {
    projects,
    isLoaded,
    saveProject,
    deleteProject,
    duplicateProject,
    importProjects,
    updateProjectData,
  };
}
