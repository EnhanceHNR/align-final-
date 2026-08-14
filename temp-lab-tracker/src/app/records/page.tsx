import { fetchSubmissions, fetchLabs } from "@/lib/data";
import { RecordsClientPage } from "@/components/records/RecordsClientPage";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function RecordsPage({ searchParams }: Props) {
  try {
    const [submissions, labs] = await Promise.all([
        fetchSubmissions(),
        fetchLabs()
    ]);

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
                    <FileText className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <CardTitle className="text-3xl font-bold tracking-tight">Records</CardTitle>
                    <CardDescription className="text-base">Manage and export your lab submissions</CardDescription>
                </div>
            </div>
          </div>
        </CardHeader>
        <div className="p-0">
          <RecordsClientPage 
            submissions={submissions} 
            labs={labs} 
            initialOpenId={typeof searchParams.id === 'string' ? searchParams.id : Array.isArray(searchParams.id) ? searchParams.id[0] : undefined} 
          />
        </div>
      </Card>
    </div>
    );
  } catch (error: any) {
    return (
      <div className="p-10 bg-red-100 text-red-900 border border-red-500 rounded-xl m-10">
        <h2 className="text-xl font-bold">RecordsPage SSR Error</h2>
        <pre className="whitespace-pre-wrap mt-4">{error.stack || error.message || String(error)}</pre>
      </div>
    );
  }
}
