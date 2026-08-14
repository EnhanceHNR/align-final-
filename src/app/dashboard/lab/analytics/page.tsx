import { AnalyticsClientPage } from "@/components/lab/analytics/AnalyticsClientPage";
import { fetchSubmissions, fetchEntitiesAction } from "@/app/dashboard/lab/actions";

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const submissions = await fetchSubmissions();
  const labs = await fetchEntitiesAction("labs");

  const validSubmissions = submissions.map(sub => ({
    ...sub,
    createdAt: new Date(sub.createdAt),
    appointmentDate: sub.appointmentDate ? new Date(sub.appointmentDate) : undefined,
  }));

  return <AnalyticsClientPage submissions={validSubmissions as any} labs={labs as any} />;
}
