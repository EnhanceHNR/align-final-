import { AnalyticsClientPage } from "@/components/lab/analytics/AnalyticsClientPage";
import { fetchSubmissions, fetchEntitiesAction } from "@/app/dashboard/lab/actions";

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const submissions = await fetchSubmissions();
  const labs = await fetchEntitiesAction("labs");

  const safeSubmissions = JSON.parse(JSON.stringify(submissions));
  const safeLabs = JSON.parse(JSON.stringify(labs));

  return <AnalyticsClientPage submissions={safeSubmissions} labs={safeLabs} />;
}
