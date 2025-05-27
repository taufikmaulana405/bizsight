
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Pencil, Trash2, PlusCircle, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, CalendarIcon, FilterX, Filter } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;
type SortableExpenseKeys = 'category' | 'amount' | 'date';

export default function ExpensesPage() {
  const dataContext = useData();
  const { toast } = useToast();

  const [allFetchedExpenses, setAllFetchedExpenses] = useState<Expense[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);

  const [sortConfig, setSortConfig] = useState<{ key: SortableExpenseKeys | null; direction: 'ascending' | 'descending' }>({ key: null, direction: 'ascending' });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isFilterSectionVisible, setIsFilterSectionVisible] = useState(false);

  const isInvalidAmountRange = useMemo(() => {
    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    return !isNaN(min) && !isNaN(max) && max < min;
  }, [minAmount, maxAmount]);

  const fetchAllExpenses = useCallback(async () => {
    setInitialLoading(true);
    try {
      const allExpensesData = await dataContext.getAllExpenses();
      setAllFetchedExpenses(allExpensesData);
    } catch (error) {
      toast({ title: "Error", description: "Could not load all expenses.", variant: "destructive" });
    } finally {
      setInitialLoading(false);
    }
  }, [dataContext, toast]);

  useEffect(() => {
    fetchAllExpenses();
  }, [fetchAllExpenses]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig, startDate, endDate, minAmount, maxAmount]);

  const requestSort = (key: SortableExpenseKeys) => {
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'ascending') {
        setSortConfig({ key, direction: 'descending' });
      } else { 
        setSortConfig({ key: null, direction: 'ascending' }); 
      }
    } else {
      setSortConfig({ key, direction: 'ascending' });
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setMinAmount('');
    setMaxAmount('');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const filteredExpenses = useMemo(() => {
    let tempExpenses = [...allFetchedExpenses];

    if (searchTerm) {
      tempExpenses = tempExpenses.filter(expense =>
        expense.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    const isValidMin = !isNaN(min);
    const isValidMax = !isNaN(max);

    if (!isInvalidAmountRange) { // Only apply amount filter if range is valid
      if (isValidMin) {
        tempExpenses = tempExpenses.filter(expense => expense.amount >= min);
      }
      if (isValidMax) {
        tempExpenses = tempExpenses.filter(expense => expense.amount <= max);
      }
    }
    
    if (startDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      tempExpenses = tempExpenses.filter(expense => new Date(expense.date) >= startOfDay);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      tempExpenses = tempExpenses.filter(expense => new Date(expense.date) <= endOfDay);
    }

    return tempExpenses;
  }, [allFetchedExpenses, searchTerm, minAmount, maxAmount, startDate, endDate, isInvalidAmountRange]);

  const sortedExpenses = useMemo(() => {
    let sortableItems = [...filteredExpenses];
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
        } else { 
          comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
        }
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return sortableItems;
  }, [filteredExpenses, sortConfig]);

  const totalPages = useMemo(() => {
    if (sortedExpenses.length === 0) return 1;
    return Math.ceil(sortedExpenses.length / ITEMS_PER_PAGE);
  }, [sortedExpenses]);

  const currentTableData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedExpenses.slice(startIndex, endIndex);
  }, [sortedExpenses, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

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
        await fetchAllExpenses(); 
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
    await fetchAllExpenses(); 
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

  const getSortIcon = (columnKey: SortableExpenseKeys) => {
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
        <h1 className="text-3xl font-bold tracking-tight">Expense Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsFilterSectionVisible(!isFilterSectionVisible)}>
            <Filter className="mr-2 h-4 w-4" />
            {isFilterSectionVisible ? "Hide Filters" : "Show Filters"}
          </Button>
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Log New Expense
          </Button>
        </div>
      </div>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense Entry" : "New Expense Entry"}</DialogTitle>
            <FormDialogDescription>
              {editingExpense ? `Update the details for "${editingExpense.category}".` : "Log a new expense for your business."}
            </FormDialogDescription>
          </DialogHeader>
          <ExpenseForm expenseToEdit={editingExpense} onFinish={handleFormFinish} />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Expense Entries</CardTitle>
          <CardDescription>
            {initialLoading 
              ? "Loading expense entries..."
              : `Showing expense entries.`}
            {!initialLoading && allFetchedExpenses.length === 0 && " No expense entries found."}
            {!initialLoading && filteredExpenses.length === 0 && allFetchedExpenses.length > 0 && " No entries match your filters."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isFilterSectionVisible && (
            <div className="mb-6 p-4 border rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Filter Expenses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <div>
                  <Label htmlFor="search-category" className="text-sm font-medium text-gray-700 dark:text-gray-300">Search Category</Label>
                  <Input
                    id="search-category"
                    type="search"
                    placeholder="Filter by category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="min-amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">Min Amount</Label>
                  <Input
                    id="min-amount"
                    type="number"
                    placeholder="e.g., 10"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    step="0.01"
                    className={cn("mt-1", isInvalidAmountRange && "border-destructive")}
                  />
                </div>
                <div>
                  <Label htmlFor="max-amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Amount</Label>
                  <Input
                    id="max-amount"
                    type="number"
                    placeholder="e.g., 100"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    step="0.01"
                    className={cn("mt-1", isInvalidAmountRange && "border-destructive")}
                  />
                </div>
                <div>
                  <Label htmlFor="start-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="start-date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) =>
                          date > new Date() ||
                          date < new Date("1900-01-01") ||
                          (endDate && date > endDate)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="end-date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => (startDate ? date < startDate : false) || date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={handleClearFilters} className="w-full mt-1 md:mt-0">
                    <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          )}

          {initialLoading && allFetchedExpenses.length === 0 ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : currentTableData.length === 0 && !initialLoading ? (
             <p className="text-sm text-muted-foreground text-center py-4">
              {searchTerm || minAmount || maxAmount || startDate || endDate ? "No expense entries match your filters." : "No expense entries found."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('category')} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      Category {getSortIcon('category')}
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
              {sortedExpenses.length > ITEMS_PER_PAGE && (
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
              This action cannot be undone. This will permanently delete the expense entry for <span className="font-semibold">{expenseToDelete?.category}</span>
              amounting to <span className="font-semibold">{expenseToDelete?.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>.
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
