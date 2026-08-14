"use client";

import { useState, useEffect } from "react";
import { useRoles } from "@/hooks/use-roles";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { approveOrderAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Submission } from "@/lib/types";

export default function PendingApprovalsPage() {
  const { isAdmin, isLoading: isRoleLoading } = useRoles();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [pendingOrders, setPendingOrders] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isRoleLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You must be an Admin to view this page.",
        variant: "destructive",
      });
      router.push("/");
    }
  }, [isAdmin, isRoleLoading, router, toast]);

  const fetchPendingOrders = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "submissions"),
        where("type", "==", "send"),
        where("approvalStatus", "==", "Pending")
        // Note: orderBy might require a composite index if combining where and orderBy
      );
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Submission[];
      
      // Sort manually to avoid index requirement for now
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setPendingOrders(fetched);
    } catch (error) {
      console.error("Error fetching pending orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchPendingOrders();
    }
  }, [db, isAdmin]);

  const handleAction = async (id: string, status: 'Approved' | 'Rejected') => {
    setProcessingId(id);
    try {
      const result = await approveOrderAction(id, status);
      if (result.success) {
        toast({
          title: `Order ${status}`,
          description: `The order has been successfully ${status.toLowerCase()}.`,
        });
        fetchPendingOrders();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Action failed",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (isRoleLoading || !isAdmin) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Verifying Permissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Clock className="w-8 h-8 text-primary" /> Pending Approvals
            </h1>
            <p className="text-muted-foreground font-medium">Review and approve new send orders</p>
          </div>
        </div>
      </div>

      <Card className="glass-card border-none shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                  Orders Awaiting Approval
              </CardTitle>
              <Badge variant="outline" className="rounded-full bg-primary/10 text-primary border-none">
                  {pendingOrders.length} Pending
              </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 opacity-20 text-green-500" />
                <p className="font-bold">All caught up! No pending orders.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/10 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Patient & Lab</TableHead>
                    <TableHead className="font-bold">Item / Service</TableHead>
                    <TableHead className="font-bold">Sender</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="font-bold">{new Date(order.createdAt).toLocaleDateString()}</span>
                            <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-primary">{order.patientName}</span>
                          <span className="text-xs text-muted-foreground font-medium">{order.labName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-background shadow-sm">{order.item}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold">{order.senderName}</span>
                          {order.senderEmail && <span className="text-xs text-muted-foreground">{order.senderEmail}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-destructive/20 text-destructive hover:bg-destructive/10"
                                disabled={processingId === order.id}
                                onClick={() => handleAction(order.id, 'Rejected')}
                            >
                                {processingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />} Reject
                            </Button>
                            <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={processingId === order.id}
                                onClick={() => handleAction(order.id, 'Approved')}
                            >
                                {processingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />} Approve
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
