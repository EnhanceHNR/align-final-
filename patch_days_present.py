with open("src/app/dashboard/attendance/employees/[id]/page.tsx", "r") as f:
    content = f.read()

target = "const [currentMonth, setCurrentMonth] = useState(new Date());"
replacement = """const [currentMonth, setCurrentMonth] = useState(new Date());

  // --- REAL DATA CALCULATIONS ---
  const currentMonthAttendances = employee?.attendances?.filter(a => isSameMonth(new Date(a.date), currentMonth)) || [];
  const daysPresent = currentMonthAttendances.filter(a => ["Present", "Late", "Double Late", "PaidLeave"].includes(a.status)).length;
  const daysAbsent = currentMonthAttendances.filter(a => ["Absent", "UnpaidLeave"].includes(a.status)).length;
  
  const dailyRate = (employee?.baseSalary || 0) / 30;
  const estimatedPayout = Math.max(0, (employee?.baseSalary || 0) - (dailyRate * daysAbsent));
  const absentPenalty = dailyRate * daysAbsent;
"""

content = content.replace(target, replacement)

with open("src/app/dashboard/attendance/employees/[id]/page.tsx", "w") as f:
    f.write(content)

print("Patched variables into scope.")
