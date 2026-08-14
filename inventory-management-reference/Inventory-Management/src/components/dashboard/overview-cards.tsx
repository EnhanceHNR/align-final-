
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, ShoppingCart } from 'lucide-react';
import { useCollection } from '@/firebase';
import { collection, firestore } from 'firebase/firestore';
import { useMemo } from 'react';
import { InventoryItem, PurchaseOrder } from '@/lib/types';

const StatCard = ({ title, value, icon: Icon, description }: { title: string; value: string | React.ReactNode; icon: React.ElementType; description: string; }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export function OverviewCards() {
    const itemsCollection = useMemo(() => firestore ? collection(firestore, 'items') : null, []);
    const { data: inventoryItems, isLoading: itemsLoading } = useCollection<InventoryItem>(itemsCollection);
    
    const ordersCollection = useMemo(() => firestore ? collection(firestore, 'orderRecords') : null, []);
    const { data: purchaseOrders, isLoading: ordersLoading } = useCollection<PurchaseOrder>(ordersCollection);

    const stats = useMemo(() => {
        if (!inventoryItems || !purchaseOrders) return {
            totalItems: 0,
            lowStockCount: 0,
            pendingOrders: 0,
            totalSpending: 0
        };

        const totalItems = inventoryItems.reduce((acc, item) => acc + item.itemCount, 0);
        const lowStockCount = inventoryItems.filter(item => item.itemCount < item.minQuantity).length;
        const pendingOrders = purchaseOrders.filter(order => order.status === 'Pending' || order.status === 'Delayed').length;
        const totalSpending = purchaseOrders
            .filter(order => order.status === 'Delivered')
            .reduce((acc, order) => acc + order.price, 0);
        
        return { totalItems, lowStockCount, pendingOrders, totalSpending };
    }, [inventoryItems, purchaseOrders]);

    if (itemsLoading || ordersLoading) {
        return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader><CardTitle>Total Items</CardTitle></CardHeader><CardContent>Loading...</CardContent></Card>
            <Card><CardHeader><CardTitle>Low Stock</CardTitle></CardHeader><CardContent>Loading...</CardContent></Card>
            <Card><CardHeader><CardTitle>Pending Orders</CardTitle></CardHeader><CardContent>Loading...</CardContent></Card>
            <Card><CardHeader><CardTitle>Total Spending</CardTitle></CardHeader><CardContent>Loading...</CardContent></Card>
        </div>
    }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard 
        title="Total Items" 
        value={stats.totalItems.toLocaleString()}
        icon={Package} 
        description="+20.1% from last month"
      />
      <StatCard 
        title="Low Stock" 
        value={`${stats.lowStockCount} items`}
        icon={AlertTriangle} 
        description="Items needing reorder"
      />
      <StatCard 
        title="Pending Orders" 
        value={stats.pendingOrders.toString()}
        icon={ShoppingCart}
        description="Deliveries to be received"
      />
      <StatCard 
        title="Total Spending" 
        value={`INR ${stats.totalSpending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={ShoppingCart}
        description="This month"
      />
    </div>
  );
}

    