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
    const photoUrls: string[] = typeof sub.photoUrls === "string" ? JSON.parse(sub.photoUrls) : sub.photoUrls || [];
    const verificationPhotoUrl = sub.senderSelfieUrl || sub.photoUrl || null;
    const verificationPhotoLabel = sub.type === 'send' ? 'Sender Selfie' : 'Verification Photo';

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

                    {/* Sender/receiver identity photos and the case photo gallery are
                        only included on an internal share -- an external link (sent
                        to the lab partner, a patient, etc.) never carries staff or
                        patient photos, per how this link was shared. */}
                    {!isExternal && verificationPhotoUrl && (
                        <div className="space-y-3 pt-6 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{verificationPhotoLabel}</h3>
                            <div className="relative aspect-[4/3] max-w-sm rounded-lg overflow-hidden border border-gray-200">
                                <img src={verificationPhotoUrl} alt={verificationPhotoLabel} className="w-full h-full object-cover" />
                            </div>
                        </div>
                    )}

                    {!isExternal && photoUrls.length > 0 && (
                        <div className="space-y-3 pt-6 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Case Gallery</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {photoUrls.map((url: string, idx: number) => (
                                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="block relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity">
                                        <img src={url} alt={`Case photo ${idx + 1}`} className="object-cover w-full h-full" />
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
