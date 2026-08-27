import { adminDb } from "@/lib/firebaseAdmin";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SharedLabOrderPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ type?: string }> }) {
    const { id } = await params;
    const { type } = await searchParams;
    
    const docRef = adminDb.collection('labSubmissions').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
        notFound();
    }
    
    const sub = docSnap.data();
    if (!sub) notFound();

    const isExternal = type === 'external';

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-3xl shadow-lg border-t-4 border-t-primary">
                <CardHeader className="bg-white rounded-t-xl border-b pb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Lab Order Details</CardTitle>
                            <CardDescription className="text-gray-500 font-mono">ID: {id}</CardDescription>
                        </div>
                        <Badge variant={sub.status === 'Completed' ? 'default' : 'secondary'} className="text-sm px-3 py-1 uppercase tracking-wider">
                            {sub.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Patient Information</h3>
                            <p className="text-lg font-medium text-gray-900">{sub.patientName}</p>
                            {sub.patientAge && <p className="text-gray-600">Age: {sub.patientAge}</p>}
                            {sub.patientGender && <p className="text-gray-600">Gender: {sub.patientGender}</p>}
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Lab Details</h3>
                            <p className="text-lg font-medium text-gray-900">{sub.labName}</p>
                            <p className="text-gray-600">Procedure: <span className="font-medium text-gray-900">{sub.item}</span></p>
                            <p className="text-gray-600">Order Date: {sub.createdAt?.toMillis ? format(new Date(sub.createdAt.toMillis()), 'PPP p') : '-'}</p>
                            <p className="text-gray-600">Expected Delivery: {sub.expectedDeliveryDate ? format(new Date(sub.expectedDeliveryDate), 'PPP') : '-'}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Instructions / Notes</h3>
                        <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap border border-gray-100">
                            {sub.instructions || "No special instructions provided."}
                        </div>
                    </div>

                    {(!isExternal && sub.cost) && (
                        <div className="space-y-3 pt-6 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Internal Cost Details</h3>
                            <p className="text-xl font-bold text-gray-900">${sub.cost}</p>
                        </div>
                    )}
                    
                    {sub.attachmentUrls && sub.attachmentUrls.length > 0 && (
                        <div className="space-y-3 pt-6 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Attachments</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {sub.attachmentUrls.map((url: string, idx: number) => (
                                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="block relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity">
                                        <img src={url} alt={`Attachment ${idx + 1}`} className="object-cover w-full h-full" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
