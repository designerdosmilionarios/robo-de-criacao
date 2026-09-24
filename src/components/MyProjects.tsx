import React, { useState, useRef, useMemo } from 'react';
import {
  FolderOpen,
  Trash2,
  Copy,
  Download,
  Upload,
  Search,
  Calendar,
  Layers,
  Image as ImageIcon,
  User,
  LayoutGrid,
  X,
  Plus,
  AlertCircle,
  Check,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { SavedProject, SavedProjectType } from '@/types';
import saveAs from 'file-saver';

interface MyProjectsProps {
  projects: SavedProject[];
  onLoadProject: (project: SavedProject) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onImportProjects: (projects: SavedProject[]) => void;
}

const TYPE_META: Record<SavedProjectType, { label: string; color: string; icon: any }> = {
  carousel: { label: 'Carrossel', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: Layers },
  'single-image': { label: 'Criativo Único', color: 'bg-brand-500/20 text-brand-300 border-brand-500/30', icon: ImageIcon },
  pose: { label: 'Pose / Pessoa', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30', icon: User },
  'batch-ads': { label: 'Lote Meta Ads', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: LayoutGrid },
};

export const MyProjects: React.FC<MyProjectsProps> = ({
  projects,
  onLoadProject,
  onDeleteProject,
  onDuplicateProject,
  onImportProjects,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<SavedProjectType | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return projects
      .filter((p) => {
        if (filterType !== 'all' && p.type !== filterType) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [projects, search, filterType]);

  // Exportar tudo (backup)
  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
    saveAs(blob, `robo-studio-projetos-${new Date().toISOString().slice(0, 10)}.json`);
  };

  // Importar de JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (Array.isArray(data)) {
          onImportProjects(data);
        } else {
          alert('Arquivo inválido. O backup precisa ser uma lista de projetos.');
        }
      } catch (err) {
        alert('Erro ao ler arquivo. Verifique se é um backup válido do Robô Studio.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      onDeleteProject(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  // Estatísticas rápidas
  const stats = useMemo(() => {
    return {
      total: projects.length,
      carousel: projects.filter((p) => p.type === 'carousel').length,
      single: projects.filter((p) => p.type === 'single-image').length,
      pose: projects.filter((p) => p.type === 'pose').length,
      batch: projects.filter((p) => p.type === 'batch-ads').length,
    };
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0e111a] border border-white/10 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <FolderOpen size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Meus Projetos Salvos</h2>
              <p className="text-sm text-gray-400">
                Tudo que você criou fica aqui. Abra, duplique ou exporte quando quiser.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportAll}
              disabled={projects.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all disabled:opacity-40"
              title="Fazer backup de todos os projetos"
            >
              <Download size={13} /> Backup JSON
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all"
              title="Importar backup de projetos"
            >
              <Upload size={13} /> Importar
            </button>
          </div>
        </div>

        {/* ESTATÍSTICAS */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Total</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{stats.total}</p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/10">
            <p className="text-[10px] text-purple-300 uppercase tracking-wider font-bold">Carrosséis</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{stats.carousel}</p>
          </div>
          <div className="p-3 rounded-2xl bg-brand-500/5 border border-brand-500/10">
            <p className="text-[10px] text-brand-300 uppercase tracking-wider font-bold">Criativos</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{stats.single}</p>
          </div>
          <div className="p-3 rounded-2xl bg-pink-500/5 border border-pink-500/10">
            <p className="text-[10px] text-pink-300 uppercase tracking-wider font-bold">Poses</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{stats.pose}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10">
            <p className="text-[10px] text-amber-300 uppercase tracking-wider font-bold">Lotes</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{stats.batch}</p>
          </div>
        </div>

        {/* FILTROS E BUSCA */}
        {projects.length > 0 && (
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            {/* Busca */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar projeto por nome..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-brand-500 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filtro por tipo */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 flex-wrap">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  filterType === 'all' ? 'bg-brand-500 text-dark-900' : 'text-gray-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              {(Object.keys(TYPE_META) as SavedProjectType[]).map((t) => {
                const meta = TYPE_META[t];
                const Icon = meta.icon;
                return (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      filterType === t ? 'bg-brand-500 text-dark-900' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon size={11} /> {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* LISTA DE PROJETOS */}
      {projects.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#0e111a] border-2 border-dashed border-white/10">
          <FolderOpen size={48} className="text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Nenhum projeto salvo ainda</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Crie um carrossel, criativo único ou pose. Ao terminar, clique em <strong className="text-brand-400">"💾 Salvar Projeto"</strong> para guardar aqui.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center rounded-3xl bg-[#0e111a] border border-white/10">
          <Search size={32} className="text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            Nenhum projeto encontrado com os filtros atuais.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((project) => {
            const meta = TYPE_META[project.type];
            const Icon = meta.icon;
            const isConfirmingDelete = confirmDeleteId === project.id;
            return (
              <div
                key={project.id}
                className="group rounded-2xl bg-[#0e111a] border border-white/10 overflow-hidden shadow-xl hover:border-brand-500/30 transition-all flex flex-col"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gradient-to-br from-dark-800 to-dark-900 overflow-hidden">
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon size={36} className="text-gray-600" />
                    </div>
                  )}
                  {/* Tag tipo */}
                  <div className="absolute top-2 left-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${meta.color}`}>
                      <Icon size={10} /> {meta.label}
                    </span>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-3.5 flex-1 flex flex-col">
                  <h4 className="text-sm font-bold text-white truncate mb-1">
                    {project.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-3">
                    <span className="truncate max-w-[100px]">{project.brandName}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Calendar size={9} />
                      {new Date(project.updatedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex items-center gap-1.5 mt-auto">
                    <button
                      onClick={() => onLoadProject(project)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-brand-500 text-dark-900 hover:bg-brand-400 transition-colors"
                    >
                      <FolderOpen size={11} /> Abrir
                    </button>
                    <button
                      onClick={() => onDuplicateProject(project.id)}
                      className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      title="Duplicar projeto"
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isConfirmingDelete
                          ? 'bg-red-500 text-white'
                          : 'text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10'
                      }`}
                      title={isConfirmingDelete ? 'Clique novamente para confirmar' : 'Excluir projeto'}
                    >
                      {isConfirmingDelete ? <Check size={11} /> : <Trash2 size={11} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
