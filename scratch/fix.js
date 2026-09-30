const fs = require('fs');
const path = 'd:/workspace/Projects/LeadGenerationToolForBBDE/LeadGenerationToolForBBDE/scratch/replace.js';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/\\`/g, '`');
fs.writeFileSync(path, c);
