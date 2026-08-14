'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
} from '@/components/ui/chart';

const data = [
  { month: 'Jan', consumption: Math.floor(Math.random() * 500) + 100 },
  { month: 'Feb', consumption: Math.floor(Math.random() * 500) + 100 },
  { month: 'Mar', consumption: Math.floor(Math.random() * 500) + 100 },
  { month: 'Apr', consumption: Math.floor(Math.random() * 500) + 100 },
  { month: 'May', consumption: Math.floor(Math.random() * 500) + 100 },
  { month: 'Jun', consumption: Math.floor(Math.random() * 500) + 100 },
];

export function MonthlyConsumptionChart() {
  return (
    <div className="h-[300px] w-full">
      <ChartContainer
        config={{
          consumption: {
            label: 'Consumption',
            color: 'hsl(var(--accent))',
          },
        }}
        className="h-full w-full"
      >
        <BarChart data={data} accessibilityLayer>
          <XAxis
            dataKey="month"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar
            dataKey="consumption"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
