import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { CUSTOM_LINK_ICONS, PlatformIcon } from '../profile/PlatformIcons'

export interface CustomLinkDraft {
  id: string
  title: string
  url: string
  icon: string
}

interface CustomLinkEditorProps {
  items: CustomLinkDraft[]
  errors: Record<string, string>
  onChange: (items: CustomLinkDraft[]) => void
  onClearError: (id: string) => void
}

export function CustomLinkEditor({
  items,
  errors,
  onChange,
  onClearError,
}: CustomLinkEditorProps) {
  function handleAdd() {
    onChange([
      ...items,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: '',
        url: '',
        icon: 'link',
      },
    ])
  }

  function handleUpdate(id: string, patch: Partial<CustomLinkDraft>) {
    onClearError(id)
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function handleRemove(id: string) {
    onClearError(id)
    onChange(items.filter((item) => item.id !== id))
  }

  function handleMove(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= items.length) return
    const copy = [...items]
    const [moved] = copy.splice(index, 1)
    copy.splice(next, 0, moved)
    onChange(copy)
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-semibold text-[#141413]">Other Links</h2>
          <p className="text-[13px] text-[#5C5B57]">
            Add portfolios, websites, stores, booking pages, or any custom URL.
          </p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const err = errors[item.id]
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-[#E6E4DF] bg-white p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3F2EE] text-[#42413D]">
                      <PlatformIcon platform="custom" customIcon={item.icon} size={16} />
                    </span>
                    <select
                      aria-label="Choose link icon"
                      value={item.icon}
                      onChange={(e) => handleUpdate(item.id, { icon: e.target.value })}
                      className="rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] px-2.5 py-1.5 text-[12px] font-medium text-[#42413D] focus:border-[#141413] focus:outline-none"
                    >
                      {CUSTOM_LINK_ICONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move link up"
                      className="rounded-lg p-1.5 text-[#6F6E69] hover:bg-[#F3F2EE] hover:text-[#141413] disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 1)}
                      disabled={idx === items.length - 1}
                      aria-label="Move link down"
                      className="rounded-lg p-1.5 text-[#6F6E69] hover:bg-[#F3F2EE] hover:text-[#141413] disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      aria-label="Delete link"
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <input
                      value={item.title}
                      onChange={(e) => handleUpdate(item.id, { title: e.target.value })}
                      maxLength={80}
                      placeholder="Link title (e.g. My Portfolio)"
                      className="w-full rounded-xl border border-[#E6E4DF] bg-white px-3.5 py-2.5 text-[14px] text-[#141413] placeholder:text-[#9E9C96] focus:border-[#141413] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <input
                      value={item.url}
                      onChange={(e) => handleUpdate(item.id, { url: e.target.value })}
                      inputMode="url"
                      placeholder="https://yourwebsite.com"
                      className="w-full rounded-xl border border-[#E6E4DF] bg-white px-3.5 py-2.5 text-[14px] text-[#141413] placeholder:text-[#9E9C96] focus:border-[#141413] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {err && (
                  <p role="alert" className="text-[12px] font-medium text-rose-600">
                    {err}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#CFCBC3] bg-white/60 px-4 text-[13px] font-semibold text-[#42413D] hover:border-[#141413] hover:bg-white hover:text-[#141413] transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>{items.length === 0 ? 'Add a custom link' : 'Add another link'}</span>
      </button>
    </div>
  )
}

