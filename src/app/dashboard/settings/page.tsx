"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Plus, Link as LinkIcon, Unlink, Building2, Clock, Lock, CreditCard, Laptop } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("profile");

    // Chairs State
    const { data: chairs, refetch: refetchChairs, isLoading: isChairsLoading } = api.chairs.list.useQuery();
    const [newChairName, setNewChairName] = useState("");
    
    const createChair = api.chairs.create.useMutation({
        onSuccess: () => { setNewChairName(""); refetchChairs(); toast({ title: "Chair created successfully" }); },
    });
    const deleteChair = api.chairs.delete.useMutation({
        onSuccess: () => { refetchChairs(); toast({ title: "Chair removed" }); }
    });
    const updateGoogle = api.chairs.updateGoogleCalendar.useMutation({
        onSuccess: () => { refetchChairs(); toast({ title: "Google Calendar settings updated" }); }
    });

    // Profile State
    const { data: org, refetch: refetchOrg } = api.organization.getProfile.useQuery();
    const updateProfile = api.organization.updateProfile.useMutation({
        onSuccess: () => { toast({ title: "Profile updated successfully" }); refetchOrg(); }
    });

    const [profileForm, setProfileForm] = useState({
        name: "", phone: "", email: "", address: "", orgType: "Clinic", workingHoursStart: "08:00", workingHoursEnd: "18:00"
    });

    useEffect(() => {
        if (org) {
            setProfileForm({
                name: org.name || "",
                phone: org.phone || "",
                email: org.email || "",
                address: org.address || "",
                orgType: org.orgType || "Clinic",
                workingHoursStart: org.workingHoursStart || "08:00",
                workingHoursEnd: org.workingHoursEnd || "18:00"
            });
        }
    }, [org]);

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfile.mutate(profileForm);
    };

    // Password State
    const [pwdForm, setPwdForm] = useState({ newPassword: "", confirmPassword: "" });
    const changePassword = api.organization.changePassword.useMutation({
        onSuccess: () => { toast({ title: "Password changed successfully" }); setPwdForm({ newPassword: "", confirmPassword: "" }); },
        onError: (err) => { toast({ title: "Error changing password", variant: "destructive" }); }
    });

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pwdForm.newPassword !== pwdForm.confirmPassword) {
            toast({ title: "Passwords do not match", variant: "destructive" });
            return;
        }
        changePassword.mutate({ newPassword: pwdForm.newPassword });
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 shrink-0">
                <h1 className="text-3xl font-bold mb-6">Settings</h1>
                <nav className="space-y-1">
                    <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Building2 className="w-5 h-5" /> Organization Profile
                    </button>
                    <button onClick={() => setActiveTab('hours')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'hours' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Clock className="w-5 h-5" /> Working Hours
                    </button>
                    <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'security' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Lock className="w-5 h-5" /> Security
                    </button>
                    <button onClick={() => setActiveTab('chairs')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'chairs' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Laptop className="w-5 h-5" /> Chairs & Resources
                    </button>
                    <button onClick={() => setActiveTab('plan')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'plan' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <CreditCard className="w-5 h-5" /> Billing & Plan
                    </button>
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
                {activeTab === 'profile' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                        <h2 className="text-xl font-semibold mb-6">Organization Profile</h2>
                        <form onSubmit={handleProfileSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Organization Name</label>
                                    <input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} required className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Organization Type</label>
                                    <select value={profileForm.orgType} onChange={e => setProfileForm({...profileForm, orgType: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500 bg-white">
                                        <option value="Clinic">Clinic</option>
                                        <option value="Lab">Laboratory</option>
                                        <option value="Dealer">Dealer / Supplier</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Email Address</label>
                                    <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
                                    <input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Address</label>
                                <textarea value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} rows={3} className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500"></textarea>
                            </div>
                            <div className="pt-4">
                                <button type="submit" disabled={updateProfile.isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">Save Changes</button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'hours' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                        <h2 className="text-xl font-semibold mb-2">Working Hours</h2>
                        <p className="text-sm text-gray-500 mb-6">Set your standard operational hours. This affects calendar displays and attendance rules.</p>
                        <form onSubmit={handleProfileSubmit} className="space-y-5 max-w-md">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                                    <input type="time" value={profileForm.workingHoursStart} onChange={e => setProfileForm({...profileForm, workingHoursStart: e.target.value})} required className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500" />
                                </div>
                                <div className="pt-6 text-gray-400 font-bold">—</div>
                                <div className="flex-1">
                                    <label className="block text-sm text-gray-600 mb-1">End Time</label>
                                    <input type="time" value={profileForm.workingHoursEnd} onChange={e => setProfileForm({...profileForm, workingHoursEnd: e.target.value})} required className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div className="pt-4">
                                <button type="submit" disabled={updateProfile.isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">Update Hours</button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                        <h2 className="text-xl font-semibold mb-2">Security</h2>
                        <p className="text-sm text-gray-500 mb-6">Update your account password.</p>
                        <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-md">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">New Password</label>
                                <input type="password" value={pwdForm.newPassword} onChange={e => setPwdForm({...pwdForm, newPassword: e.target.value})} required minLength={6} className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Confirm New Password</label>
                                <input type="password" value={pwdForm.confirmPassword} onChange={e => setPwdForm({...pwdForm, confirmPassword: e.target.value})} required minLength={6} className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500" />
                            </div>
                            <div className="pt-4">
                                <button type="submit" disabled={changePassword.isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">Change Password</button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'plan' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                        <h2 className="text-xl font-semibold mb-6">Billing & Plan</h2>
                        <div className="p-6 border border-blue-100 bg-blue-50 rounded-xl mb-6">
                            <h3 className="font-bold text-lg text-blue-900 mb-1">Current Plan: Pro SaaS</h3>
                            <p className="text-sm text-blue-700 mb-4">You are currently on the active subscription tier.</p>
                            <div className="text-sm text-blue-800 space-y-2">
                                <p><strong>Status:</strong> {org?.isActive ? "Active" : "Inactive"}</p>
                                <p><strong>Renewal Date:</strong> {org?.stripeCurrentPeriodEnd ? new Date(org.stripeCurrentPeriodEnd).toLocaleDateString() : "N/A"}</p>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Manage Subscription in Stripe</button>
                    </div>
                )}

                {activeTab === 'chairs' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                        <h2 className="text-xl font-semibold mb-4">Chairs & Resources</h2>
                        <p className="text-sm text-gray-500 mb-6">Create chairs or doctors to assign appointments to. You can connect each chair to a specific Google Calendar for 1-way syncing.</p>

                        <div className="flex items-center gap-3 mb-6">
                            <input 
                                value={newChairName}
                                onChange={(e) => setNewChairName(e.target.value)}
                                placeholder="e.g. Chair 1, Dr. Smith"
                                className="border border-gray-200 rounded-lg px-4 py-2 text-sm flex-1 max-w-xs outline-none focus:border-blue-500"
                            />
                            <button 
                                onClick={() => createChair.mutate({ name: newChairName })}
                                disabled={!newChairName || createChair.isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" /> Add Chair
                            </button>
                        </div>

                        {isChairsLoading ? (
                            <div className="text-sm text-gray-400">Loading chairs...</div>
                        ) : (
                            <div className="space-y-4">
                                {chairs?.map((chair) => (
                                    <div key={chair.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl gap-4">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{chair.name}</h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {chair.googleSyncEnabled ? "Connected to Google Calendar" : "Not connected to Google Calendar"}
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {chair.googleSyncEnabled ? (
                                                <button 
                                                    onClick={() => updateGoogle.mutate({ id: chair.id, googleSyncEnabled: false, googleCalendarId: null })}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 bg-red-50 rounded-lg text-xs font-medium hover:bg-red-100 transition"
                                                >
                                                    <Unlink className="w-3.5 h-3.5" /> Disconnect
                                                </button>
                                            ) : (
                                                <a 
                                                    href={`/api/calendar/auth?chairId=${chair.id}`}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 bg-white rounded-lg text-xs font-medium hover:bg-gray-50 transition"
                                                >
                                                    <LinkIcon className="w-3.5 h-3.5" /> Connect Google
                                                </a>
                                            )}

                                            <button 
                                                onClick={() => confirm("Are you sure?") && deleteChair.mutate({ id: chair.id })}
                                                className="text-xs text-gray-400 hover:text-red-500 px-3 py-1.5"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {chairs?.length === 0 && (
                                    <div className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl">No chairs configured yet.</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
