
"use client";

import React, { useEffect } from "react";
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
import { useData, type ExpenseFormData } from "@/contexts/data-context";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@/lib/types";

const expenseFormSchema = z.object({
  category: z.string().min(2, "Category must be at least 2 characters.").max(100, "Category must be 100 characters or less."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  date: z.date({ required_error: "A date is required." }),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  expenseToEdit?: Expense | null;
  onFinish?: () => void; // Called after successful submission or cancellation
}

export function ExpenseForm({ expenseToEdit, onFinish }: ExpenseFormProps) {
  const { addExpense, updateExpense } = useData();
  const { toast } = useToast();

  const isEditing = !!expenseToEdit;

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: "",
      amount: 0,
      date: new Date(),
    },
  });

  useEffect(() => {
    if (isEditing && expenseToEdit) {
      form.reset({
        category: expenseToEdit.category,
        amount: expenseToEdit.amount,
        date: new Date(expenseToEdit.date), // Ensure date is a Date object
      });
    } else {
      form.reset({
        category: "",
        amount: 0,
        date: new Date(),
      });
    }
  }, [expenseToEdit, form, isEditing]);

  async function onSubmit(values: ExpenseFormValues) {
    try {
      if (isEditing && expenseToEdit) {
        await updateExpense(expenseToEdit.id, values as ExpenseFormData);
        toast({
          title: "Expense Updated",
          description: `${values.category} - ${values.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
        });
      } else {
        await addExpense(values as ExpenseFormData);
        toast({
          title: "Expense Added",
          description: `${values.category} - ${values.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
        });
      }
      if (onFinish) {
        onFinish();
      }
    } catch (error) {
      console.error("Error submitting expense form:", error);
      toast({
        title: "Error",
        description: `Could not ${isEditing ? 'update' : 'add'} expense. Please try again.`,
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expense Category</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Office Supplies" {...field} />
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
                <Input type="number" placeholder="e.g., 75.50" step="0.01" {...field} />
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
          <Button type="submit">{isEditing ? "Update Expense" : "Add Expense"}</Button>
          {isEditing && (
            <Button type="button" variant="outline" onClick={() => {
              if (onFinish) onFinish(); 
            }}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
