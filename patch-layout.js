const fs = require('fs');
let code = fs.readFileSync('src/app/layout.tsx', 'utf8');

code = code.replace(
    'import Providers from "@/app/_components/Providers";',
    'import Providers from "@/app/_components/Providers";\nimport { Toaster } from "@/components/ui/toaster";'
);

code = code.replace(
    '          <Providers>\n            {children}\n          </Providers>',
    '          <Providers>\n            {children}\n            <Toaster />\n          </Providers>'
);

fs.writeFileSync('src/app/layout.tsx', code);
