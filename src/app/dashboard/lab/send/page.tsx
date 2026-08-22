
import { SendForm } from "@/components/lab/forms/SendForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchUsersAction, fetchSubmissions } from "../actions";

export default async function SendPage() {
    try {
        const [rawUsers, rawSubmissions] = await Promise.all([
            fetchUsersAction(),
            fetchSubmissions()
        ]);
        
        // Deep clone to remove any non-serializable objects (like undefined, Dates on some runtimes)
        const users = JSON.parse(JSON.stringify(rawUsers || []));
        const submissions = JSON.parse(JSON.stringify(rawSubmissions || []));
        
        // Only get 'receive' records to show history of what patients have previously sent/received
        const receivedRecords = submissions.filter((s: any) => s.type === 'receive');

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
        return <div className="p-8 text-center text-red-500 bg-red-500/10 rounded-xl max-w-md mx-auto mt-8 border border-red-500/20">Error loading Send Page: {error.message}</div>;
    }
}
