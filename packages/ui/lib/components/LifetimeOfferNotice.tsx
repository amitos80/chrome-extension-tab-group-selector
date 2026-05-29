import { t } from '@extension/i18n'
import { useLifetimeOffer } from '@extension/shared'
import { cn } from '../utils.js'

type LifetimeOfferNoticeProps = {
  isLight: boolean
  className?: string
}

const LifetimeOfferNotice = function LifetimeOfferNotice({ isLight, className }: LifetimeOfferNoticeProps) {
  const offer = useLifetimeOffer()

  if (!offer.launchActive) {
    return null
  }

  return (
    <p
      className={cn(
        'text-xs leading-snug',
        isLight ? 'text-amber-900' : 'text-amber-100',
        className,
      )}
      role="status">
      {t('billingLifetimeLaunchOffer', [
        String(offer.launchPriceUsd),
        String(offer.launchMaxPurchases),
        String(offer.standardPriceUsd),
      ])}
    </p>
  )
}

type LifetimeCheckoutButtonLabelProps = {
  offer: ReturnType<typeof useLifetimeOffer>
}

const lifetimeButtonLabel = function lifetimeButtonLabel(offer: LifetimeCheckoutButtonLabelProps['offer']): string {
  if (offer.launchActive) {
    return t('billingLifetimeLaunchButton', [String(offer.launchPriceUsd)])
  }
  return t('billingLifetimeButton', [String(offer.standardPriceUsd)])
}

export { LifetimeOfferNotice, lifetimeButtonLabel, useLifetimeOffer }
