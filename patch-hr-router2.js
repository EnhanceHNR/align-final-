const fs = require('fs');
let code = fs.readFileSync('src/server/routers/hr.router.ts', 'utf8');

if (code.includes('const records = docs.map(d => ({ id: d.id, ...d.data() }));')) {
    code = code.replace(
        'const records = docs.map(d => ({ id: d.id, ...d.data() }));',
        'const records = docs.map(d => ({ id: d.id, ...serializeTimestamps(d.data()) }));'
    );
    // There is another one for getHolidays: const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Actually, I should just replace ALL `doc.data()` calls in the file with `serializeTimestamps(doc.data())` if they aren't already.
    // I will regex replace it, but be careful.
    
    // Instead of regex, let's just patch the specific lines
    
    code = code.replace(
        'if (p.exists) profiles[id as string] = { id: p.id, ...p.data() };',
        'if (p.exists) profiles[id as string] = { id: p.id, ...serializeTimestamps(p.data()) };'
    );
    
    // Check getHolidays
    code = code.replace(
        'const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));',
        'const records = snap.docs.map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data()) }));'
    );
    // Check any remaining
    code = code.replace(/(\.data\(\))/g, (match, p1, offset, string) => {
        // Only replace if it's not already inside serializeTimestamps
        if (string.substring(offset - 20, offset).includes('serializeTimestamps')) {
            return match;
        }
        return 'data()'; // actually let's just use safeFormat on frontend if we keep chasing this. 
    });

}
fs.writeFileSync('src/server/routers/hr.router.ts', code);
