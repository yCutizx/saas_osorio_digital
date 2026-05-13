export function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  'from-[#EACE00] to-[#c9b000]',
  'from-[#f97316] to-[#c2410c]',
  'from-[#ef4444] to-[#b91c1c]',
  'from-[#8b5cf6] to-[#6d28d9]',
  'from-[#06b6d4] to-[#0e7490]',
  'from-[#10b981] to-[#047857]',
  'from-[#ec4899] to-[#be185d]',
  'from-[#3b82f6] to-[#1d4ed8]',
]

export function getAvatarGradient(seed: string | null | undefined): string {
  if (!seed) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getAvatarTextColor(gradient: string): string {
  return gradient.includes('#EACE00') ? 'text-black' : 'text-white'
}
