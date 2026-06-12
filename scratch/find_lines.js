const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/staff/dashboard/page.tsx';

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes("field: 'color'") || line.includes("field === 'color'")) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
