import os
import glob
import re

router_files = glob.glob("src/server/routers/*.ts")

for file in router_files:
    with open(file, "r") as f:
        content = f.read()
    
    # Simple heuristic: find Prisma calls (ctx.db.model.findMany, ctx.db.model.findUnique, etc)
    # Check if organizationId is in the where clause
    prisma_calls = re.findall(r'ctx\.db\.[a-zA-Z0-9_]+\.(?:findMany|findUnique|findFirst|update|delete|count|updateMany|deleteMany)\s*\(\s*\{[^}]*where\s*:\s*\{([^}]*)\}', content)
    
    suspicious_calls = []
    for call in prisma_calls:
        if "organizationId" not in call and "id:" not in call and "userId" not in call and "patientId" not in call:
            suspicious_calls.append(call)
            
    if suspicious_calls:
        print(f"--- Suspicious Queries in {file} ---")
        for sc in suspicious_calls:
            print("   " + sc.strip())
            
print("Audit complete.")
