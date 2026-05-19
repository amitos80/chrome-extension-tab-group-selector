import { cn } from '@/lib/utils'
import { useEffectiveTheme } from '@extension/shared'
import { exampleThemeStorage } from '@extension/storage'
import type { ComponentPropsWithoutRef } from 'react'

type ToggleButtonProps = ComponentPropsWithoutRef<'button'>

export const ToggleButton = ({ className, children, disabled, onClick, ...rest }: ToggleButtonProps) => {
  const { isLight, followSystemTheme } = useEffectiveTheme()
  const mergedDisabled = Boolean(disabled) || followSystemTheme

  return (
    <button
      type="button"
      {...rest}
      disabled={mergedDisabled}
      className={cn(
        'mt-4 rounded border-2 px-4 py-1 font-bold shadow hover:scale-105',
        isLight ? 'border-black bg-white text-black' : 'border-white bg-black text-white',
        mergedDisabled && 'cursor-not-allowed opacity-50 hover:scale-100',
        className,
      )}
      onClick={e => {
        void exampleThemeStorage.toggle()
        onClick?.(e)
      }}>
      {children}
    </button>
  )
}
