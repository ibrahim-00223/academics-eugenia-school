/**
 * Domain guard — restricts access to specific email domains.
 * Configure ALLOWED_EMAIL_DOMAINS in your environment variables.
 *
 * Format: "domain1.com,domain2.fr" (comma-separated, no spaces)
 */

export function getAllowedDomains(): string[] {
  const env = process.env.ALLOWED_EMAIL_DOMAINS ?? ''
  if (!env) return [] // empty = no restriction (dev mode)
  return env.split(',').map((d) => d.trim().toLowerCase())
}

export function isEmailAllowed(email: string): boolean {
  const allowedDomains = getAllowedDomains()

  // If no domains configured, allow all (useful for local dev)
  if (allowedDomains.length === 0) return true

  const emailDomain = email.split('@')[1]?.toLowerCase()
  if (!emailDomain) return false

  return allowedDomains.includes(emailDomain)
}
