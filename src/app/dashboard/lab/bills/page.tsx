import { fetchSubmissions, fetchLabTransactions } from "../actions";
import { BillsClientPage } from "@/components/lab/bills/BillsClientPage";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function BillsPage() {
  const submissions = await fetchSubmissions();
  const transactions = await fetchLabTransactions();

  return (
     <div className="container mx-auto p-4 md:p-8 animate-in">
        <div className="mb-6">
            <Link href="/" passHref>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="w-4 h-4" />
                    Back to Dashboard
                </Button>
            </Link>
        </div>

       <Card className="glass-card border-none shadow-xl overflow-hidden mb-8">
        <CardHeader className="bg-white/50 dark:bg-white/5 border-b border-border/10 p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-5">
                <div className="bg-primary/10 p-3 rounded-2xl">
                    <Receipt className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <CardTitle className="text-3xl font-bold tracking-tight">Lab Accounts</CardTitle>
                    <CardDescription className="text-base">Track bills and challans for your labs</CardDescription>
                </div>
            </div>
          </div>
        </CardHeader>
        <div className="p-4 md:p-8">
          <BillsClientPage 
            submissions={submissions || []} 
            transactions={transactions || []}
          />
        </div>
      </Card>
    </div>
  );
}
