
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { Income, Expense, Appointment } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  Timestamp,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';

interface DataContextType {
  incomes: Income[];
  expenses: Expense[];
  appointments: Appointment[];
  addIncome: (income: Omit<Income, 'id'>) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<void>;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch initial data from Firestore
  useEffect(() => {
    setLoading(true);
    const incomesCol = collection(db, 'incomes');
    const expensesCol = collection(db, 'expenses');
    const appointmentsCol = collection(db, 'appointments');

    const qAppointments = query(appointmentsCol, orderBy("date", "asc"));

    const unsubIncomes = onSnapshot(incomesCol, (snapshot) => {
      setIncomes(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Income)));
    });

    const unsubExpenses = onSnapshot(expensesCol, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Expense)));
    });
    
    const unsubAppointments = onSnapshot(qAppointments, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Appointment)));
    });
    
    // Set loading to false after initial fetch attempt (even if empty)
    // We use a combined check or a timeout if preferred for more complex scenarios
    // For simplicity, let's assume data loads fast or components handle empty states.
    Promise.all([
      getDocs(incomesCol), 
      getDocs(expensesCol), 
      getDocs(qAppointments)
    ]).then(() => {
      setLoading(false);
    }).catch(error => {
      console.error("Error fetching initial data: ", error);
      setLoading(false);
    });

    // Cleanup function to unsubscribe from snapshot listeners
    return () => {
      unsubIncomes();
      unsubExpenses();
      unsubAppointments();
    };
  }, []);

  const addIncome = useCallback(async (income: Omit<Income, 'id'>) => {
    try {
      await addDoc(collection(db, 'incomes'), {
        ...income,
        date: Timestamp.fromDate(income.date),
      });
      // No need to manually setIncomes, onSnapshot will update
    } catch (error) {
      console.error("Error adding income: ", error);
    }
  }, []);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
    try {
      await addDoc(collection(db, 'expenses'), {
        ...expense,
        date: Timestamp.fromDate(expense.date),
      });
    } catch (error) {
      console.error("Error adding expense: ", error);
    }
  }, []);
  
  const addAppointment = useCallback(async (appointment: Omit<Appointment, 'id'>) => {
    try {
      await addDoc(collection(db, 'appointments'), {
        ...appointment,
        date: Timestamp.fromDate(appointment.date),
      });
    } catch (error) {
      console.error("Error adding appointment: ", error);
    }
  }, []);

  const totalRevenue = useMemo(() => incomes.reduce((sum, income) => sum + income.amount, 0), [incomes]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const totalProfit = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);

  // Remove or comment out the previous sample data useEffect
  // React.useEffect(() => {
  //   addIncome({ source: 'Client A Project', amount: 1200, date: new Date(2024, 6, 15) });
  //   addIncome({ source: 'Consulting Gig', amount: 800, date: new Date(2024, 6, 22) });
  //   addExpense({ category: 'Software Subscription', amount: 50, date: new Date(2024, 6, 1) });
  //   addExpense({ category: 'Office Supplies', amount: 75, date: new Date(2024, 6, 5) });
  //   addAppointment({ title: 'Meeting with Client B', date: new Date(2024, 7, 5, 10, 0), description: 'Discuss project milestones.' });
  //   addAppointment({ title: 'Team Sync-up', date: new Date(2024, 7, 7, 14, 0), description: 'Weekly team meeting.' });
  // }, [addIncome, addExpense, addAppointment]);


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
      totalProfit,
      loading
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
