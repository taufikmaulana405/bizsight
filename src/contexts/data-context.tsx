
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { Income, Expense, Appointment, AllDataExport } from '@/lib/types'; // Added AllDataExport
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  Timestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch // Added writeBatch
} from 'firebase/firestore';

// Define the shape of income data for forms (matches IncomeFormValues)
export interface IncomeFormData {
  source: string;
  amount: number;
  date: Date;
}

// Define the shape of expense data for forms
export interface ExpenseFormData {
  category: string;
  amount: number;
  date: Date;
}

interface DataContextType {
  incomes: Income[];
  expenses: Expense[];
  appointments: Appointment[];
  addIncome: (income: IncomeFormData) => Promise<void>;
  updateIncome: (id: string, incomeData: IncomeFormData) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addExpense: (expense: ExpenseFormData) => Promise<void>;
  updateExpense: (id: string, expenseData: ExpenseFormData) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<void>;
  importAllData: (data: AllDataExport) => Promise<void>; // New import function
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

  useEffect(() => {
    setLoading(true);
    const incomesCol = collection(db, 'incomes');
    const expensesCol = collection(db, 'expenses');
    const appointmentsCol = collection(db, 'appointments');

    const qIncomes = query(incomesCol, orderBy("date", "desc"));
    const qExpenses = query(expensesCol, orderBy("date", "desc"));
    const qAppointments = query(appointmentsCol, orderBy("date", "asc"));

    const unsubIncomes = onSnapshot(qIncomes, (snapshot) => {
      setIncomes(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Income)));
    }, (error) => {
      console.error("Error fetching incomes: ", error);
      setLoading(false); // Ensure loading is set to false on error too
    });

    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Expense)));
    }, (error) => {
      console.error("Error fetching expenses: ", error);
      setLoading(false);
    });
    
    const unsubAppointments = onSnapshot(qAppointments, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Appointment)));
    }, (error) => {
      console.error("Error fetching appointments: ", error);
      setLoading(false);
    });
    
    // Set loading to false after initial listeners are set up.
    // Data will stream in. A more robust approach might use Promise.allSettled
    // with initial getDocs if an "initial load complete" state is critical.
    // For now, this makes the UI responsive faster.
    const initialLoadPromises = [
      getDocs(qIncomes),
      getDocs(qExpenses),
      getDocs(qAppointments),
    ];

    Promise.all(initialLoadPromises)
      .then(() => setLoading(false))
      .catch(error => {
        console.error("Error fetching initial data snapshot: ", error);
        setLoading(false);
      });

    return () => {
      unsubIncomes();
      unsubExpenses();
      unsubAppointments();
    };
  }, []);

  const addIncome = useCallback(async (income: IncomeFormData) => {
    try {
      await addDoc(collection(db, 'incomes'), {
        ...income,
        date: Timestamp.fromDate(income.date),
      });
    } catch (error) {
      console.error("Error adding income: ", error);
      throw error;
    }
  }, []);

  const updateIncome = useCallback(async (id: string, incomeData: IncomeFormData) => {
    try {
      const incomeDocRef = doc(db, 'incomes', id);
      await updateDoc(incomeDocRef, {
        ...incomeData,
        date: Timestamp.fromDate(incomeData.date),
      });
    } catch (error) {
      console.error("Error updating income: ", error);
      throw error;
    }
  }, []);

  const deleteIncome = useCallback(async (id: string) => {
    try {
      const incomeDocRef = doc(db, 'incomes', id);
      await deleteDoc(incomeDocRef);
    } catch (error) {
      console.error("Error deleting income: ", error);
      throw error;
    }
  }, []);

  const addExpense = useCallback(async (expense: ExpenseFormData) => {
    try {
      await addDoc(collection(db, 'expenses'), {
        ...expense,
        date: Timestamp.fromDate(expense.date),
      });
    } catch (error) {
      console.error("Error adding expense: ", error);
      throw error;
    }
  }, []);

  const updateExpense = useCallback(async (id: string, expenseData: ExpenseFormData) => {
    try {
      const expenseDocRef = doc(db, 'expenses', id);
      await updateDoc(expenseDocRef, {
        ...expenseData,
        date: Timestamp.fromDate(expenseData.date),
      });
    } catch (error) {
      console.error("Error updating expense: ", error);
      throw error;
    }
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      const expenseDocRef = doc(db, 'expenses', id);
      await deleteDoc(expenseDocRef);
    } catch (error) {
      console.error("Error deleting expense: ", error);
      throw error;
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
      throw error;
    }
  }, []);

  const importAllData = useCallback(async (data: AllDataExport) => {
    setLoading(true);
    try {
      const deleteCollectionBatch = async (collectionName: string) => {
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef);
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      };

      await deleteCollectionBatch('incomes');
      await deleteCollectionBatch('expenses');
      await deleteCollectionBatch('appointments');

      const addBatch = writeBatch(db);
      const incomesCol = collection(db, 'incomes');
      data.incomes.forEach(item => {
        const { id, ...incomeData } = item; // Exclude old ID
        addBatch.set(doc(incomesCol), {
          ...incomeData,
          date: Timestamp.fromDate(new Date(item.date)) // Ensure date is converted
        });
      });

      const expensesCol = collection(db, 'expenses');
      data.expenses.forEach(item => {
        const { id, ...expenseData } = item; // Exclude old ID
        addBatch.set(doc(expensesCol), {
          ...expenseData,
          date: Timestamp.fromDate(new Date(item.date)) // Ensure date is converted
        });
      });

      const appointmentsCol = collection(db, 'appointments');
      data.appointments.forEach(item => {
        const { id, ...appointmentData } = item; // Exclude old ID
        addBatch.set(doc(appointmentsCol), {
          ...appointmentData,
          date: Timestamp.fromDate(new Date(item.date)) // Ensure date is converted
        });
      });
      
      await addBatch.commit();

    } catch (error) {
      console.error("Error importing data: ", error);
      throw error; // Re-throw to be caught by the calling UI
    } finally {
      // Data will be re-fetched by onSnapshot listeners, so no explicit setLoading(false) here
      // is strictly needed if onSnapshot updates loading state, but it's good practice for the import function.
      // However, relying on onSnapshot to update loading might be better to reflect real data state.
      // For now, we'll let onSnapshot handle the final loading state update.
    }
  }, []);

  const totalRevenue = useMemo(() => incomes.reduce((sum, income) => sum + income.amount, 0), [incomes]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const totalProfit = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);

  return (
    <DataContext.Provider value={{ 
      incomes, 
      expenses, 
      appointments, 
      addIncome,
      updateIncome,
      deleteIncome,
      addExpense, 
      updateExpense,
      deleteExpense,
      addAppointment,
      importAllData, // Added importAllData
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
