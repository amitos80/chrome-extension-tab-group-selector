import { useLifetimeOffer } from '@extension/shared'
import { lifetimeCheckoutButtonLabel, lifetimeLaunchOfferNotice } from '@extension/storage'
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
      {lifetimeLaunchOfferNotice(offer)}
    </p>
  )
}

type LifetimeCheckoutButtonLabelProps = {
  offer: ReturnType<typeof useLifetimeOffer>
}

const lifetimeButtonLabel = function lifetimeButtonLabel(offer: LifetimeCheckoutButtonLabelProps['offer']): string {
  return lifetimeCheckoutButtonLabel(offer)
}

export { LifetimeOfferNotice, lifetimeButtonLabel, useLifetimeOffer }
