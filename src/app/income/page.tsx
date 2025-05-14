import { IncomeForm } from "@/components/forms/income-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AddIncomePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Add Income</h1>
      <Card>
        <CardHeader>
          <CardTitle>New Income Entry</CardTitle>
          <CardDescription>Log a new source of revenue for your business.</CardDescription>
        </CardHeader>
        <CardContent>
          <IncomeForm />
        </CardContent>
      </Card>
    </div>
  );
}
