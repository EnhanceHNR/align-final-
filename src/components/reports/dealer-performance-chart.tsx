
"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { api } from "~/trpc/react";
import { useMemo } from "react";
import { PurchaseOrder } from "@/lib/types";


export function DealerPerformanceChart() {
    const ordersCollection = useMemo(() => firestore ? collection(firestore, 'orderRecords') : null, []);
    const { data: purchaseOrders, isLoading } = useCollection<PurchaseOrder>(ordersCollection);

    const chartData = useMemo(() => {
        if (!purchaseOrders) return [];
        const dealerData = purchaseOrders.reduce((acc, order) => {
            if (order.status === 'Delivered') {
                acc[order.dealer] = (acc[order.dealer] || 0) + order.price;
            }
            return acc;
        }, {} as Record<string, number>);
    
        return Object.entries(dealerData).map(([dealer, total]) => ({
            name: dealer.split(' ')[0], // Shorten name
            total: total
        }));
    }, [purchaseOrders]);

    if (isLoading) {
        return <div className="w-full h-[300px] flex items-center justify-center">Loading...</div>
    }

  return (
    <div className="w-full h-[300px]">
        <ChartContainer config={{
            total: {
                label: "Total Value",
                color: "hsl(var(--chart-2))",
            }
        }} className="h-full w-full">
            <BarChart accessibilityLayer data={chartData}>
                <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                />
                <YAxis 
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => {
                        const formattedValue = new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            notation: 'compact',
                            compactDisplay: 'short'
                        }).format(value);
                        return formattedValue.replace('₹', 'INR ');
                    }}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent 
                        indicator="dot" 
                        formatter={(value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value as number).replace('₹', 'INR ')}
                    />}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={4} />
            </BarChart>
        </ChartContainer>
    </div>
  )
}

    