const fs = require('fs');
const content = fs.readFileSync('src/app/staff/dashboard/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('trash') || line.includes('can_view_trash')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
