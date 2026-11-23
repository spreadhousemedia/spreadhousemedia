import { ArrowUpRight } from 'lucide-react'
import type { PersonalThemeConfig } from '../../lib/profileThemes'
import type { PublicLinkItem } from '../../types'
import { PlatformIcon } from './PlatformIcons'

interface CustomLinkButtonProps {
  link: PublicLinkItem
  isDark: boolean
  theme?: PersonalThemeConfig
}

export function CustomLinkButton({ link, isDark, theme }: CustomLinkButtonProps) {
  return (
    <a
      href={link.destination_url}
      target="_blank"
      rel="noopener noreferrer"
      style={
        theme
          ? {
              backgroundColor: theme.card,
              borderColor: theme.border,
              color: theme.ink,
              borderWidth: theme.borderWidth ?? 1,
              boxShadow: theme.tactileShadow,
            }
          : undefined
      }
      className={`group flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 ${
        theme
          ? 'focus-visible:ring-current'
          : isDark
            ? 'border-[#27272B] bg-[#18181B] text-[#F4F4F2] hover:border-[#3E3E46] hover:bg-[#1E1E22] focus-visible:ring-[#9D8BF4]'
            : 'border-[#E6E4DF] bg-white text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.03)] hover:border-[#C7C3BA] hover:bg-[#FCFBF9] focus-visible:ring-[#5E4AE3]'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          style={
            theme
              ? { backgroundColor: theme.subtleSurface, color: theme.accent }
              : undefined
          }
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            theme
              ? ''
              : isDark
                ? 'bg-[#222227] text-[#C8C8C2]'
                : 'bg-[#F3F2EE] text-[#42413D]'
          }`}
        >
          <PlatformIcon platform="custom" customIcon={link.icon} size={17} />
        </span>

        <span className="truncate text-[15px] font-medium leading-snug">
          {link.link_title}
        </span>
      </div>

      <ArrowUpRight
        style={theme ? { color: theme.muted } : undefined}
        className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
          theme
            ? ''
            : isDark
              ? 'text-[#71717A] group-hover:text-[#F4F4F2]'
              : 'text-[#85847F] group-hover:text-[#141413]'
        }`}
        aria-hidden="true"
      />
    </a>
  )
}

