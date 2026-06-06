const fs = require('fs');
const path = require('path');

const koreanRe = /[\uac00-\ud7a3]/;
const excludePaths = ['node_modules', 'thailand-addresses.js', 'i18n.js', 'find_korean.js', 'find_korean.py', 'korean_lines.txt', '.git'];

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!excludePaths.some(p => fullPath.includes(p))) {
        results.push(...walk(fullPath));
      }
    } else {
      if ((file.endsWith('.html') || file.endsWith('.js')) && !excludePaths.some(p => fullPath.includes(p))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk('.');
const outputLines = [];

files.forEach(filepath => {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (koreanRe.test(line)) {
        outputLines.push(`${filepath}:${index + 1}: ${line.trim()}`);
      }
    });
  } catch (err) {
    console.error(`Error reading ${filepath}: ${err.message}`);
  }
});

fs.writeFileSync('korean_lines.txt', outputLines.join('\n'), 'utf8');
console.log(`Successfully wrote ${outputLines.length} lines to korean_lines.txt`);
