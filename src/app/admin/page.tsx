import { AdminPanel } from "@/components/admin/admin-panel";

export const metadata = {
  title: "Admin — ours.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}
