import { Award, Building2, MapPin, User } from 'lucide-react'
import { ProfileAvatar } from './ProfileAvatar'

interface ProfileHeaderProps {
  displayName: string
  profileType?: 'personal' | 'business'
  businessCategory?: string | null
  location?: string | null
  businessExperience?: string | null
  contactPersonName?: string | null
  tagline?: string | null
  avatarId?: string | null
  profileImage?: string | null
  isDark: boolean
}

export function ProfileHeader({
  displayName,
  profileType = 'personal',
  businessCategory,
  location,
  businessExperience,
  contactPersonName,
  tagline,
  avatarId,
  profileImage,
  isDark,
}: ProfileHeaderProps) {
  const cleanTagline = tagline?.trim()
  const cleanCategory = businessCategory?.trim()
  const cleanLocation = location?.trim()
  const cleanExperience = businessExperience?.trim()
  const cleanContactPerson = contactPersonName?.trim()

  return (
    <header className="flex flex-col items-center text-center">
      <ProfileAvatar
        avatarId={avatarId}
        profileImage={profileImage}
        displayName={displayName}
        isDark={isDark}
      />

      {profileType === 'business' && (cleanCategory || cleanLocation || cleanExperience) && (
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5">
          {(cleanCategory || cleanLocation) && (
            <div
              className={`inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border ${
                isDark
                  ? 'border-[#27272B] bg-[#18181B] text-[#C8C8C2]'
                  : 'border-[#E6E4DF] bg-white text-[#42413D]'
              }`}
            >
              {cleanCategory && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-[#5E4AE3]" aria-hidden="true" />
                  <span>{cleanCategory}</span>
                </span>
              )}
              {cleanCategory && cleanLocation && <span aria-hidden="true">·</span>}
              {cleanLocation && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                  <span>{cleanLocation}</span>
                </span>
              )}
            </div>
          )}
          {cleanExperience && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                isDark
                  ? 'border-[#27272B] bg-[#18181B] text-amber-300'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <Award className="h-3 w-3" aria-hidden="true" />
              <span>{cleanExperience}</span>
            </span>
          )}
        </div>
      )}

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

      {profileType === 'business' && cleanContactPerson && (
        <p
          className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${
            isDark ? 'text-[#8E8E93]' : 'text-[#6F6E69]'
          }`}
        >
          <User className="h-3 w-3" aria-hidden="true" />
          <span>Contact: {cleanContactPerson}</span>
        </p>
      )}
    </header>
  )
}

