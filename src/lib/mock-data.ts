import type { Attendance, Employee, Leave, Payslip, OfficeLocation } from './types';
import {
  format,
  subDays,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isSunday,
  setHours,
  setMinutes,
  addMinutes,
  subMonths,
  getDay,
} from 'date-fns';

export const mockOfficeLocations: OfficeLocation[] = [
  { id: 'loc1', name: 'Pune Office', latitude: 18.508639, longitude: 73.791861 },
];

const dayOfWeekMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const mockEmployees: Omit<Employee, 'id'>[] = [
  {
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'System Administrator',
    department: 'Technology',
    manager: 'System',
    status: 'Active',
    avatarUrl: 'https://picsum.photos/seed/1/100/100',
    employeeType: 'Admin',
    password: 'password',
    shift: '9 AM - 5 PM',
    salary: 100000,
    officeLocationId: 'loc1',
    weeklyOffs: ['Saturday', 'Sunday'],
    bufferTime: 15,
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@test.com',
    role: 'Product Manager',
    department: 'Product',
    manager: 'Admin User',
    status: 'Active',
    avatarUrl: 'https://picsum.photos/seed/2/100/100',
    employeeType: 'Employee',
    password: 'password',
    shift: '9 AM - 5 PM',
    salary: 80000,
    officeLocationId: 'loc1',
    weeklyOffs: ['Saturday', 'Sunday'],
    bufferTime: 10,
  },
  {
    name: 'Rohan Mehta',
    email: 'rohan.mehta@test.com',
    role: 'Lead Software Engineer',
    department: 'Technology',
    manager: 'Admin User',
    status: 'Active',
    avatarUrl: 'https://picsum.photos/seed/3/100/100',
    employeeType: 'Employee',
    password: 'password',
    shift: '10 AM - 6 PM',
    salary: 92000,
    officeLocationId: 'loc1',
    weeklyOffs: ['Saturday', 'Sunday'],
    bufferTime: 5,
  },
  {
    name: 'Anjali Desai',
    email: 'anjali.desai@test.com',
    role: 'UI/UX Designer',
    department: 'Design',
    manager: 'Priya Sharma',
    status: 'On Leave',
    avatarUrl: 'https://picsum.photos/seed/4/100/100',
    employeeType: 'Employee',
    password: 'password',
    shift: '9 AM - 5 PM',
    salary: 68000,
    officeLocationId: 'loc1',
    weeklyOffs: ['Saturday', 'Sunday'],
    bufferTime: 10,
  },
   {
    name: 'Vikram Singh',
    email: 'vikram.singh@test.com',
    role: 'HR Specialist',
    department: 'Human Resources',
    manager: 'Admin User',
    status: 'Active',
    avatarUrl: 'https://picsum.photos/seed/5/100/100',
    employeeType: 'Employee',
    password: 'password',
    shift: '8 AM - 4 PM',
    salary: 62000,
    officeLocationId: 'loc1',
    weeklyOffs: ['Sunday'],
    bufferTime: 15,
  },
  {
    name: 'Sai Charan Reddy',
    email: 'sai.charan@test.com',
    role: 'Software Engineer',
    department: 'Technology',
    manager: 'Rohan Mehta',
    status: 'Active',
    avatarUrl: 'https://picsum.photos/seed/6/100/100',
    employeeType: 'Employee',
    password: 'password',
    shift: '9 AM - 5 PM',
    salary: 75000,
    officeLocationId: 'loc1',
    weeklyOffs: ['Saturday', 'Sunday'],
    bufferTime: 10,
  }
];

// --- MOCK DATA GENERATION FOR AUGUST 2024 ---

const today = new Date();
const targetDate = new Date(2024, 7, 1); // August 2024
const startOfTargetMonth = startOfMonth(targetDate);
const endOfTargetMonth = endOfMonth(targetDate);
const daysInMonth = eachDayOfInterval({
  start: startOfTargetMonth,
  end: endOfTargetMonth,
});

