import { defaultLifetimeOfferStatus, type LifetimeOfferStatus } from '@extension/storage'
import { useEffect, useState } from 'react'

export const useLifetimeOffer = function useLifetimeOffer(): LifetimeOfferStatus {
  const [offer, setOffer] = useState<LifetimeOfferStatus>(() => defaultLifetimeOfferStatus())

  useEffect(() => {
    void chrome.runtime
      .sendMessage({ type: 'GET_LIFETIME_OFFER_STATUS' })
      .then((res: LifetimeOfferStatus | undefined) => {
        if (res?.launchPriceUsd != null) {
          setOffer(res)
        }
      })
      .catch(() => {
        /* Keep default launch snapshot when background is unavailable. */
      })
  }, [])

  return offer
}
