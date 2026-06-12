const fs = require('fs');
const content = fs.readFileSync('c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/staff/dashboard/page.tsx', 'utf8');
const lines = content.split('\n');

console.log('Searching for handleInlineSave:');
lines.forEach((line, idx) => {
  if (line.includes('handleInlineSave') || line.includes('const handleInlineSave')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
