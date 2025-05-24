
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { Income, Expense, Appointment, AllDataExport } from '@/lib/types';
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
  writeBatch,
  where // For deleting specific types during CSV import
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

// Define the shape of appointment data for forms
export interface AppointmentFormData {
  title: string;
  date: Date;
  description?: string;
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
  addAppointment: (appointment: AppointmentFormData) => Promise<void>; // Use AppointmentFormData
  importAllData: (data: AllDataExport) => Promise<void>;
  deleteAllUserData: () => Promise<void>;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  loading: boolean;
  importIncomesFromCSV: (csvData: Record<string, string>[]) => Promise<void>;
  importExpensesFromCSV: (csvData: Record<string, string>[]) => Promise<void>;
  importAppointmentsFromCSV: (csvData: Record<string, string>[]) => Promise<void>;
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
    });

    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Expense)));
    }, (error) => {
      console.error("Error fetching expenses: ", error);
    });
    
    const unsubAppointments = onSnapshot(qAppointments, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Appointment)));
    }, (error) => {
      console.error("Error fetching appointments: ", error);
    });
    
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
  
  const addAppointment = useCallback(async (appointment: AppointmentFormData) => {
    try {
      await addDoc(collection(db, 'appointments'), {
        ...appointment,
        date: Timestamp.fromDate(appointment.date),
        description: appointment.description || "", // Ensure description is always a string
      });
    } catch (error) {
      console.error("Error adding appointment: ", error);
      throw error;
    }
  }, []);

  const deleteCollectionBatch = async (collectionName: string) => {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  };

  const importAllData = useCallback(async (data: AllDataExport) => {
    try {
      await deleteCollectionBatch('incomes');
      await deleteCollectionBatch('expenses');
      await deleteCollectionBatch('appointments');

      const addBatch = writeBatch(db);
      const incomesCol = collection(db, 'incomes');
      data.incomes.forEach(item => {
        const { id, ...incomeData } = item; 
        addBatch.set(doc(incomesCol), {
          ...incomeData,
          date: Timestamp.fromDate(new Date(item.date))
        });
      });

      const expensesCol = collection(db, 'expenses');
      data.expenses.forEach(item => {
        const { id, ...expenseData } = item;
        addBatch.set(doc(expensesCol), {
          ...expenseData,
          date: Timestamp.fromDate(new Date(item.date))
        });
      });

      const appointmentsCol = collection(db, 'appointments');
      data.appointments.forEach(item => {
        const { id, ...appointmentData } = item; 
        addBatch.set(doc(appointmentsCol), {
          ...appointmentData,
          date: Timestamp.fromDate(new Date(item.date)),
          description: item.description || "",
        });
      });
      
      await addBatch.commit();

    } catch (error) {
      console.error("Error importing data: ", error);
      throw error;
    }
  }, []);

  const deleteAllUserData = useCallback(async () => {
    try {
      await deleteCollectionBatch('incomes');
      await deleteCollectionBatch('expenses');
      await deleteCollectionBatch('appointments');
    } catch (error) {
      console.error("Error deleting all user data: ", error);
      throw error;
    }
  }, []);

  const importIncomesFromCSV = useCallback(async (csvData: Record<string, string>[]) => {
    try {
      await deleteCollectionBatch('incomes');
      const batch = writeBatch(db);
      const incomesCol = collection(db, 'incomes');
      csvData.forEach(row => {
        const date = new Date(row.date); // Assumes date is ISO string
        const amount = parseFloat(row.amount);
        if (row.source && !isNaN(amount) && !isNaN(date.getTime())) {
          batch.set(doc(incomesCol), {
            source: row.source,
            amount: amount,
            date: Timestamp.fromDate(date),
          });
        } else {
          console.warn("Skipping invalid income row from CSV:", row);
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error importing incomes from CSV:", error);
      throw error;
    }
  }, []);

  const importExpensesFromCSV = useCallback(async (csvData: Record<string, string>[]) => {
    try {
      await deleteCollectionBatch('expenses');
      const batch = writeBatch(db);
      const expensesCol = collection(db, 'expenses');
      csvData.forEach(row => {
        const date = new Date(row.date);
        const amount = parseFloat(row.amount);
        if (row.category && !isNaN(amount) && !isNaN(date.getTime())) {
          batch.set(doc(expensesCol), {
            category: row.category,
            amount: amount,
            date: Timestamp.fromDate(date),
          });
        } else {
          console.warn("Skipping invalid expense row from CSV:", row);
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error importing expenses from CSV:", error);
      throw error;
    }
  }, []);

  const importAppointmentsFromCSV = useCallback(async (csvData: Record<string, string>[]) => {
    try {
      await deleteCollectionBatch('appointments');
      const batch = writeBatch(db);
      const appointmentsCol = collection(db, 'appointments');
      csvData.forEach(row => {
        const date = new Date(row.date);
        if (row.title && !isNaN(date.getTime())) {
          batch.set(doc(appointmentsCol), {
            title: row.title,
            description: row.description || "",
            date: Timestamp.fromDate(date),
          });
        } else {
          console.warn("Skipping invalid appointment row from CSV:", row);
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error importing appointments from CSV:", error);
      throw error;
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
      importAllData,
      deleteAllUserData,
      importIncomesFromCSV,
      importExpensesFromCSV,
      importAppointmentsFromCSV,
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
