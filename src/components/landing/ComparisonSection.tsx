export function ComparisonSection() {
  const rows = [
    {
      criteria: 'Target Link Changes',
      staticQr: 'Impossible. If your link changes, all printed stickers and standees must be thrown away.',
      spreadNfc: 'Instant. Update link anytime in 30 seconds without touching physical stickers.',
      advantage: true,
    },
    {
      criteria: 'Pre-Printing Physical Stock',
      staticQr: 'Cannot pre-print. Final URL must be known before printing starts.',
      spreadNfc: 'Pre-print physical standees in advance with unique IDs, and assign links whenever ready.',
      advantage: true,
    },
    {
      criteria: 'First-Scan Activation',
      staticQr: 'Not supported. Scans will result in an error or lead to dead ends.',
      spreadNfc: 'Brand new standees prompt you to claim them and enter your link on first scan.',
      advantage: true,
    },
    {
      criteria: 'Security & Control',
      staticQr: 'None. Once printed, it cannot be controlled or protected.',
      spreadNfc: 'Password-protected with your private key so only authorized people can edit it.',
      advantage: true,
    },
    {
      criteria: 'Typo & Broken-Link Protection',
      staticQr: 'None. A single typo in the URL permanently ruins every single printed card.',
      spreadNfc: 'Automatic live check verifies the web address exists before allowing you to save.',
      advantage: true,
    },
    {
      criteria: 'Multi-Campaign Reusability',
      staticQr: 'Locked forever to whatever website was printed on day one.',
      spreadNfc: 'Rotate between your Menu, Instagram, Google Reviews, or Sale offers as often as you want.',
      advantage: true,
    },
    {
      criteria: 'Long-Term Printing Costs',
      staticQr: 'Ongoing reprint and labor expenses whenever business details change.',
      spreadNfc: '$0.00 reprint cost. One physical standee or sticker lasts for the lifetime of your business.',
      advantage: true,
    },
  ]

  return (
    <section id="comparison" className="py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wider text-lavender bg-lavender/10 border border-lavender/20 mb-4">
            06 // COMPARATIVE ANALYSIS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            Traditional Static QR vs.{' '}
            <span className="font-editorial italic font-normal text-lavender">
              Spread NFC Dynamic QR
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl mx-auto">
            Why modern businesses are upgrading from disposable printed stickers to permanent smart dynamic QR codes.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-surface-border shadow-xl bg-white max-w-5xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-soft">
                  <th className="py-5 px-6 font-bold text-ink w-1/4">Feature</th>
                  <th className="py-5 px-6 font-bold text-ink-muted w-3/8">Traditional Static QR</th>
                  <th className="py-5 px-6 font-bold text-lavender bg-lavender/5 w-3/8">
                    Spread NFC Smart Dynamic QR
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-soft/60 transition-colors">
                    <td className="py-5 px-6 font-semibold text-ink">{row.criteria}</td>
                    <td className="py-5 px-6 text-ink-muted">
                      <div className="flex items-start gap-2.5">
                        <span className="text-rose-500 shrink-0 font-bold">✕</span>
                        <span>{row.staticQr}</span>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-ink bg-lavender/5 font-medium">
                      <div className="flex items-start gap-2.5">
                        <span className="text-emerald-600 shrink-0 font-bold">✓</span>
                        <span>{row.spreadNfc}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
