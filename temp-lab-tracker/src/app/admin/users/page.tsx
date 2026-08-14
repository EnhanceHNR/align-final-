"use client";

import { useState, useEffect } from "react";
import { useRoles } from "@/hooks/use-roles";
import { useUser, useFirestore } from "@/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { createInternalUserAction, fetchUsersAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Shield, User as UserIcon, Mail, Lock, Loader2, ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function UserManagementPage() {
  const { user } = useUser();
  const { isAdmin, isLoading: isRoleLoading } = useRoles();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "staff" as "admin" | "staff",
  });

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

  useEffect(() => {
    async function fetchUsers() {
      try {
        const fetchedUsers = await fetchUsersAction();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsUsersLoading(false);
      }
    }

    if (isAdmin) {
      fetchUsers();
    }
  }, [db, isAdmin]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const result = await createInternalUserAction(user.uid, formData);
      if (result.success) {
        toast({
          title: "User Created",
          description: result.message,
        });
        setFormData({ email: "", password: "", fullName: "", role: "staff" });
        // Refresh users list
        const fetchedUsers = await fetchUsersAction();
        setUsers(fetchedUsers);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight">User Management</h1>
            <p className="text-muted-foreground font-medium">Add and manage internal company accounts</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <Card className="lg:col-span-1 glass-card border-none shadow-xl h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add New User
            </CardTitle>
            <CardDescription>Create an internal staff or admin account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="pl-10 rounded-xl bg-background/50"
                    placeholder="Enter full name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="pl-10 rounded-xl bg-background/50"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="pl-10 rounded-xl bg-background/50"
                    placeholder="Min. 6 characters"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Account Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(v: "admin" | "staff") => setFormData({...formData, role: v})}
                >
                  <SelectTrigger className="rounded-xl bg-background/50 h-11">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    <SelectItem value="staff" className="focus:bg-primary/10">Staff (Standard Access)</SelectItem>
                    <SelectItem value="admin" className="focus:bg-primary/10">Admin (Full Control)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold transition-all hover:scale-[1.02]" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="lg:col-span-2 glass-card border-none shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Team Members
                </CardTitle>
                <Badge variant="outline" className="rounded-full bg-primary/10 text-primary border-none">
                    {users.length} Total
                </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isUsersLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-2xl border border-border/10 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold">Member</TableHead>
                      <TableHead className="font-bold">Role</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className="hover:bg-primary/5 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold">{u.fullName || 'Unnamed User'}</span>
                            <span className="text-xs text-muted-foreground font-medium">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={u.role === 'admin' ? "bg-primary" : "bg-muted text-foreground"} variant={u.role === 'admin' ? "default" : "secondary"}>
                            {u.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : null}
                            {u.role?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-none rounded-full text-[10px] font-bold">
                            ACTIVE
                          </Badge>
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
    </div>
  );
}
