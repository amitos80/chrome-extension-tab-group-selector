/** Converts a basic wildcard pattern (*.github.com) into a strict RegExp. */
export const wildcardToRegex = (pattern: string): RegExp => {
  const sanitized = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const regexString = '^' + sanitized.replace(/\*/g, '.*') + '$'

  return new RegExp(regexString, 'i')
}

/** Validates whether a target URL satisfies a matching condition. */
export const isUrlMatch = (url: string, pattern: string): boolean => {
  if (!url) return false

  try {
    return wildcardToRegex(pattern).test(url)
  } catch {
    return false
  }
}
