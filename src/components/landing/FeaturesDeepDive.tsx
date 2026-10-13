import { useState } from 'react'
import { Link } from 'react-router-dom'

interface FeatureItem {
  id: string
  badge: string
  title: string
  headline: string
  description: string
  details: string[]
  benefitLabel: string
  exampleScenario: {
    beforeTitle: string
    beforeLink: string
    afterTitle: string
    afterLink: string
    changeReason: string
  }
}

const CLIENT_FEATURES: FeatureItem[] = [
  {
    id: 'instant-updates',
    badge: 'TOTAL AGILITY',
    title: 'Instant Link Updates',
    headline: 'Change Your Target Link in 30 Seconds Anytime',
    description:
      'Running a new weekend promotion? Updated your restaurant menu prices? Changed your Instagram handle? Update your QR code online instantly—your physical stickers and counter standees stay right where they are.',
    details: [
      'Changes take effect immediately across all physical standees and stickers',
      'No reprinting, no delivery waits, and no replacement labor required',
      'Works seamlessly from any mobile browser or desktop computer',
      'Update as frequently as you like—daily, weekly, or seasonally',
    ],
    benefitLabel: 'Saves 100% of Reprinting Costs',
    exampleScenario: {
      beforeTitle: 'Monday Lunch Menu',
      beforeLink: 'https://mycafe.com/lunch-menu',
      afterTitle: 'Friday Happy Hour Specials',
      afterLink: 'https://mycafe.com/happy-hour',
      changeReason: 'Updated in 20 seconds before evening rush without touching table cards.',
    },
  },
  {
    id: 'password-locked',
    badge: 'SECURITY & PRIVACY',
    title: 'Password-Protected Security',
    headline: 'Your QR Codes Are Locked to Your Private Password',
    description:
      'Only you and your authorized staff can change where your QR code redirects. When you claim or configure your code, you set a private password that protects your brand from unauthorized changes.',
    details: [
      'Each QR code is safeguarded by your private chosen password',
      'Anyone attempting to change the link must know the correct password',
      'Simple password entry with a show/hide toggle for easy typing',
      'Peace of mind knowing your customer traffic always reaches your authentic page',
    ],
    benefitLabel: 'Protected Brand Traffic',
    exampleScenario: {
      beforeTitle: 'Current Target Link',
      beforeLink: 'https://mybrand.com/shop',
      afterTitle: 'Authorized Staff Update',
      afterLink: 'https://mybrand.com/new-collection',
      changeReason: 'Verified with secret password before any link update is accepted.',
    },
  },
  {
    id: 'first-scan-setup',
    badge: 'EASY ONBOARDING',
    title: 'First-Scan Automatic Claiming',
    headline: 'Fresh Standees Are Ready to Setup Right Out of the Box',
    description:
      'When your physical standees or stickers arrive, they are ready for action. Simply open your phone camera and scan the standee—you will be guided straight to a friendly screen to enter your website link and create your password.',
    details: [
      'No complicated onboarding or technical training needed',
      'Your phone camera automatically recognizes your unique QR code ID',
      'Simply paste your link, pick your password, and click Save',
      'Immediately test your standee right after saving to verify it works',
    ],
    benefitLabel: 'Instant 1-Minute Activation',
    exampleScenario: {
      beforeTitle: 'Fresh Unclaimed Standee',
      beforeLink: 'Unassigned (Waiting for your link)',
      afterTitle: 'Live Active Standee',
      afterLink: 'https://g.page/r/my-business-review',
      changeReason: 'Claimed by business owner on first scan directly from their smartphone.',
    },
  },
  {
    id: 'typo-protection',
    badge: 'LINK SAFETY',
    title: 'Automatic Link Verification',
    headline: 'Smart Checks Prevent Dead Links or Broken Websites',
    description:
      'Ever printed a marketing banner with a typo in the link? With Spread NFC, our system automatically verifies that your link is active and reachable before saving, so your customers never encounter an embarrassing error page.',
    details: [
      'Automatic check verifies the website responds before saving',
      'Automatically corrects missing "https://" prefixes for you',
      'Alerts you immediately if a domain is misspelled or inactive',
      'Guarantees your customers always reach a working destination',
    ],
    benefitLabel: 'Zero Dead-End Links',
    exampleScenario: {
      beforeTitle: 'Misspelled Web Address',
      beforeLink: 'https://exampel-typo-site.org',
      afterTitle: 'System Alert & Fixed Link',
      afterLink: 'https://example-verified-site.com',
      changeReason: 'System alerted owner of unreachable link before saving, preventing customer errors.',
    },
  },
  {
    id: 'no-app-needed',
    badge: 'CUSTOMER EXPERIENCE',
    title: 'No App Required for Customers',
    headline: 'Fast, Frictionless Scanning on All Smartphones',
    description:
      'Your customers do not need to install any app or register for any account. They simply point their smartphone camera at your standee, and their browser opens your link in less than a second.',
    details: [
      'Compatible with native camera apps on all iPhones and Android devices',
      'Zero download prompts or sign-up barriers for your visitors',
      'High error-correction ensures fast scans even at an angle or in low light',
      'Maximizes engagement, reviews, orders, and social follows',
    ],
    benefitLabel: '100% Smartphone Compatibility',
    exampleScenario: {
      beforeTitle: 'Customer Points Camera',
      beforeLink: 'Native iPhone / Android Camera',
      afterTitle: 'Instant Redirection',
      afterLink: 'Opens your digital menu in under 1 second',
      changeReason: 'Frictionless customer experience that drives higher conversion.',
    },
  },
  {
    id: 'all-links-welcome',
    badge: 'VERSATILITY',
    title: 'Connect to Any Online Destination',
    headline: 'One Standee Can Point to Everything Your Business Needs',
    description:
      'Your Smart QR is not limited to a single type of content. Rotate between different online destinations depending on your business goals for the day, week, or season.',
    details: [
      'Google Review Page to boost your 5-star local rankings',
      'Digital Menu or Online Ordering for contactless dining',
      'Instagram, TikTok, or Facebook to grow your social community',
      'WhatsApp Business chat for direct instant customer inquiries',
    ],
    benefitLabel: 'Multi-Purpose Marketing',
    exampleScenario: {
      beforeTitle: 'Summer Campaign',
      beforeLink: 'https://instagram.com/mybrand',
      afterTitle: 'Holiday Campaign',
      afterLink: 'https://mybrand.com/holiday-sale',
      changeReason: 'Changed from social community building to direct holiday checkout link.',
    },
  },
]

