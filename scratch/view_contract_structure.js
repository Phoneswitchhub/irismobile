const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/contract/page.tsx';

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('const ') || line.includes('function ') || line.includes('useRef') || line.includes('useState') || line.includes('return (') || line.includes('tab') || line.includes('type')) {
    if (idx < 200) { // Let's check first 200 lines first
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  }
});
