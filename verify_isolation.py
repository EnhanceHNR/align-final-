import os
import glob
import re

router_files = glob.glob("src/server/routers/*.ts")

for file in router_files:
    with open(file, "r") as f:
        content = f.read()
    
    # We will look for `.findMany({ where: {` or `.findFirst({ where: {`
    queries = re.findall(r'\.find[A-Za-z]+\s*\(\s*\{[^}]*where\s*:\s*\{([^}]*)\}', content)
    
    suspicious = []
    for q in queries:
        # Ignore models that don't have organizationId (e.g. Users if searching by email, etc.)
        # Or if they are querying by organizationId.
        if "organizationId" not in q and "id:" not in q and "userId" not in q and "patientId" not in q and "slug" not in q and "email" not in q:
            suspicious.append(q.strip())
            
    if suspicious:
        print(f"File: {file} has suspicious queries:")
        for s in suspicious:
            print(f"  {s}")

