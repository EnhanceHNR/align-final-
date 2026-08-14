'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { firestore } from '@/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { InventoryItem, Dealer, ConsumptionRecord } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';

export default function MergeDuplicatesPage() {
    const [status, setStatus] = useState<string>('Ready to merge duplicates.');
    const [isMerging, setIsMerging] = useState(false);

    const handleMerge = async () => {
        if (!firestore) return;
        setIsMerging(true);
        setStatus('Starting deduplication...');

        try {
            // 1. Fetch all items, dealers, consumption records
            const [itemsSnapshot, dealersSnapshot, consumptionSnapshot] = await Promise.all([
                getDocs(collection(firestore, 'items')),
                getDocs(collection(firestore, 'dealers')),
                getDocs(collection(firestore, 'consumptionRecords'))
            ]);

            const items = itemsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
            
            // 2. Group items by lowercase name + brand/company
            const itemGroups: Record<string, InventoryItem[]> = {};
            for (const item of items) {
                const key = `${(item.name || '').trim().toLowerCase()}|${(item.brandName || item.company || '').trim().toLowerCase()}`;
                if (!itemGroups[key]) itemGroups[key] = [];
                itemGroups[key].push(item);
            }

            // 3. Find duplicates
            const groupsWithDuplicates = Object.values(itemGroups).filter(group => group.length > 1);
            
            if (groupsWithDuplicates.length === 0) {
                setStatus('No duplicate items found!');
                setIsMerging(false);
                return;
            }

            setStatus(`Found ${groupsWithDuplicates.length} groups of duplicates. Processing...`);

            let batch = writeBatch(firestore);
            let operationCount = 0;

            const commitBatchIfNeeded = async () => {
                if (operationCount >= 450) {
                    await batch.commit();
                    batch = writeBatch(firestore);
                    operationCount = 0;
                }
            };

            const idMap: Record<string, string> = {}; // Maps duplicate IDs to the primary ID

            for (const group of groupsWithDuplicates) {
                // Sort by ID so the lowest ID (e.g. A0001) is kept
                group.sort((a, b) => a.id.localeCompare(b.id));
                
                const primaryItem = group[0];
                const duplicates = group.slice(1);

                let mergedItemCount = primaryItem.itemCount || 0;
                let mergedStock = [...(primaryItem.stock || [])];

                for (const duplicate of duplicates) {
                    idMap[duplicate.id] = primaryItem.id;
                    mergedItemCount += (duplicate.itemCount || 0);
                    if (duplicate.stock) {
                        mergedStock = [...mergedStock, ...duplicate.stock];
                    }

                    // Delete the duplicate document
                    const dupRef = doc(firestore, 'items', duplicate.id);
                    batch.delete(dupRef);
                    operationCount++;
                    await commitBatchIfNeeded();
                }

                // Update the primary document
                const primaryRef = doc(firestore, 'items', primaryItem.id);
                batch.update(primaryRef, {
                    itemCount: mergedItemCount,
                    stock: mergedStock,
                    status: mergedItemCount === 0 ? 'Out of Stock' : (mergedItemCount <= (primaryItem.minQuantity || 0) ? 'Low Stock' : 'In Stock')
                });
                operationCount++;
                await commitBatchIfNeeded();
            }

            setStatus('Updating dealers...');
            for (const d of dealersSnapshot.docs) {
                const dealerData = d.data() as Dealer;
                let dealerNeedsUpdate = false;
                
                let newSuppliedItems = [...(dealerData.suppliedItems || [])];
                const newItemPrices = { ...(dealerData.itemPrices || {}) };
                const newItemExpiries = { ...(dealerData.itemExpiries || {}) };

                // Map duplicate IDs to primary IDs in suppliedItems
                const mappedSuppliedItems = newSuppliedItems.map(id => idMap[id] || id);
                // Remove duplicates in the array
                const uniqueSuppliedItems = Array.from(new Set(mappedSuppliedItems));
                
                if (newSuppliedItems.length !== uniqueSuppliedItems.length || newSuppliedItems.some((id, i) => id !== mappedSuppliedItems[i])) {
                    newSuppliedItems = uniqueSuppliedItems;
                    dealerNeedsUpdate = true;
                }

                for (const [oldId, price] of Object.entries(newItemPrices)) {
                    if (idMap[oldId]) {
                        const primaryId = idMap[oldId];
                        // Only set price if primary doesn't already have one
                        if (newItemPrices[primaryId] === undefined) {
                            newItemPrices[primaryId] = price;
                        }
                        delete newItemPrices[oldId];
                        dealerNeedsUpdate = true;
                    }
                }

                for (const [oldId, expiry] of Object.entries(newItemExpiries)) {
                    if (idMap[oldId]) {
                        const primaryId = idMap[oldId];
                        if (newItemExpiries[primaryId] === undefined) {
                            newItemExpiries[primaryId] = expiry;
                        }
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

            setStatus('Updating consumption records...');
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

            setStatus('Deduplication completed successfully!');
        } catch (error: any) {
            console.error('Merge failed:', error);
            setStatus(`Merge failed: ${error.message}`);
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <div className="p-8">
            <PageHeader title="Merge Duplicates" />
            <div className="mt-8 space-y-4">
                <p>Status: {status}</p>
                <Button onClick={handleMerge} disabled={isMerging}>
                    {isMerging ? 'Merging...' : 'Start Merge'}
                </Button>
            </div>
        </div>
    );
}
