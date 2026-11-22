import type { PublicLinkItem } from '../../types'
import { CustomLinkButton } from './CustomLinkButton'

interface CustomLinkListProps {
  links: PublicLinkItem[]
  isDark: boolean
}

export function CustomLinkList({ links, isDark }: CustomLinkListProps) {
  if (links.length === 0) return null

  return (
    <section className="mt-7 space-y-2.5 sm:space-y-3" aria-label="Links">
      {links.map((link) => (
        <CustomLinkButton key={link.id} link={link} isDark={isDark} />
      ))}
    </section>
  )
}

