// IT WILL BE ADJUSTED TO YOUR LANGUAGE DURING BUILD TIME, DON'T MOVE BELOW IMPORT TO OTHER LINE
import localeJSON from '../locales/en/messages.json' with { type: 'json' }
import type { I18nValueType, LocalesJSONType } from './types.js'

const applySubstitutions = function applySubstitutions(message: string, substitutions: string | string[]): string {
  const values = Array.isArray(substitutions) ? substitutions : [substitutions]
  let result = ''
  let index = 0

  while (index < message.length) {
    if (message[index] === '$') {
      const next = message[index + 1]
      const afterNext = message[index + 2]

      if (next === '$' && afterNext != null && /\d/.test(afterNext)) {
        const placeholder = message.slice(index).match(/^\$\$(\d+)/)
        if (placeholder) {
          const valueIndex = parseInt(placeholder[1], 10) - 1
          result += `$${values[valueIndex] ?? ''}`
          index += placeholder[0].length
          continue
        }
      }

      if (next === '$') {
        result += '$'
        index += 2
        continue
      }

      const numbered = message.slice(index).match(/^\$(\d+)/)
      if (numbered) {
        const valueIndex = parseInt(numbered[1], 10) - 1
        result += values[valueIndex] ?? ''
        index += numbered[0].length
        continue
      }
    }

    result += message[index]
    index += 1
  }

  return result
}

const translate = (key: keyof LocalesJSONType, substitutions?: string | string[]) => {
  const localeValues = localeJSON[key] as I18nValueType
  let message = localeValues.message
  /**
   * This is a placeholder replacement logic. But it's not perfect.
   * It just imitates the behavior of the Chrome extension i18n API.
   * Please check the official document for more information And double-check the behavior on production build.
   *
   * @url https://developer.chrome.com/docs/extensions/how-to/ui/localization-message-formats#placeholders
   */
  if (localeValues.placeholders) {
    Object.entries(localeValues.placeholders).forEach(([key, { content }]) => {
      if (content) {
        message = message.replace(new RegExp(`\\$${key}\\$`, 'gi'), content)
      }
    })
  }

  if (!substitutions) {
    return message
  }

  return applySubstitutions(message, substitutions)
}

const removePlaceholder = (message: string) => message.replace(/\$\d+/g, '')

export const t = (...args: Parameters<typeof translate>) => {
  const result = translate(...args)
  if (args[1]) {
    return result
  }
  return removePlaceholder(result)
}
