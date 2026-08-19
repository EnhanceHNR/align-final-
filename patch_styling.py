with open("src/app/dashboard/attendance/employees/page.tsx", "r") as f:
    content = f.read()

import re

# Replace input styles
content = re.sub(
    r'className="w-full bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100([^"]*)"',
    r'className="w-full bg-[#f1f2f3] border-0 rounded-xl px-4 py-3 h-12 text-sm outline-none focus:ring-2 focus:ring-slate-200 transition-all\1"',
    content
)

# Fix specific inputs that might not have matched
content = content.replace(
    'className="flex-1 bg-transparent border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"',
    'className="flex-1 bg-[#f1f2f3] border-0 rounded-xl px-4 py-3 h-12 text-sm outline-none focus:ring-2 focus:ring-slate-200 transition-all"'
)

# We want to change the shift timings to look like [09:00] [AM]
# For simplicity, if we use <input type="time"> it forces browser styling. Let's keep it but make it look like the box. 
# Wait, the screenshot has separate dropdowns for time and AM/PM. Let's just use `type="time"` but styled properly, it's natively supported and much more robust.
# Let's adjust the Shift Timings layout slightly to match the spacing.
content = content.replace(
    '<span className="text-gray-400 font-bold">-</span>',
    '<span className="text-gray-400 font-bold mx-1">-</span>'
)

# Update Add Modal Title
content = content.replace(
    '<DialogDescription>Create a new employee profile and system account.</DialogDescription>',
    '<DialogDescription>Add a new employee to the system.</DialogDescription>'
)

with open("src/app/dashboard/attendance/employees/page.tsx", "w") as f:
    f.write(content)

print("Patched styling to match screenshot.")
