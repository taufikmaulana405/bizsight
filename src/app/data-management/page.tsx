
"use client";

import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Upload, AlertTriangle, Trash2, FileText, FileJson, Info } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';


type CsvImportType = 'incomes' | 'expenses' | 'appointments' | 'all_unified';

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
  
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvIncomeFileInputRef = useRef<HTMLInputElement>(null);
  const csvExpenseFileInputRef = useRef<HTMLInputElement>(null);
  const csvAppointmentFileInputRef = useRef<HTMLInputElement>(null);
  const csvUnifiedFileInputRef = useRef<HTMLInputElement>(null);
  
  const [isJsonImportConfirmOpen, setIsJsonImportConfirmOpen] = useState(false);
  const [dataToImportJson, setDataToImportJson] = useState<AllDataExport | null>(null);
  const [jsonImportLoading, setJsonImportLoading] = useState(false);

  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  const [csvImportType, setCsvImportType] = useState<CsvImportType | null>(null);
  const [csvDataToImport, setCsvDataToImport] = useState<Record<string, string>[] | null>(null);
  const [isCsvImportConfirmOpen, setIsCsvImportConfirmOpen] = useState(false);
  const [csvImportLoading, setCsvImportLoading] = useState(false);

  const [jsonDragActive, setJsonDragActive] = useState(false);
  const [unifiedCsvDragActive, setUnifiedCsvDragActive] = useState(false);
  const [incomeCsvDragActive, setIncomeCsvDragActive] = useState(false);
  const [expenseCsvDragActive, setExpenseCsvDragActive] = useState(false);
  const [appointmentCsvDragActive, setAppointmentCsvDragActive] = useState(false);

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

  const processJsonFile = (file: File | undefined) => {
    if (file) {
      if (file.type !== "application/json") {
        toast({ title: "Invalid File Type", description: "Please upload a valid JSON file (.json).", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedData = JSON.parse(text) as AllDataExport;
            if (parsedData && Array.isArray(parsedData.incomes) && Array.isArray(parsedData.expenses) && Array.isArray(parsedData.appointments)) {
              setDataToImportJson(parsedData);
              setIsJsonImportConfirmOpen(true);
            } else {
              throw new Error("Invalid JSON file format. Missing required top-level keys: incomes, expenses, appointments.");
            }
          }
        } catch (error: any) {
          toast({ title: "JSON Import Error", description: error.message || "Failed to parse JSON file or invalid format.", variant: "destructive" });
          console.error("JSON Import error:", error);
        } finally {
          if (jsonFileInputRef.current) jsonFileInputRef.current.value = ""; 
        }
      };
      reader.readAsText(file);
    }
  };

  const handleJsonFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    processJsonFile(event.target.files?.[0]);
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
    if (type === 'all_unified') return csvUnifiedFileInputRef;
    return null;
  }

  const processCsvFile = (file: File | undefined, type: CsvImportType) => {
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
              else if (type === 'all_unified' && firstRow.type !== undefined && firstRow.date !== undefined) validHeaders = true; 

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

  const handleCsvFileSelected = (event: React.ChangeEvent<HTMLInputElement>, type: CsvImportType) => {
    processCsvFile(event.target.files?.[0], type);
  };
  
  const confirmCsvImportData = async () => {
    if (csvDataToImport && csvImportType) {
      setCsvImportLoading(true);
      setIsCsvImportConfirmOpen(false);
      const currentType = csvImportType;
      try {
        switch (currentType) {
          case 'incomes':
            await importIncomesFromCSV(csvDataToImport);
            break;
          case 'expenses':
            await importExpensesFromCSV(csvDataToImport);
            break;
          case 'appointments':
            await importAppointmentsFromCSV(csvDataToImport);
            break;
          case 'all_unified':
            await importAllDataFromUnifiedCSV(csvDataToImport);
            break;
        }
        toast({ title: `${currentType === 'all_unified' ? 'All Data (Unified CSV)' : currentType.charAt(0).toUpperCase() + currentType.slice(1)} Import Successful`, description: `Your ${currentType === 'all_unified' ? 'data has' : currentType + ' data has'} been imported and replaced.` });
      } catch (error) {
        toast({ title: "CSV Import Failed", description: `Could not import ${currentType} data. Please check the console.`, variant: "destructive" });
        console.error(`CSV Import for ${currentType} failed:`, error);
      } finally {
        setCsvImportLoading(false);
        setCsvDataToImport(null);
        setCsvImportType(null);
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

  const handleDropJson = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setJsonDragActive(false);
    if (anyOperationLoading) return;
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      processJsonFile(event.dataTransfer.files[0]);
    }
  };
  
  const handleDropCsv = (event: React.DragEvent<HTMLDivElement>, type: CsvImportType, setDragActive: React.Dispatch<React.SetStateAction<boolean>>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (anyOperationLoading) return;
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        processCsvFile(event.dataTransfer.files[0], type);
    }
  }
  
  const anyOperationLoading = jsonImportLoading || deleteAllLoading || csvImportLoading || dataContextLoading;

  const dropZoneClasses = (dragActive: boolean) => 
    cn(
      "border-2 border-dashed rounded-md transition-colors",
      "flex flex-col items-start space-y-2", 
      dragActive ? "border-primary bg-primary/10 text-primary" : "border-transparent hover:border-muted-foreground/25",
      anyOperationLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
    );


  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download your application data in various formats.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
            
            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> CSV - All Data (Unified)</h3>
              <Button onClick={handleExportAllDataCSV} variant="outline" disabled={anyOperationLoading}>
                <Download className="mr-2 h-4 w-4" /> Export All Data (Unified CSV)
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Exports all data types into a single CSV file with a 'type' column.
              </p>
            </div>
            
            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-2">CSV - Specific Data Types</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2"><FileText className="h-5 w-5" /> Incomes</h4>
                  <Button onClick={() => handleExportCSV('incomes')} variant="outline" disabled={anyOperationLoading}>
                    <Download className="mr-2 h-4 w-4" /> Export Incomes
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exports only income data.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2"><FileText className="h-5 w-5" /> Expenses</h4>
                  <Button onClick={() => handleExportCSV('expenses')} variant="outline" disabled={anyOperationLoading}>
                    <Download className="mr-2 h-4 w-4" /> Export Expenses
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exports only expense data.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2"><FileText className="h-5 w-5" /> Appointments</h4>
                  <Button onClick={() => handleExportCSV('appointments')} variant="outline" disabled={anyOperationLoading}>
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
            {/* JSON - All Data Import */}
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileJson className="h-5 w-5 text-primary" /> JSON - All Data</h3>
              <div
                onDragOver={(e) => handleDragOver(e, setJsonDragActive)}
                onDragLeave={(e) => handleDragLeave(e, setJsonDragActive)}
                onDrop={handleDropJson}
                className={dropZoneClasses(jsonDragActive)}
                onClick={() => !anyOperationLoading && jsonFileInputRef.current?.click()}
              >
                <Button onClick={(e) => { e.stopPropagation(); jsonFileInputRef.current?.click(); }} variant="outline" disabled={anyOperationLoading}>
                  <Upload className="mr-2 h-4 w-4" /> Choose JSON File
                </Button>
                <input type="file" ref={jsonFileInputRef} onChange={handleJsonFileSelected} accept=".json" className="hidden" />
                <p className="text-xs text-muted-foreground">Or drag and drop a JSON file here (.json)</p>
                <p className="text-xs text-destructive mt-1">Warning: Replaces all existing income, expense, and appointment data.</p>
                {jsonImportLoading && <p className="text-sm text-muted-foreground mt-2 inline">Processing JSON import...</p>}
              </div>
            </div>

            <Separator />

            {/* CSV - All Data (Unified) Import */}
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> CSV - All Data (Unified)</h3>
              <div
                onDragOver={(e) => handleDragOver(e, setUnifiedCsvDragActive)}
                onDragLeave={(e) => handleDragLeave(e, setUnifiedCsvDragActive)}
                onDrop={(e) => handleDropCsv(e, 'all_unified', setUnifiedCsvDragActive)}
                className={dropZoneClasses(unifiedCsvDragActive)}
                onClick={() => !anyOperationLoading && csvUnifiedFileInputRef.current?.click()}
              >
                <div className="flex items-center">
                  <Button onClick={(e) => { e.stopPropagation(); csvUnifiedFileInputRef.current?.click(); }} variant="outline" disabled={anyOperationLoading}>
                    <Upload className="mr-2 h-4 w-4" /> Choose Unified CSV File
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <Button variant="ghost" className="ml-2 cursor-help p-1.5 rounded-full hover:bg-secondary/50 h-auto w-auto flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Required headers: `type`, `date`, and other relevant fields (e.g. `amount`, `source`, `category`, `title`).</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <input type="file" ref={csvUnifiedFileInputRef} onChange={(e) => handleCsvFileSelected(e, 'all_unified')} accept=".csv" className="hidden" />
                <p className="text-xs text-muted-foreground">Or drag and drop a CSV file here (.csv)</p>
                <p className="text-xs text-destructive mt-1">Warning: Replaces all existing income, expense, and appointment data.</p>
                {(csvImportLoading && csvImportType === 'all_unified') && <p className="text-sm text-muted-foreground mt-2">Processing...</p>}
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
                    onDrop={(e) => handleDropCsv(e, 'incomes', setIncomeCsvDragActive)}
                    className={dropZoneClasses(incomeCsvDragActive)}
                    onClick={() => !anyOperationLoading && csvIncomeFileInputRef.current?.click()}
                  >
                    <div className="flex items-center">
                      <Button onClick={(e) => {e.stopPropagation(); csvIncomeFileInputRef.current?.click();}} variant="outline" disabled={anyOperationLoading}>
                        <Upload className="mr-2 h-4 w-4" /> Choose Incomes CSV
                      </Button>
                       <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" className="ml-2 cursor-help p-1.5 rounded-full hover:bg-secondary/50 h-auto w-auto flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Required headers: `source`, `amount`, `date`.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <input type="file" ref={csvIncomeFileInputRef} onChange={(e) => handleCsvFileSelected(e, 'incomes')} accept=".csv" className="hidden" />
                    <p className="text-xs text-muted-foreground">Or drag and drop (.csv)</p>
                    <p className="text-xs text-destructive mt-1">Warning: Replaces all existing income data.</p>
                    {(csvImportLoading && csvImportType === 'incomes') && <p className="text-sm text-muted-foreground mt-2">Processing...</p>}
                  </div>
                </div>

                {/* Expenses CSV Import */}
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2"><FileText className="h-5 w-5" /> Expenses</h4>
                  <div
                    onDragOver={(e) => handleDragOver(e, setExpenseCsvDragActive)}
                    onDragLeave={(e) => handleDragLeave(e, setExpenseCsvDragActive)}
                    onDrop={(e) => handleDropCsv(e, 'expenses', setExpenseCsvDragActive)}
                    className={dropZoneClasses(expenseCsvDragActive)}
                    onClick={() => !anyOperationLoading && csvExpenseFileInputRef.current?.click()}
                  >
                    <div className="flex items-center">
                      <Button onClick={(e) => { e.stopPropagation(); csvExpenseFileInputRef.current?.click(); }} variant="outline" disabled={anyOperationLoading}>
                        <Upload className="mr-2 h-4 w-4" /> Choose Expenses CSV
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" className="ml-2 cursor-help p-1.5 rounded-full hover:bg-secondary/50 h-auto w-auto flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Required headers: `category`, `amount`, `date`.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <input type="file" ref={csvExpenseFileInputRef} onChange={(e) => handleCsvFileSelected(e, 'expenses')} accept=".csv" className="hidden" />
                    <p className="text-xs text-muted-foreground">Or drag and drop (.csv)</p>
                    <p className="text-xs text-destructive mt-1">Warning: Replaces all existing expense data.</p>
                    {(csvImportLoading && csvImportType === 'expenses') && <p className="text-sm text-muted-foreground mt-2">Processing...</p>}
                  </div>
                </div>

                {/* Appointments CSV Import */}
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2"><FileText className="h-5 w-5" /> Appointments</h4>
                  <div
                    onDragOver={(e) => handleDragOver(e, setAppointmentCsvDragActive)}
                    onDragLeave={(e) => handleDragLeave(e, setAppointmentCsvDragActive)}
                    onDrop={(e) => handleDropCsv(e, 'appointments', setAppointmentCsvDragActive)}
                    className={dropZoneClasses(appointmentCsvDragActive)}
                    onClick={() => !anyOperationLoading && csvAppointmentFileInputRef.current?.click()}
                  >
                    <div className="flex items-center">
                      <Button onClick={(e) => { e.stopPropagation(); csvAppointmentFileInputRef.current?.click(); }} variant="outline" disabled={anyOperationLoading}>
                        <Upload className="mr-2 h-4 w-4" /> Choose Appointments CSV
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" className="ml-2 cursor-help p-1.5 rounded-full hover:bg-secondary/50 h-auto w-auto flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Headers: `title`, `date`. Optional: `description`.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <input type="file" ref={csvAppointmentFileInputRef} onChange={(e) => handleCsvFileSelected(e, 'appointments')} accept=".csv" className="hidden" />
                    <p className="text-xs text-muted-foreground">Or drag and drop (.csv)</p>
                    <p className="text-xs text-destructive mt-1">Warning: Replaces all existing appointment data.</p>
                    {(csvImportLoading && csvImportType === 'appointments') && <p className="text-sm text-muted-foreground mt-2">Processing...</p>}
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
                Confirm CSV Data Import for {csvImportType === 'all_unified' ? 'All Data (Unified)' : csvImportType}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you absolutely sure you want to import this CSV file for <strong className="font-semibold">{csvImportType === 'all_unified' ? 'all data types' : csvImportType}</strong>? 
                {csvImportType === 'all_unified' ? (
                  <strong className="text-destructive"> This action will permanently delete all your current income, expense, and appointment records and replace them.</strong>
                ) : (
                  <strong className="text-destructive"> This action will permanently delete all your current {csvImportType} records and replace them with the data from the selected file. Data for other categories will not be affected.</strong>
                )}
                This cannot be undone for the selected scope.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setCsvDataToImport(null); setCsvImportType(null); setIsCsvImportConfirmOpen(false);}}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmCsvImportData} className="bg-destructive hover:bg-destructive/90">
                Yes, Overwrite {csvImportType === 'all_unified' ? 'All Data' : csvImportType} and Import
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
    </TooltipProvider>
  );
}
    
