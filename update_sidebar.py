import re

filepath = '/Users/sai/Documents/Dental/src/components/dashboard-sidebar.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Replace aside with Sidebar components
content = content.replace('import { Accordion,', 'import { Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";\nimport { Accordion,')
content = content.replace('<aside className="sticky top-0 hidden h-screen w-72 flex-col space-y-8 border-r bg-white p-6 text-slate-600 md:flex overflow-y-auto">', '<Sidebar className="border-r bg-white/50 backdrop-blur-xl">\n<SidebarHeader className="sticky top-0 bg-white/80 backdrop-blur-md z-10 pb-4 border-b">')

content = content.replace('</aside>', '</Sidebar>')

# We need to close SidebarHeader and open SidebarContent
content = content.replace('            {/* SEARCH */}', '            </SidebarHeader>\n            <SidebarContent className="p-4 space-y-6 overflow-y-auto">\n            {/* SEARCH */}')
content = content.replace('            </nav>', '            </nav>\n            </SidebarContent>')

with open(filepath, 'w') as f:
    f.write(content)

