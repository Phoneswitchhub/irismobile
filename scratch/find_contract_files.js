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
    } else if (file.toLowerCase().includes('contract') || file.toLowerCase().includes('sign')) {
      console.log(`Found file: ${fullPath}`);
    }
  });
}
search('c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app');
