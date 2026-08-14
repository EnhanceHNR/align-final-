'use client';
import { Button } from '@/components/ui/button';
import { firestore, useUser } from '@/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';

export default function MigratePage() {
    const [status, setStatus] = useState('Idle');
    const { user } = useUser();

    const migrate = async () => {
        if (!user) {
            setStatus('Error: You must be logged in.');
            return;
        }
        setStatus('Migrating...');
        try {
            const snapshot = await getDocs(collection(firestore, 'items'));
            const total = snapshot.docs.length;
            let count = 0;
            for (const docSnapshot of snapshot.docs) {
                const data = docSnapshot.data();
                if (data.brandName) {
                    await updateDoc(doc(firestore, 'items', docSnapshot.id), {
                        company: data.brandName,
                        brandName: ''
                    });
                }
                count++;
                setStatus(`Migrating... ${count}/${total}`);
            }
            setStatus('Done!');
        } catch (e: any) {
            setStatus('Error: ' + e.message);
        }
    };

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-4">Migrate DB</h1>
            <Button onClick={migrate} disabled={!user}>Run Migration</Button>
            <p className="mt-4">{status}</p>
        </div>
    );
}
