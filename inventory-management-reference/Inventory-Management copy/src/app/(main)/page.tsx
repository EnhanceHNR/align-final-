'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { MonthlyConsumptionChart } from '@/components/dashboard/monthly-consumption-chart';
import { ExpiringSoon } from '@/components/dashboard/expiring-soon';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import { DashboardAlerts } from '@/components/dashboard/dashboard-alerts';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" />
      
      <DashboardAlerts />

      <OverviewCards />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Monthly Consumption</CardTitle>
            <CardDescription>Overview of item consumption for the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyConsumptionChart />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Expiring Soon</CardTitle>
            <CardDescription>Items that are approaching their expiry date.</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpiringSoon />
          </CardContent>
        </Card>
      </div>

      <RecentOrders />
    </div>
  );
}
