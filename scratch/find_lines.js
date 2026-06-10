const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/staff/dashboard/page.tsx';

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('subscribe') || line.includes('channel') || line.includes('useEffect') || line.includes('loadLedgerData')) {
    if (idx < 500) { // check the setup phase
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
