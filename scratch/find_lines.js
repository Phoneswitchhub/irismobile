const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/auth/page.tsx';

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('phoneToEmail') || line.includes('makePassword')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
