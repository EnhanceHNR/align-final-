import re

with open("src/components/appointments/AppointmentFormSheet.tsx", "r") as f:
    content = f.read()

# Replace imports
content = content.replace(
    'import {\n    Sheet,\n    SheetContent,\n    SheetHeader,\n    SheetTitle,\n    SheetTrigger,\n} from "@/components/ui/sheet";',
    'import {\n    Dialog,\n    DialogContent,\n    DialogHeader,\n    DialogTitle,\n    DialogTrigger,\n} from "@/components/ui/dialog";'
)

# Replace components
content = content.replace('<Sheet ', '<Dialog ')
content = content.replace('</Sheet>', '</Dialog>')

content = content.replace('<SheetTrigger', '<DialogTrigger')
content = content.replace('</SheetTrigger>', '</DialogTrigger>')

content = content.replace('<SheetHeader>', '<DialogHeader>')
content = content.replace('</SheetHeader>', '</DialogHeader>')

content = content.replace('<SheetTitle>', '<DialogTitle>')
content = content.replace('</SheetTitle>', '</DialogTitle>')

# SheetContent replacement, taking into account the class name
content = re.sub(
    r'<SheetContent className="[^"]*">',
    r'<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">',
    content
)
content = content.replace('</SheetContent>', '</DialogContent>')

with open("src/components/appointments/AppointmentFormSheet.tsx", "w") as f:
    f.write(content)

print("Changed Sheet to Dialog!")
