
export interface Income {
  id: string;
  source: string;
  amount: number;
  date: Date;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: Date;
}

export interface Appointment {
  id:string;
  title: string;
  date: Date;
  description?: string;
}

// Type for the structure of the exported/imported JSON data
export interface AllDataExport {
  incomes: Income[];
  expenses: Expense[];
  appointments: Appointment[];
}
