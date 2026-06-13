const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/contract/page.tsx';

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log('Total lines in page.tsx:', lines.length);

// Let's print out lines in page.tsx where tab or create is rendered in JSX
lines.forEach((line, idx) => {
  if (line.includes('sidebarTab') || line.includes('className="sidebar"') || line.includes('tab-btn') || line.includes('t(\'contract_')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
