"use client"

import * as React from "react"
import { Pie, PieChart, Sector } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
const inventoryItems = [] as any[];

const chartConfig = {
  items: {
    label: "Items",
  },
  instruments: {
    label: "Instruments",
    color: "hsl(var(--chart-1))",
  },
  consumables: {
    label: "Consumables",
    color: "hsl(var(--chart-2))",
  },
  materials: {
    label: "Materials",
    color: "hsl(var(--chart-3))",
  },
} satisfies React.ComponentProps<typeof ChartContainer>["config"]

export function StockOverviewChart() {
  const chartData = React.useMemo(() => {
    const categoryCounts = inventoryItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCounts).map(([category, count]) => ({
      name: category,
      items: count,
      fill: `var(--color-${category.toLowerCase()})`,
    }));
  }, []);

  const id = "pie-interactive"

  return (
    <div className="w-full h-[300px]">
      <ChartContainer
        id={id}
        config={chartConfig}
        className="mx-auto aspect-square h-full"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="items"
            nameKey="name"
            innerRadius={60}
            strokeWidth={5}
            activeIndex={0}
            activeShape={({ outerRadius = 0, ...props }) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius}
                    innerRadius={outerRadius - 8}
                  />
                </g>
              )}
          />
        </PieChart>
      </ChartContainer>
    </div>
  )
}
