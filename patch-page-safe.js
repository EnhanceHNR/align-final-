const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/attendance/page.tsx', 'utf8');

// Define a safeFormat function
const safeFormatCode = `
import { Badge } from "~/components/ui/badge";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function safeFormat(dateVal: any, formatStr: string) {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? 'Invalid Time' : format(d, formatStr);
}
`;

code = code.replace(
    'import { Badge } from "~/components/ui/badge";\nimport { useSession } from "next-auth/react";\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";\nimport { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";',
    safeFormatCode
);

// Replace format(new Date(...)) with safeFormat(...)
code = code.replace(/format\(new Date\(([^)]+)\),\s*'([^']+)'\)/g, "safeFormat($1, '$2')");

fs.writeFileSync('src/app/dashboard/attendance/page.tsx', code);
