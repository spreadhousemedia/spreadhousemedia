import { Link } from 'react-router-dom'

interface ProfileFooterProps {
  isDark: boolean
}

export function ProfileFooter({ isDark }: ProfileFooterProps) {
  return (
    <footer className="pt-8 pb-6 text-center">
      <Link
        to="/"
        className={`inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-medium tracking-wide transition-colors ${
          isDark
            ? 'text-[#71717A] hover:text-[#C8C8C2]'
            : 'text-[#85847F] hover:text-[#42413D]'
        }`}
      >
        <span>SpreadNFC</span>
      </Link>
    </footer>
  )
}

