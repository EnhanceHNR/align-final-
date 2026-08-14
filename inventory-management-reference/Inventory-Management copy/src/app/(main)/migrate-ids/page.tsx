'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { firestore } from '@/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { generateSequentialId } from '@/lib/utils';
import { InventoryItem, Dealer, ConsumptionRecord } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';

export default function MigratePage() {
    const [status, setStatus] = useState<string>('Ready to migrate.');
    const [isMigrating, setIsMigrating] = useState(false);

    const handleMigrate = async () => {
        if (!firestore) return;
        setIsMigrating(true);
        setStatus('Starting migration...');

        try {
            // 1. Initialize counter if not exists, and get starting count
            const counterRef = doc(firestore, 'metadata', 'itemCounter');
            
            // Do reads first
            const [itemsSnapshot, dealersSnapshot, consumptionSnapshot, counterDoc] = await Promise.all([
                getDocs(collection(firestore, 'items')),
                getDocs(collection(firestore, 'dealers')),
                getDocs(collection(firestore, 'consumptionRecords')),
                getDoc(counterRef)
            ]);

            let currentCount = 0;
            if (counterDoc.exists()) {
                currentCount = counterDoc.data().lastItemId || 0;
            }

            const items = itemsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
            const itemsToMigrate = items.filter(item => !/^[A-Z]\d{4}$/.test(item.id));
            
            setStatus(`Found ${itemsToMigrate.length} items to migrate...`);

            if (itemsToMigrate.length === 0) {
                setStatus('No items need migration.');
                setIsMigrating(false);
                return;
            }

            // Prepare old ID to new ID mapping
            const idMap: Record<string, string> = {};
            for (const item of itemsToMigrate) {
                currentCount++;
                const newId = generateSequentialId(currentCount);
                idMap[item.id] = newId;
            }

            // Start writing in batches
            let batch = writeBatch(firestore);
            let operationCount = 0;

            const commitBatchIfNeeded = async () => {
                if (operationCount >= 450) {
                    await batch.commit();
                    batch = writeBatch(firestore);
                    operationCount = 0;
                }
            };

            // Update counter
            batch.set(counterRef, { lastItemId: currentCount }, { merge: true });
            operationCount++;

            setStatus('Preparing items updates...');
            // Copy items to new IDs and delete old IDs
            for (const item of itemsToMigrate) {
                const newId = idMap[item.id];
                const newDocRef = doc(firestore, 'items', newId);
                const oldDocRef = doc(firestore, 'items', item.id);
                
                const newItemData = { ...item };
                delete (newItemData as any).id;
                
                batch.set(newDocRef, newItemData);
                batch.delete(oldDocRef);
                operationCount += 2;
                await commitBatchIfNeeded();
            }

            setStatus('Preparing dealers updates...');
            for (const d of dealersSnapshot.docs) {
                const dealerData = d.data() as Dealer;
                let dealerNeedsUpdate = false;
                
                const newSuppliedItems = [...(dealerData.suppliedItems || [])];
                const newItemPrices = { ...(dealerData.itemPrices || {}) };
                const newItemExpiries = { ...(dealerData.itemExpiries || {}) };

                for (let i = 0; i < newSuppliedItems.length; i++) {
                    const oldId = newSuppliedItems[i];
                    if (idMap[oldId]) {
                        newSuppliedItems[i] = idMap[oldId];
                        dealerNeedsUpdate = true;
                    }
                }

                for (const [oldId, price] of Object.entries(newItemPrices)) {
                    if (idMap[oldId]) {
                        newItemPrices[idMap[oldId]] = price;
                        delete newItemPrices[oldId];
                        dealerNeedsUpdate = true;
                    }
                }

                for (const [oldId, expiry] of Object.entries(newItemExpiries)) {
                    if (idMap[oldId]) {
                        newItemExpiries[idMap[oldId]] = expiry;
                        delete newItemExpiries[oldId];
                        dealerNeedsUpdate = true;
                    }
                }

                if (dealerNeedsUpdate) {
                    const dealerRef = doc(firestore, 'dealers', d.id);
                    batch.update(dealerRef, {
                        suppliedItems: newSuppliedItems,
                        itemPrices: newItemPrices,
                        itemExpiries: newItemExpiries
                    });
                    operationCount++;
                    await commitBatchIfNeeded();
                }
            }

            setStatus('Preparing consumption records updates...');
            for (const c of consumptionSnapshot.docs) {
                const cData = c.data() as ConsumptionRecord;
                if (idMap[cData.itemId]) {
                    const cDocRef = doc(firestore, 'consumptionRecords', c.id);
                    batch.update(cDocRef, {
                        itemId: idMap[cData.itemId]
                    });
                    operationCount++;
                    await commitBatchIfNeeded();
                }
            }

            setStatus('Committing changes to database...');
            if (operationCount > 0) {
                await batch.commit();
            }

            setStatus('Migration completed successfully!');
        } catch (error: any) {
            console.error('Migration failed:', error);
            setStatus(`Migration failed: ${error.message}`);
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="p-8">
            <PageHeader title="Database Migration" />
            <div className="mt-8 space-y-4">
                <p>Status: {status}</p>
                <Button onClick={handleMigrate} disabled={isMigrating}>
                    {isMigrating ? 'Migrating...' : 'Start Migration'}
                </Button>
            </div>
        </div>
    );
}
