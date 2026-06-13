const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/contract/sign/[id]/page.tsx';

if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  console.log('Total lines in sign/[id]/page.tsx:', lines.length);
  lines.forEach((line, idx) => {
    if (line.includes('contract') || line.includes('store') || line.includes('product') || line.includes('selling')) {
      if (idx < 300) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
      }
    }
  });
} else {
  console.log('File does not exist:', filePath);
}
