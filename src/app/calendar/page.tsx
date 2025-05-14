import { AppointmentCalendarView } from "@/components/calendar/appointment-calendar-view";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Appointments Calendar</h1>
      
      <AppointmentCalendarView />

      <Separator className="my-6" />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Add New Appointment</CardTitle>
          <CardDescription>Schedule a new event or meeting.</CardDescription>
        </CardHeader>
        <CardContent>
          <AppointmentForm />
        </CardContent>
      </Card>
    </div>
  );
}
