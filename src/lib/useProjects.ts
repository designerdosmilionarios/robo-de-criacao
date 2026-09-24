import { useState, useEffect, useCallback } from 'react';
import { SavedProject } from '@/types';
import { loadProjectsFromDB, migrateProjectsFromLocalStorage, saveProjectsToDB } from '@/lib/storage';

export function useProjects() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar projetos salvos do IndexedDB e migrar a versão antiga.
  useEffect(() => {
    (async () => {
      try {
        await migrateProjectsFromLocalStorage();
        setProjects(await loadProjectsFromDB());
      } catch (e) {
        console.error('Erro ao carregar projetos salvos:', e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (newProjects: SavedProject[]): Promise<boolean> => {
    try {
      await saveProjectsToDB(newProjects);
      setProjects(newProjects);
      return true;
    } catch (e: any) {
      // QuotaExceededError ou similar
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
        alert(
          'Limite de armazenamento atingido. Exporte um backup e remova projetos antigos antes de tentar novamente.'
        );
      } else {
        console.error('Erro ao salvar projetos:', e);
        alert('Erro ao salvar projeto. Tente remover projetos antigos.');
      }
      return false;
    }
  }, []);

  // Adicionar/atualizar projeto
  const saveProject = useCallback(
    async (project: SavedProject) => {
      const newProjects = [...projects];
      const existingIndex = newProjects.findIndex((p) => p.id === project.id);
      if (existingIndex >= 0) {
        newProjects[existingIndex] = { ...project, updatedAt: new Date().toISOString() };
      } else {
        newProjects.push(project);
      }
      return persist(newProjects);
    },
    [projects, persist]
  );

  // Excluir projeto
  const deleteProject = useCallback(
    async (id: string) => {
      return persist(projects.filter((p) => p.id !== id));
    },
    [projects, persist]
  );

  // Duplicar projeto
  const duplicateProject = useCallback(
    async (id: string) => {
      const original = projects.find((p) => p.id === id);
      if (!original) return;
      const copy: SavedProject = {
        ...original,
        id: `${original.id}-copy-${Date.now()}`,
        name: `${original.name} (cópia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return persist([copy, ...projects]);
    },
    [projects, persist]
  );

  // Importar lista de projetos (merge com existentes, evita duplicar por id)
  const importProjects = useCallback(
    async (newOnes: SavedProject[]) => {
      const existingIds = new Set(projects.map((p) => p.id));
      const merged = [...projects];
      let imported = 0;
      for (const p of newOnes) {
        if (!existingIds.has(p.id)) {
          merged.unshift(p);
          imported++;
        }
      }
      if (await persist(merged)) alert(`${imported} projeto(s) importado(s) com sucesso!`);
    },
    [projects, persist]
  );

  // Atualizar dados de um projeto sem mudar updatedAt
  const updateProjectData = useCallback(
    async (id: string, dataUpdate: Partial<SavedProject>) => {
      const newProjects = projects.map((p) =>
        p.id === id ? { ...p, ...dataUpdate, updatedAt: new Date().toISOString() } : p
      );
      return persist(newProjects);
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
