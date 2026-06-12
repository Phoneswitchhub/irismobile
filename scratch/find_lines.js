const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/staff/dashboard/page.tsx';

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

let startIdx = -1;
lines.forEach((line, idx) => {
  if (line.includes('handleFileChange =')) {
    startIdx = idx;
  }
});
if (startIdx !== -1) {
  console.log(`handleFileChange starts at line ${startIdx + 1}`);
  for (let i = startIdx; i < startIdx + 20; i++) {
    console.log(`${i + 1}: ${lines[i].trim()}`);
  }
}
