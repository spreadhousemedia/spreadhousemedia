interface ProfileAboutProps {
  bio?: string | null
  isDark: boolean
}

export function ProfileAbout({ bio, isDark }: ProfileAboutProps) {
  const cleanBio = bio?.trim()
  if (!cleanBio) return null

  return (
    <section className="mt-6 flex justify-center" aria-label="About">
      <p
        className={`max-w-[42ch] text-center break-words text-[15px] leading-[1.6] font-normal ${
          isDark ? 'text-[#C8C8C2]' : 'text-[#42413D]'
        }`}
      >
        {cleanBio}
      </p>
    </section>
  )
}

