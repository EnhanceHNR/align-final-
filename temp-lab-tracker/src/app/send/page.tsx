import { SendForm } from "@/components/forms/SendForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchUsersAction, fetchSubmissions } from "../actions";

export default async function SendPage() {
  try {
    const users = await fetchUsersAction();
    const allSubmissions = await fetchSubmissions();
    const receivedRecords = allSubmissions.filter(sub => sub.type === 'receive');

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
                        <Send className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                    <CardTitle className="text-2xl font-bold">Send Submission</CardTitle>
                    <CardDescription>Enter details for the item being sent to the lab.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-8">
                <SendForm users={users} receivedRecords={receivedRecords} />
            </CardContent>
        </Card>
    </div>
    );
  } catch (error: any) {
    return (
      <div className="p-10 bg-red-100 text-red-900 border border-red-500 rounded-xl m-10">
        <h2 className="text-xl font-bold">SendPage SSR Error</h2>
        <pre className="whitespace-pre-wrap mt-4">{error.stack || error.message || String(error)}</pre>
      </div>
    );
  }
}
