import { Moon, Sun } from 'lucide-react'
import type { ProfileTheme } from '../../types'

interface ThemeToggleProps {
  theme: ProfileTheme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors active:scale-95 ${
        isDark
          ? 'border-[#27272B] bg-[#18181B] text-[#A0A09B] hover:border-[#3A3A40] hover:text-[#F4F4F2]'
          : 'border-[#E6E4DF] bg-white text-[#5C5B57] hover:border-[#CFCBC3] hover:text-[#141413]'
      }`}
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  )
}

