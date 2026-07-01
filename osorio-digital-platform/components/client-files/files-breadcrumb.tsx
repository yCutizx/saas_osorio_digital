'use client'

import Link from 'next/link'
import { ChevronRight, FolderOpen } from 'lucide-react'

export interface Crumb {
  id:   string
  name: string
}

interface Props {
  clientId:   string
  breadcrumb: Crumb[] // raiz → pasta atual (vazio = está na raiz)
}

export function FilesBreadcrumb({ clientId, breadcrumb }: Props) {
  const base = `/admin/clients/${clientId}/space/files`

  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap">
      {breadcrumb.length === 0 ? (
        <span className="inline-flex items-center gap-1.5 text-[#EACE00] font-medium">
          <FolderOpen className="h-4 w-4" />
          Arquivos
        </span>
      ) : (
        <Link href={base} className="inline-flex items-center gap-1.5 text-[#888] hover:text-white transition-colors">
          <FolderOpen className="h-4 w-4" />
          Arquivos
        </Link>
      )}

      {breadcrumb.map((crumb, i) => {
        const isLast = i === breadcrumb.length - 1
        return (
          <span key={crumb.id} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-[#444] shrink-0" />
            {isLast ? (
              <span className="text-[#EACE00] font-medium truncate max-w-[200px]">{crumb.name}</span>
            ) : (
              <Link
                href={`${base}/${crumb.id}`}
                className="text-[#888] hover:text-white transition-colors truncate max-w-[160px]"
              >
                {crumb.name}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
