"use client";

import React, { useState, useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useData } from "@/contexts/data-context";
import { format, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export function AppointmentCalendarView() {
  const { appointments } = useData();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const appointmentsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return appointments
      .filter(app => isSameDay(app.date, selectedDate))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [appointments, selectedDate]);

  const appointmentDates = useMemo(() => appointments.map(app => app.date), [appointments]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>Select a date to view appointments.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{ scheduled: appointmentDates }}
            modifiersClassNames={{ scheduled: 'bg-primary/20 rounded-full' }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            Appointments for {selectedDate ? format(selectedDate, "PPP") : "selected date"}
          </CardTitle>
          <CardDescription>
            {appointmentsForSelectedDate.length > 0 
              ? `You have ${appointmentsForSelectedDate.length} appointment(s).`
              : "No appointments for this date."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72">
            {appointmentsForSelectedDate.length > 0 ? (
              <ul className="space-y-3">
                {appointmentsForSelectedDate.map((appointment) => (
                  <li key={appointment.id} className="p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">{appointment.title}</h4>
                      <Badge variant="outline">{format(appointment.date, "p")}</Badge>
                    </div>
                    {appointment.description && (
                      <p className="text-sm text-muted-foreground mt-1">{appointment.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No appointments scheduled for this day.
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
