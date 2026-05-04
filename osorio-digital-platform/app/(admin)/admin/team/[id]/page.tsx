import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft, Pencil, TrendingUp, Camera,
  CheckCircle2, Clock, Loader2 as Spinner, Trash2,
  AlertTriangle, ChevronRight, Plus,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toggleActiveAction, updateTaskStatusAction, deleteTaskAction } from './actions'
import { AddTaskForm } from './add-task-form'

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
  traffic_manager: { label: 'Gestor de Tráfego', icon: TrendingUp, classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  social_media:    { label: 'Social Media',       icon: Camera,     classes: 'bg-purple-500/15 text-purple-400 border-purple-500/25' },
}

const PRIORITY_CONFIG: Record<string, { label: string; classes: string }> = {
  baixa: { label: 'Baixa', classes: 'bg-white/8 text-white/40 border-white/10' },
  media: { label: 'Média', classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
  alta:  { label: 'Alta',  classes: 'bg-red-500/15 text-red-400 border-red-500/25' },
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; next: string; nextLabel: string; classes: string }> = {
  pendente:      { label: 'Pendente',      icon: Clock,         next: 'em_andamento', nextLabel: 'Iniciar',   classes: 'bg-white/8 text-white/50 border-white/10' },
  em_andamento:  { label: 'Em andamento',  icon: Spinner,       next: 'concluida',    nextLabel: 'Concluir',  classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  concluida:     { label: 'Concluída',     icon: CheckCircle2,  next: 'pendente',     nextLabel: 'Reabrir',   classes: 'bg-green-500/15 text-green-400 border-green-500/25' },
}

export default async function TeamMemberDetailPage({ params }: { params: { id: string } }) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  const [
    { data: member },
    { data: assignments },
    { data: tasks },
    { data: clients },
  ] = await Promise.all([
    adminSupabase
      .from('profiles')
      .select('id, full_name, email, role, active, created_at')
      .eq('id', params.id)
      .single(),
    adminSupabase
      .from('client_assignments')
      .select('client_id, role, clients(id, name)')
      .eq('user_id', params.id),
    adminSupabase
      .from('tasks')
      .select('id, title, description, due_date, due_time, priority, status, client_id, clients(name)')
      .eq('assigned_to', params.id)
      .order('status')
      .order('due_date', { ascending: true, nullsFirst: false }),
    adminSupabase
      .from('clients')
      .select('id, name')
      .eq('active', true)
      .order('name'),
  ])

  if (!member) notFound()

  const roleConf = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.traffic_manager
  const RoleIcon = roleConf.icon

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myClients = (assignments as any[])?.filter((a) => a.role === member.role) ?? []

  const tasksByStatus = {
    pendente:     tasks?.filter((t) => t.status === 'pendente')     ?? [],
    em_andamento: tasks?.filter((t) => t.status === 'em_andamento') ?? [],
    concluida:    tasks?.filter((t) => t.status === 'concluida')    ?? [],
  }

  return (
    <AppLayout pageTitle={member.full_name ?? 'Funcionário'}>
      <div className="space-y-6 max-w-5xl">

        <Link
          href="/admin/team"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Equipe
        </Link>

        {/* Header */}
        <div className="rounded-2xl bg-[#111] border border-[#222] p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EACE00]/10 border border-[#EACE00]/20 flex items-center justify-center shrink-0">
                <span className="text-[#EACE00] font-black text-xl">
                  {(member.full_name ?? member.email).slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">{member.full_name ?? '—'}</h1>
                <p className="text-sm text-white/40 mt-0.5">{member.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold', roleConf.classes)}>
                    <RoleIcon className="h-3 w-3" />
                    {roleConf.label}
                  </span>
                  <span className={cn(
                    'text-xs px-2.5 py-1 rounded-full border font-semibold',
                    member.active
                      ? 'bg-green-500/15 text-green-400 border-green-500/30'
                      : 'bg-white/8 text-white/40 border-white/10'
                  )}>
                    {member.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <form action={toggleActiveAction}>
                <input type="hidden" name="member_id" value={member.id} />
                <input type="hidden" name="active" value={(!member.active).toString()} />
                <button
                  type="submit"
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                    member.active
                      ? 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      : 'border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  )}
                >
                  {member.active ? 'Desativar' : 'Ativar'}
                </button>
              </form>
              <Link
                href={`/admin/team/${member.id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Coluna esquerda — info + clientes */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#111] border border-[#222] p-5 space-y-3">
              <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest">Clientes Atribuídos</h2>
              {myClients.length === 0 ? (
                <p className="text-sm text-white/30 italic">Nenhum cliente atribuído.</p>
              ) : (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {myClients.map((a: any) => (
                    <Link
                      key={a.client_id}
                      href={`/admin/clients/${a.client_id}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/3 border border-white/8 hover:border-white/15 transition-colors group"
                    >
                      <span className="text-sm text-white/70 group-hover:text-white transition-colors truncate">
                        {a.clients?.name ?? '—'}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-white/20 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-[#111] border border-[#222] p-5 space-y-2">
              <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest">Resumo de Tarefas</h2>
              {[
                { key: 'pendente',     label: 'Pendentes',    count: tasksByStatus.pendente.length,     color: 'text-white/50' },
                { key: 'em_andamento', label: 'Em andamento', count: tasksByStatus.em_andamento.length, color: 'text-blue-400' },
                { key: 'concluida',    label: 'Concluídas',   count: tasksByStatus.concluida.length,    color: 'text-green-400' },
              ].map((s) => (
                <div key={s.key} className="flex items-center justify-between py-1">
                  <span className="text-sm text-white/50">{s.label}</span>
                  <span className={cn('text-sm font-bold', s.color)}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna direita — tarefas */}
          <div className="lg:col-span-2 space-y-4">

            {/* Lista de tarefas ativas */}
            <div className="rounded-2xl bg-[#111] border border-[#222] p-5 space-y-4">
              <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest">Tarefas</h2>

              {!tasks?.length ? (
                <p className="text-sm text-white/30 py-4 text-center">Nenhuma tarefa cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {tasks.filter((t) => t.status !== 'concluida').concat(tasks.filter((t) => t.status === 'concluida')).map((task) => {
                    const prio   = PRIORITY_CONFIG[task.priority]   ?? PRIORITY_CONFIG.media
                    const status = STATUS_CONFIG[task.status]       ?? STATUS_CONFIG.pendente
                    const StatusIcon = status.icon
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const clientName = (task.clients as any)?.name ?? null

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'rounded-xl border p-4 space-y-2 transition-opacity',
                          task.status === 'concluida' ? 'border-white/5 bg-white/2 opacity-60' : 'border-white/8 bg-white/3'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <StatusIcon className={cn('h-4 w-4 mt-0.5 shrink-0', task.status === 'concluida' ? 'text-green-400' : task.status === 'em_andamento' ? 'text-blue-400' : 'text-white/30')} />
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-semibold', task.status === 'concluida' ? 'line-through text-white/40' : 'text-white')}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', prio.classes)}>
                                {prio.label}
                              </span>
                              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', status.classes)}>
                                {status.label}
                              </span>
                              {clientName && (
                                <span className="text-xs text-white/30">{clientName}</span>
                              )}
                              {task.due_date && (
                                <span className="text-xs text-white/30">
                                  Prazo: {format(parseISO(task.due_date), "d MMM", { locale: ptBR })}
                                  {task.due_time && ` às ${task.due_time.slice(0, 5)}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <form action={updateTaskStatusAction} className="flex-1">
                            <input type="hidden" name="task_id"     value={task.id} />
                            <input type="hidden" name="assigned_to" value={member.id} />
                            <input type="hidden" name="status"      value={status.next} />
                            <button
                              type="submit"
                              className="text-xs text-white/40 hover:text-white/80 transition-colors"
                            >
                              → {status.nextLabel}
                            </button>
                          </form>
                          <form action={deleteTaskAction}>
                            <input type="hidden" name="task_id"     value={task.id} />
                            <input type="hidden" name="assigned_to" value={member.id} />
                            <button type="submit" className="p-1 text-white/20 hover:text-red-400 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Formulário nova tarefa */}
            <div className="rounded-2xl bg-[#111] border border-[#222] p-5 space-y-4">
              <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest flex items-center gap-2">
                <Plus className="h-3 w-3" />
                Nova Tarefa
              </h2>
              <AddTaskForm assignedTo={member.id} clients={clients ?? []} />
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  )
}
