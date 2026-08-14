#!/bin/bash

# Update records page
sed -i '' 's|import { fetchSubmissions, fetchLabs } from "@/lib/data";|import { fetchSubmissions, fetchEntitiesAction } from "../actions";|g' src/app/dashboard/lab/records/page.tsx
sed -i '' 's|fetchLabs()|fetchEntitiesAction("labs")|g' src/app/dashboard/lab/records/page.tsx
sed -i '' 's|import { RecordsClientPage } from "@/components/records/RecordsClientPage";|import { RecordsClientPage } from "@/components/lab/records/RecordsClientPage";|g' src/app/dashboard/lab/records/page.tsx

# Update receive page
sed -i '' 's|import { fetchUsersAction, fetchSubmissions } from "@/app/actions";|import { fetchUsersAction, fetchSubmissions } from "../actions";|g' src/app/dashboard/lab/receive/page.tsx
sed -i '' 's|import { ReceiveForm } from "@/components/forms/ReceiveForm";|import { ReceiveForm } from "@/components/lab/forms/ReceiveForm";|g' src/app/dashboard/lab/receive/page.tsx

# Update bills page
sed -i '' 's|import { fetchSubmissions } from "@/app/actions";|import { fetchSubmissions, fetchEntitiesAction } from "../actions";|g' src/app/dashboard/lab/bills/page.tsx
sed -i '' 's|fetchLabs()|fetchEntitiesAction("labs")|g' src/app/dashboard/lab/bills/page.tsx
sed -i '' 's|import { BillsClientPage } from "@/components/bills/BillsClientPage";|import { BillsClientPage } from "@/components/lab/bills/BillsClientPage";|g' src/app/dashboard/lab/bills/page.tsx

