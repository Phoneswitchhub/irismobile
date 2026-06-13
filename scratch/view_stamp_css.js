const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/contract/page.tsx';

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

let printing = false;
lines.forEach((line, idx) => {
  if (line.includes('.company-seal-stamp')) {
    printing = true;
  }
  if (printing) {
    console.log(`${idx + 1}: ${line.trim()}`);
    if (line.includes('}')) {
      printing = false;
    }
  }
});
