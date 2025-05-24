
"use client";

import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Upload, AlertTriangle, Trash2, FileText } from 'lucide-react';
import { useData } from '@/contexts/data-context';
import { useToast } from "@/hooks/use-toast";
import type { AllDataExport, Income, Expense, Appointment } from '@/lib/types';
import { convertToCSV, downloadCSV, parseCSV } from '@/lib/csv-utils';
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
import { Separator } from '@/components/ui/separator';

type CsvImportType = 'incomes' | 'expenses' | 'appointments';

export default function DataManagementPage() {
  const { 
    incomes, 
    expenses, 
    appointments, 
    importAllData, 
    deleteAllUserData, 
    loading: dataContextLoading,
    importIncomesFromCSV,
    importExpensesFromCSV,
    importAppointmentsFromCSV
  } = useData();
  const { toast } = useToast();
  
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvIncomeFileInputRef = useRef<HTMLInputElement>(null);
  const csvExpenseFileInputRef = useRef<HTMLInputElement>(null);
  const csvAppointmentFileInputRef = useRef<HTMLInputElement>(null);
  
  const [isJsonImportConfirmOpen, setIsJsonImportConfirmOpen] = useState(false);
  const [dataToImportJson, setDataToImportJson] = useState<AllDataExport | null>(null);
  const [jsonImportLoading, setJsonImportLoading] = useState(false);

  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  const [csvImportType, setCsvImportType] = useState<CsvImportType | null>(null);
  const [csvDataToImport, setCsvDataToImport] = useState<Record<string, string>[] | null>(null);
  const [isCsvImportConfirmOpen, setIsCsvImportConfirmOpen] = useState(false);
  const [csvImportLoading, setCsvImportLoading] = useState(false);


  const handleExportDataJson = () => {
    const dataToExport: AllDataExport = {
      incomes: incomes.map(i => ({...i, date: i.date.toISOString() as any})),
      expenses: expenses.map(e => ({...e, date: e.date.toISOString() as any})),
      appointments: appointments.map(a => ({...a, date: a.date.toISOString() as any, description: a.description || ""})),
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bizsight_data_export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "JSON Data Exported", description: "Your data has been downloaded as a JSON file." });
  };

  const handleJsonImportClick = () => {
    jsonFileInputRef.current?.click();
  };

  const handleJsonFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedData = JSON.parse(text) as AllDataExport;
            // Basic validation
            if (parsedData && Array.isArray(parsedData.incomes) && Array.isArray(parsedData.expenses) && Array.isArray(parsedData.appointments)) {
              setDataToImportJson(parsedData);
              setIsJsonImportConfirmOpen(true);
            } else {
              throw new Error("Invalid JSON file format.");
            }
          }
        } catch (error) {
          toast({ title: "JSON Import Error", description: "Failed to parse JSON file or invalid format.", variant: "destructive" });
          console.error("JSON Import error:", error);
        } finally {
          if (event.target) event.target.value = ""; 
        }
      };
      reader.readAsText(file);
    }
  };

  const confirmJsonImportData = async () => {
    if (dataToImportJson) {
      setJsonImportLoading(true);
      setIsJsonImportConfirmOpen(false);
      try {
        await importAllData(dataToImportJson);
        toast({ title: "JSON Import Successful", description: "Your data has been imported and replaced." });
      } catch (error) {
        toast({ title: "JSON Import Failed", description: "Could not import data. Please check the console.", variant: "destructive" });
        console.error("JSON Import failed:", error);
      } finally {
        setJsonImportLoading(false);
        setDataToImportJson(null);
      }
    }
  };

  const handleDeleteAllDataInitiate = () => {
    setIsDeleteAllConfirmOpen(true);
  };

  const confirmDeleteAllData = async () => {
    setDeleteAllLoading(true);
    setIsDeleteAllConfirmOpen(false);
    try {
      await deleteAllUserData();
      toast({ title: "All Data Deleted", description: "All your income, expense, and appointment records have been permanently deleted." });
    } catch (error) {
      toast({ title: "Deletion Failed", description: "Could not delete all data. Please check the console.", variant: "destructive" });
      console.error("Delete all data failed:", error);
    } finally {
      setDeleteAllLoading(false);
    }
  };

  // CSV Export Handlers
  const handleExportCSV = (type: CsvImportType) => {
    let dataToExport: any[] = [];
    let headers: string[] = [];
    let filename = `bizsight_${type}_export.csv`;

    switch (type) {
      case 'incomes':
        dataToExport = incomes;
        headers = ['id', 'source', 'amount', 'date'];
        break;
      case 'expenses':
        dataToExport = expenses;
        headers = ['id', 'category', 'amount', 'date'];
        break;
      case 'appointments':
        dataToExport = appointments.map(a => ({...a, description: a.description || ""}));
        headers = ['id', 'title', 'description', 'date'];
        break;
    }
    const csvString = convertToCSV(dataToExport, headers);
    downloadCSV(csvString, filename);
    toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} CSV Exported`, description: `Your ${type} data has been downloaded.` });
  };

  // CSV Import Handlers
  const handleCsvImportClick = (type: CsvImportType) => {
    setCsvImportType(type);
    if (type === 'incomes') csvIncomeFileInputRef.current?.click();
    if (type === 'expenses') csvExpenseFileInputRef.current?.click();
    if (type === 'appointments') csvAppointmentFileInputRef.current?.click();
  };

  const handleCsvFileSelected = (event: React.ChangeEvent<HTMLInputElement>, type: CsvImportType) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedData = parseCSV(text);
            if (parsedData.length > 0) {
              // Basic validation: check if essential headers exist for the type
              const firstRow = parsedData[0];
              let validHeaders = false;
              if (type === 'incomes' && firstRow.source !== undefined && firstRow.amount !== undefined && firstRow.date !== undefined) validHeaders = true;
              else if (type === 'expenses' && firstRow.category !== undefined && firstRow.amount !== undefined && firstRow.date !== undefined) validHeaders = true;
              else if (type === 'appointments' && firstRow.title !== undefined && firstRow.date !== undefined) validHeaders = true; // description is optional

              if (validHeaders) {
                setCsvDataToImport(parsedData);
                setCsvImportType(type);
                setIsCsvImportConfirmOpen(true);
              } else {
                 throw new Error(`Invalid CSV format for ${type}. Missing required headers.`);
              }
            } else {
              throw new Error("CSV file is empty or has no data rows.");
            }
          }
        } catch (error: any) {
          toast({ title: "CSV Import Error", description: error.message || "Failed to parse CSV file or invalid format.", variant: "destructive" });
          console.error(`CSV Import error for ${type}:`, error);
        } finally {
          if (event.target) event.target.value = "";
        }
      };
      reader.readAsText(file);
    }
  };
  
  const confirmCsvImportData = async () => {
    if (csvDataToImport && csvImportType) {
      setCsvImportLoading(true);
      setIsCsvImportConfirmOpen(false);
      try {
        switch (csvImportType) {
          case 'incomes':
            await importIncomesFromCSV(csvDataToImport);
            break;
          case 'expenses':
            await importExpensesFromCSV(csvDataToImport);
            break;
          case 'appointments':
            await importAppointmentsFromCSV(csvDataToImport);
            break;
        }
        toast({ title: `${csvImportType.charAt(0).toUpperCase() + csvImportType.slice(1)} CSV Import Successful`, description: `Your ${csvImportType} data has been imported and replaced.` });
      } catch (error) {
        toast({ title: "CSV Import Failed", description: `Could not import ${csvImportType} data. Please check the console.`, variant: "destructive" });
        console.error(`CSV Import for ${csvImportType} failed:`, error);
      } finally {
        setCsvImportLoading(false);
        setCsvDataToImport(null);
        setCsvImportType(null);
      }
    }
  };
  
  const anyOperationLoading = jsonImportLoading || deleteAllLoading || csvImportLoading || dataContextLoading;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>JSON Data</CardTitle>
          <CardDescription>Export all your data (incomes, expenses, appointments) as a single JSON file, or import from one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button onClick={handleExportDataJson} variant="outline" disabled={anyOperationLoading}>
              <Download className="mr-2 h-4 w-4" />
              Export All Data (JSON)
            </Button>
            {anyOperationLoading && jsonImportLoading && <p className="text-sm text-muted-foreground ml-4 inline">Processing...</p>}
          </div>
          <div>
            <Button onClick={handleJsonImportClick} variant="outline" disabled={anyOperationLoading}>
              <Upload className="mr-2 h-4 w-4" />
              Import All Data (JSON)
            </Button>
            <input
              type="file"
              ref={jsonFileInputRef}
              onChange={handleJsonFileSelected}
              accept=".json"
              className="hidden"
            />
            {anyOperationLoading && jsonImportLoading && <p className="text-sm text-muted-foreground ml-4 inline">Processing...</p>}
            <p className="text-xs text-muted-foreground mt-1">
              <strong className="text-destructive">Warning:</strong> Importing JSON will replace <strong className="text-destructive">all</strong> existing income, expense, and appointment data.
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>CSV Data Export</CardTitle>
          <CardDescription>Export your incomes, expenses, or appointments individually as CSV files. These can be easily opened in spreadsheet software.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <Button onClick={() => handleExportCSV('incomes')} variant="outline" disabled={anyOperationLoading}>
            <FileText className="mr-2 h-4 w-4" /> Export Incomes (CSV)
          </Button>
          <Button onClick={() => handleExportCSV('expenses')} variant="outline" disabled={anyOperationLoading}>
            <FileText className="mr-2 h-4 w-4" /> Export Expenses (CSV)
          </Button>
          <Button onClick={() => handleExportCSV('appointments')} variant="outline" disabled={anyOperationLoading}>
            <FileText className="mr-2 h-4 w-4" /> Export Appointments (CSV)
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>CSV Data Import</CardTitle>
          <CardDescription>Import your incomes, expenses, or appointments individually from CSV files. <strong className="text-destructive">Warning: Importing a CSV file for a specific category will replace all existing data in that category only.</strong></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-md">
            <h4 className="font-semibold mb-2">Incomes CSV</h4>
            <Button onClick={() => handleCsvImportClick('incomes')} variant="outline" disabled={anyOperationLoading}>
              <Upload className="mr-2 h-4 w-4" /> Import Incomes (CSV)
            </Button>
            <input type="file" ref={csvIncomeFileInputRef} onChange={(e) => handleCsvFileSelected(e, 'incomes')} accept=".csv" className="hidden" />
            <p className="text-xs text-muted-foreground mt-1">Required headers: `source`, `amount`, `date` (ISO format e.g., YYYY-MM-DDTHH:mm:ss.sssZ).</p>
          </div>
          <div className="p-4 border rounded-md">
            <h4 className="font-semibold mb-2">Expenses CSV</h4>
            <Button onClick={() => handleCsvImportClick('expenses')} variant="outline" disabled={anyOperationLoading}>
              <Upload className="mr-2 h-4 w-4" /> Import Expenses (CSV)
            </Button>
            <input type="file" ref={csvExpenseFileInputRef} onChange={(e) => handleCsvFileSelected(e, 'expenses')} accept=".csv" className="hidden" />
            <p className="text-xs text-muted-foreground mt-1">Required headers: `category`, `amount`, `date` (ISO format).</p>
          </div>
          <div className="p-4 border rounded-md">
            <h4 className="font-semibold mb-2">Appointments CSV</h4>
            <Button onClick={() => handleCsvImportClick('appointments')} variant="outline" disabled={anyOperationLoading}>
              <Upload className="mr-2 h-4 w-4" /> Import Appointments (CSV)
            </Button>
            <input type="file" ref={csvAppointmentFileInputRef} onChange={(e) => handleCsvFileSelected(e, 'appointments')} accept=".csv" className="hidden" />
            <p className="text-xs text-muted-foreground mt-1">Required headers: `title`, `date` (ISO format). Optional: `description`.</p>
          </div>
           {(anyOperationLoading && csvImportLoading) && <p className="text-sm text-muted-foreground ml-4 inline">Processing CSV import...</p>}
        </CardContent>
      </Card>


      <Separator />

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Delete All Data</CardTitle>
          <CardDescription>
            <strong className="text-destructive">Warning: This action is irreversible.</strong> It will permanently delete all income, expense, and appointment records from your account. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDeleteAllDataInitiate} variant="destructive" disabled={anyOperationLoading}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete All My Data
          </Button>
          {anyOperationLoading && deleteAllLoading && <p className="text-sm text-muted-foreground ml-4 inline">Processing...</p>}
        </CardContent>
      </Card>

      {/* JSON Import Confirmation Dialog */}
      <AlertDialog open={isJsonImportConfirmOpen} onOpenChange={setIsJsonImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
              Confirm JSON Data Import
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure you want to import this JSON file? 
              <strong className="text-destructive"> This action will permanently delete all your current income, expense, and appointment records and replace them with the data from the selected file.</strong> This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setDataToImportJson(null); setIsJsonImportConfirmOpen(false);}}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmJsonImportData} className="bg-destructive hover:bg-destructive/90">
              Yes, Overwrite All and Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Confirmation Dialog */}
      <AlertDialog open={isCsvImportConfirmOpen} onOpenChange={setIsCsvImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
              Confirm CSV Data Import for {csvImportType}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure you want to import this CSV file for <strong className="font-semibold">{csvImportType}</strong>? 
              <strong className="text-destructive"> This action will permanently delete all your current {csvImportType} records and replace them with the data from the selected file.</strong> Data for other categories will not be affected. This cannot be undone for the {csvImportType} category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setCsvDataToImport(null); setCsvImportType(null); setIsCsvImportConfirmOpen(false);}}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCsvImportData} className="bg-destructive hover:bg-destructive/90">
              Yes, Overwrite {csvImportType} and Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Data Confirmation Dialog */}
      <AlertDialog open={isDeleteAllConfirmOpen} onOpenChange={setIsDeleteAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
              Confirm Delete All Data
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure you want to delete all your data? 
              <strong className="text-destructive"> This will permanently erase all income, expense, and appointment records. This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteAllConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAllData} className="bg-destructive hover:bg-destructive/90">
              Yes, Delete All Data Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
