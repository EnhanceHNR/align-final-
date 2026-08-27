const fs = require('fs');
let code = fs.readFileSync('src/server/routers/hr.router.ts', 'utf8');

const serializeCode = `
const serializeTimestamps = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
    if ('_seconds' in obj && '_nanoseconds' in obj) return new Date(obj._seconds * 1000).toISOString();
    if (Array.isArray(obj)) return obj.map(serializeTimestamps);
    const res: any = {};
    for (const key in obj) res[key] = serializeTimestamps(obj[key]);
    return res;
};
`;

if (!code.includes('serializeTimestamps')) {
    code = code.replace(
        'const fetchWithProfiles = async (collectionName: string, organizationId: string, employeeProfileId?: string) => {',
        serializeCode + '\nconst fetchWithProfiles = async (collectionName: string, organizationId: string, employeeProfileId?: string) => {'
    );
    code = code.replace(
        'const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));',
        'const records = snap.docs.map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data()) }));'
    );
    // Also patch the profile fetching map just in case
    code = code.replace(
        '(profiles as any)[id as string] = { id: pDoc.id, ...pDoc.data() };',
        '(profiles as any)[id as string] = { id: pDoc.id, ...serializeTimestamps(pDoc.data()) };'
    );
    // Fix the sorting fallback which relied on toMillis()
    code = code.replace(
        '(b.dateOfApplying?.toMillis?.() || 0) - (a.dateOfApplying?.toMillis?.() || 0)',
        'new Date(b.dateOfApplying || 0).getTime() - new Date(a.dateOfApplying || 0).getTime()'
    );
    code = code.replace(
        '(b.submittedDate?.toMillis?.() || 0) - (a.submittedDate?.toMillis?.() || 0)',
        'new Date(b.submittedDate || 0).getTime() - new Date(a.submittedDate || 0).getTime()'
    );
    code = code.replace(
        '(b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)',
        'new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()'
    );
    fs.writeFileSync('src/server/routers/hr.router.ts', code);
}
