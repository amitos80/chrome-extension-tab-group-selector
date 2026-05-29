import { t } from '@extension/i18n'
import { usePremiumAccess } from '@extension/shared'
import { premiumEntitlementStorage } from '@extension/storage'
import { cn, LifetimeOfferNotice, lifetimeButtonLabel, useLifetimeOffer } from '@extension/ui'
import { useCallback, useState } from 'react'

type BillingSectionProps = {
  isLight: boolean
}

const planLabelKey = function planLabelKey(
  reason: string,
): 'billingPlanTrial' | 'billingPlanYearly' | 'billingPlanLifetime' | 'billingPlanFree' | 'billingPlanDev' {
  if (reason === 'trial') {
    return 'billingPlanTrial'
  }
  if (reason === 'subscription') {
    return 'billingPlanYearly'
  }
  if (reason === 'lifetime') {
    return 'billingPlanLifetime'
  }
  if (reason === 'dev') {
    return 'billingPlanDev'
  }
  return 'billingPlanFree'
}

const BillingSection = function BillingSection({ isLight }: BillingSectionProps) {
  const access = usePremiumAccess()
  const lifetimeOffer = useLifetimeOffer()
  const [licenseInput, setLicenseInput] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const openCheckout = useCallback((plan: 'yearly' | 'lifetime') => {
    void chrome.runtime.sendMessage({ type: 'OPEN_CHECKOUT', plan })
  }, [])

  const activateLicense = useCallback(async () => {
    setBusy(true)
    setStatusMessage(null)
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'ACTIVATE_LICENSE',
        licenseKey: licenseInput,
      })) as { success?: boolean; error?: string }
      if (res?.success) {
        setStatusMessage(t('billingActivateSuccess'))
        setLicenseInput('')
      } else {
        setStatusMessage(res?.error ?? t('billingActivateFailed'))
      }
    } catch {
      setStatusMessage(t('billingActivateFailed'))
    } finally {
      setBusy(false)
    }
  }, [licenseInput])

  const restoreLicense = useCallback(async () => {
    setBusy(true)
    setStatusMessage(null)
    try {
      const res = (await chrome.runtime.sendMessage({ type: 'RESTORE_LICENSE' })) as {
        success?: boolean
        error?: string
      }
      if (res?.success) {
        setStatusMessage(t('billingRestoreSuccess'))
      } else {
        setStatusMessage(res?.error ?? t('billingRestoreFailed'))
      }
    } catch {
      setStatusMessage(t('billingRestoreFailed'))
    } finally {
      setBusy(false)
    }
  }, [])

  const trialBanner =
    access.reason === 'trial' && access.daysLeftInTrial != null
      ? t('billingTrialDaysLeft', [String(access.daysLeftInTrial)])
      : access.reason === 'free' && access.trialEndsAt != null
        ? t('billingTrialEnded')
        : null

  return (
    <section
      id="billing"
      className={cn(
        'rounded-xl border p-5 shadow-sm',
        isLight ? 'border-blue-200 bg-blue-50/50' : 'border-blue-500/30 bg-blue-950/20',
      )}>
      <h2
        className={cn(
          'mb-3 text-xs font-semibold uppercase tracking-wide',
          isLight ? 'text-blue-900' : 'text-blue-200/90',
        )}>
        {t('billingSectionTitle')}
      </h2>

      {trialBanner ? (
        <p className={cn('mb-3 text-sm', isLight ? 'text-blue-950' : 'text-blue-100')}>{trialBanner}</p>
      ) : null}

      <p className={cn('mb-4 text-sm font-medium', isLight ? 'text-gray-900' : 'text-white')}>
        {t(planLabelKey(access.reason))}
      </p>

      <LifetimeOfferNotice isLight={isLight} className="mb-4" />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy}
          onClick={() => openCheckout('yearly')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 text-sm font-semibold',
            isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-400',
          )}>
          {t('billingSubscribeYearlyButton')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => openCheckout('lifetime')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 text-sm font-semibold',
            isLight ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-amber-500 text-black hover:bg-amber-400',
          )}>
          {lifetimeButtonLabel(lifetimeOffer)}
        </button>
      </div>

      <p className={cn('mb-2 text-xs', isLight ? 'text-gray-600' : 'text-gray-400')}>{t('billingLicenseHint')}</p>
      <input
        type="text"
        value={licenseInput}
        onChange={e => setLicenseInput(e.target.value)}
        placeholder={t('billingLicensePlaceholder')}
        className={cn(
          'mb-2 w-full rounded-lg border px-3 py-2 text-sm',
          isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-900 text-white',
        )}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !licenseInput.trim()}
          onClick={() => void activateLicense()}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-semibold',
            isLight ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-900 hover:bg-gray-100',
          )}>
          {t('billingActivateButton')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void restoreLicense()}
          className={cn(
            'rounded-lg border px-4 py-2 text-sm font-semibold',
            isLight ? 'border-gray-300 text-gray-800 hover:bg-gray-100' : 'border-gray-500 text-gray-200 hover:bg-gray-800',
          )}>
          {t('billingRestoreButton')}
        </button>
      </div>
      {statusMessage ? (
        <p className={cn('mt-3 text-sm', isLight ? 'text-gray-700' : 'text-gray-300')}>{statusMessage}</p>
      ) : null}
    </section>
  )
}

const DevPremiumToggle = function DevPremiumToggle({ isLight }: { isLight: boolean }) {
  const access = usePremiumAccess()

  return (
    <section
      className={cn(
        'rounded-xl border p-5 shadow-sm',
        isLight ? 'border-amber-200 bg-amber-50' : 'border-amber-500/40 bg-amber-950/30',
      )}>
      <h2
        className={cn(
          'mb-3 text-xs font-semibold uppercase tracking-wide',
          isLight ? 'text-amber-900' : 'text-amber-200/90',
        )}>
        {t('popupDevPremiumSectionTitle')}
      </h2>
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border px-3 py-3',
          isLight ? 'border-amber-200 bg-white/80' : 'border-amber-500/30 bg-black/20',
        )}>
        <div className="min-w-0 flex-1 text-left">
          <p className={cn('text-sm font-medium', isLight ? 'text-gray-900' : 'text-white')}>
            {t('optionAutoGroupingPremiumDevToggle')}
          </p>
          <p className={cn('mt-1 text-xs leading-snug', isLight ? 'text-gray-700' : 'text-gray-300')}>
            {t('optionAutoGroupingPremiumDevToggleDescription')}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={access.reason === 'dev'}
          aria-label={t('optionAutoGroupingPremiumDevToggle')}
          onClick={() => void premiumEntitlementStorage.setManualPremiumUnlock(access.reason !== 'dev')}
          className={cn(
            'relative h-7 w-[2.875rem] shrink-0 rounded-full transition-colors',
            access.reason === 'dev' ? 'bg-blue-600' : isLight ? 'bg-gray-300' : 'bg-gray-600',
          )}>
          <span
            className={cn(
              'absolute left-0.5 top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform',
              access.reason === 'dev' ? 'translate-x-[1.125rem]' : 'translate-x-0',
            )}
          />
        </button>
      </div>
    </section>
  )
}

export { BillingSection, DevPremiumToggle }
