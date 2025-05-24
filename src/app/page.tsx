
"use client";

import { useState, useEffect, useMemo, useRef } from 'react'; // Added useRef
import { DollarSign, TrendingDown, TrendingUp, PiggyBank, Lightbulb, Download, Upload, AlertTriangle } from 'lucide-react'; // Added Download, Upload, AlertTriangle
import { MetricCard } from '@/components/dashboard/metric-card';
import { useData } from '@/contexts/data-context';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast"; // Added useToast
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Added AlertDialog components

import { generateFinancialInsight, type FinancialInsightInput, type FinancialInsightOutput } from '@/ai/flows/financial-insight-flow';
import type { Income, Expense, AllDataExport } from '@/lib/types'; // Added AllDataExport

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

// Helper function to aggregate monthly data for insights
const getMonthlyDataForInsightAggregator = (
  currentIncomes: Income[],
  currentExpenses: Expense[]
): Array<{ name: string; income: number; expenses: number }> => {
  const monthlyAggregatedData: { [key: string]: { name: string; income: number; expenses: number; yearMonth: string } } = {};
  currentIncomes.forEach(income => {
    const yearMonth = format(new Date(income.date), 'yyyy-MM'); // Ensure date is Date object
    const monthDisplay = format(new Date(income.date), 'MMM');
    if (!monthlyAggregatedData[yearMonth]) {
      monthlyAggregatedData[yearMonth] = { name: monthDisplay, income: 0, expenses: 0, yearMonth };
    }
    monthlyAggregatedData[yearMonth].income += income.amount;
  });
  currentExpenses.forEach(expense => {
    const yearMonth = format(new Date(expense.date), 'yyyy-MM'); // Ensure date is Date object
    const monthDisplay = format(new Date(expense.date), 'MMM');
    if (!monthlyAggregatedData[yearMonth]) {
      monthlyAggregatedData[yearMonth] = { name: monthDisplay, income: 0, expenses: 0, yearMonth };
    }
    monthlyAggregatedData[yearMonth].expenses += expense.amount;
  });
  return Object.values(monthlyAggregatedData)
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    .slice(-6) // Get last 6 months for insight
    .map(cd => ({ name: cd.name, income: cd.income, expenses: cd.expenses })); 
};


