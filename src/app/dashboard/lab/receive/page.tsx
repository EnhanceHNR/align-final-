
import { ReceiveForm } from "@/components/lab/forms/ReceiveForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchUsersAction, fetchSubmissions } from "../actions";

export default async function ReceivePage() {
  try {
    const [rawUsers, rawSubmissions] = await Promise.all([
      fetchUsersAction(),
      fetchSubmissions()
    ]);

    // Deep clone to prevent RSC serialization errors
    const users = JSON.parse(JSON.stringify(rawUsers || []));
    const submissions = JSON.parse(JSON.stringify(rawSubmissions || []));

    // Find records that are already received to filter them out
    const receivedIds = new Set(submissions.filter((s: any) => s.type === 'receive' && s.linkedRecordId).map((s: any) => s.linkedRecordId));
    
    // Only show sent records that haven't been received yet
    const sentRecords = submissions.filter((s: any) => s.type === 'send' && !receivedIds.has(s.id));

    return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl animate-in">
        <div className="mb-6">
            <Link href="/" passHref>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="w-4 h-4" />
                    Back to Dashboard
                </Button>
            </Link>
        </div>
        <Card className="glass-card border-none shadow-2xl">
            <CardHeader className="border-b border-border/10 pb-6">
                <div className="flex items-center gap-5">
                    <div className="bg-primary/10 p-3 rounded-2xl">
                        <Archive className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                    <CardTitle className="text-2xl font-bold">Receive Submission</CardTitle>
                    <CardDescription>Enter details for the item being received from the lab.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-8">
                <ReceiveForm users={users} sentRecords={sentRecords} />
            </CardContent>
        </Card>
    </div>
    );
  } catch (error: any) {
    return (
      <div className="p-10 bg-red-100 text-red-900 border border-red-500 rounded-xl m-10">
        <h2 className="text-xl font-bold">ReceivePage SSR Error</h2>
        <pre className="whitespace-pre-wrap mt-4">{error.stack || error.message || String(error)}</pre>
      </div>
    );
  }
}
