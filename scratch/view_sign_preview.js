const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/contract/sign/[id]/page.tsx';

if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('iris_logo') || line.includes('h2') || line.includes('sig-box') || line.includes('stamp')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  });
}
