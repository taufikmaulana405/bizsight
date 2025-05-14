"use client";

import { DollarSign, TrendingDown, TrendingUp, PiggyBank } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { useData } from '@/contexts/data-context';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { totalRevenue, totalExpenses, totalProfit } = useData();

  const profitColor = totalProfit >= 0 ? 'text-accent' : 'text-destructive';

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
        <h2 className="text-2xl font-semibold mb-4">Quick Overview</h2>
        {/* Placeholder for charts or more detailed summaries */}
        <div className="p-6 bg-card rounded-lg shadow">
          <p className="text-muted-foreground">More insights and charts coming soon!</p>
        </div>
      </div>
    </div>
  );
}
