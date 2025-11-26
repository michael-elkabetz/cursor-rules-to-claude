#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const shebang = '#!/usr/bin/env node';
const indexPath = path.join(__dirname, '../dist/index.js');
const outputPath = path.join(__dirname, '../dist/cursor-rules-aggregator');

let content = fs.readFileSync(indexPath, 'utf-8');

if (!content.startsWith('#!')) {
    content = shebang + '\n' + content;
}

fs.writeFileSync(outputPath, content);
fs.chmodSync(outputPath, '755');

console.log('✓ Executable created at dist/cursor-rules-aggregator');
console.log('Run with: ./dist/cursor-rules-aggregator --force');
