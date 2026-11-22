import { ArrowRight, Check } from 'lucide-react'
import { CURATED_AVATARS, CURATED_AVATAR_MAP, DEFAULT_AVATAR_ID } from '../../lib/avatars'

interface AvatarPickerProps {
  selectedAvatarId: string | null
  onSelect: (avatarId: string) => void
  onContinue: () => void
}

export function AvatarPicker({
  selectedAvatarId,
  onSelect,
  onContinue,
}: AvatarPickerProps) {
  const activeId =
    selectedAvatarId && CURATED_AVATAR_MAP.has(selectedAvatarId)
      ? selectedAvatarId
      : DEFAULT_AVATAR_ID
  const activeAvatar = CURATED_AVATAR_MAP.get(activeId) ?? CURATED_AVATARS[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.025em] leading-[1.15] text-[#141413]">
          Choose your identity
        </h1>
        <p className="mt-2 text-[15px] text-[#5C5B57] leading-relaxed">
          Select an avatar that represents you.
        </p>
      </div>

      {/* Larger Preview of Selected Avatar */}
      <div className="flex items-center gap-4 rounded-2xl border border-[#E6E4DF] bg-white p-4">
        <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-[22px] bg-[#ECEAE4] ring-1 ring-inset ring-black/[0.07]">
          <img
            src={activeAvatar.src}
            alt={activeAvatar.label}
            width={96}
            height={96}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#6F6E69]">
            Selected Avatar
          </p>
          <p className="mt-0.5 text-[16px] font-semibold text-[#141413]">
            {activeAvatar.label}
          </p>
          <p className="mt-1 text-[13px] text-[#5C5B57]">
            You can switch your avatar anytime from your profile editor.
          </p>
        </div>
      </div>

      {/* Responsive Curated Avatar Grid */}
      <div className="grid grid-cols-3 min-[440px]:grid-cols-4 sm:grid-cols-6 gap-3">
        {CURATED_AVATARS.map((avatar) => {
          const isSelected = avatar.id === activeId
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onSelect(avatar.id)}
              aria-label={`Select ${avatar.label}`}
              aria-pressed={isSelected}
              className={`group relative aspect-square overflow-hidden rounded-[20px] bg-[#ECEAE4] transition-all duration-150 ${
                isSelected
                  ? 'ring-2 ring-[#141413] ring-offset-2 ring-offset-[#F7F6F3]'
                  : 'ring-1 ring-inset ring-black/[0.08] hover:ring-black/25'
              }`}
            >
              <img
                src={avatar.src}
                alt={avatar.label}
                width={128}
                height={128}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              {isSelected && (
                <span
                  className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#141413] text-white shadow-sm"
                  aria-hidden="true"
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Sticky Bottom Continue */}
      <div className="sticky bottom-0 -mx-4 border-t border-[#E6E4DF] bg-[#F7F6F3]/95 px-4 py-4 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (!selectedAvatarId) onSelect(activeId)
              onContinue()
            }}
            className="inline-flex h-12 w-full sm:w-auto sm:min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#141413] px-6 text-[15px] font-semibold text-white transition-all hover:bg-[#2A2A28] active:scale-[0.99]"
          >
            <span>Continue</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

