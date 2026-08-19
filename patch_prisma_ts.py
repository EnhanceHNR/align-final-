with open("src/lib/prisma.ts", "r") as f:
    content = f.read()

models_to_add = [
    "Anamnesis", "TreatmentPlanItem", "InvoiceItem", "ShiftSegment", 
    "Attendance", "AttendanceSession", "LeaveRequest", "PayrollRecord", 
    "ResignationRequest", "RejoinRequest", "EmployeeDocument", 
    "LateRequest", "EarlyPunchOutRequest"
]

import re

match = re.search(r"const tenantModels = \[(.*?)\];", content, re.DOTALL)
if match:
    existing = match.group(1)
    new_models = [f'"{m}"' for m in models_to_add if f'"{m}"' not in existing]
    if new_models:
        replacement = existing + ",\n    " + ", ".join(new_models)
        content = content.replace(existing, replacement)

with open("src/lib/prisma.ts", "w") as f:
    f.write(content)

print("Added models to tenantModels in prisma.ts")
