'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, X, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import { createProjectAction } from '@/app/actions/pipeline'

type Project = {
  id: string
  name: string
  description: string | null
  stage: string
  value: number | null
  start_date: string | null
  end_date: string | null
  created_at: string
  client: { id: string; full_name: string; email: string } | null
  responsible: { id: string; full_name: string } | null
}

type Client = { id: string; full_name: string; email: string }
type Member = { id: string; full_name: string }
type ProjectStage = { id: string; name: string; order: number; color: string }

interface ProjectsClientProps {
  projects: Project[]
  clients: Client[]
  members: Member[]
  projectStages: ProjectStage[]
  projectsPageHref: string
}

const STAGE_COLORS: Record<string, string> = {
  'A Fazer':       '#3B82F6',
  'Em Andamento':  '#F59E0B',
  'Em Revisão':    '#8B5CF6',
  'Concluído':     '#22C55E',
}

export function ProjectsClient({ projects, clients, members, projectStages, projectsPageHref }: ProjectsClientProps) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)

  const [clientId, setClientId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stage, setStage] = useState(projectStages[0]?.name ?? 'A Fazer')
  const [responsibleId, setResponsibleId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !name.trim()) return
    startTransition(async () => {
      try {
        await createProjectAction({
          client_id: clientId,
          name,
          description: description || undefined,
          stage,
          responsible_id: responsibleId || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          value: value ? parseFloat(value) : undefined,
        })
        toast.success('Projeto criado!')
        setShowForm(false)
        setName('')
        setDescription('')
        setClientId('')
        setResponsibleId('')
        setStartDate('')
        setEndDate('')
        setValue('')
        window.location.reload()
      } catch {
        toast.error('Erro ao criar projeto')
      }
    })
  }

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Projeto
        </button>
      </div>

      {/* Project List */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-white/20" />
          </div>
          <p className="text-white/40 text-sm">Nenhum projeto criado ainda.</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#222]">
                <th className="text-left text-[#888] font-medium px-4 py-3">Projeto</th>
                <th className="text-left text-[#888] font-medium px-4 py-3 hidden md:table-cell">Cliente</th>
                <th className="text-left text-[#888] font-medium px-4 py-3 hidden lg:table-cell">Responsável</th>
                <th className="text-left text-[#888] font-medium px-4 py-3">Estágio</th>
                <th className="text-left text-[#888] font-medium px-4 py-3 hidden lg:table-cell">Valor</th>
                <th className="text-left text-[#888] font-medium px-4 py-3 hidden xl:table-cell">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const stageColor = STAGE_COLORS[project.stage] ?? '#6B7280'
                return (
                  <tr key={project.id} className="border-b border-[#1a1a1a] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`${projectsPageHref}/${project.id}`} className="text-white hover:text-[#EACE00] font-medium transition-colors">
                        {project.name}
                      </Link>
                      {project.description && (
                        <p className="text-[#555] text-xs mt-0.5 line-clamp-1">{project.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-white/70">{project.client?.full_name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-white/70">{project.responsible?.full_name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ background: stageColor + '22', color: stageColor }}
                      >
                        {project.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-[#EACE00] font-semibold">
                        {project.value != null ? fmtCurrency(project.value) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-white/40 text-xs">
                      {project.end_date ? fmtDate(project.end_date) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Project Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div
            className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base">Novo Projeto</h3>
              <button onClick={() => setShowForm(false)} className="text-[#888] hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[#888] text-xs mb-1 block">Cliente *</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
                >
                  <option value="">Selecionar cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[#888] text-xs mb-1 block">Nome do Projeto *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
                />
              </div>
              <div>
                <label className="text-[#888] text-xs mb-1 block">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#888] text-xs mb-1 block">Estágio</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                  >
                    {projectStages.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[#888] text-xs mb-1 block">Responsável</label>
                  <select
                    value={responsibleId}
                    onChange={(e) => setResponsibleId(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                  >
                    <option value="">Nenhum</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#888] text-xs mb-1 block">Início</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#888] text-xs mb-1 block">Término</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[#888] text-xs mb-1 block">Valor (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-[#333] text-[#888] rounded-xl text-sm hover:border-[#555] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 bg-[#EACE00] text-black font-semibold rounded-xl text-sm hover:bg-[#f5d800] transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Criando...' : 'Criar Projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
