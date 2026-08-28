const fs = require('fs');
const path = 'src/components/lab/forms/ReceiveForm.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = \`                                    <>
                                        <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground hover:text-blue-500 font-bold text-xs h-full" onClick={(e) => { 
                                            e.stopPropagation(); 
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = (e: any) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const newDocs = [...documents];
                                                    newDocs[idx].file = file;
                                                    newDocs[idx].preview = URL.createObjectURL(file);
                                                    setDocuments(newDocs);
                                                }
                                            };
                                            input.click();
                                        }}>
                                            <Upload className="w-4 h-4 text-blue-500" /> Upload
                                        </div>
                                    </>\`;

const replacement = \`                                    <>
                                        <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground hover:text-blue-500 font-bold text-xs h-full border-r" onClick={(e) => { 
                                            e.stopPropagation(); 
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = (e: any) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const newDocs = [...documents];
                                                    newDocs[idx].file = file;
                                                    newDocs[idx].preview = URL.createObjectURL(file);
                                                    setDocuments(newDocs);
                                                }
                                            };
                                            input.click();
                                        }}>
                                            <Upload className="w-4 h-4 text-blue-500" /> Upload
                                        </div>
                                        <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground hover:text-blue-500 font-bold text-xs h-full" onClick={(e) => { 
                                            e.stopPropagation(); 
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.capture = 'environment';
                                            input.onchange = (e: any) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const newDocs = [...documents];
                                                    newDocs[idx].file = file;
                                                    newDocs[idx].preview = URL.createObjectURL(file);
                                                    setDocuments(newDocs);
                                                }
                                            };
                                            input.click();
                                        }}>
                                            <Camera className="w-4 h-4 text-blue-500" /> Capture
                                        </div>
                                    </>\`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content);
    console.log("Patched successfully");
} else {
    console.log("Target string not found!");
}