const generateMonthlyAttendance = (employee: Omit<Employee, 'id'>, isSaiCharan: boolean = false): Attendance[] => {
  const attendanceRecords: Attendance[] = [];
  const shift = employee.shift || '9 AM - 5 PM';
  const weeklyOffs = employee.weeklyOffs || ['Sunday'];

  const [shiftStartHourStr] = shift.split(' ')[0].split(':');
  let shiftStartHour = parseInt(shiftStartHourStr, 10);
  const shiftStartPeriod = shift.split(' ')[1];
  
  if (shiftStartPeriod === 'PM' && shiftStartHour !== 12) {
    shiftStartHour += 12;
  }
  if (shiftStartPeriod === 'AM' && shiftStartHour === 12) {
    shiftStartHour = 0;
  }

  // Define specific dates for Sai Charan's attendance events in August 2024
  const saiCharanLateDates = isSaiCharan ? ['2024-08-05', '2024-08-12', '2024-08-19'] : [];
  const saiCharanAbsentDates = isSaiCharan ? ['2024-08-20', '2024-08-21'] : [];
  const holidayDateStr = '2024-08-15'; // Independence Day

  let lateDaysCount = 0;
  let absentDaysCount = 0;

  daysInMonth.forEach((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayOfWeekName = dayOfWeekMap[getDay(day)];
    
    if (weeklyOffs.includes(dayOfWeekName)) {
        attendanceRecords.push({
            employeeId: employee.email!,
            date: dateStr,
            status: 'Weekend',
            sessions: [],
        });
        return;
    }
    
    if (dateStr === holidayDateStr) {
        attendanceRecords.push({
            employeeId: employee.email!,
            date: dateStr,
            status: 'Holiday',
            sessions: [],
        });
        return;
    }
    
    let status: 'Present' | 'Late' | 'Absent' | 'Holiday' | 'Weekend' = 'Present';
    let sessions = [];

    // Logic to create varied attendance
    if (isSaiCharan) {
        if (saiCharanLateDates.includes(dateStr)) {
            status = 'Late';
        } else if (saiCharanAbsentDates.includes(dateStr)) {
            status = 'Absent';
        }
    } else {
        const randomFactor = Math.random();
        if (randomFactor < 0.1 && absentDaysCount < 2) { // ~10% chance of being absent, max 2 days
          status = 'Absent';
          absentDaysCount++;
        } else if (randomFactor < 0.3 && lateDaysCount < 4) { // ~20% chance of being late, max 4 days
          status = 'Late';
          lateDaysCount++;
        }
    }


    if (status !== 'Absent') {
      const clockInMinuteOffset = (status === 'Late' ? 15 : -5) + Math.floor(Math.random() * 10);
      const clockOutMinuteOffset = -5 + Math.floor(Math.random() * 20);

      const clockInTime = setMinutes(setHours(day, shiftStartHour), clockInMinuteOffset);
      const clockOutTime = addMinutes(addHours(clockInTime, 8), clockOutMinuteOffset); // 8 hours duration + offset

      sessions.push({
        clockIn: {
          time: format(clockInTime, 'hh:mm a'),
          photo: `https://picsum.photos/seed/${employee.email}${dateStr}in/300/225`,
          location: null,
        },
        clockOut: {
          time: format(clockOutTime, 'hh:mm a'),
          photo: `https://picsum.photos/seed/${employee.email}${dateStr}out/300/225`,
          location: null,
        },
        duration: `${8}h ${Math.abs(clockOutMinuteOffset + clockInMinuteOffset)}m`,
      });
    }

    attendanceRecords.push({
      employeeId: employee.email!,
      date: dateStr,
      status: status,
      sessions: sessions,
    });
  });

  return attendanceRecords;
};

// Helper to add hours correctly for shift parsing
const addHours = (date: Date, hours: number) => {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
};


export const mockAttendance: Attendance[] = mockEmployees.flatMap(emp => {
    if (emp.email === 'anjali.desai@test.com') return []; // Anjali is on leave
    const isSaiCharan = emp.email === 'sai.charan@test.com';
    return generateMonthlyAttendance(emp, isSaiCharan);
});

export const mockLeaves: Leave[] = [
    // Anjali is on leave for most of the target month
    { id: 'L001', employeeId: 'anjali.desai@test.com', type: 'Paid Leave', startDate: format(startOfTargetMonth, 'yyyy-MM-dd'), endDate: format(subDays(endOfTargetMonth, 5), 'yyyy-MM-dd'), days: 20, status: 'Approved' },
    // Rohan took a sick day last month
    { id: 'L002', employeeId: 'rohan.mehta@test.com', type: 'Sick Leave', startDate: format(addDays(startOfTargetMonth, 7), 'yyyy-MM-dd'), endDate: format(addDays(startOfTargetMonth, 7), 'yyyy-MM-dd'), days: 1, status: 'Approved' },
    // Priya has an unpaid leave from last month
    { id: 'L003', employeeId: 'priya.sharma@test.com', type: 'Unpaid Leave', startDate: format(addDays(startOfTargetMonth, 3), 'yyyy-MM-dd'), endDate: format(addDays(startOfTargetMonth, 4), 'yyyy-MM-dd'), days: 2, status: 'Approved' },
    // Vikram has a pending request for the current month
    { id: 'L004', employeeId: 'vikram.singh@test.com', type: 'Paid Leave', startDate: format(addDays(today, 10), 'yyyy-MM-dd'), endDate: format(addDays(today, 12), 'yyyy-MM-dd'), days: 3, status: 'Pending' },
];


export const mockPayslips: Payslip[] = [
    { id: 'PAY-0624', period: 'June 2024', netPay: 78000.00, status: 'Paid' },
    { id: 'PAY-0524', period: 'May 2024', netPay: 78000.00, status: 'Paid' },
    { id: 'PAY-0424', period: 'April 2024', netPay: 77500.50, status: 'Paid' },
];
export const mockSalaryProfile = `
  {
    "employeeId": "EMP002",
    "effectiveDate": "2024-01-01",
    "salaryComponents": {
      "basic": 45000,
      "hra": 18000,
      "specialAllowance": 12000,
      "transportAllowance": 3000,
      "providentFund": -5400
    },
    "bankDetails": {
      "bankName": "Global Trust Bank",
      "accountNumber": "xxxx-xxxx-1234"
    },
    "taxInformation": {
      "taxRegime": "New",
      "pan": "ABCDE1234F"
    },
    "salaryCycle": "Monthly"
  }
`;
