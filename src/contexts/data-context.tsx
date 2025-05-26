
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
  limit as firestoreLimit
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

const RECENT_ITEMS_LIMIT = 15;

interface DataContextType {
  incomes: Income[]; // Will hold the limited list for real-time updates
  expenses: Expense[]; // Will hold the limited list for real-time updates
  appointments: Appointment[];
  
  addIncome: (income: IncomeFormData) => Promise<void>;
  updateIncome: (id: string, incomeData: IncomeFormData) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  getAllIncomes: () => Promise<Income[]>; // For "Show All"

  addExpense: (expense: ExpenseFormData) => Promise<void>;
  updateExpense: (id: string, expenseData: ExpenseFormData) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getAllExpenses: () => Promise<Expense[]>; // For "Show All"

  addAppointment: (appointment: AppointmentFormData) => Promise<void>;
  
  importAllData: (data: AllDataExport) => Promise<void>;
  deleteAllUserData: () => Promise<void>;
  
  totalRevenue: number; // Will be calculated from a one-time full fetch
  totalExpenses: number; // Will be calculated from a one-time full fetch
  totalProfit: number;
  
  loading: boolean; // Global loading state
  
  importIncomesFromCSV: (csvData: Record<string, string>[]) => Promise<void>;
  importExpensesFromCSV: (csvData: Record<string, string>[]) => Promise<void>;
  importAppointmentsFromCSV: (csvData: Record<string, string>[]) => Promise<void>;
  importAllDataFromUnifiedCSV: (csvData: Record<string, string>[]) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const incomesCol = collection(db, 'incomes');
    const expensesCol = collection(db, 'expenses');
    const appointmentsCol = collection(db, 'appointments');

    // Snapshots for limited, real-time lists
    const qIncomesRecent = query(incomesCol, orderBy("date", "desc"), firestoreLimit(RECENT_ITEMS_LIMIT));
    const qExpensesRecent = query(expensesCol, orderBy("date", "desc"), firestoreLimit(RECENT_ITEMS_LIMIT));
    const qAppointmentsAll = query(appointmentsCol, orderBy("date", "asc")); // Appointments typically show all or by date range