export function FeaturesDeepDive() {
  const [activeTab, setActiveTab] = useState<string>(CLIENT_FEATURES[0].id)
  const currentFeature = CLIENT_FEATURES.find((f) => f.id === activeTab) || CLIENT_FEATURES[0]

  return (
    <section id="benefits" className="py-28 bg-surface-soft border-y border-surface-border relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wider text-lavender bg-lavender/10 border border-lavender/20 mb-4">
            05 // CLIENT ADVANTAGES
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            Built for Real-World{' '}
            <span className="font-editorial italic font-normal text-lavender">
              Business Agility
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl mx-auto">
            Everything your business needs to manage customer connections effortlessly from physical standees and stickers.
          </p>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-surface-border mb-10">
          {CLIENT_FEATURES.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => setActiveTab(feature.id)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                activeTab === feature.id
                  ? 'bg-lavender text-white shadow-md shadow-lavender/25'
                  : 'bg-white text-ink-muted hover:text-ink hover:bg-surface-subtle border border-surface-border'
              }`}
            >
              {feature.title}
            </button>
          ))}
        </div>

        {/* Active Feature Showcase Box */}
        <div className="bg-white rounded-3xl border border-surface-border shadow-xl p-6 sm:p-10 lg:p-12 transition-all">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-mono font-bold tracking-wider text-lavender bg-lavender/10 px-2.5 py-1 rounded-md border border-lavender/20">
                  {currentFeature.badge}
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                  ✓ {currentFeature.benefitLabel}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink tracking-tight leading-tight">
                {currentFeature.headline}
              </h3>

              <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                {currentFeature.description}
              </p>

              <div className="pt-2">
                <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-3.5">
                  How This Helps Your Operations
                </h4>
                <ul className="space-y-3">
                  {currentFeature.details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-3 text-xs sm:text-sm text-ink">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4">
                <Link
                  to="/update"
                  className="inline-flex items-center gap-2 text-xs font-bold text-lavender hover:text-lavender-hover transition-colors"
                >
                  <span>Experience the Update Portal</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right Visual Scenario Box (Client-Oriented Editorial White Card) */}
            <div className="lg:col-span-5">
              <div className="bg-surface-soft rounded-2xl p-6 sm:p-7 text-ink border border-surface-border shadow-md space-y-5">
                <div className="flex items-center justify-between pb-3.5 border-b border-surface-border text-xs">
                  <span className="font-semibold text-ink-muted font-mono text-[11px] uppercase tracking-wider">Client Workflow Scenario</span>
                  <span className="text-[11px] font-mono font-semibold text-electric bg-electric/10 px-2.5 py-0.5 rounded border border-electric/20">
                    Live Demo
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-white rounded-xl border border-surface-border shadow-xs">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                      Initial Destination Link
                    </span>
                    <p className="text-xs font-bold text-ink">{currentFeature.exampleScenario.beforeTitle}</p>
                    <p className="text-[11px] font-mono text-ink-muted truncate mt-0.5">
                      {currentFeature.exampleScenario.beforeLink}
                    </p>
                  </div>

                  <div className="flex justify-center text-electric">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200/80 shadow-xs">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-700 block mb-1">
                      Updated in Seconds (Zero Reprinting)
                    </span>
                    <p className="text-xs font-bold text-slate-900">{currentFeature.exampleScenario.afterTitle}</p>
                    <p className="text-[11px] font-mono text-emerald-700 font-semibold truncate mt-0.5">
                      {currentFeature.exampleScenario.afterLink}
                    </p>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-surface-border text-xs text-ink-muted flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>{currentFeature.exampleScenario.changeReason}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6-Grid Feature Summary */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CLIENT_FEATURES.map((f) => (
            <div
              key={f.id}
              onClick={() => setActiveTab(f.id)}
              className={`cursor-pointer p-6 sm:p-7 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                activeTab === f.id
                  ? 'bg-white border-electric shadow-lg ring-2 ring-electric/20'
                  : 'bg-white/70 border-surface-border hover:bg-white hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono font-semibold text-electric bg-electric/10 px-2 py-0.5 rounded">
                  {f.badge}
                </span>
                <h4 className="font-bold text-base text-ink mt-2.5">{f.title}</h4>
                <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">{f.description}</p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-border flex items-center justify-between text-xs text-electric font-semibold">
                <span>Explore Feature</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
