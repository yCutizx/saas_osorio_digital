const SPECIAL = /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]/

export interface PasswordValidation {
  valid:    boolean
  strength: 'weak' | 'medium' | 'strong'
  errors:   string[]
  score:    number
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []
  let score = 0

  if (password.length >= 8)   score++
  if (password.length >= 12)  score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (SPECIAL.test(password)) score++

  if (password.length < 8)    errors.push('Mínimo 8 caracteres')
  if (!/[A-Z]/.test(password)) errors.push('Pelo menos 1 letra maiúscula')
  if (!/[0-9]/.test(password)) errors.push('Pelo menos 1 número')
  if (!SPECIAL.test(password)) errors.push('Pelo menos 1 caractere especial (!@#$%^&*)')

  const strength: PasswordValidation['strength'] =
    score <= 2 ? 'weak' : score <= 3 ? 'medium' : 'strong'

  return { valid: errors.length === 0, strength, errors, score }
}