    const unsubIncomes = onSnapshot(qIncomesRecent, (snapshot) => {
      if (!active) return;
      setIncomes(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Income)));
    }, (error) => console.error("Error fetching recent incomes: ", error));

    const unsubExpenses = onSnapshot(qExpensesRecent, (snapshot) => {
      if (!active) return;
      setExpenses(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Expense)));
    }, (error) => console.error("Error fetching recent expenses: ", error));
    
    const unsubAppointments = onSnapshot(qAppointmentsAll, (snapshot) => {
      if (!active) return;
      setAppointments(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Appointment)));
    }, (error) => console.error("Error fetching appointments: ", error));
    
    // One-time fetch for all incomes and expenses to calculate accurate totals
    const fetchAllForTotals = async () => {
      try {
        const allIncomesSnapshot = await getDocs(query(incomesCol, orderBy("date", "desc")));
        const allExpensesSnapshot = await getDocs(query(expensesCol, orderBy("date", "desc")));
        
        if (!active) return;

        const allIncomesData = allIncomesSnapshot.docs.map(doc => doc.data() as Omit<Income, 'id'>);
        const allExpensesData = allExpensesSnapshot.docs.map(doc => doc.data() as Omit<Expense, 'id'>);

        setTotalRevenue(allIncomesData.reduce((sum, income) => sum + income.amount, 0));
        setTotalExpenses(allExpensesData.reduce((sum, expense) => sum + expense.amount, 0));
        
      } catch (error) {
        console.error("Error fetching all data for totals: ", error);
      }
    };

    Promise.all([
      new Promise(resolve => onSnapshot(qIncomesRecent, () => resolve(null), () => resolve(null))), // Wait for first snapshot
      new Promise(resolve => onSnapshot(qExpensesRecent, () => resolve(null), () => resolve(null))),
      new Promise(resolve => onSnapshot(qAppointmentsAll, () => resolve(null), () => resolve(null))),
      fetchAllForTotals()
    ]).then(() => {
      if (active) setLoading(false);
    }).catch(error => {
      console.error("Error during initial data load: ", error);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      unsubIncomes();
      unsubExpenses();
      unsubAppointments();
    };
  }, []);

  const totalProfit = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);

  const addIncome = useCallback(async (income: IncomeFormData) => {
    try {
      await addDoc(collection(db, 'incomes'), {
        ...income,
        date: Timestamp.fromDate(income.date),
      });
      // Snapshot should update the limited list if the new item falls within criteria
      // For totals, they are not real-time after initial load. A page refresh would update them.
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

  const getAllIncomes = useCallback(async (): Promise<Income[]> => {
    const allIncomesSnapshot = await getDocs(query(collection(db, 'incomes'), orderBy("date", "desc")));
    return allIncomesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: (doc.data().date as Timestamp).toDate(),
    } as Income));
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

  const getAllExpenses = useCallback(async (): Promise<Expense[]> => {
    const allExpensesSnapshot = await getDocs(query(collection(db, 'expenses'), orderBy("date", "desc")));
    return allExpensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: (doc.data().date as Timestamp).toDate(),
    } as Expense));
  }, []);
  
  const addAppointment = useCallback(async (appointment: AppointmentFormData) => {
    try {
      await addDoc(collection(db, 'appointments'), {
        ...appointment,
        date: Timestamp.fromDate(appointment.date),
        description: appointment.description || "",
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
      // After import, totals are stale. A page refresh would be needed, or explicitly refetch totals.
      // For simplicity, not re-fetching totals here.
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
      setTotalRevenue(0); // Reset totals in UI
      setTotalExpenses(0);
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
        const date = new Date(row.date); 
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

  const importAllDataFromUnifiedCSV = useCallback(async (csvData: Record<string, string>[]) => {
    try {
      await deleteCollectionBatch('incomes');
      await deleteCollectionBatch('expenses');
      await deleteCollectionBatch('appointments');

      const batch = writeBatch(db);
      const incomesCol = collection(db, 'incomes');
      const expensesCol = collection(db, 'expenses');
      const appointmentsCol = collection(db, 'appointments');

      csvData.forEach(row => {
        const type = row.type?.toLowerCase();
        const date = new Date(row.date);
        const amount = row.amount ? parseFloat(row.amount) : 0;

        if (isNaN(date.getTime())) {
          console.warn("Skipping row with invalid date:", row);
          return;
        }

        switch (type) {
          case 'income':
            if (row.source && !isNaN(amount)) {
              batch.set(doc(incomesCol), {
                source: row.source,
                amount: amount,
                date: Timestamp.fromDate(date),
              });
            } else {
              console.warn("Skipping invalid income row from unified CSV:", row);
            }
            break;
          case 'expense':
            if (row.category && !isNaN(amount)) {
              batch.set(doc(expensesCol), {
                category: row.category,
                amount: amount,
                date: Timestamp.fromDate(date),
              });
            } else {
              console.warn("Skipping invalid expense row from unified CSV:", row);
            }
            break;
          case 'appointment':
            if (row.title) {
              batch.set(doc(appointmentsCol), {
                title: row.title,
                description: row.description || "",
                date: Timestamp.fromDate(date),
              });
            } else {
              console.warn("Skipping invalid appointment row from unified CSV:", row);
            }
            break;
          default:
            console.warn("Skipping row with unknown type from unified CSV:", row);
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error importing all data from unified CSV:", error);
      throw error;
    }
  }, []);

  return (
    <DataContext.Provider value={{ 
      incomes, 
      expenses, 
      appointments, 
      addIncome,
      updateIncome,
      deleteIncome,
      getAllIncomes,
      addExpense, 
      updateExpense,
      deleteExpense,
      getAllExpenses,
      addAppointment,
      importAllData,
      deleteAllUserData,
      importIncomesFromCSV,
      importExpensesFromCSV,
      importAppointmentsFromCSV,
      importAllDataFromUnifiedCSV,
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
