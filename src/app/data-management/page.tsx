
"use client";

import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Upload, AlertTriangle, Trash2 } from 'lucide-react';
import { useData } from '@/contexts/data-context';
import { useToast } from "@/hooks/use-toast";
import type { AllDataExport } from '@/lib/types';
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

export default function DataManagementPage() {
  const { incomes, expenses, appointments, importAllData, deleteAllUserData, loading: dataContextLoading } = useData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [dataToImport, setDataToImport] = useState<AllDataExport | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  const handleExportData = () => {
    const dataToExport: AllDataExport = {
      incomes: incomes.map(i => ({...i, date: i.date.toISOString() as any})),
      expenses: expenses.map(e => ({...e, date: e.date.toISOString() as any})),
      appointments: appointments.map(a => ({...a, date: a.date.toISOString() as any})),
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
    toast({ title: "Data Exported", description: "Your data has been downloaded as a JSON file." });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedData = JSON.parse(text) as AllDataExport;
            if (parsedData && Array.isArray(parsedData.incomes) && Array.isArray(parsedData.expenses) && Array.isArray(parsedData.appointments)) {
              setDataToImport(parsedData);
              setIsImportConfirmOpen(true);
            } else {
              throw new Error("Invalid file format.");
            }
          }
        } catch (error) {
          toast({ title: "Import Error", description: "Failed to parse JSON file or invalid format.", variant: "destructive" });
          console.error("Import error:", error);
        } finally {
          if (event.target) {
            event.target.value = ""; 
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const confirmImportData = async () => {
    if (dataToImport) {
      setImportLoading(true);
      setIsImportConfirmOpen(false);
      try {
        await importAllData(dataToImport);
        toast({ title: "Import Successful", description: "Your data has been imported and replaced." });
      } catch (error) {
        toast({ title: "Import Failed", description: "Could not import data. Please check the console.", variant: "destructive" });
        console.error("Import failed:", error);
      } finally {
        setImportLoading(false);
        setDataToImport(null);
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
  
  const anyOperationLoading = importLoading || deleteAllLoading || dataContextLoading;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Export Your Data</CardTitle>
          <CardDescription>Download all your income, expense, and appointment data as a JSON file. This can be used as a backup or for migrating to another system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportData} variant="outline" disabled={anyOperationLoading}>
            <Download className="mr-2 h-4 w-4" />
            Export All Data
          </Button>
          {anyOperationLoading && <p className="text-sm text-muted-foreground ml-4 inline">Processing...</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
          <CardDescription>Import data from a previously exported JSON file. 
            <strong className="text-destructive"> Warning: This will permanently delete all your current data and replace it with the data from the file.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleImportClick} variant="outline" disabled={anyOperationLoading}>
            <Upload className="mr-2 h-4 w-4" />
            Import Data from File
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            accept=".json"
            className="hidden"
          />
           {anyOperationLoading && <p className="text-sm text-muted-foreground ml-4 inline">Processing...</p>}
        </CardContent>
      </Card>

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
          {anyOperationLoading && <p className="text-sm text-muted-foreground ml-4 inline">Processing...</p>}
        </CardContent>
      </Card>

      <AlertDialog open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
              Confirm Data Import
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure you want to import this data? 
              <strong className="text-destructive"> This action will permanently delete all your current income, expense, and appointment records and replace them with the data from the selected file.</strong> This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setDataToImport(null); setIsImportConfirmOpen(false);}}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImportData} className="bg-destructive hover:bg-destructive/90">
              Yes, Overwrite and Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
