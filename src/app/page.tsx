import { OursDashboard } from "@/components/dashboard/ours-dashboard";
import { MaintenancePage } from "@/components/dashboard/maintenance-page";
import { LanguageProvider } from "@/components/dashboard/language-context";
import { getMaintenanceMode } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const maintenance = await getMaintenanceMode();
  if (maintenance) {
    return (
      <LanguageProvider>
        <MaintenancePage />
      </LanguageProvider>
    );
  }

  return <OursDashboard />;
}
