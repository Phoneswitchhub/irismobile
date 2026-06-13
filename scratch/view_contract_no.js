const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/contract/page.tsx';

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('setContractNo') || line.includes('contractNo')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
