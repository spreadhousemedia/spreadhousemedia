import type { PublicLinkItem } from '../../types'
import { SocialIconTile } from './SocialIconTile'

interface SocialIconGridProps {
  links: PublicLinkItem[]
  isDark: boolean
}

function getGridContainerClass(count: number): string {
  // Ensures symmetric, balanced rows with zero awkward left-aligned orphans for 1..15 icons
  if (count <= 4) return 'max-w-[290px]'
  if (count === 5 || count === 6 || count === 9) return 'max-w-[220px] sm:max-w-[230px]'
  if (count <= 12) return 'max-w-[280px] sm:max-w-[300px]'
  return 'max-w-[280px] min-[400px]:max-w-[348px] sm:max-w-[366px]'
}

export function SocialIconGrid({ links, isDark }: SocialIconGridProps) {
  if (links.length === 0) return null

  return (
    <section className="mt-7 flex justify-center" aria-label="Social links">
      <div
        className={`flex flex-wrap items-center justify-center gap-3 sm:gap-3.5 ${getGridContainerClass(
          links.length,
        )}`}
      >
        {links.map((link) => (
          <SocialIconTile key={link.id} link={link} isDark={isDark} />
        ))}
      </div>
    </section>
  )
}

