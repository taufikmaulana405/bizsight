
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ExpenseForm } from "@/components/forms/expense-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useData } from '@/contexts/data-context';
import { useToast } from "@/hooks/use-toast";
import type { Expense } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, PlusCircle, ListRestart, Loader2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 10;

export default function ExpensesPage() {
  const dataContext = useData();
  const { toast } = useToast();

  const [allFetchedExpenses, setAllFetchedExpenses] = useState<Expense[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);

  const [showingAll, setShowingAll] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const displayedExpensesSource = useMemo(() => {
    return showingAll ? allFetchedExpenses : dataContext.expenses;
  }, [showingAll, allFetchedExpenses, dataContext.expenses]);

  const totalPages = useMemo(() => {
    if (!showingAll || displayedExpensesSource.length === 0) return 1;
    return Math.ceil(displayedExpensesSource.length / ITEMS_PER_PAGE);
  }, [displayedExpensesSource, showingAll]);

  const currentTableData = useMemo(() => {
    if (!showingAll) {
      return displayedExpensesSource; // Show recent items directly
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return displayedExpensesSource.slice(startIndex, endIndex);
  }, [displayedExpensesSource, currentPage, showingAll]);

  useEffect(() => {
    if (showingAll && currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage, showingAll]);

  const handleAddNew = () => {
    setEditingExpense(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormDialogOpen(true);
  };

  const handleDeleteInitiate = (expense: Expense) => {
    setExpenseToDelete(expense);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (expenseToDelete) {
      try {
        await dataContext.deleteExpense(expenseToDelete.id);
        toast({
          title: "Expense Deleted",
          description: `${expenseToDelete.category} expense was successfully deleted.`,
        });
        if (showingAll) {
            setLoadingAll(true);
            const updatedAllExpenses = await dataContext.getAllExpenses();
            setAllFetchedExpenses(updatedAllExpenses);
            setLoadingAll(false);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not delete expense. Please try again.",
          variant: "destructive",
        });
      } finally {
        setExpenseToDelete(null);
        setIsDeleteDialogOpen(false);
      }
    }
  };

  const handleFormFinish = async () => {
    setEditingExpense(null);
    setIsFormDialogOpen(false);
    if (showingAll) {
      setLoadingAll(true);
      const updatedAllExpenses = await dataContext.getAllExpenses();
      setAllFetchedExpenses(updatedAllExpenses);
      setLoadingAll(false);
    }
  };

  const handleToggleShowAll = async () => {
    if (showingAll) {
      setShowingAll(false);
      setCurrentPage(1);
    } else {
      setLoadingAll(true);
      try {
        const allExpensesData = await dataContext.getAllExpenses();
        setAllFetchedExpenses(allExpensesData);
        setShowingAll(true);
        setCurrentPage(1);
      } catch (error) {
        toast({ title: "Error", description: "Could not load all expenses.", variant: "destructive" });
      } finally {
        setLoadingAll(false);
      }
    }
  };

  const isLoadingInitialData = dataContext.loading && !showingAll && dataContext.expenses.length === 0;

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Expense Management</h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Log New Expense
        </Button>
      </div>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense Entry" : "New Expense Entry"}</DialogTitle>
            <DialogDescription>
              {editingExpense ? `Update the details for "${editingExpense.category}".` : "Log a new expense for your business."}
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm expenseToEdit={editingExpense} onFinish={handleFormFinish} />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Existing Expenses</CardTitle>
              <CardDescription>
                 {showingAll 
                    ? `Showing all expense entries. Page ${currentPage} of ${totalPages}.` 
                    : "Showing most recent expense entries."}
                 {!showingAll && dataContext.expenses.length === 0 && !dataContext.loading && " No recent expense entries."}
              </CardDescription>
            </div>
            <Button onClick={handleToggleShowAll} variant="outline" disabled={loadingAll || dataContext.loading}>
              {loadingAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : showingAll ? (
                <ListRestart className="mr-2 h-4 w-4" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              {showingAll ? "Show Recent" : "Show All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingInitialData ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : currentTableData.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-4">
              {showingAll ? "No expense entries found in 'Show All' view." : "No recent expense entries. Try 'Show All'."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTableData.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.category}</TableCell>
                      <TableCell className="text-right">
                        {expense.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </TableCell>
                      <TableCell>{format(new Date(expense.date), "PPP")}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(expense)} aria-label="Edit expense">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteInitiate(expense)} aria-label="Delete expense">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {showingAll && displayedExpensesSource.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-end space-x-2 py-4">
                   <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense entry for <span className="font-semibold">{expenseToDelete?.category}</span>
              amounting to <span className="font-semibold">{expenseToDelete?.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Yes, delete it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
