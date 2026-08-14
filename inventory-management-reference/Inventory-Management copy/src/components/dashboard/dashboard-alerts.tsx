'use client';
import { useCollection, firestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { InventoryItem, PurchaseOrder, Delivery } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Clock, Truck } from 'lucide-react';
import Link from 'next/link';

export function DashboardAlerts() {
    const itemsCollection = useMemo(() => firestore ? collection(firestore, 'items') : null, []);
    const { data: inventoryItems } = useCollection<InventoryItem>(itemsCollection);
    
    const ordersCollection = useMemo(() => firestore ? collection(firestore, 'orderRecords') : null, []);
    const { data: purchaseOrders } = useCollection<PurchaseOrder>(ordersCollection);

    const deliveriesCollection = useMemo(() => firestore ? collection(firestore, 'deliveries') : null, []);
    const { data: deliveries } = useCollection<Delivery>(deliveriesCollection);

    const alerts = useMemo(() => {
        const generatedAlerts: React.ReactNode[] = [];
        
        if (!inventoryItems || !purchaseOrders) return generatedAlerts;

        // 1. Threshold Minimum
        const lowStockItems = inventoryItems.filter(item => item.itemCount <= item.minQuantity);
        if (lowStockItems.length > 0) {
            generatedAlerts.push(
                <Alert className="border-[#EDCFA3] bg-[#F4EBE0] text-[#D37C2C] dark:bg-[#D37C2C]/10 dark:border-[#D37C2C]/30 dark:text-[#E89241]" key="low-stock">
                    <AlertCircle className="h-5 w-5 stroke-[#D37C2C] dark:stroke-[#E89241]" />
                    <AlertTitle className="text-[17px] font-medium leading-relaxed">Inventory Alert</AlertTitle>
                    <AlertDescription className="text-[15px] mt-1">
                        {lowStockItems.length} {lowStockItems.length === 1 ? 'item has' : 'items have'} dropped to Low or Out of Stock!
                        <Link href="/inventory?alert=low-stock" className="ml-2 font-bold underline hover:opacity-80">Review now</Link>
                    </AlertDescription>
                </Alert>
            );
        }

        // 2. Reached Expiry Date
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day
        const expiredItems = inventoryItems.filter(item => 
            item.stock?.some(s => {
                const expiry = new Date(s.expiryDate);
                return expiry <= today;
            })
        );
        if (expiredItems.length > 0) {
             generatedAlerts.push(
                <Alert variant="destructive" key="expired">
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Expired Items</AlertTitle>
                    <AlertDescription>
                        You have {expiredItems.length} {expiredItems.length === 1 ? 'item' : 'items'} that have reached their expiry date.
                        <Link href="/inventory?alert=expired" className="ml-2 font-medium underline">View Inventory</Link>
                    </AlertDescription>
                </Alert>
            );
        }

        // 3. Order ETA in next 2 days
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        twoDaysFromNow.setHours(23, 59, 59, 999); // End of the day, 2 days from now

        const arrivingOrders = purchaseOrders.filter(order => {
            if (order.status !== 'Pending' && order.status !== 'Delayed') return false;
            if (!order.estimatedArrival) return false;
            
            const eta = new Date(order.estimatedArrival);
            // Alert if ETA is anytime before the end of '2 days from now'
            return eta <= twoDaysFromNow;
        });

        if (arrivingOrders.length > 0) {
            generatedAlerts.push(
                <Alert className="border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" key="eta">
                    <Truck className="h-4 w-4 stroke-yellow-600 dark:stroke-yellow-400" />
                    <AlertTitle>Upcoming Deliveries</AlertTitle>
                    <AlertDescription>
                        You have {arrivingOrders.length} {arrivingOrders.length === 1 ? 'order' : 'orders'} expected to arrive within the next 2 days (or overdue).
                        <Link href="/orders?alert=eta" className="ml-2 font-medium underline">View Orders</Link>
                    </AlertDescription>
                </Alert>
            );
        }

        // 4. Pending Approvals
        const pendingApprovals = purchaseOrders.filter(order => order.status === 'Pending Approval');
        if (pendingApprovals.length > 0) {
            generatedAlerts.unshift(
                <Alert className="border-[#EDCFA3] bg-[#F4EBE0] text-[#D37C2C] dark:bg-[#D37C2C]/10 dark:border-[#D37C2C]/30 dark:text-[#E89241]" key="pending-approvals">
                    <AlertCircle className="h-5 w-5 stroke-[#D37C2C] dark:stroke-[#E89241]" />
                    <AlertTitle className="text-[17px] font-medium leading-relaxed">Pending Order Approvals</AlertTitle>
                    <AlertDescription className="text-[15px]">
                        You have {pendingApprovals.length} pending order {pendingApprovals.length === 1 ? 'request' : 'requests'} from employees. 
                        <Link href="/orders?alert=pending-approvals" className="ml-2 font-bold underline hover:opacity-80">Review now</Link>
                    </AlertDescription>
                </Alert>
            );
        }

        // 5. Unpaid Bills > 30 Days
        if (deliveries) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const overdueBills = deliveries.filter(delivery => {
                if (delivery.isPaid) return false;
                const deliveryDate = new Date(delivery.deliveryDate);
                return deliveryDate < thirtyDaysAgo;
            });

            if (overdueBills.length > 0) {
                generatedAlerts.unshift(
                    <Alert variant="destructive" key="overdue-bills">
                        <AlertCircle className="h-5 w-5" />
                        <AlertTitle className="text-[17px] font-medium leading-relaxed">Overdue Bills Detected</AlertTitle>
                        <AlertDescription className="text-[15px]">
                            You have {overdueBills.length} unpaid {overdueBills.length === 1 ? 'bill' : 'bills'} pending for more than 30 days since delivery.
                            <Link href="/bills" className="ml-2 font-bold underline hover:opacity-80">Review Bills</Link>
                        </AlertDescription>
                    </Alert>
                );
            }
        }

        return generatedAlerts;
    }, [inventoryItems, purchaseOrders, deliveries]);

    if (alerts.length === 0) return null;

    return (
        <div className="flex flex-col gap-4">
            {alerts}
        </div>
    );
}
