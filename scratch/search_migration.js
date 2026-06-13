const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/backup_static';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.sql')) {
    const fullPath = path.join(dir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.toLowerCase().includes('contracts')) {
      console.log(`=== File: ${file} ===`);
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes('contracts') || line.toLowerCase().includes('create table')) {
          console.log(`${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
