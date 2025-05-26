
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  DialogDescription as FormDialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as ConfirmDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as ConfirmDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, PlusCircle, Loader2, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 10;
type SortableIncomeKeys = 'source' | 'amount' | 'date';

export default function IncomePage() {
  const dataContext = useData();
  const { toast } = useToast();

  const [allFetchedIncomes, setAllFetchedIncomes] = useState<Income[]>([]);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);

  const [sortConfig, setSortConfig] = useState<{ key: SortableIncomeKeys | null; direction: 'ascending' | 'descending' }>({ key: null, direction: 'ascending' });

  const fetchAllIncomes = useCallback(async () => {
    setInitialLoading(true);
    try {
      const allIncomesData = await dataContext.getAllIncomes();
      setAllFetchedIncomes(allIncomesData);
      // Reset current page if allFetchedIncomes changes, e.g. after delete/add/edit
      // Sort config is preserved unless user clicks header again
      setCurrentPage(1); 
    } catch (error) {
      toast({ title: "Error", description: "Could not load all incomes.", variant: "destructive" });
    } finally {
      setInitialLoading(false);
    }
  }, [dataContext, toast]);

  useEffect(() => {
    fetchAllIncomes();
  }, [fetchAllIncomes]);

  const requestSort = (key: SortableIncomeKeys) => {
    if (sortConfig.key === key) {
      // Current column is already being sorted, cycle through directions or turn off
      if (sortConfig.direction === 'ascending') {
        setSortConfig({ key, direction: 'descending' });
      } else { // direction is 'descending'
        setSortConfig({ key: null, direction: 'ascending' }); // Turn off sort for this column
      }
    } else {
      // New column to sort, start with ascending
      setSortConfig({ key, direction: 'ascending' });
    }
    setCurrentPage(1);
  };

  const sortedIncomes = useMemo(() => {
    let sortableItems = [...allFetchedIncomes];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        if (valA === null || valA === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valB === null || valB === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
        
        let comparison = 0;
        if (sortConfig.key === 'amount') {
          comparison = (valA as number) < (valB as number) ? -1 : (valA as number) > (valB as number) ? 1 : 0;
        } else if (sortConfig.key === 'date') {
          comparison = new Date(valA as Date).getTime() < new Date(valB as Date).getTime() ? -1 : new Date(valA as Date).getTime() > new Date(valB as Date).getTime() ? 1 : 0;
        } else { // source
          comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
        }
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return sortableItems;
  }, [allFetchedIncomes, sortConfig]);

  const totalPages = useMemo(() => {
    if (sortedIncomes.length === 0) return 1;
    return Math.ceil(sortedIncomes.length / ITEMS_PER_PAGE);
  }, [sortedIncomes]);

  const currentTableData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedIncomes.slice(startIndex, endIndex);
  }, [sortedIncomes, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

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
        await fetchAllIncomes(); 
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

  const handleFormFinish = async () => {
    setEditingIncome(null);
    setIsFormDialogOpen(false);
    await fetchAllIncomes(); 
  };
  
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

  const getSortIcon = (columnKey: SortableIncomeKeys) => {
    if (sortConfig.key !== columnKey) {
      return null; 
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="ml-1 h-4 w-4 inline-block" />;
    } else {
      return <ArrowDown className="ml-1 h-4 w-4 inline-block" />;
    }
  };

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
            <FormDialogDescription>
              {editingIncome ? `Update the details for "${editingIncome.source}".` : "Log a new source of revenue for your business."}
            </FormDialogDescription>
          </DialogHeader>
          <IncomeForm incomeToEdit={editingIncome} onFinish={handleFormFinish} />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Income Entries</CardTitle>
          <CardDescription>
            {initialLoading 
              ? "Loading income entries..."
              : `Showing all income entries.`}
            {!initialLoading && allFetchedIncomes.length === 0 && " No income entries found."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initialLoading && allFetchedIncomes.length === 0 ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : currentTableData.length === 0 && !initialLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No income entries found.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('source')} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      Source {getSortIcon('source')}
                    </TableHead>
                    <TableHead onClick={() => requestSort('amount')} className="text-right cursor-pointer hover:bg-muted/50 transition-colors">
                      Amount {getSortIcon('amount')}
                    </TableHead>
                    <TableHead onClick={() => requestSort('date')} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      Date {getSortIcon('date')}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTableData.map((income) => (
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
              {sortedIncomes.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || initialLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || initialLoading}
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
            <ConfirmDialogTitle>Are you absolutely sure?</ConfirmDialogTitle>
            <ConfirmDialogDescription>
              This action cannot be undone. This will permanently delete the income entry for <span className="font-semibold">{incomeToDelete?.source}</span>
              amounting to <span className="font-semibold">{incomeToDelete?.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>.
            </ConfirmDialogDescription>
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
