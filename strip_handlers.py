import re
import sys

def strip_handlers(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replace specific functions with mocks
    content = re.sub(r'const handleGenerateStatement = async \(\) => \{[\s\S]*?\} finally \{', 
                     'const handleGenerateStatement = async () => {\n        try {\n            // Mock generate statement\n            toast({\n                title: "Statement Generated",\n                description: "Mock statement generated successfully.",\n            });\n        } catch (error) {\n        } finally {', content)
                     
    content = re.sub(r'const handleRecordPayment = async \(\) => \{[\s\S]*?\} finally \{', 
                     'const handleRecordPayment = async () => {\n        try {\n            // Mock payment\n            toast({\n                title: "Payment Recorded",\n                description: "Mock payment recorded successfully.",\n            });\n        } catch (error) {\n        } finally {', content)

    # Any leftover firestore
    content = content.replace('const statementsCollection = useMemo(() => firestore ? collection(firestore, \'statements\') : null, []);', '')
    content = content.replace('import { useCollection, firestore, errorEmitter, FirestorePermissionError } from "@/firebase";', 'import { api } from "~/trpc/react";')
    content = content.replace('import { collection, doc, writeBatch } from "firebase/firestore";', '')
    
    with open(filepath, 'w') as f:
        f.write(content)

for filepath in sys.argv[1:]:
    strip_handlers(filepath)
