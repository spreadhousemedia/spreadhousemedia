import { Navbar } from '../../components/landing/Navbar'
import { HeroSection } from '../../components/landing/HeroSection'
import { InteractiveSimulator } from '../../components/landing/InteractiveSimulator'
import { HowItWorks } from '../../components/landing/HowItWorks'
import { ImpactMetricsSection } from '../../components/landing/ImpactMetricsSection'
import { FeaturesDeepDive } from '../../components/landing/FeaturesDeepDive'
import { ComparisonSection } from '../../components/landing/ComparisonSection'
import { AboutFounderSection } from '../../components/landing/AboutFounderSection'
import { UseCasesSection } from '../../components/landing/UseCasesSection'
import { ArchitectureSecurity } from '../../components/landing/ArchitectureSecurity'
import { FaqSection } from '../../components/landing/FaqSection'
import { CtaFooter } from '../../components/landing/CtaFooter'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-ink flex flex-col selection:bg-electric selection:text-white">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <ImpactMetricsSection />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <InteractiveSimulator />
        </div>
        <HowItWorks />
        <FeaturesDeepDive />
        <AboutFounderSection />
        <ComparisonSection />
        <UseCasesSection />
        <ArchitectureSecurity />
        <FaqSection />
      </main>
      <CtaFooter />
    </div>
  )
}
