import type { ProfileTheme, PublicLinkItem, PublicProfileData } from '../../types'
import { PublicProfileView } from './PublicProfileView'

interface ProfileCardProps {
  profile: PublicProfileData
  links: PublicLinkItem[]
  qrNumber: string
  previewMode?: boolean
  onThemeChange?: (next: ProfileTheme) => void
}

export function ProfileCard(props: ProfileCardProps) {
  return <PublicProfileView {...props} />
}
