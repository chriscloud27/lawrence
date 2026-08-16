import styles from "./marketing.module.css";
import TopBar from "./TopBar";
import SiteHeader from "./SiteHeader";
import MainNav from "./MainNav";
import TrustpilotStrip from "./TrustpilotStrip";
import HeroCarousel from "./HeroCarousel";
import ServicesTabs from "./ServicesTabs";
import AboutSection from "./AboutSection";
import AwardsSection from "./AwardsSection";
import TutorsGrid from "./TutorsGrid";
import NewsSection from "./NewsSection";
import SiteFooter from "./SiteFooter";

export default function MarketingPage() {
  return (
    <div className={styles.page}>
      <TopBar />
      <SiteHeader />
      <MainNav />
      <TrustpilotStrip />
      <HeroCarousel />
      <ServicesTabs />
      <AboutSection />
      <AwardsSection />
      <TutorsGrid />
      <NewsSection />
      <SiteFooter />
    </div>
  );
}
