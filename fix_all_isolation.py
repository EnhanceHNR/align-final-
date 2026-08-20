import os
import glob
import re

models_with_org = [
    "visitNote", "patient", "chair", "treatmentPlanItem", "invoiceItem", "treatment",
    "appointment", "lab", "labTransaction", "labSubmission", "instructionTemplate",
    "inventoryItem", "stockEntry", "purchaseOrder", "delivery", "dealer", "statement",
    "consumptionRecord", "learningMaterial", "learningCategory", "earlyPunchOutRequest",
    "attendanceSession", "leaveRequest", "employeeDocument", "doctor", "procedure",
    "employeeProfile", "attendance", "shiftSegment", "payrollRecord", "resignationRequest",
    "rejoinRequest", "holiday", "lateRequest", "invoice", "treatmentPlan"
]
# Let's double check if some of these have it. 
# We will just patch the known routers manually or semi-automatically for safety.
