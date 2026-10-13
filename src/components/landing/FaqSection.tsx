import { useState } from 'react'

interface FaqItem {
  q: string
  a: string
}

const CLIENT_FAQS: FaqItem[] = [
  {
    q: 'How does a dynamic QR code work without reprinting?',
    a: 'When you print a Spread NFC QR code, its physical graphic stays permanent. You can change where it points anytime through our online Update Portal. When you save a new link, scanners are immediately directed to your new destination—your physical sticker or acrylic standee never needs to be reprinted!',
  },
  {
    q: 'How do I change the link on my QR code?',
    a: 'Simply click "Update My QR Link" at the top of this page, type your QR number (printed on the bottom of your physical standee), enter your private password, and paste your new destination URL. Your update is active immediately across all physical copies.',
  },
  {
    q: 'Do my customers need to install a special app to scan?',
    a: 'Not at all! Customers simply open their standard smartphone camera (on any iPhone or Android phone) and point it at your standee. In less than a second, their phone browser opens your live page.',
  },
  {
    q: 'How is my QR code protected from unauthorized changes?',
    a: 'Your QR code is locked behind your private password. Nobody can alter where your physical standees redirect without entering your correct password.',
  },
  {
    q: 'What types of online links can I connect to my QR code?',
    a: 'Any valid web address! You can link to your Digital Menu, Google Review page, Instagram profile, WhatsApp chat, product manual, online booking portal, or full website. You can also change between them as often as you like.',
  },
  {
    q: 'What happens if I accidentally type a broken link or a typo?',
    a: 'Our system automatically verifies that your destination link is active and reachable before saving. If there is a typo or an invalid domain, you will be alerted immediately so your customers never encounter an error screen.',
  },
  {
    q: 'What if I forget the password for my QR code?',
    a: 'If you ever lose or forget your password, simply contact our support team with your QR code ID and business details, and our team will securely verify your ownership and assist you in resetting it.',
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-28 bg-surface-soft border-t border-surface-border relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wider text-lavender bg-lavender/10 border border-lavender/20 mb-4">
            08 // QUESTIONS & ANSWERS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            Client & User{' '}
            <span className="font-editorial italic font-normal text-lavender">
              Help Center
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-muted leading-relaxed">
            Everything you need to know about setting up, scanning, and updating your smart QR codes.
          </p>
        </div>

        <div className="space-y-4">
          {CLIENT_FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-surface-border shadow-xs overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full py-5 px-6 text-left flex items-center justify-between gap-4 font-bold text-ink hover:text-lavender transition-colors"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-ink-muted transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-lavender/10 text-lavender' : ''
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-xs sm:text-sm text-ink-muted leading-relaxed border-t border-surface-border pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
