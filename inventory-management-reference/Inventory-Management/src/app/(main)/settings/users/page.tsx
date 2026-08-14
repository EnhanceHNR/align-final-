'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Edit, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useCollection, firestore, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";
import { StaffUser } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";

export default function UserManagementPage() {
  const { toast } = useToast();
  const { user: authUser } = useUser();
  const usersCollection = useMemo(() => firestore ? collection(firestore, 'users') : null, []);
  const { data: users, isLoading } = useCollection<StaffUser>(usersCollection);

  const currentUserData = useMemo(() => {
    return users?.find(u => u.id === authUser?.uid || u.email === authUser?.email);
  }, [users, authUser]);

  const isAdmin = currentUserData?.role === "Admin";

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Staff");
  const [isSaving, setIsSaving] = useState(false);

  const openNewUserDialog = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("Staff");
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: StaffUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email || "");
    setPassword("");
    setRole(user.role);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "users", id));
      toast({ title: "User deleted successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (!editingUser && (!email.trim() || !password.trim())) {
      toast({ title: "Email and password are required", variant: "destructive" });
      return;
    }
    if (!firestore) return;
    setIsSaving(true);
    try {
      let id = editingUser ? editingUser.id : "";
      
      if (!editingUser) {
        // Create secondary app so we don't log out the admin
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryUserCreationApp");
        const secondaryAuth = getAuth(secondaryApp);
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
          id = userCredential.user.uid;
        } finally {
          await deleteApp(secondaryApp);
        }
      }

      const userRef = doc(firestore, "users", id);
      const userData: StaffUser = {
        id,
        name,
        email,
        role,
        createdAt: editingUser ? editingUser.createdAt : new Date().toISOString()
      };
      await setDoc(userRef, userData);
      toast({ title: editingUser ? "User updated" : "User created" });
      setIsDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="User Management">
        {isAdmin && (
          <Button onClick={openNewUserDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              Add staff members so they can be selected when placing orders or verifying deliveries.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Doe" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. jane@example.com" disabled={!!editingUser} />
            </div>
            {!editingUser && (
              <div className="grid gap-2">
                <Label htmlFor="password">Temporary Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password for new user" />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <SearchableSelect
                  options={[
                      { value: 'Admin', label: 'Admin' },
                      { value: 'Manager', label: 'Manager' },
                      { value: 'Staff', label: 'Staff' },
                  ]}
                  value={role}
                  onValueChange={setRole}
                  placeholder="Select role"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
