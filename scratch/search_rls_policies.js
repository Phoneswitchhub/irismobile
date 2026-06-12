const fs = require('fs');
const path = require('path');

function search(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        search(fullPath);
      }
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes('sheets_inventory') && content.toLowerCase().includes('policy')) {
        console.log(`FOUND: ${fullPath}`);
      }
    }
  });
}
search('c:/Users/ASUS/Documents/GitHub/phoneswitchhub');
