import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import {
  getPlatformMeta,
  isValidDestinationUrl,
  normalizeDestinationUrl,
  validatePlatformLinkUrl,
} from '../../lib/validation'
import type { SocialPlatform } from '../../types'
import { PlatformIcon } from '../profile/PlatformIcons'
import { CustomLinkEditor, type CustomLinkDraft } from './CustomLinkEditor'

interface SocialLinkFormProps {
  selectedPlatforms: SocialPlatform[]
  socialValues: Partial<Record<SocialPlatform, string>>
  customLinks: CustomLinkDraft[]
  onSocialChange: (platform: SocialPlatform, value: string) => void
  onCustomLinksChange: (items: CustomLinkDraft[]) => void
  onContinue: () => void
  onChangePlatforms: () => void
}

export function SocialLinkForm({
  selectedPlatforms,
  socialValues,
  customLinks,
  onSocialChange,
  onCustomLinksChange,
  onContinue,
  onChangePlatforms,
}: SocialLinkFormProps) {
  const [socialErrors, setSocialErrors] = useState<Partial<Record<SocialPlatform, string>>>({})
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({})

  const socialPlatforms = selectedPlatforms.filter((p) => p !== 'custom')

  function handleSocialBlur(platform: SocialPlatform) {
    const val = socialValues[platform]?.trim() || ''
    if (!val) {
      setSocialErrors((prev) => ({ ...prev, [platform]: undefined }))
      return
    }
    const check = validatePlatformLinkUrl(platform, val)
    if (!check.ok) {
      setSocialErrors((prev) => ({ ...prev, [platform]: check.error }))
    } else {
      setSocialErrors((prev) => ({ ...prev, [platform]: undefined }))
    }
  }

  function handleSubmit() {
    const nextSocialErrors: Partial<Record<SocialPlatform, string>> = {}
    const nextCustomErrors: Record<string, string> = {}
    let valid = true

    for (const platform of socialPlatforms) {
      const raw = socialValues[platform]?.trim() || ''
      if (!raw) continue
      const res = validatePlatformLinkUrl(platform, raw)
      if (!res.ok) {
        nextSocialErrors[platform] = res.error
        valid = false
      }
    }

    for (const item of customLinks) {
      const title = item.title.trim()
      const urlRaw = item.url.trim()
      if (!title && !urlRaw) continue
      if (!title) {
        nextCustomErrors[item.id] = 'Please enter a title for this link.'
        valid = false
        continue
      }
      const normUrl = normalizeDestinationUrl(urlRaw)
      if (!isValidDestinationUrl(normUrl)) {
        nextCustomErrors[item.id] = 'Please enter a valid http:// or https:// URL.'
        valid = false
      }
    }

    setSocialErrors(nextSocialErrors)
    setCustomErrors(nextCustomErrors)

    if (valid) {
      onContinue()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.025em] leading-[1.15] text-[#141413]">
            Add your links
          </h1>
          <p className="mt-2 text-[15px] text-[#5C5B57] leading-relaxed">
            Enter your profile details to connect everything in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={onChangePlatforms}
          className="shrink-0 rounded-xl border border-[#E6E4DF] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#42413D] hover:border-[#141413] hover:text-[#141413] transition-colors"
        >
          Edit platforms
        </button>
      </div>

      {/* Selected Social Inputs */}
      {socialPlatforms.length > 0 && (
        <div className="space-y-3.5">
          {socialPlatforms.map((platform) => {
            const meta = getPlatformMeta(platform)
            const val = socialValues[platform] ?? ''
            const err = socialErrors[platform]
            const preview = val.trim() ? validatePlatformLinkUrl(platform, val) : null

            return (
              <div key={platform} className="space-y-1.5">
                <label
                  htmlFor={`social-${platform}`}
                  className="block text-[13px] font-semibold text-[#141413]"
                >
                  {meta.label}
                </label>

                <div
                  className={`flex items-center rounded-2xl border bg-white pr-3.5 transition-colors ${
                    err
                      ? 'border-rose-400 focus-within:border-rose-500'
                      : 'border-[#E6E4DF] focus-within:border-[#141413]'
                  }`}
                >
                  <input
                    id={`social-${platform}`}
                    value={val}
                    onChange={(e) => {
                      onSocialChange(platform, e.target.value)
                      if (socialErrors[platform]) {
                        setSocialErrors((prev) => ({ ...prev, [platform]: undefined }))
                      }
                    }}
                    onBlur={() => handleSocialBlur(platform)}
                    placeholder={meta.placeholder}
                    className="w-full rounded-2xl bg-transparent px-4 py-3.5 text-[14px] text-[#141413] placeholder:text-[#9E9C96] focus:outline-none"
                  />
                  <span className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F7F6F3]">
                    <PlatformIcon platform={platform} size={18} />
                  </span>
                </div>

                {err ? (
                  <p role="alert" className="text-[12px] font-medium text-rose-600 px-1">
                    {err}
                  </p>
                ) : preview?.ok ? (
                  <p className="text-[11px] font-mono text-[#6F6E69] truncate px-1">
                    {preview.normalizedUrl}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* Divider if both sections present */}
      {socialPlatforms.length > 0 && <div className="border-t border-[#E6E4DF]" />}

      {/* Other Links */}
      <CustomLinkEditor
        items={customLinks}
        errors={customErrors}
        onChange={onCustomLinksChange}
        onClearError={(id) =>
          setCustomErrors((prev) => {
            if (!prev[id]) return prev
            const next = { ...prev }
            delete next[id]
            return next
          })
        }
      />

      {/* Sticky Bottom Continue */}
      <div className="sticky bottom-0 -mx-4 border-t border-[#E6E4DF] bg-[#F7F6F3]/95 px-4 py-4 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
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

