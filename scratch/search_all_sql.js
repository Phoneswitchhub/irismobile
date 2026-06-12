const fs = require('fs');
const path = require('path');

const backupDir = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/backup_static';
fs.readdirSync(backupDir).forEach(f => {
  if (f.endsWith('.sql')) {
    const p = path.join(backupDir, f);
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.split('\n');
    let printing = false;
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes('create table public.sheets_inventory') || line.toLowerCase().includes('create table sheets_inventory')) {
        printing = true;
        console.log(`=== File: ${f} ===`);
      }
      if (printing) {
        console.log(`${idx + 1}: ${line.trim()}`);
        if (line.includes(');')) {
          printing = false;
        }
      }
    });
  }
});
