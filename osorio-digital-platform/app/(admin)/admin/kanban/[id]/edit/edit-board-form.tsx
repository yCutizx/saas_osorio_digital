'use client'

import { useState, useTransition, useEffect } from 'react'
import { useFormState } from 'react-dom'
import { useRouter } from 'next/navigation'
import { updateBoardAction, deleteBoardAction, type FormState } from './actions'
import { Plus, X, GripVertical, Trash2 } from 'lucide-react'

const COLORS = ['#EACE00', '#3b82f6', '#8b5cf6', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899']

type Column = { id: string; label: string; color: string }

interface Board {
  id: string
  name: string
  description?: string | null
  color: string
  columns: Column[]
}

const INIT: FormState = {}

export function EditBoardForm({ board }: { board: Board }) {
  const router = useRouter()
  const [state, dispatch] = useFormState(updateBoardAction, INIT)
  const [, startT]        = useTransition()
  const [showDelete, setShowDelete] = useState(false)

  const [color, setColor]     = useState(board.color)
  const [columns, setColumns] = useState<Column[]>(
    Array.isArray(board.columns) ? board.columns : []
  )

  useEffect(() => {
    if (state.success) router.push(`/admin/kanban/${board.id}`)
  }, [state.success]) // eslint-disable-line react-hooks/exhaustive-deps

  function addColumn() {
    setColumns((prev) => [...prev, { id: `col_${Date.now()}`, label: 'Nova Coluna', color: '#555555' }])
  }
  function removeColumn(id: string) { setColumns((prev) => prev.filter((c) => c.id !== id)) }
  function updateLabel(id: string, label: string) {
    setColumns((prev) => prev.map((c) => c.id === id ? { ...c, label } : c))
  }
  function updateColColor(id: string, val: string) {
    setColumns((prev) => prev.map((c) => c.id === id ? { ...c, color: val } : c))
  }

  function handleDelete() {
    startT(async () => { await deleteBoardAction(board.id) })
  }

  return (
    <>
      <form action={dispatch} className="space-y-6">
        <input type="hidden" name="board_id"     value={board.id} />
        <input type="hidden" name="color"        value={color} />
        <input type="hidden" name="columns_json" value={JSON.stringify(columns)} />

        {state.message && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {state.message}
          </div>
        )}

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Nome do Quadro *</label>
          <input name="name" required defaultValue={board.name}
            className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#EACE00]" />
          {state.errors?.name && <p className="text-red-400 text-xs mt-1">{state.errors.name[0]}</p>}
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Descrição (opcional)</label>
          <textarea name="description" rows={2} defaultValue={board.description ?? ''}
            className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#EACE00] resize-none" />
        </div>

        <div>
          <label className="text-xs text-white/50 mb-2 block">Cor de destaque</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                style={{ background: c }}
                className={`w-8 h-8 rounded-lg transition-transform ${color === c ? 'ring-2 ring-white/40 scale-110' : 'opacity-60 hover:opacity-100'}`} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-white/50">Colunas</label>
            <button type="button" onClick={addColumn}
              className="flex items-center gap-1 text-xs text-[#EACE00] hover:opacity-80 transition-opacity">
              <Plus className="h-3.5 w-3.5" />Adicionar coluna
            </button>
          </div>
          <div className="space-y-2">
            {columns.map((col) => (
              <div key={col.id}
                className="flex items-center gap-2 bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2">
                <GripVertical className="h-4 w-4 text-white/20 shrink-0" />
                <input type="color" value={col.color}
                  onChange={(e) => updateColColor(col.id, e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                <input value={col.label} onChange={(e) => updateLabel(col.id, e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white focus:outline-none" />
                {columns.length > 1 && (
                  <button type="button" onClick={() => removeColumn(col.id)}
                    className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-white/30 mt-2">
            Remover uma coluna não exclui os cards — eles ficam sem coluna até serem movidos.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-2.5 rounded-xl border border-[#333] text-sm text-white/50 hover:text-white hover:border-[#555] transition-colors">
            Cancelar
          </button>
          <button type="submit"
            className="flex-1 py-2.5 rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors">
            Salvar
          </button>
        </div>
      </form>

      {/* Zona de perigo */}
      <div className="mt-8 pt-6 border-t border-[#222]">
        <p className="text-xs text-white/30 mb-3">Zona de perigo</p>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-400/70 text-sm hover:border-red-500/60 hover:text-red-400 transition-colors">
            <Trash2 className="h-4 w-4" />Excluir Quadro
          </button>
        ) : (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
            <p className="text-sm text-white">
              Isso excluirá o quadro e <strong>todos os cards</strong> permanentemente. Confirmar?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)}
                className="flex-1 py-2 rounded-lg border border-[#333] text-sm text-white/50 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                Excluir
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
