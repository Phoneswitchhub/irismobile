const fs = require('fs');
const path = require('path');

const tables = new Set();

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        walk(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/\.from\(['"](.*?)['"]\)/g);
      if (matches) {
        matches.forEach(m => {
          const t = m.match(/\.from\(['"](.*?)['"]\)/)[1];
          tables.add(t);
        });
      }
    }
  });
}

walk('c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src');
console.log('Tables found in codebase:', Array.from(tables));