export default function DashboardPage() {
  const { totalRevenue, totalExpenses, totalProfit, incomes, expenses, appointments, loading: dataLoading, importAllData } = useData();
  const { toast } = useToast();
  const [chartData, setChartData] = useState<any[]>([]);
  const [financialInsight, setFinancialInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState<boolean>(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [dataToImport, setDataToImport] = useState<AllDataExport | null>(null);
  const [importLoading, setImportLoading] = useState(false);


  const [isAiInsightEnabled, setIsAiInsightEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true; 
    }
    const storedPreference = localStorage.getItem('aiInsightEnabled');
    return storedPreference !== null ? JSON.parse(storedPreference) : true; 
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aiInsightEnabled', JSON.stringify(isAiInsightEnabled));
    }
  }, [isAiInsightEnabled]);

  useEffect(() => {
    if (dataLoading) {
      setChartData([]);
      return;
    }

    const processDataForChart = () => {
      const aggregatedData: { [key: string]: { name: string; income: number; expenses: number; yearMonth: string } } = {};

      incomes.forEach(income => {
        const yearMonth = format(new Date(income.date), 'yyyy-MM');
        const monthDisplay = format(new Date(income.date), 'MMM');
        if (!aggregatedData[yearMonth]) {
          aggregatedData[yearMonth] = { name: monthDisplay, income: 0, expenses: 0, yearMonth };
        }
        aggregatedData[yearMonth].income += income.amount;
      });

      expenses.forEach(expense => {
        const yearMonth = format(new Date(expense.date), 'yyyy-MM');
        const monthDisplay = format(new Date(expense.date), 'MMM');
        if (!aggregatedData[yearMonth]) {
          aggregatedData[yearMonth] = { name: monthDisplay, income: 0, expenses: 0, yearMonth };
        }
        aggregatedData[yearMonth].expenses += expense.amount;
      });

      const dataArray = Object.values(aggregatedData)
        .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
        .slice(-12);

      setChartData(dataArray);
    };

    processDataForChart();
  }, [incomes, expenses, dataLoading]);

  const insightInputKey = useMemo(() => {
    if (dataLoading) return null;
    // Dates in incomes/expenses are already Date objects from DataContext
    const monthlyData = getMonthlyDataForInsightAggregator(incomes, expenses);
    return JSON.stringify({
      totalRevenue,
      totalExpenses,
      totalProfit,
      monthlyData,
    });
  }, [totalRevenue, totalExpenses, totalProfit, incomes, expenses, dataLoading]);


  useEffect(() => {
    if (!isAiInsightEnabled) {
      setFinancialInsight("AI insights are disabled. Click the lightbulb to enable.");
      setInsightLoading(false);
      setInsightError(null);
      return;
    }

    const hasFinancialActivity = totalRevenue > 0 || totalExpenses > 0 || incomes.length > 0 || expenses.length > 0;

    if (!dataLoading && hasFinancialActivity && insightInputKey) {
      if (!insightLoading) { // Only fetch if not already loading
        const fetchInsight = async () => {
          setInsightLoading(true);
          setInsightError(null);
          try {
            const monthlyDataForFlow = getMonthlyDataForInsightAggregator(incomes, expenses);

            const input: FinancialInsightInput = {
              totalRevenue,
              totalExpenses,
              totalProfit,
              monthlyData: monthlyDataForFlow,
            };
            const result: FinancialInsightOutput = await generateFinancialInsight(input);
            setFinancialInsight(result.insight);
          } catch (error: any) {
            console.error("Failed to generate financial insight:", error);
            if (error.toString().includes("429") || (error.message && error.message.includes("429"))) {
              setInsightError("AI insight generation is currently rate-limited. Please try again in a few moments. If this persists, consider upgrading your AI plan.");
            } else {
              setInsightError("Could not generate financial insight at this time.");
            }
            setFinancialInsight(null); // Clear previous insight on error
          } finally {
            setInsightLoading(false);
          }
        };
        fetchInsight();
      }
    } else if (!dataLoading && !hasFinancialActivity) {
      const defaultMessage = "Add some income and expenses to get your first financial insight!";
      if (financialInsight !== defaultMessage || insightError) {
        setFinancialInsight(defaultMessage);
        setInsightError(null);
      }
       setInsightLoading(false); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAiInsightEnabled, dataLoading, insightInputKey]); // insightLoading removed to prevent re-triggering on its own change


  const profitColor = totalProfit >= 0 ? 'text-accent' : 'text-destructive';

  const yAxisTickFormatter = (value: number) => {
    if (value === 0) return "$0";
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const handleExportData = () => {
    const dataToExport: AllDataExport = {
      incomes: incomes.map(i => ({...i, date: i.date.toISOString() as any})), // Convert Date to ISO string
      expenses: expenses.map(e => ({...e, date: e.date.toISOString() as any})),
      appointments: appointments.map(a => ({...a, date: a.date.toISOString() as any})),
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bizsight_data_export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Data Exported", description: "Your data has been downloaded as a JSON file." });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedData = JSON.parse(text) as AllDataExport;
            // Basic validation
            if (parsedData && Array.isArray(parsedData.incomes) && Array.isArray(parsedData.expenses) && Array.isArray(parsedData.appointments)) {
              setDataToImport(parsedData);
              setIsImportConfirmOpen(true);
            } else {
              throw new Error("Invalid file format.");
            }
          }
        } catch (error) {
          toast({ title: "Import Error", description: "Failed to parse JSON file or invalid format.", variant: "destructive" });
          console.error("Import error:", error);
        } finally {
          // Reset file input to allow re-selection of the same file
          if (event.target) {
            event.target.value = ""; 
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const confirmImportData = async () => {
    if (dataToImport) {
      setImportLoading(true);
      setIsImportConfirmOpen(false);
      try {
        await importAllData(dataToImport);
        toast({ title: "Import Successful", description: "Your data has been imported." });
      } catch (error) {
        toast({ title: "Import Failed", description: "Could not import data. Please check the console.", variant: "destructive" });
        console.error("Import failed:", error);
      } finally {
        setImportLoading(false);
        setDataToImport(null);
      }
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        {/* Add Data Management Card/Section here if preferred, or keep buttons separate */}
      </div>
      
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

      <div className="mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-x-2 pb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsAiInsightEnabled(prev => !prev)}
                    aria-label={isAiInsightEnabled ? "Disable AI Financial Insights" : "Enable AI Financial Insights"}
                    aria-pressed={isAiInsightEnabled}
                  >
                    <Lightbulb className={cn("h-6 w-6", isAiInsightEnabled ? "text-primary" : "text-destructive")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isAiInsightEnabled ? "Click to disable AI insights" : "Click to enable AI insights"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <CardTitle>AI Financial Insight</CardTitle>
          </CardHeader>
          <CardContent>
            {insightLoading && isAiInsightEnabled ? (
              <>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : insightError && isAiInsightEnabled ? (
              <Alert variant="destructive">
                <AlertDescription>{insightError}</AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">
                {financialInsight || (isAiInsightEnabled ? "No insights available yet. Add more data!" : "AI insights are disabled. Click the lightbulb to enable.")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Overview</CardTitle>
            <CardDescription>Income vs. Expenses for the last 12 months.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {dataLoading ? (
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
                        const item = payload?.[0]?.payload;
                        if (item && item.yearMonth) {
                          try {
                            // Ensure date is parsed correctly regardless of timezone for display
                            const [year, month] = item.yearMonth.split('-');
                            const date = new Date(Number(year), Number(month) - 1, 1);
                            return format(date, "MMM yyyy");
                          } catch (e) {
                            return item.name;
                          }
                        }
                        return label;
                      }}
                      formatter={(value, name) => (
                        <>
                          <span className="font-medium" style={{ color: name === 'income' ? 'var(--color-income)' : 'var(--color-expenses)'}}>
                            {String(name).charAt(0).toUpperCase() + String(name).slice(1)}:
                          </span>
                          {' '}{typeof value === 'number' ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : value}
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

      {/* Data Management Section */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export your application data or import data from a backup file.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleExportData} variant="outline" disabled={dataLoading || importLoading}>
              <Download className="mr-2 h-4 w-4" />
              Export All Data
            </Button>
            <Button onClick={handleImportClick} variant="outline" disabled={dataLoading || importLoading}>
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".json"
              className="hidden"
            />
            {(dataLoading || importLoading) && <p className="text-sm text-muted-foreground">Processing...</p>}
          </CardContent>
        </Card>
      </div>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
              Confirm Data Import
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure you want to import this data? 
              <strong className="text-destructive"> This action will permanently delete all your current income, expense, and appointment records and replace them with the data from the selected file.</strong> This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setDataToImport(null); setIsImportConfirmOpen(false);}}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImportData} className="bg-destructive hover:bg-destructive/90">
              Yes, Overwrite and Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
