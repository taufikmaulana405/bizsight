
"use client";

import { useState, useEffect } from 'react';
import { DollarSign, TrendingDown, TrendingUp, PiggyBank } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { useData } from '@/contexts/data-context';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart"

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-2))", // Greenish
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-1))", // Orangey-red
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { totalRevenue, totalExpenses, totalProfit, incomes, expenses, loading } = useData();
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (loading) {
      setChartData([]); // Clear data or set specific loading state for chart if needed
      return;
    }

    const processDataForChart = () => {
      const aggregatedData: { [key: string]: { name: string; income: number; expenses: number; yearMonth: string } } = {};

      incomes.forEach(income => {
        const yearMonth = format(income.date, 'yyyy-MM');
        const monthDisplay = format(income.date, 'MMM');
        if (!aggregatedData[yearMonth]) {
          aggregatedData[yearMonth] = { name: monthDisplay, income: 0, expenses: 0, yearMonth };
        }
        aggregatedData[yearMonth].income += income.amount;
      });

      expenses.forEach(expense => {
        const yearMonth = format(expense.date, 'yyyy-MM');
        const monthDisplay = format(expense.date, 'MMM');
        if (!aggregatedData[yearMonth]) {
          aggregatedData[yearMonth] = { name: monthDisplay, income: 0, expenses: 0, yearMonth };
        }
        aggregatedData[yearMonth].expenses += expense.amount;
      });

      const dataArray = Object.values(aggregatedData)
        .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
        .slice(-12); // Show up to last 12 months

      setChartData(dataArray);
    };

    processDataForChart();
  }, [incomes, expenses, loading]);

  const profitColor = totalProfit >= 0 ? 'text-accent' : 'text-destructive';

  const yAxisTickFormatter = (value: number) => {
    if (value === 0) return "$0";
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };


  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Revenue"
          value={totalRevenue}
          icon={TrendingUp}
          description="All income received"
        />
        <MetricCard
          title="Total Expenses"
          value={totalExpenses}
          icon={TrendingDown}
          description="All expenses paid"
        />
        <MetricCard
          title="Net Profit"
          value={totalProfit}
          icon={PiggyBank}
          description="Revenue minus expenses"
          valueColor={cn(profitColor)}
        />
      </div>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Overview</CardTitle>
            <CardDescription>Income vs. Expenses for the last 12 months.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {loading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
                <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={yAxisTickFormatter}
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent
                      labelFormatter={(label, payload) => {
                        // Find the full yearMonth from payload if needed for more context
                        const item = payload?.[0]?.payload;
                        if (item && item.yearMonth) {
                          try {
                            const date = new Date(item.yearMonth + "-01"); // Create a valid date
                            return format(date, "MMM yyyy");
                          } catch (e) {
                            return item.name; // fallback
                          }
                        }
                        return label;
                      }}
                      formatter={(value, name) => (
                        <>
                          <span className="font-medium">{name.charAt(0).toUpperCase() + name.slice(1)}:</span>
                          {typeof value === 'number' ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : value}
                        </>
                      )}
                    />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex min-h-[350px] items-center justify-center rounded-lg border border-dashed p-4 text-center">
                <p className="text-muted-foreground">
                  Not enough data to display chart. <br />
                  Please add some income or expenses to see your monthly overview.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
