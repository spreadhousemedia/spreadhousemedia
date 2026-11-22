import { ProfileAvatar } from './ProfileAvatar'

interface ProfileHeaderProps {
  displayName: string
  tagline?: string | null
  avatarId?: string | null
  profileImage?: string | null
  isDark: boolean
}

export function ProfileHeader({
  displayName,
  tagline,
  avatarId,
  profileImage,
  isDark,
}: ProfileHeaderProps) {
  const cleanTagline = tagline?.trim()

  return (
    <header className="flex flex-col items-center text-center">
      <ProfileAvatar
        avatarId={avatarId}
        profileImage={profileImage}
        displayName={displayName}
        isDark={isDark}
      />

      <h1
        className={`mt-4 max-w-full break-words text-[28px] sm:text-[34px] font-bold tracking-[-0.025em] leading-[1.12] ${
          isDark ? 'text-[#F4F4F2]' : 'text-[#141413]'
        }`}
      >
        {displayName}
      </h1>

      {cleanTagline && (
        <p
          className={`mt-2 max-w-[36ch] break-words text-[14px] sm:text-[15px] font-medium leading-snug ${
            isDark ? 'text-[#A0A09B]' : 'text-[#5C5B57]'
          }`}
        >
          {cleanTagline}
        </p>
      )}
    </header>
  )
}

