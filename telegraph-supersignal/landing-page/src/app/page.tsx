import Header from "@/components/header";
import Footer from "@/components/footer";
import HeroSectionNew from "@/components/hero-section-new";
import HowItWorksSection from "@/components/sections/how-it-works-section";
import DecisionEngineSection from "@/components/sections/decision-engine-section";
import WalletsSection from "@/components/sections/wallets-section";
import CallToActionSection from "@/components/sections/call-to-action-section";
import IntegrationsAndPartnershipsSection from "@/components/sections/integrations-partnerships-section";

export default function Home() {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen">
      <Header />
      <main>
        <HeroSectionNew />
        <HowItWorksSection />
        <DecisionEngineSection />
        {/* <DeFiSection /> */}
        <IntegrationsAndPartnershipsSection />
        <WalletsSection />
        <CallToActionSection />
      </main>
      <Footer />
    </div>
  );
}
