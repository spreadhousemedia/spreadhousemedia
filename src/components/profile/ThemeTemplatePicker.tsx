import { Check } from 'lucide-react'
import {
  BUSINESS_THEMES,
  PERSONAL_THEMES,
  resolveBusinessTheme,
  resolvePersonalTheme,
} from '../../lib/profileThemes'
import type { ProfileTheme } from '../../types'

interface ThemeTemplatePickerProps {
  mode: 'business' | 'personal'
  value: ProfileTheme
  onChange: (next: ProfileTheme) => void
}

export function ThemeTemplatePicker({ mode, value, onChange }: ThemeTemplatePickerProps) {
  if (mode === 'business') {
    const active = resolveBusinessTheme(value)
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {BUSINESS_THEMES.map((tpl) => {
          const selected = active.id === tpl.id
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onChange(tpl.id)}
              aria-pressed={selected}
              className={`group relative rounded-xl border p-2.5 text-left transition-all ${
                selected
                  ? 'border-[#161616] bg-white ring-1 ring-[#161616] shadow-xs'
                  : 'border-[#E5E7EB] bg-white hover:border-[#9CA3AF]'
              }`}
            >
              {/* Tactile mini template preview */}
              <div
                className="relative mb-2.5 h-14 w-full overflow-hidden rounded-lg border"
                style={{ backgroundColor: tpl.canvas, borderColor: tpl.border }}
              >
                {tpl.layout === 'executive' && tpl.headerBand && (
                  <div className="h-4 w-full" style={{ backgroundColor: tpl.headerBand }} />
                )}
                <div
                  className={`mx-auto rounded-md border px-2 py-1 ${
                    tpl.layout === 'executive' ? '-mt-1.5 w-4/5' : 'mt-2 w-4/5'
                  }`}
                  style={{ backgroundColor: tpl.card, borderColor: tpl.border }}
                >
                  <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: tpl.accent }} />
                  <div
                    className="mt-1 h-1 w-12 rounded-full opacity-40"
                    style={{ backgroundColor: tpl.muted }}
                  />
                </div>
              </div>

              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#161616]">{tpl.name}</p>
                  <p className="truncate text-[10px] text-[#6B7280]">{tpl.description}</p>
                </div>
                {selected && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#161616] text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const active = resolvePersonalTheme(value)
  const professionalThemes = PERSONAL_THEMES.filter((t) => t.category === 'professional')
  const funkyThemes = PERSONAL_THEMES.filter((t) => t.category === 'funky')

  const renderPersonalCard = (tpl: (typeof PERSONAL_THEMES)[number]) => {
    const selected = active.id === tpl.id
    return (
      <button
        key={tpl.id}
        type="button"
        onClick={() => onChange(tpl.id)}
        aria-pressed={selected}
        className={`group relative rounded-xl border p-2.5 text-left transition-all ${
          selected
            ? 'border-[#141413] bg-white ring-1 ring-[#141413] shadow-xs'
            : 'border-[#E6E4DF] bg-white hover:border-[#9E9C96]'
        }`}
      >
        <div
          className="mb-2.5 flex h-14 w-full flex-col items-center justify-center rounded-lg border p-2"
          style={{ backgroundColor: tpl.canvas, borderColor: tpl.border }}
        >
          <span
            className="h-3.5 w-3.5 rounded-full border"
            style={{ backgroundColor: tpl.accent, borderColor: tpl.border }}
          />
          <div
            className="mt-1.5 h-3 w-4/5 rounded border"
            style={{
              backgroundColor: tpl.card,
              borderColor: tpl.border,
              borderWidth: tpl.borderWidth ?? 1,
              boxShadow: tpl.tactileShadow,
            }}
          />
        </div>

        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[#141413]">{tpl.name}</p>
            <p className="truncate text-[10px] text-[#6F6E69]">{tpl.description}</p>
          </div>
          {selected && (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#141413] text-white">
              <Check className="h-2.5 w-2.5 stroke-[3]" />
            </span>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#6F6E69]">
          Professional &amp; Minimal
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {professionalThemes.map(renderPersonalCard)}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#6F6E69]">
          Funky &amp; Bold
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {funkyThemes.map(renderPersonalCard)}
        </div>
      </div>
    </div>
  )
}

