"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Plus, Link as LinkIcon, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
    const { toast } = useToast();
    const { data: chairs, refetch, isLoading } = api.chairs.list.useQuery();
    
    const [newChairName, setNewChairName] = useState("");
    
    const createChair = api.chairs.create.useMutation({
        onSuccess: () => {
            setNewChairName("");
            refetch();
            toast({ title: "Chair created successfully" });
        },
    });

    const deleteChair = api.chairs.delete.useMutation({
        onSuccess: () => {
            refetch();
            toast({ title: "Chair removed" });
        }
    });

    const updateGoogle = api.chairs.updateGoogleCalendar.useMutation({
        onSuccess: () => {
            refetch();
            toast({ title: "Google Calendar settings updated" });
        }
    });

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-gray-500 mb-8">Manage application settings and resources.</p>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
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

                {isLoading ? (
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
                                        <button 
                                            onClick={() => {
                                                const calId = prompt("Enter the Google Calendar ID to sync to (e.g. your-email@gmail.com):");
                                                if (calId) {
                                                    updateGoogle.mutate({ id: chair.id, googleSyncEnabled: true, googleCalendarId: calId });
                                                }
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 bg-white rounded-lg text-xs font-medium hover:bg-gray-50 transition"
                                        >
                                            <LinkIcon className="w-3.5 h-3.5" /> Connect Google
                                        </button>
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
        </div>
    );
}
