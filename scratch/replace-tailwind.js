const fs = require('fs');
const file = 'src/app/(workflow)/apollo-search/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace standard occurrences
content = content.split('text-[var(--text-primary)]').join('text-(--text-primary)');
content = content.split('text-[var(--accent-indigo)]').join('text-(--accent-indigo)');
content = content.split('border-[var(--border-subtle)]').join('border-(--border-subtle)');
content = content.split('text-[var(--text-muted)]').join('text-(--text-muted)');

fs.writeFileSync(file, content);
