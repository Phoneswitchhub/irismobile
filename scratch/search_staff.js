const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/staff/dashboard/page.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const query = process.argv[2] || 'Sticker';
console.log(`Searching for "${query}" in page.tsx...`);

let count = 0;
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes(query.toLowerCase())) {
    console.log(`${idx + 1}: ${line.trim()}`);
    count++;
  }
});
console.log(`Found ${count} lines.`);
