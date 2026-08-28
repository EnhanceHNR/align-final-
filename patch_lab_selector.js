const fs = require('fs');
const path = 'src/components/lab/forms/LabSelector.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetSort = \`        }).sort((a, b) => {
            const score: Record<string, number> = { green: 0, yellow: 1, red: 2, default: 3 };
            if (score[a.highlight] !== score[b.highlight]) return score[a.highlight] - score[b.highlight];
            return (a.name || "").localeCompare(b.name || "");
        });
    }, [labs, searchQuery, selectedService, globalKeywordsForSelected]);\`;

const replacementSort = \`        }).sort((a, b) => {
            if (disabled && selectedLab) {
                if (a.name === selectedLab && b.name !== selectedLab) return -1;
                if (b.name === selectedLab && a.name !== selectedLab) return 1;
            }
            const score: Record<string, number> = { green: 0, yellow: 1, red: 2, default: 3 };
            if (score[a.highlight] !== score[b.highlight]) return score[a.highlight] - score[b.highlight];
            return (a.name || "").localeCompare(b.name || "");
        });
        
        if (disabled && selectedLab) {
            return sorted.filter(l => l.name === selectedLab);
        }
        return sorted;
    }, [labs, searchQuery, selectedService, globalKeywordsForSelected, disabled, selectedLab]);\`;

content = content.replace(targetSort, replacementSort);

const targetSortedAndFilteredLabs = \`    const sortedAndFilteredLabs = useMemo(() => {
        let filtered = labs;
        if (searchQuery) {
            filtered = filtered.filter(l => l.name?.toLowerCase().includes(searchQuery.toLowerCase()));
        }\`;

const replacementSortedAndFilteredLabs = \`    const sortedAndFilteredLabs = useMemo(() => {
        let filtered = labs;
        if (searchQuery && !disabled) {
            filtered = filtered.filter(l => l.name?.toLowerCase().includes(searchQuery.toLowerCase()));
        }\`;

content = content.replace(targetSortedAndFilteredLabs, replacementSortedAndFilteredLabs);
fs.writeFileSync(path, content);
console.log("Patched LabSelector.tsx");
