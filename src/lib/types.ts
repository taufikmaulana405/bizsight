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
