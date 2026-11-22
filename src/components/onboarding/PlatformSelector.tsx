import { ArrowRight, Check } from 'lucide-react'
import { SOCIAL_PLATFORMS } from '../../lib/validation'
import type { SocialPlatform } from '../../types'
import { PlatformIcon } from '../profile/PlatformIcons'

interface PlatformSelectorProps {
  selected: SocialPlatform[]
  onToggle: (platform: SocialPlatform) => void
  onContinue: () => void
  onSkip: () => void
}

export function PlatformSelector({
  selected,
  onToggle,
  onContinue,
  onSkip,
}: PlatformSelectorProps) {
  const hasSelection = selected.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.025em] leading-[1.15] text-[#141413]">
          Which platforms are you on?
        </h1>
        <p className="mt-2 text-[15px] text-[#5C5B57] leading-relaxed">
          Select the platforms you want to share. You can add or remove links anytime.
        </p>
      </div>

      {/* Platform Grid: 2 cols on very narrow screens, 3 cols on standard mobile, 4 cols on tablet+ */}
      <div className="grid grid-cols-2 min-[380px]:grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {SOCIAL_PLATFORMS.map((platform) => {
          const isSelected = selected.includes(platform.id)
          const label = platform.id === 'custom' ? 'Custom Link' : platform.label

          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => onToggle(platform.id)}
              aria-pressed={isSelected}
              className={`relative flex min-h-[96px] flex-col items-center justify-center gap-2.5 rounded-2xl border px-3 py-4 text-center transition-all duration-150 active:scale-[0.98] ${
                isSelected
                  ? 'border-[#141413] bg-white shadow-[0_2px_10px_rgba(20,20,19,0.06)] ring-1 ring-[#141413]'
                  : 'border-[#E6E4DF] bg-white/75 hover:border-[#CBC8C0] hover:bg-white'
              }`}
            >
              {/* Selection badge */}
              <span
                className={`absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                  isSelected
                    ? 'border-[#141413] bg-[#141413] text-white'
                    : 'border-[#D5D2CA] bg-transparent text-transparent'
                }`}
                aria-hidden="true"
              >
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>

              <span className="flex h-9 w-9 items-center justify-center">
                <PlatformIcon platform={platform.id} size={24} />
              </span>

              <span
                className={`text-[13px] leading-tight ${
                  isSelected ? 'font-semibold text-[#141413]' : 'font-medium text-[#42413D]'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>

      <p className="text-[12px] text-[#6F6E69]">
        {selected.length === 0
          ? 'Select at least one platform to continue, or skip for now.'
          : `${selected.length} ${selected.length === 1 ? 'platform' : 'platforms'} selected. You can change these anytime later.`}
      </p>

      {/* Bottom Primary Actions */}
      <div className="sticky bottom-0 -mx-4 border-t border-[#E6E4DF] bg-[#F7F6F3]/95 px-4 py-4 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex h-12 items-center justify-center rounded-xl px-4 text-[14px] font-medium text-[#5C5B57] hover:bg-white hover:text-[#141413] transition-colors"
          >
            Skip for now
          </button>

          <button
            type="button"
            disabled={!hasSelection}
            onClick={onContinue}
            className="inline-flex h-12 w-full sm:w-auto sm:min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#141413] px-6 text-[15px] font-semibold text-white transition-all hover:bg-[#2A2A28] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#D5D2CA] disabled:text-[#85847F]"
          >
            <span>Continue</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

