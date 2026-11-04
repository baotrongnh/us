import { OursDashboard } from "@/components/dashboard/ours-dashboard";
import { MaintenancePage } from "@/components/dashboard/maintenance-page";
import { LanguageProvider } from "@/components/dashboard/language-context";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = await getSiteSettings();
  if (settings.maintenance) {
    return (
      <LanguageProvider>
        <MaintenancePage />
      </LanguageProvider>
    );
  }

  return <OursDashboard mapLocations={settings.locations} />;
}
