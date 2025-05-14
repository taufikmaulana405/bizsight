"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { Income, Expense, Appointment } from '@/lib/types';

interface DataContextType {
  incomes: Income[];
  expenses: Expense[];
  appointments: Appointment[];
  addIncome: (income: Omit<Income, 'id'>) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const addIncome = useCallback((income: Omit<Income, 'id'>) => {
    setIncomes((prev) => [...prev, { ...income, id: Date.now().toString() }]);
  }, []);

  const addExpense = useCallback((expense: Omit<Expense, 'id'>) => {
    setExpenses((prev) => [...prev, { ...expense, id: Date.now().toString() }]);
  }, []);
  
  const addAppointment = useCallback((appointment: Omit<Appointment, 'id'>) => {
    setAppointments((prev) => [...prev, { ...appointment, id: Date.now().toString() }].sort((a,b) => a.date.getTime() - b.date.getTime()));
  }, []);

  const totalRevenue = useMemo(() => incomes.reduce((sum, income) => sum + income.amount, 0), [incomes]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const totalProfit = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);

  // Sample initial data
  React.useEffect(() => {
    addIncome({ source: 'Client A Project', amount: 1200, date: new Date(2024, 6, 15) });
    addIncome({ source: 'Consulting Gig', amount: 800, date: new Date(2024, 6, 22) });
    addExpense({ category: 'Software Subscription', amount: 50, date: new Date(2024, 6, 1) });
    addExpense({ category: 'Office Supplies', amount: 75, date: new Date(2024, 6, 5) });
    addAppointment({ title: 'Meeting with Client B', date: new Date(2024, 7, 5, 10, 0), description: 'Discuss project milestones.' });
    addAppointment({ title: 'Team Sync-up', date: new Date(2024, 7, 7, 14, 0), description: 'Weekly team meeting.' });
  }, [addIncome, addExpense, addAppointment]);


  return (
    <DataContext.Provider value={{ 
      incomes, 
      expenses, 
      appointments, 
      addIncome, 
      addExpense, 
      addAppointment,
      totalRevenue,
      totalExpenses,
      totalProfit
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
