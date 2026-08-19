"use client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ChevronLeft, PlusCircle, Trash2, Camera, Upload, X } from "lucide-react";
import Link from "next/link";
import React, { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SearchableSelect = ({ options, value, onValueChange, placeholder }: any) => {
    return (
        <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={value} 
            onChange={e => onValueChange(e.target.value)}
        >
            <option value="">{placeholder}</option>
            {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    );
};

export default function CreateOrderPage() {
    const { toast } = useToast();
    const router = useRouter();
    
    const { data: items } = api.inventory.getAll.useQuery();
    const { data: dealers } = api.inventory.getDealers.useQuery();
    // Assuming we don't have a staff query right now, we'll mock it based on users or just text
    const staffOptions = [{ value: "admin", label: "Enhance Head Neck Rehabilitation" }];
    
    const createOrder = api.inventory.createOrder.useMutation();

    const [selectedStaff, setSelectedStaff] = useState("admin");
    const [baseOrderId, setBaseOrderId] = useState("A17");
    
    type OrderItem = { id: string; quantity: number; dealerId: string; price: number; isCollapsed: boolean };
    const [orderItems, setOrderItems] = useState<OrderItem[]>([
        { id: "", quantity: 1, dealerId: "", price: 0, isCollapsed: false }
    ]);
    
    const [notes, setNotes] = useState("");
    const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split("T")[0]);
    
    // Photo verification state
    const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraActive(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            toast({ title: "Camera access denied", variant: "destructive" });
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
            setPhotoDataUri(canvas.toDataURL("image/png"));
            stopCamera();
        }
    };

    const handleSubmit = async () => {
        const validItems = orderItems.filter(item => item.id && item.dealerId);
        if (validItems.length === 0) {
            toast({ title: "Please select an item and dealer.", variant: "destructive" });
            return;
        }
        if (!photoDataUri) {
            toast({ title: "Photo verification is required.", variant: "destructive" });
            return;
        }

        try {
            // Process each item as a separate PurchaseOrder
            for (const item of validItems) {
                await createOrder.mutateAsync({
                    inventoryItemId: item.id,
                    dealerId: item.dealerId,
                    quantity: item.quantity,
                    price: item.price,
                    notes: notes
                });
            }
            toast({ title: "Orders created successfully!" });
            router.push("/dashboard/inventory/orders");
        } catch (err: any) {
            toast({ title: "Failed to create order", description: err.message, variant: "destructive" });
        }
    };

    return (
        <div className="p-8 flex flex-col gap-6 h-full animate-in fade-in max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <PageHeader title="Create Purchase Order" />
                <Button variant="outline" asChild>
                    <Link href="/dashboard/inventory/orders">Cancel</Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Order Details</CardTitle>
                    <CardDescription>Select the item, dealer, and staff placing the order.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Placed By <span className="text-destructive">*</span></Label>
                        <SearchableSelect 
                            options={staffOptions} 
                            value={selectedStaff} 
                            onValueChange={setSelectedStaff} 
                            placeholder="Select your name" 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Base Order ID</Label>
                        <Input value={baseOrderId} onChange={e => setBaseOrderId(e.target.value)} />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-lg font-semibold block">Items to Order</Label>
                        {orderItems.map((oi, index) => (
                            <div key={index} className="flex flex-col gap-4 bg-muted/20 p-4 rounded-lg border border-border">
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 space-y-2 w-full">
                                        <Label>Item {index + 1}</Label>
                                        <SearchableSelect 
                                            options={items?.map(i => ({ value: i.id, label: i.name })) || []}
                                            value={oi.id}
                                            onValueChange={(val: string) => {
                                                const newItems = [...orderItems];
                                                newItems[index].id = val;
                                                setOrderItems(newItems);
                                            }}
                                            placeholder="Select an item"
                                        />
                                    </div>
                                    <div className="w-full md:w-32 space-y-2">
                                        <Label>Quantity</Label>
                                        <Input type="number" min="1" value={oi.quantity} onChange={e => {
                                            const newItems = [...orderItems];
                                            newItems[index].quantity = parseInt(e.target.value) || 1;
                                            setOrderItems(newItems);
                                        }} />
                                    </div>
                                    {orderItems.length > 1 && (
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => {
                                            const newItems = [...orderItems];
                                            newItems.splice(index, 1);
                                            setOrderItems(newItems);
                                        }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                
                                <div className="flex-1 space-y-2 w-full mt-4">
                                    <Label>Dealer</Label>
                                    <div className="border rounded-md overflow-hidden bg-background">
                                        <div className="flex items-center px-3 py-2 border-b bg-muted/50">
                                            <span className="text-sm text-muted-foreground">Search dealers...</span>
                                        </div>
                                        <div className="grid grid-cols-3 p-2 text-xs text-muted-foreground border-b">
                                            <span>Name</span>
                                            <span className="text-right">Price</span>
                                            <span className="text-right">Expiry Date</span>
                                        </div>
                                        {dealers?.map(dealer => (
                                            <div 
                                                key={dealer.id} 
                                                className={`grid grid-cols-3 p-3 text-sm cursor-pointer hover:bg-muted ${oi.dealerId === dealer.id ? 'bg-red-100/50 dark:bg-red-900/20' : 'bg-red-50/50 dark:bg-red-900/10'} border-b last:border-0`}
                                                onClick={() => {
                                                    const newItems = [...orderItems];
                                                    newItems[index].dealerId = dealer.id;
                                                    setOrderItems(newItems);
                                                }}
                                            >
                                                <span className="text-red-800 dark:text-red-400">{dealer.name}</span>
                                                <span className="text-right text-red-800 dark:text-red-400">-</span>
                                                <span className="text-right text-red-800 dark:text-red-400">-</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button variant="outline" className="w-full border-dashed" onClick={() => {
                        setOrderItems([...orderItems, { id: "", quantity: 1, dealerId: "", price: 0, isCollapsed: false }]);
                    }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
                    </Button>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea placeholder="e.g., General notes about these orders" value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Order Date</Label>
                        <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                    </div>

                    <div className="space-y-2 pt-4">
                        <Label className="text-lg">Photo Verification <span className="text-destructive">*</span></Label>
                        <Card className="border-dashed shadow-none bg-muted/20 relative">
                            {photoDataUri && (
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 rounded-full bg-background border shadow-sm z-10" onClick={() => setPhotoDataUri(null)}>
                                    <X className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                            <CardContent className="p-6">
                                {photoDataUri ? (
                                    <div className="flex justify-center">
                                        <img src={photoDataUri} alt="Verification" className="rounded-md max-h-[300px]" />
                                    </div>
                                ) : isCameraActive ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <video ref={videoRef} autoPlay playsInline className="rounded-md max-h-[300px] w-full object-cover bg-black" />
                                        <div className="flex gap-2">
                                            <Button onClick={capturePhoto}><Camera className="mr-2 h-4 w-4" /> Capture</Button>
                                            <Button variant="outline" onClick={stopCamera}>Cancel</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-4 py-8">
                                        <p className="text-sm text-muted-foreground">Capture or upload a photo.</p>
                                        <div className="flex gap-4 w-full max-w-md">
                                            <Button className="flex-1" onClick={startCamera}><Camera className="mr-2 h-4 w-4" /> Capture</Button>
                                            <Button className="flex-1" variant="outline"><Upload className="mr-2 h-4 w-4" /> Upload</Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-end mt-8">
                        <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white" onClick={handleSubmit} disabled={createOrder.isPending}>
                            {createOrder.isPending ? "Processing..." : "Review Order"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
