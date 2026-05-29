import { t } from '@extension/i18n'
import { usePremiumAccess, useStorage } from '@extension/shared'
import { autoGroupRulesStorage, CHROME_TAB_GROUP_COLORS } from '@extension/storage'
import { cn } from '@extension/ui'
import { Fragment, useCallback, useState } from 'react'
import type { AutoGroupRule, ChromeTabGroupColor } from '@extension/storage'

const COLOR_SWATCH: Record<ChromeTabGroupColor, string> = {
  grey: 'bg-gray-500',
  blue: 'bg-blue-600',
  red: 'bg-red-600',
  yellow: 'bg-yellow-500',
  green: 'bg-green-600',
  pink: 'bg-pink-500',
  purple: 'bg-purple-600',
  cyan: 'bg-cyan-500',
  orange: 'bg-orange-500',
}

type Props = {
  embedded?: boolean
  isLight: boolean
}

export const AutoGroupingRulesSection = ({ embedded = false, isLight }: Props) => {
  const { isPremium } = usePremiumAccess()
  const { rules } = useStorage(autoGroupRulesStorage)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftPattern, setDraftPattern] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftColor, setDraftColor] = useState<ChromeTabGroupColor>('blue')

  const resetDraft = useCallback(() => {
    setEditingId(null)
    setDraftPattern('')
    setDraftTitle('')
    setDraftColor('blue')
  }, [])

  const startAdd = useCallback(() => {
    setEditingId('__new__')
    setDraftPattern('')
    setDraftTitle('')
    setDraftColor('blue')
  }, [])

  const startEdit = useCallback((r: AutoGroupRule) => {
    setEditingId(r.id)
    setDraftPattern(r.pattern)
    setDraftTitle(r.groupTitle)
    setDraftColor(r.groupColor)
  }, [])

  const saveDraft = useCallback(async () => {
    const trimmedPattern = draftPattern.trim()
    const trimmedTitle = draftTitle.trim()

    if (!trimmedPattern || !trimmedTitle) {
      window.alert(t('optionAutoGroupingValidationNonEmpty'))

      return
    }

    if (editingId === '__new__') {
      const next: AutoGroupRule = {
        id: crypto.randomUUID(),
        pattern: trimmedPattern,
        groupTitle: trimmedTitle,
        groupColor: draftColor,
      }

      await autoGroupRulesStorage.setRules([...rules, next])
    } else if (editingId) {
      await autoGroupRulesStorage.setRules(
        rules.map(r =>
          r.id === editingId ? { ...r, pattern: trimmedPattern, groupTitle: trimmedTitle, groupColor: draftColor } : r,
        ),
      )
    }

    resetDraft()
  }, [draftColor, draftPattern, draftTitle, editingId, resetDraft, rules])

  const removeRule = useCallback(
    async (id: string) => {
      if (!window.confirm(t('optionAutoGroupingDeleteConfirm'))) return

      await autoGroupRulesStorage.setRules(rules.filter(r => r.id !== id))

      if (editingId === id) resetDraft()
    },
    [editingId, resetDraft, rules],
  )

  const content = (
    <>
      {!isPremium ? (
        <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-400')} role="status">
          {t('optionAutoGroupingPremiumGate')}
        </p>
      ) : (
        <>
          <p className={cn('mb-3 text-xs leading-snug', isLight ? 'text-amber-800' : 'text-amber-200/90')}>
            {t('optionAutoGroupingBroadPatternWarning')}
          </p>

          {rules.length > 0 ? (
            <ul className={cn('mb-4 divide-y rounded-lg border', isLight ? 'border-gray-200' : 'border-gray-600')}>
              {rules.map(r => (
                <li
                  key={r.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 text-left text-sm',
                    isLight ? 'bg-white' : 'bg-gray-900/40',
                  )}>
                  <span
                    className={cn('h-3 w-3 shrink-0 rounded-full', COLOR_SWATCH[r.groupColor])}
                    title={r.groupColor}
                  />
                  <span className="min-w-0 flex-1 font-medium text-current">{r.groupTitle}</span>
                  <span className="max-w-[10rem] shrink-0 truncate font-mono text-xs opacity-80">{r.pattern}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(r)}
                    className={cn('shrink-0 text-xs underline', isLight ? 'text-blue-700' : 'text-blue-400')}>
                    {t('optionAutoGroupingEdit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeRule(r.id)}
                    className={cn('shrink-0 text-xs underline', isLight ? 'text-red-600' : 'text-red-400')}>
                    {t('optionAutoGroupingDelete')}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {editingId !== null ? (
            <div
              className={cn(
                'mb-4 flex flex-col gap-3 rounded-lg border px-3 py-3',
                isLight ? 'border-gray-200 bg-slate-50' : 'border-gray-600 bg-gray-900/50',
              )}>
              <label className="block text-xs font-semibold uppercase tracking-wide">
                <span className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>
                  {t('optionAutoGroupingPatternLabel')}
                </span>
                <input
                  type="text"
                  value={draftPattern}
                  onChange={e => setDraftPattern(e.target.value)}
                  placeholder={t('optionAutoGroupingPatternPlaceholder')}
                  className={cn(
                    'mt-1 block w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500',
                    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-950 text-gray-100',
                  )}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide">
                <span className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>
                  {t('optionAutoGroupingGroupTitleLabel')}
                </span>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  className={cn(
                    'mt-1 block w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500',
                    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-950 text-gray-100',
                  )}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide">
                <span className={cn(isLight ? 'text-gray-600' : 'text-gray-400')}>
                  {t('optionAutoGroupingColorLabel')}
                </span>
                <select
                  value={draftColor}
                  onChange={e => setDraftColor(e.target.value as ChromeTabGroupColor)}
                  className={cn(
                    'mt-1 block w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500',
                    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-950 text-gray-100',
                  )}>
                  {CHROME_TAB_GROUP_COLORS.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveDraft()}
                  className={cn(
                    'rounded-md px-4 py-2 text-sm font-medium',
                    isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600',
                  )}>
                  {t('optionAutoGroupingSave')}
                </button>
                <button
                  type="button"
                  onClick={resetDraft}
                  className={cn(
                    'rounded-md px-4 py-2 text-sm font-medium',
                    isLight ? 'border border-gray-300 bg-white text-gray-900' : 'border border-gray-600 text-gray-100',
                  )}>
                  {t('optionAutoGroupingCancel')}
                </button>
              </div>
            </div>
          ) : null}

          {editingId === null ? (
            <button
              type="button"
              onClick={startAdd}
              className={cn(
                'w-full rounded-lg border px-4 py-2.5 text-sm font-semibold',
                isLight
                  ? 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                  : 'border-gray-600 text-gray-100 hover:bg-gray-700/50',
              )}>
              {t('optionAutoGroupingAddRule')}
            </button>
          ) : null}
        </>
      )}
    </>
  )

  if (embedded) {
    return <Fragment>{content}</Fragment>
  }

  return (
    <section
      className={cn(
        'rounded-xl border p-5 shadow-sm',
        isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800/80',
      )}>
      {content}
    </section>
  )
}
