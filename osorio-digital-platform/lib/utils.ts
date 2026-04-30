import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function calculateCTR(clicks: number, impressions: number): string {
  if (impressions === 0) return '0,00%'
  return ((clicks / impressions) * 100).toFixed(2).replace('.', ',') + '%'
}

export function calculateROAS(revenue: number, spend: number): string {
  if (spend === 0) return '0,00x'
  return (revenue / spend).toFixed(2).replace('.', ',') + 'x'
}
