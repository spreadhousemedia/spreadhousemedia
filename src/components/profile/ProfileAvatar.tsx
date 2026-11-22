import { resolveProfileAvatarSrc } from '../../lib/avatars'

interface ProfileAvatarProps {
  avatarId?: string | null
  profileImage?: string | null
  displayName: string
  isDark: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ProfileAvatar({
  avatarId,
  profileImage,
  displayName,
  isDark,
  size = 'lg',
}: ProfileAvatarProps) {
  const src = resolveProfileAvatarSrc(avatarId, profileImage)
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  const dimensions =
    size === 'sm'
      ? 'h-16 w-16 rounded-[18px]'
      : size === 'md'
        ? 'h-20 w-20 rounded-[22px]'
        : 'h-[92px] w-[92px] sm:h-[112px] sm:w-[112px] rounded-[24px] sm:rounded-[28px]'

  return (
    <div
      className={`relative shrink-0 overflow-hidden select-none flex items-center justify-center ${dimensions} ${
        isDark
          ? 'bg-[#1D1D21] text-[#F4F4F2] ring-1 ring-inset ring-white/10 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.65)]'
          : 'bg-[#ECEAE4] text-[#141413] ring-1 ring-inset ring-black/[0.07] shadow-[0_8px_24px_-10px_rgba(20,20,19,0.16)]'
      }`}
    >
      {src ? (
        <img
          src={src}
          alt={displayName}
          width={112}
          height={112}
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-2xl sm:text-3xl font-bold tracking-tight">
          {initials || 'SN'}
        </span>
      )}
    </div>
  )
}

