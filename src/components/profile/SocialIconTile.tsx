import { getPlatformMeta } from '../../lib/validation'
import type { PublicLinkItem } from '../../types'
import { PlatformIcon } from './PlatformIcons'

interface SocialIconTileProps {
  link: PublicLinkItem
  isDark: boolean
}

export function SocialIconTile({ link, isDark }: SocialIconTileProps) {
  const meta = getPlatformMeta(link.platform)

  return (
    <a
      href={link.destination_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={meta.label}
      title={meta.label}
      className={`group relative flex h-[54px] w-[54px] sm:h-[58px] sm:w-[58px] items-center justify-center rounded-2xl border transition-all duration-150 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 ${
        isDark
          ? 'border-[#27272B] bg-[#18181B] text-[#F4F4F2] hover:border-[#3E3E46] hover:bg-[#202025] focus-visible:ring-[#9D8BF4]'
          : 'border-[#E6E4DF] bg-white text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.04)] hover:border-[#CBC8C0] hover:bg-[#FAF9F7] focus-visible:ring-[#5E4AE3]'
      }`}
    >
      <PlatformIcon platform={link.platform} size={23} />

      {/* Crisp desktop hover/focus tooltip */}
      <span
        role="tooltip"
        className={`pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[12px] font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 hidden sm:block ${
          isDark
            ? 'bg-[#27272B] text-[#F4F4F2] border border-[#3A3A40] shadow-md'
            : 'bg-[#141413] text-white shadow-md'
        }`}
      >
        {meta.label}
      </span>
    </a>
  )
}

