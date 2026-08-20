import { router } from "./trpc";
import { patientsRouter } from "./routers/patients.router"; // src/server/routers/ klasöründe
import { odontogramRouter } from "./routers/odontogram.router"; // src/server/api/routers/ klasöründe
import { appointmentRouter } from "./routers/appointment.router";
import { visitNotesRouter } from "./routers/visit-notes.router";
import { invoiceRouter } from "./routers/invoice.router";
import { labRouter } from "./routers/lab.router";
import { labSubmissionRouter } from "./routers/labSubmission.router";
import { labTransactionRouter } from "./routers/labTransaction.router";
import { inventoryRouter } from "./routers/inventory.router";
import { chairRouter } from "./routers/chairs.router";
import { googleCalendarRouter } from "./routers/googleCalendar.router";
import { learningRouter } from "./routers/learning.router";
import { employeeRouter } from "./routers/employee.router";
import { attendanceRouter } from "./routers/attendance.router";
import { hrRouter } from "./routers/hr.router";
import { organizationRouter } from "./routers/organization.router";
import { historyRouter } from "./routers/history.router";

import { doctorsRouter } from "./routers/doctors.router";
import { proceduresRouter } from "./routers/procedures.router";

export const appRouter = router({
  patients: patientsRouter,
  odontogram: odontogramRouter,
  appointment: appointmentRouter,
  visitNotes: visitNotesRouter,
  invoice: invoiceRouter,
  lab: labRouter,
  labSubmission: labSubmissionRouter,
  labTransaction: labTransactionRouter,
  inventory: inventoryRouter,
  chairs: chairRouter,
  googleCalendar: googleCalendarRouter,
  learning: learningRouter,
  employee: employeeRouter,
  attendance: attendanceRouter,
  hr: hrRouter,
  organization: organizationRouter,
  history: historyRouter,

  doctors: doctorsRouter,
  procedures: proceduresRouter,
});

export type AppRouter = typeof appRouter;