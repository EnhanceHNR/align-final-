"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SuperAdminBillingPage() {
  return (
    <div className="p-8 space-y-8 h-full bg-slate-50 overflow-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Billing & MRR</h1>
        <p className="text-slate-500 mt-2">Financial metrics and subscription overview.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Stripe Metrics</CardTitle>
          <CardDescription>MRR, Active Subscribers, Churn</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please provide Stripe API keys to fully activate this dashboard.</p>
        </CardContent>
      </Card>
    </div>
  );
}
