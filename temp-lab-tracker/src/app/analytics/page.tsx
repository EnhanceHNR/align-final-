import { fetchSubmissions, fetchEntitiesAction } from "@/app/actions";
import { AnalyticsClientPage } from "./AnalyticsClientPage";

export const metadata = {
  title: "Analytics - LabTrack",
};

export default async function AnalyticsPage() {
  const [submissions, labs] = await Promise.all([
    fetchSubmissions(),
    fetchEntitiesAction('labs')
  ]);

  return <AnalyticsClientPage submissions={submissions} labs={labs} />;
}
