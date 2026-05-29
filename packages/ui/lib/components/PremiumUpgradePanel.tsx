import { t } from '@extension/i18n'
import { LifetimeOfferNotice, lifetimeButtonLabel, useLifetimeOffer } from './LifetimeOfferNotice.js'
import { cn } from '../utils.js'

type PremiumUpgradePanelProps = {
  isLight: boolean
}

const openCheckout = function openCheckout(plan: 'yearly' | 'lifetime'): void {
  void chrome.runtime.sendMessage({ type: 'OPEN_CHECKOUT', plan })
}

const openBillingOptions = function openBillingOptions(): void {
  const url = chrome.runtime.getURL('options/index.html#billing')
  void chrome.tabs.create({ url })
}

const PremiumUpgradePanel = function PremiumUpgradePanel({ isLight }: PremiumUpgradePanelProps) {
  const lifetimeOffer = useLifetimeOffer()

  return (
    <div
      className={cn(
        'mt-1 shrink-0 rounded-lg border px-3 py-3',
        isLight ? 'border-amber-200 bg-amber-50' : 'border-amber-500/40 bg-amber-950/40',
      )}>
      <p className={cn('text-sm leading-snug', isLight ? 'text-amber-950' : 'text-amber-100')}>
        {t('switcherPremiumUpgradeCta')}
      </p>
      <LifetimeOfferNotice isLight={isLight} className="mt-2" />
      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => openCheckout('yearly')}
          className={cn(
            'w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
            isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-400',
          )}>
          {t('billingSubscribeYearlyButton')}
        </button>
        <button
          type="button"
          onClick={() => openCheckout('lifetime')}
          className={cn(
            'w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
            isLight ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-amber-500 text-black hover:bg-amber-400',
          )}>
          {lifetimeButtonLabel(lifetimeOffer)}
        </button>
        <button
          type="button"
          onClick={openBillingOptions}
          className={cn(
            'text-xs font-medium underline-offset-2 hover:underline',
            isLight ? 'text-amber-900' : 'text-amber-200',
          )}>
          {t('billingAlreadyPurchasedLink')}
        </button>
      </div>
    </div>
  )
}

export { PremiumUpgradePanel }
