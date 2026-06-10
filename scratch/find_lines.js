const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/staff/dashboard/page.tsx';

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  const trimmed = line.trim();
  if (trimmed.includes('refund') || trimmed.includes('교환') || trimmed.includes('반품') || trimmed.includes('불량')) {
    console.log(`${idx + 1}: ${trimmed}`);
  }
});
