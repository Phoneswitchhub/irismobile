const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/contract/page.tsx';

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('print-area') || line.includes('document-preview') || line.includes('stamp') || line.includes('logo') || line.includes('ref={') || line.includes('window.print') || line.includes('id="print"')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
