
"use client";

import React, { useEffect } from "react"; // Added React import
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useData, type IncomeFormData } from "@/contexts/data-context"; // Import IncomeFormData
import { useToast } from "@/hooks/use-toast";
import type { Income } from "@/lib/types";

const incomeFormSchema = z.object({
  source: z.string().min(2, "Source must be at least 2 characters.").max(100, "Source must be 100 characters or less."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  date: z.date({ required_error: "A date is required." }),
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

interface IncomeFormProps {
  incomeToEdit?: Income | null;
  onFinish?: () => void; // Called after successful submission or cancellation
}

export function IncomeForm({ incomeToEdit, onFinish }: IncomeFormProps) {
  const { addIncome, updateIncome } = useData();
  const { toast } = useToast();

  const isEditing = !!incomeToEdit;

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      source: "",
      amount: 0,
      date: new Date(),
    },
  });

  useEffect(() => {
    if (isEditing && incomeToEdit) {
      form.reset({
        source: incomeToEdit.source,
        amount: incomeToEdit.amount,
        date: new Date(incomeToEdit.date), // Ensure date is a Date object
      });
    } else {
      // Reset to default "add new" state
      form.reset({
        source: "",
        amount: 0, // Or a more suitable default like undefined if your input handles it
        date: new Date(),
      });
    }
  }, [incomeToEdit, form, isEditing]);

  async function onSubmit(values: IncomeFormValues) {
    try {
      if (isEditing && incomeToEdit) {
        await updateIncome(incomeToEdit.id, values as IncomeFormData);
        toast({
          title: "Income Updated",
          description: `${values.source} - ${values.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
        });
      } else {
        await addIncome(values as IncomeFormData);
        toast({
          title: "Income Added",
          description: `${values.source} - ${values.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
        });
      }
      if (onFinish) {
        onFinish();
      }
    } catch (error) {
      console.error("Error submitting income form:", error);
      toast({
        title: "Error",
        description: `Could not ${isEditing ? 'update' : 'add'} income. Please try again.`,
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Income Source</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Project Alpha" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 1500" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex space-x-2">
          <Button type="submit">{isEditing ? "Update Income" : "Add Income"}</Button>
          {isEditing && (
            <Button type="button" variant="outline" onClick={() => {
              if (onFinish) onFinish(); // This will trigger reset via useEffect in parent
            }}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
