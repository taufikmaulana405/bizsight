
"use client";

import React, { useState, useEffect } from 'react';
import { IncomeForm } from "@/components/forms/income-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useData } from '@/contexts/data-context';
import { useToast } from "@/hooks/use-toast";
import type { Income } from '@/lib/types';
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
import { Pencil, Trash2, PlusCircle, ListRestart, Loader2, Eye } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from '@/components/ui/skeleton';

export default function IncomePage() {
  const dataContext = useData();
  const { toast } = useToast();

  const [displayedIncomes, setDisplayedIncomes] = useState<Income[]>([]);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  
  const [showingAll, setShowingAll] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    if (!showingAll && !dataContext.loading) {
      setDisplayedIncomes(dataContext.incomes);
    }
  }, [dataContext.incomes, showingAll, dataContext.loading]);

  const handleAddNew = () => {
    setEditingIncome(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setIsFormDialogOpen(true);
  };

  const handleDeleteInitiate = (income: Income) => {
    setIncomeToDelete(income);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (incomeToDelete) {
      try {
        await dataContext.deleteIncome(incomeToDelete.id);
        toast({
          title: "Income Deleted",
          description: `${incomeToDelete.source} was successfully deleted.`,
        });
        // If showing all, and the deleted item was in the displayed list, refetch all to update.
        // Otherwise, the snapshot will handle the update for the recent list.
        if (showingAll) {
            handleToggleShowAll(); // This will refetch all or reset to recent based on current state
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not delete income. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIncomeToDelete(null);
        setIsDeleteDialogOpen(false);
      }
    }
  };

  const handleFormFinish = () => {
    setEditingIncome(null);
    setIsFormDialogOpen(false);
    // If showing all and an item was added/edited, it might be good to refresh the "all" list
    // or rely on the user to toggle if strict data consistency is needed for the "all" view.
    // For now, adding/editing an item will reflect in the "recent" list via snapshot.
    // If "all" is shown, the change might not appear without toggling.
  };

  const handleToggleShowAll = async () => {
    if (showingAll) {
      // Switch to showing recent
      setDisplayedIncomes(dataContext.incomes);
      setShowingAll(false);
    } else {
      // Switch to showing all
      setLoadingAll(true);
      try {
        const allIncomes = await dataContext.getAllIncomes();
        setDisplayedIncomes(allIncomes);
        setShowingAll(true);
      } catch (error) {
        toast({ title: "Error", description: "Could not load all incomes.", variant: "destructive" });
      } finally {
        setLoadingAll(false);
      }
    }
  };
  
  const isLoadingInitialData = dataContext.loading && displayedIncomes.length === 0;


  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Income Management</h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Log New Income
        </Button>
      </div>
      
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingIncome ? "Edit Income Entry" : "New Income Entry"}</DialogTitle>
            <DialogDescription>
              {editingIncome ? `Update the details for "${editingIncome.source}".` : "Log a new source of revenue for your business."}
            </DialogDescription>
          </DialogHeader>
          <IncomeForm incomeToEdit={editingIncome} onFinish={handleFormFinish} />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Existing Incomes</CardTitle>
              <CardDescription>
                {showingAll ? "Showing all income entries." : "Showing most recent income entries."}
                {!showingAll && dataContext.incomes.length === 0 && !dataContext.loading && " No recent income entries."}
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
          ) : displayedIncomes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {showingAll ? "No income entries found." : "No recent income entries. Try 'Show All'."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedIncomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="font-medium">{income.source}</TableCell>
                    <TableCell className="text-right">
                      {income.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </TableCell>
                    <TableCell>{format(new Date(income.date), "PPP")}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(income)} aria-label="Edit income">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteInitiate(income)} aria-label="Delete income">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the income entry for <span className="font-semibold">{incomeToDelete?.source}</span>
              amounting to <span className="font-semibold">{incomeToDelete?.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>.
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
