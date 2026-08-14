import re
import sys

def strip_firebase(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove firebase imports
    content = re.sub(r'import \{.*useCollection.*\} from "@/firebase";\n', 'import { api } from "~/trpc/react";\n', content)
    content = re.sub(r'import \{.*\} from "firebase/firestore";\n', '', content)
    content = re.sub(r'import \{.*\} from "@/firebase";\n', '', content)
    
    # Replace useCollection hooks with tRPC mocks
    content = re.sub(r'const .* = useMemo\(\(\) => collection\(firestore.*\);\n', '', content)
    content = re.sub(r'const .* = useMemo\(\(\) => query\(collection\(firestore.*\);\n', '', content)
    content = re.sub(r'const \{ data: (.*?), isLoading: (.*?) \} = useCollection.*?;', r'const { data: \1, isLoading: \2 } = { data: [] as any[], isLoading: false };', content)
    content = re.sub(r'const \{ data: (.*?), isLoading \} = useCollection.*?;', r'const { data: \1, isLoading } = { data: [] as any[], isLoading: false };', content)
    content = re.sub(r'const \{ data: (.*?) \} = useCollection.*?;', r'const { data: \1 } = { data: [] as any[] };', content)

    # Any other firestore stuff
    content = content.replace("!firestore", "false")
    
    # Save the cleaned file
    with open(filepath, 'w') as f:
        f.write(content)

for filepath in sys.argv[1:]:
    strip_firebase(filepath)
