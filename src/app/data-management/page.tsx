
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


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

  const handleCsvImportClick = (type: CsvImportType) => {
    setCsvImportType(type);
    if (type === 'incomes') csvIncomeFileInputRef.current?.click();
    if (type === 'expenses') csvExpenseFileInputRef.current?.click();
    if (type === 'appointments') csvAppointmentFileInputRef.current?.click();
    if (type === 'all_unified') csvUnifiedFileInputRef.current?.click();
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
  
  const anyOperationLoading = jsonImportLoading || deleteAllLoading || csvImportLoading || dataContextLoading;

  return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download your application data in various formats.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileJson className="h-5 w-5 text-primary" />JSON - All Data</h3>
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
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />CSV - All Data (Unified)</h3>
              <Button onClick={handleExportAllDataCSV} variant="outline" disabled={anyOperationLoading}>
                <Download className="mr-2 h-4 w-4" /> Export All Data (Unified CSV)
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Exports all data types into a single CSV file with a 'type' column.
              </p>
            </div>

            <Separator />
            
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5" />CSV - Incomes</h3>
                <Button onClick={() => handleExportCSV('incomes')} variant="outline" disabled={anyOperationLoading}>
                  <Download className="mr-2 h-4 w-4" /> Export Incomes
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Exports only income data.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5" />CSV - Expenses</h3>
                <Button onClick={() => handleExportCSV('expenses')} variant="outline" disabled={anyOperationLoading}>
                  <Download className="mr-2 h-4 w-4" /> Export Expenses
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Exports only expense data.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5" />CSV - Appointments</h3>
                <Button onClick={() => handleExportCSV('appointments')} variant="outline" disabled={anyOperationLoading}>
                  <Download className="mr-2 h-4 w-4" /> Export Appointments
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Exports only appointment data.
                </p>
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
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileJson className="h-5 w-5 text-primary" />JSON - All Data</h3>
              <Button onClick={handleJsonImportClick} variant="outline" disabled={anyOperationLoading}>
                <Upload className="mr-2 h-4 w-4" />
                Import All Data (JSON)
              </Button>
              <input type="file" ref={jsonFileInputRef} onChange={handleJsonFileSelected} accept=".json" className="hidden" />
              <p className="text-xs text-destructive mt-1">
                Warning: Replaces all existing income, expense, and appointment data.
              </p>
              {jsonImportLoading && <p className="text-sm text-muted-foreground mt-2 inline">Processing JSON import...</p>}
            </div>
            
            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />CSV - All Data (Unified)</h3>
              <div className="flex items-center">
                <Button onClick={() => handleCsvImportClick('all_unified')} variant="outline" disabled={anyOperationLoading}>
                  <Upload className="mr-2 h-4 w-4" /> Import All Data (Unified CSV)
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="ml-2 cursor-help p-1.5 rounded-full hover:bg-secondary/50 h-auto w-auto">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto text-sm">
                    <p>Required headers: `type`, `date`, and other relevant fields (e.g. `amount`, `source`, `category`, `title`).</p>
                  </PopoverContent>
                </Popover>
              </div>
              <input type="file" ref={csvUnifiedFileInputRef} onChange={(e) => handleCsvFileSelected(e, 'all_unified')} accept=".csv" className="hidden" />
              <p className="text-xs text-destructive mt-1">Warning: Replaces all existing income, expense, and appointment data.</p>
              {(csvImportLoading && csvImportType === 'all_unified') && <p className="text-sm text-muted-foreground mt-2">Processing unified CSV import...</p>}
            </div>

            <Separator />

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5" />CSV - Incomes</h3>
                <div className="flex items-center">
                  <Button onClick={() => handleCsvImportClick('incomes')} variant="outline" disabled={anyOperationLoading}>
                    <Upload className="mr-2 h-4 w-4" /> Import Incomes
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="ml-2 cursor-help p-1.5 rounded-full hover:bg-secondary/50 h-auto w-auto">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto text-sm">
                      <p>Required headers: `source`, `amount`, `date`.</p>
                    </PopoverContent>
                  </Popover>
                </div>
                <input type="file" ref={csvIncomeFileInputRef} onChange={(e) => handleCsvFileSelected(e, 'incomes')} accept=".csv" className="hidden" />
                <p className="text-xs text-destructive mt-1">Warning: Replaces all existing income data.</p>
                {(csvImportLoading && csvImportType === 'incomes') && <p className="text-sm text-muted-foreground mt-2">Processing...</p>}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5" />CSV - Expenses</h3>
                <div className="flex items-center">
                  <Button onClick={() => handleCsvImportClick('expenses')} variant="outline" disabled={anyOperationLoading}>
                    <Upload className="mr-2 h-4 w-4" /> Import Expenses
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                       <Button variant="ghost" className="ml-2 cursor-help p-1.5 rounded-full hover:bg-secondary/50 h-auto w-auto">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto text-sm">
                      <p>Required headers: `category`, `amount`, `date`.</p>
                    </PopoverContent>
                  </Popover>
                </div>
                <input type="file" ref={csvExpenseFileInputRef} onChange={(e) => handleCsvFileSelected(e, 'expenses')} accept=".csv" className="hidden" />
                <p className="text-xs text-destructive mt-1">Warning: Replaces all existing expense data.</p>
                {(csvImportLoading && csvImportType === 'expenses') && <p className="text-sm text-muted-foreground mt-2">Processing...</p>}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5" />CSV - Appointments</h3>
                <div className="flex items-center">
                  <Button onClick={() => handleCsvImportClick('appointments')} variant="outline" disabled={anyOperationLoading}>
                    <Upload className="mr-2 h-4 w-4" /> Import Appointments
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="ml-2 cursor-help p-1.5 rounded-full hover:bg-secondary/50 h-auto w-auto">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto text-sm">
                      <p>Headers: `title`, `date`. Optional: `description`.</p>
                    </PopoverContent>
                  </Popover>
                </div>
                <input type="file" ref={csvAppointmentFileInputRef} onChange={(e) => handleCsvFileSelected(e, 'appointments')} accept=".csv" className="hidden" />
                <p className="text-xs text-destructive mt-1">Warning: Replaces all existing appointment data.</p>
                {(csvImportLoading && csvImportType === 'appointments') && <p className="text-sm text-muted-foreground mt-2">Processing...</p>}
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
  );
}

