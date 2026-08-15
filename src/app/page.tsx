import {
  LandingAbout,
  LandingCta,
  LandingFeatures,
  LandingFooter,
  LandingHero,
  LandingNav,
  LandingTestimonials,
} from "@/components/landing/LandingSections";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-white">
      <LandingNav session={session} />
      <LandingHero />
      <LandingFeatures />
      <LandingAbout />
      <LandingTestimonials />
      <LandingCta />
      <LandingFooter />
    </div>
  );
}
