"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, ShieldCheck, Ban, RotateCcw, Pencil } from "lucide-react";

const MODULES: { key: string; label: string }[] = [
  { key: "patients", label: "Patient Management" },
  { key: "lab", label: "Lab Management" },
  { key: "inventory", label: "Inventory Management" },
  { key: "attendance", label: "HR & Attendance" },
  { key: "learning", label: "E-Learning" },
];

export function TeamAccessTab() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const utils = api.useUtils();

  const role = (session?.user as any)?.role as "MASTER" | "ADMIN" | "STAFF" | undefined;
  const isSuperAdmin = !!(session?.user as any)?.isSuperAdmin;
  const myModules: string[] = (session?.user as any)?.allowedModules || [];
  const isOrgOwner = role === "MASTER" || isSuperAdmin;
  const grantableModules = isOrgOwner ? MODULES : MODULES.filter((m) => myModules.includes(m.key));

  const { data: team, isLoading } = api.employee.getAllUsers.useQuery();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" as "STAFF" | "ADMIN", modules: [] as string[] });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ role: "STAFF" as "STAFF" | "ADMIN", modules: [] as string[] });

  const createStaff = api.employee.createStaffUser.useMutation({
    onSuccess: () => {
      toast({ title: "Team member added" });
      setAddOpen(false);
      setForm({ name: "", email: "", password: "", role: "STAFF", modules: [] });
      utils.employee.getAllUsers.invalidate();
      utils.employee.getAllEmployees.invalidate();
    },
    onError: (err) => toast({ title: "Couldn't add team member", description: err.message, variant: "destructive" }),
  });

  const updateAccess = api.employee.updateStaffAccess.useMutation({
    onSuccess: () => {
      toast({ title: "Access updated" });
      setEditingUserId(null);
      utils.employee.getAllUsers.invalidate();
    },
    onError: (err) => toast({ title: "Couldn't update access", description: err.message, variant: "destructive" }),
  });

  const setActive = api.employee.setStaffActive.useMutation({
    onSuccess: () => {
      toast({ title: "Updated" });
      utils.employee.getAllUsers.invalidate();
    },
    onError: (err) => toast({ title: "Couldn't update", description: err.message, variant: "destructive" }),
  });

  const toggleModule = (list: string[], key: string) =>
    list.includes(key) ? list.filter((m) => m !== key) : [...list, key];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Team & Access</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isOrgOwner
              ? "Create Admin and Staff accounts and choose which modules each one can see."
              : "Create Staff accounts for the modules you manage."}
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" /> Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              {isOrgOwner && (
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as "STAFF" | "ADMIN" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAFF">Staff -- limited access to assigned modules</SelectItem>
                      <SelectItem value="ADMIN">Admin -- full control of assigned modules</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Module access</Label>
                <div className="space-y-2">
                  {grantableModules.map((m) => (
                    <label key={m.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.modules.includes(m.key)}
                        onCheckedChange={() => setForm((f) => ({ ...f, modules: toggleModule(f.modules, m.key) }))}
                      />
                      {m.label}
                    </label>
                  ))}
                  {grantableModules.length === 0 && (
                    <p className="text-xs text-gray-400">You have no modules of your own to grant.</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!form.name || !form.email || form.password.length < 6 || createStaff.isPending}
                onClick={() =>
                  createStaff.mutate({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    role: form.role,
                    allowedModules: form.modules,
                  })
                }
              >
                {createStaff.isPending ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400">Loading team...</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {team?.map((member: any) => (
            <div key={member.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-800 flex items-center gap-2">
                  {member.employeeProfile?.name || member.email}
                  <Badge variant="outline" className={member.role === "MASTER" ? "bg-blue-50 text-blue-700 border-blue-200" : member.role === "ADMIN" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-slate-100 text-slate-600 border-slate-200"}>
                    {member.role === "MASTER" && <ShieldCheck className="w-3 h-3 mr-1" />}
                    {member.role}
                  </Badge>
                  {!member.isActive && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Deactivated</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {member.email} &middot;{" "}
                  {member.role === "MASTER" ? "All modules" : member.allowedModules?.length ? member.allowedModules.join(", ") : "No modules assigned"}
                </p>
              </div>

              {member.role !== "MASTER" && (
                <div className="flex items-center gap-2">
                  <Dialog open={editingUserId === member.id} onOpenChange={(open) => {
                    if (open) {
                      setEditingUserId(member.id);
                      setEditForm({ role: member.role, modules: member.allowedModules || [] });
                    } else {
                      setEditingUserId(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit access</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Edit access -- {member.email}</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-2">
                        {isOrgOwner && (
                          <div className="space-y-1.5">
                            <Label>Role</Label>
                            <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as "STAFF" | "ADMIN" }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="STAFF">Staff</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label>Module access</Label>
                          <div className="space-y-2">
                            {grantableModules.map((m) => (
                              <label key={m.key} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={editForm.modules.includes(m.key)}
                                  onCheckedChange={() => setEditForm((f) => ({ ...f, modules: toggleModule(f.modules, m.key) }))}
                                />
                                {m.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          disabled={updateAccess.isPending}
                          onClick={() =>
                            updateAccess.mutate({ userId: member.id, role: editForm.role, allowedModules: editForm.modules })
                          }
                        >
                          Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    size="sm"
                    variant="outline"
                    className={member.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}
                    disabled={setActive.isPending}
                    onClick={() => setActive.mutate({ userId: member.id, isActive: !member.isActive })}
                  >
                    {member.isActive ? (
                      <><Ban className="w-3.5 h-3.5 mr-1.5" /> Deactivate</>
                    ) : (
                      <><RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reactivate</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
          {(!team || team.length === 0) && (
            <div className="text-sm text-gray-400 text-center py-6">No team members yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
