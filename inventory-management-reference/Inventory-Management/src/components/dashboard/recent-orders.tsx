
'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCollection, firestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { PurchaseOrder } from '@/lib/types';

const statusVariantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    'Pending': 'outline',
    'Delivered': 'default',
    'Delayed': 'secondary',
    'Rejected': 'destructive',
};

export function RecentOrders() {
  const ordersCollection = useMemo(() => firestore ? collection(firestore, 'orderRecords') : null, []);
  const { data: purchaseOrders, isLoading } = useCollection<PurchaseOrder>(ordersCollection);
  
  const recentOrders = useMemo(() => {
    if (!purchaseOrders) return [];
    return purchaseOrders.slice(0, 5);
  }, [purchaseOrders]);

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Recent Orders</CardTitle>
                <CardDescription>A list of the most recent purchase orders.</CardDescription>
            </CardHeader>
            <CardContent>
                <div>Loading...</div>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Recent Orders</CardTitle>
        <CardDescription>A list of the most recent purchase orders.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.itemName}</TableCell>
                <TableCell>{order.dealer}</TableCell>
                <TableCell>INR {order.price.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariantMap[order.status] || 'default'}>
                    {order.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    