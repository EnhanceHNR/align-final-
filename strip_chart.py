import re

filepath = '/Users/sai/Documents/Dental/src/components/reports/dealer-performance-chart.tsx'
with open(filepath, 'r') as f:
    content = f.read()

content = re.sub(r'import \{.*useCollection.*\} from "@/firebase";\n', 'import { api } from "~/trpc/react";\n', content)
content = re.sub(r'import \{.*\} from "firebase/firestore";\n', '', content)
content = re.sub(r'const .* = useMemo\(\(\) => collection\(firestore.*\);\n', '', content)
content = re.sub(r'const \{ data: (.*?), isLoading: (.*?) \} = useCollection.*?;', r'const { data: \1, isLoading: \2 } = { data: [] as any[], isLoading: false };', content)

with open(filepath, 'w') as f:
    f.write(content)

