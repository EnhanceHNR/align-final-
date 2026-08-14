import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown } from "lucide-react";
import { StockOverviewChart } from "@/components/reports/stock-overview-chart";
import { DealerPerformanceChart } from "@/components/reports/dealer-performance-chart";
import { MonthlyConsumptionChart } from "@/components/dashboard/monthly-consumption-chart";

export default function ReportsPage() {
    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Reports & Analytics">
                <Button variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Reports
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Stock Overview</CardTitle>
                        <CardDescription>Distribution of items by category.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <StockOverviewChart />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Dealer Performance</CardTitle>
                        <CardDescription>Comparison of total order value by dealer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DealerPerformanceChart />
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Monthly Consumption</CardTitle>
                    <CardDescription>Overview of item consumption for the last 6 months.</CardDescription>
                </CardHeader>
                <CardContent>
                    <MonthlyConsumptionChart />
                </CardContent>
            </Card>
        </div>
    );
}
