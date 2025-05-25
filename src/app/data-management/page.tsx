
"use client";

import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Upload, AlertTriangle, Trash2, FileText, FileJson, Info, FilePieChart } from 'lucide-react';
import { useData } from '@/contexts/data-context';
import { useToast } from "@/hooks/use-toast";
import type { AllDataExport } from '@/lib/types';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';


type CsvImportType = 'incomes' | 'expenses' | 'appointments'; // 'all_unified' is handled separately now

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
    importAppointmentsFromCSV,
    importAllDataFromUnifiedCSV
  } = useData();
  const { toast } = useToast();
  
  // Combined "All Data" import states
  const allDataFileInputRef = useRef<HTMLInputElement>(null);
  const [allDataDragActive, setAllDataDragActive] = useState(false);
  const [isAllDataImportConfirmOpen, setIsAllDataImportConfirmOpen] = useState(false);
  const [allDataImportLoading, setAllDataImportLoading] = useState(false);
  const [parsedAllDataToImport, setParsedAllDataToImport] = useState<AllDataExport | Record<string, string>[] | null>(null);
  const [allDataImportType, setAllDataImportType] = useState<'json' | 'csv' | null>(null);

  // Specific CSV type import states
  const csvIncomeFileInputRef = useRef<HTMLInputElement>(null);
  const csvExpenseFileInputRef = useRef<HTMLInputElement>(null);
  const csvAppointmentFileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSpecificCsvImportConfirmOpen, setIsSpecificCsvImportConfirmOpen] = useState(false);
  const [specificCsvDataToImport, setSpecificCsvDataToImport] = useState<Record<string, string>[] | null>(null);
  const [specificCsvImportType, setSpecificCsvImportType] = useState<CsvImportType | null>(null);
  const [specificCsvImportLoading, setSpecificCsvImportLoading] = useState(false);

  const [incomeCsvDragActive, setIncomeCsvDragActive] = useState(false);
  const [expenseCsvDragActive, setExpenseCsvDragActive] = useState(false);
  const [appointmentCsvDragActive, setAppointmentCsvDragActive] = useState(false);
  
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  const totalRecords = incomes.length + expenses.length + appointments.length;


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

  const processAllDataFile = (file: File | undefined) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("Failed to read file content.");
        }

        if (file.name.endsWith('.json') || file.type === "application/json") {
          const parsedData = JSON.parse(text) as AllDataExport;
          if (parsedData && Array.isArray(parsedData.incomes) && Array.isArray(parsedData.expenses) && Array.isArray(parsedData.appointments)) {
            setParsedAllDataToImport(parsedData);
            setAllDataImportType('json');
            setIsAllDataImportConfirmOpen(true);
          } else {
            throw new Error("Invalid JSON file format. Missing required top-level keys: incomes, expenses, appointments.");
          }
        } else if (file.name.endsWith('.csv') || file.type === "text/csv") {
          const parsedData = parseCSV(text);
          if (parsedData.length > 0 && parsedData[0].type !== undefined && parsedData[0].date !== undefined) {
            setParsedAllDataToImport(parsedData);
            setAllDataImportType('csv');
            setIsAllDataImportConfirmOpen(true);
          } else {
            throw new Error("Invalid Unified CSV format. Missing required 'type' or 'date' headers, or file is empty.");
          }
        } else {
          throw new Error("Unsupported file type. Please upload a .json or .csv file for all data import.");
        }
      } catch (error: any) {
        toast({ title: "All Data Import Error", description: error.message || "Failed to process file.", variant: "destructive" });
        console.error("All Data Import error:", error);
      } finally {
        if (allDataFileInputRef.current) allDataFileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };
  
  const handleAllDataFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    processAllDataFile(event.target.files?.[0]);
  };

  const confirmAllDataImport = async () => {
    if (parsedAllDataToImport && allDataImportType) {
      setAllDataImportLoading(true);
      setIsAllDataImportConfirmOpen(false);
      try {
        if (allDataImportType === 'json') {
          await importAllData(parsedAllDataToImport as AllDataExport);
        } else if (allDataImportType === 'csv') {
          await importAllDataFromUnifiedCSV(parsedAllDataToImport as Record<string, string>[]);
        }
        toast({ title: "All Data Import Successful", description: `Your data from the ${allDataImportType.toUpperCase()} file has been imported and replaced.` });
      } catch (error) {
        toast({ title: "All Data Import Failed", description: `Could not import data from ${allDataImportType!.toUpperCase()} file. Please check the console.`, variant: "destructive" });
        console.error(`All Data ${allDataImportType!.toUpperCase()} Import failed:`, error);
      } finally {
        setAllDataImportLoading(false);
        setParsedAllDataToImport(null);
        setAllDataImportType(null);
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

  const handleExportCSV = (type: 'incomes' | 'expenses' | 'appointments') => {
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

  const handleExportAllDataCSV = () => {
    const unifiedData = [
      ...incomes.map(i => ({ type: 'income', id: i.id, date: i.date, amount: i.amount, source: i.source, category: '', title: '', description: '' })),
      ...expenses.map(e => ({ type: 'expense', id: e.id, date: e.date, amount: e.amount, source: '', category: e.category, title: '', description: '' })),
      ...appointments.map(a => ({ type: 'appointment', id: a.id, date: a.date, amount: null, source: '', category: '', title: a.title, description: a.description || '' })),
    ];
    const headers = ['type', 'id', 'date', 'amount', 'source', 'category', 'title', 'description'];
    const csvString = convertToCSV(unifiedData, headers);
    downloadCSV(csvString, 'bizsight_all_data_export.csv');
    toast({ title: "All Data CSV Exported", description: "Your data has been downloaded as a unified CSV file." });
  };

  const getCsvInputRef = (type: CsvImportType) => {
    if (type === 'incomes') return csvIncomeFileInputRef;
    if (type === 'expenses') return csvExpenseFileInputRef;
    if (type === 'appointments') return csvAppointmentFileInputRef;
    return null;
  }

  const processSpecificCsvFile = (file: File | undefined, type: CsvImportType) => {
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast({ title: "Invalid File Type", description: "Please upload a valid CSV file (.csv).", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedData = parseCSV(text);
            if (parsedData.length > 0) {
              const firstRow = parsedData[0];
              let validHeaders = false;
              if (type === 'incomes' && firstRow.source !== undefined && firstRow.amount !== undefined && firstRow.date !== undefined) validHeaders = true;
              else if (type === 'expenses' && firstRow.category !== undefined && firstRow.amount !== undefined && firstRow.date !== undefined) validHeaders = true;
              else if (type === 'appointments' && firstRow.title !== undefined && firstRow.date !== undefined) validHeaders = true;

              if (validHeaders) {
                setSpecificCsvDataToImport(parsedData);
                setSpecificCsvImportType(type);
                setIsSpecificCsvImportConfirmOpen(true);
              } else {
                 throw new Error(`Invalid CSV format for ${type}. Missing required headers.`);
              }
            } else {
              throw new Error("CSV file is empty or has no data rows.");
            }
          }
        } catch (error: any) {
          toast({ title: "CSV Import Error", description: error.message || `Failed to parse CSV file or invalid format for ${type}.`, variant: "destructive" });
          console.error(`CSV Import error for ${type}:`, error);
        } finally {
          const inputRef = getCsvInputRef(type);
          if (inputRef?.current) inputRef.current.value = "";
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSpecificCsvFileSelected = (event: React.ChangeEvent<HTMLInputElement>, type: CsvImportType) => {
    processSpecificCsvFile(event.target.files?.[0], type);
  };
  
  const confirmSpecificCsvImportData = async () => {
    if (specificCsvDataToImport && specificCsvImportType) {
      setSpecificCsvImportLoading(true);
      setIsSpecificCsvImportConfirmOpen(false);
      const currentType = specificCsvImportType;
      try {
        switch (currentType) {
          case 'incomes':
            await importIncomesFromCSV(specificCsvDataToImport);
            break;
          case 'expenses':
            await importExpensesFromCSV(specificCsvDataToImport);
            break;
          case 'appointments':
            await importAppointmentsFromCSV(specificCsvDataToImport);
            break;
        }
        toast({ title: `${currentType.charAt(0).toUpperCase() + currentType.slice(1)} Import Successful`, description: `Your ${currentType} data has been imported and replaced.` });
      } catch (error) {
        toast({ title: "CSV Import Failed", description: `Could not import ${currentType} data. Please check the console.`, variant: "destructive" });
        console.error(`CSV Import for ${currentType} failed:`, error);
      } finally {
        setSpecificCsvImportLoading(false);
        setSpecificCsvDataToImport(null);
        setSpecificCsvImportType(null);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, setDragActive: React.Dispatch<React.SetStateAction<boolean>>) => {
    event.preventDefault();
    event.stopPropagation();
    if (anyOperationLoading) return;
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>, setDragActive: React.Dispatch<React.SetStateAction<boolean>>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleDropAllData = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setAllDataDragActive(false);
    if (anyOperationLoading) return;
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      processAllDataFile(event.dataTransfer.files[0]);
    }
  };
  
  const handleDropSpecificCsv = (event: React.DragEvent<HTMLDivElement>, type: CsvImportType, setDragActive: React.Dispatch<React.SetStateAction<boolean>>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (anyOperationLoading) return;
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        processSpecificCsvFile(event.dataTransfer.files[0], type);
    }
  }
  
  const anyOperationLoading = allDataImportLoading || deleteAllLoading || specificCsvImportLoading || dataContextLoading;

  const dropZoneClasses = (dragActive: boolean) => 
    cn(
      "border-2 border-dashed rounded-md transition-colors",
      "flex flex-col items-start space-y-2", 
      dragActive ? "border-primary bg-primary/10 text-primary" : "border-transparent hover:border-muted-foreground/25",
      anyOperationLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
    );


  return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePieChart className="h-6 w-6 text-primary" />
              Data Summary
            </CardTitle>
            <CardDescription>Overview of your current data records.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div><span className="font-semibold">Total Incomes:</span> {incomes.length}</div>
            <div><span className="font-semibold">Total Expenses:</span> {expenses.length}</div>
            <div><span className="font-semibold">Total Appointments:</span> {appointments.length}</div>
            <div><span className="font-semibold">Total Records:</span> {totalRecords}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download your application data in various formats.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileJson className="h-5 w-5 text-primary" /> JSON - All Data</h3>
                <Button onClick={handleExportDataJson} variant="outline" disabled={anyOperationLoading}>
                  <Download className="mr-2 h-4 w-4" />
                  Export All Data (JSON)
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended for full backups. Exports all incomes, expenses, and appointments into a single JSON file.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> CSV - All Data (Unified)</h3>
                <Button onClick={handleExportAllDataCSV} variant="outline" disabled={anyOperationLoading}>
                  <Download className="mr-2 h-4 w-4" /> Export All Data (Unified CSV)
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Exports all data types into a single CSV file with a 'type' column.
                </p>
              </div>
            </div>
            
            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-2">CSV - Specific Data Types</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2"><FileText className="h-5 w-5" /> Incomes</h4>
                  <Button onClick={() => handleExportCSV('incomes')} variant="outline" disabled={anyOperationLoading} className="w-full md:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Export Incomes
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exports only income data.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2"><FileText className="h-5 w-5" /> Expenses</h4>
                  <Button onClick={() => handleExportCSV('expenses')} variant="outline" disabled={anyOperationLoading} className="w-full md:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Export Expenses
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exports only expense data.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2"><FileText className="h-5 w-5" /> Appointments</h4>
                  <Button onClick={() => handleExportCSV('appointments')} variant="outline" disabled={anyOperationLoading} className="w-full md:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Export Appointments
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exports only appointment data.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Data</CardTitle>
            <CardDescription>Upload data from JSON or CSV files. Importing replaces existing data for the selected scope.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* All Data Import (JSON or Unified CSV) */}
            <div className="grid md:grid-cols-1 gap-6"> 
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" /> All Data Import (.json or .csv)
                </h3>
                <div
                  onDragOver={(e) => handleDragOver(e, setAllDataDragActive)}
                  onDragLeave={(e) => handleDragLeave(e, setAllDataDragActive)}
                  onDrop={handleDropAllData}
                  className={dropZoneClasses(allDataDragActive)}
                  onClick={() => !anyOperationLoading && allDataFileInputRef.current?.click()}
                >
                  <div className="flex items-center">
                    <Button onClick={(e) => { e.stopPropagation(); allDataFileInputRef.current?.click(); }} variant="outline" disabled={anyOperationLoading}>
                      <Upload className="mr-2 h-4 w-4" /> Choose File (.json or .csv)
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                           <Button variant="ghost" className="ml-2 cursor-help p-1.5 rounded-full hover:bg-secondary/50 h-auto w-auto flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto text-sm p-2">
                          <p><strong>JSON:</strong> Root keys: `incomes`, `expenses`, `appointments`.</p>
                          <p><strong>CSV:</strong> Unified format. Required headers: `type`, `date`, and other relevant fields (e.g. `amount`, `source`, `category`, `title`).</p>
                        </PopoverContent>
                    </Popover>
                  </div>
                  <input type="file" ref={allDataFileInputRef} onChange={handleAllDataFileSelected} accept=".json,.csv" className="hidden" />
                  <p className="text-xs text-muted-foreground">Or drag and drop a JSON or Unified CSV file here.</p>
                  <p className="text-xs text-destructive mt-1">Warning: Replaces all existing income, expense, and appointment data.</p>
                  {allDataImportLoading && <p className="text-sm text-muted-foreground mt-2 inline">Processing import...</p>}
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* CSV - Specific Data Types Import */}
            <div>
              <h3 className="text-lg font-semibold mb-2">CSV - Specific Data Types</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Incomes CSV Import */}
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2"><FileText className="h-5 w-5" /> Incomes</h4>
                  <div
                    onDragOver={(e) => handleDragOver(e, setIncomeCsvDragActive)}
                    onDragLeave={(e) => handleDragLeave(e, setIncomeCsvDragActive)}
                    onDrop={(e) => handleDropSpecificCsv(e, 'incomes', setIncomeCsvDragActive)}
                    className={dropZoneClasses(incomeCsvDragActive)}
                    onClick={() => !anyOperationLoading && csvIncomeFileInputRef.current?.click()}
                  >
                    <div className="flex items-center">
                       <Button onClick={(e) => {e.stopPropagation(); csvIncomeFileInputRef.current?.click();}} variant="outline" disabled={anyOperationLoading} className="flex-grow">
                        <Upload className="mr-2 h-4 w-4" /> Choose Incomes CSV
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="ml-2 cursor-help p-1.5 rounded-full hover:bg-secondary/50 h-auto w-auto flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto text-sm p-2">
                          <p>Required headers: `source`, `amount`, `date`.</p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <input type="file" ref={csvIncomeFileInputRef} onChange={(e) => handleSpecificCsvFileSelected(e, 'incomes')} accept=".csv" className="hidden" />
                    <p className="text-xs text-muted-foreground">Or drag and drop (.csv)</p>
                    <p className="text-xs text-destructive mt-1">Warning: Replaces all existing income data.</p>
                    {(specificCsvImportLoading && specificCsvImportType === 'incomes') && <p className="text-sm text-muted-foreground mt-2">Processing...</p>}
                  </div>
                </div>

                {/* Expenses CSV Import */}
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2"><FileText className="h-5 w-5" /> Expenses</h4>
                  <div
                    onDragOver={(e) => handleDragOver(e, setExpenseCsvDragActive)}
                    onDragLeave={(e) => handleDragLeave(e, setExpenseCsvDragActive)}
                    onDrop={(e) => handleDropSpecificCsv(e, 'expenses', setExpenseCsvDragActive)}
                    className={dropZoneClasses(expenseCsvDragActive)}
                    onClick={() => !anyOperationLoading && csvExpenseFileInputRef.current?.click()}
                  >
                    <div className="flex items-center">
                       <Button onClick={(e) => { e.stopPropagation(); csvExpenseFileInputRef.current?.click(); }} variant="outline" disabled={anyOperationLoading} className="flex-grow">
                        <Upload className="mr-2 h-4 w-4" /> Choose Expenses CSV
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                           <Button variant="ghost" className="ml-2 cursor-help p-1.5 rounded-full hover:bg-secondary/50 h-auto w-auto flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto text-sm p-2">
                          <p>Required headers: `category`, `amount`, `date`.</p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <input type="file" ref={csvExpenseFileInputRef} onChange={(e) => handleSpecificCsvFileSelected(e, 'expenses')} accept=".csv" className="hidden" />
                    <p className="text-xs text-muted-foreground">Or drag and drop (.csv)</p>
                    <p className="text-xs text-destructive mt-1">Warning: Replaces all existing expense data.</p>
                    {(specificCsvImportLoading && specificCsvImportType === 'expenses') && <p className="text-sm text-muted-foreground mt-2">Processing...</p>}
                  </div>
                </div>

                {/* Appointments CSV Import */}
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2"><FileText className="h-5 w-5" /> Appointments</h4>
                  <div
                    onDragOver={(e) => handleDragOver(e, setAppointmentCsvDragActive)}
                    onDragLeave={(e) => handleDragLeave(e, setAppointmentCsvDragActive)}
                    onDrop={(e) => handleDropSpecificCsv(e, 'appointments', setAppointmentCsvDragActive)}
                    className={dropZoneClasses(appointmentCsvDragActive)}
                    onClick={() => !anyOperationLoading && csvAppointmentFileInputRef.current?.click()}
                  >
                    <div className="flex items-center">
                      <Button onClick={(e) => { e.stopPropagation(); csvAppointmentFileInputRef.current?.click(); }} variant="outline" disabled={anyOperationLoading} className="flex-grow">
                        <Upload className="mr-2 h-4 w-4" /> Choose Appointments CSV
                      </Button>
                       <Popover>
                        <PopoverTrigger asChild>
                           <Button variant="ghost" className="ml-2 cursor-help p-1.5 rounded-full hover:bg-secondary/50 h-auto w-auto flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto text-sm p-2">
                          <p>Headers: `title`, `date`. Optional: `description`.</p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <input type="file" ref={csvAppointmentFileInputRef} onChange={(e) => handleSpecificCsvFileSelected(e, 'appointments')} accept=".csv" className="hidden" />
                    <p className="text-xs text-muted-foreground">Or drag and drop (.csv)</p>
                    <p className="text-xs text-destructive mt-1">Warning: Replaces all existing appointment data.</p>
                    {(specificCsvImportLoading && specificCsvImportType === 'appointments') && <p className="text-sm text-muted-foreground mt-2">Processing...</p>}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions. Please be certain before proceeding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDeleteAllDataInitiate} variant="destructive" disabled={anyOperationLoading}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All My Data
            </Button>
            {deleteAllLoading && <p className="text-sm text-muted-foreground ml-4 inline">Processing deletion...</p>}
            <p className="text-xs text-muted-foreground mt-1">
              <strong className="text-destructive">Warning:</strong> This action is irreversible. It will permanently delete all income, expense, and appointment records.
            </p>
          </CardContent>
        </Card>

        {/* All Data Import Confirmation Dialog */}
        <AlertDialog open={isAllDataImportConfirmOpen} onOpenChange={setIsAllDataImportConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
                Confirm All Data Import
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you absolutely sure you want to import this <strong className="font-semibold">{allDataImportType?.toUpperCase()}</strong> file for all data? 
                <strong className="text-destructive"> This action will permanently delete all your current income, expense, and appointment records and replace them with the data from the selected file.</strong> This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setParsedAllDataToImport(null); setAllDataImportType(null); setIsAllDataImportConfirmOpen(false);}}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAllDataImport} className="bg-destructive hover:bg-destructive/90">
                Yes, Overwrite All and Import
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Specific CSV Import Confirmation Dialog */}
        <AlertDialog open={isSpecificCsvImportConfirmOpen} onOpenChange={setIsSpecificCsvImportConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
                Confirm CSV Data Import for {specificCsvImportType ? specificCsvImportType.charAt(0).toUpperCase() + specificCsvImportType.slice(1) : ''}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you absolutely sure you want to import this CSV file for <strong className="font-semibold">{specificCsvImportType}</strong>? 
                <strong className="text-destructive"> This action will permanently delete all your current {specificCsvImportType} records and replace them with the data from the selected file. Data for other categories will not be affected.</strong>
                This cannot be undone for the selected scope.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setSpecificCsvDataToImport(null); setSpecificCsvImportType(null); setIsSpecificCsvImportConfirmOpen(false);}}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSpecificCsvImportData} className="bg-destructive hover:bg-destructive/90">
                Yes, Overwrite {specificCsvImportType} and Import
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
    

    