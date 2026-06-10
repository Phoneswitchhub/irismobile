const fs = require('fs');
const filePath = 'c:/Users/ASUS/Documents/GitHub/phoneswitchhub/src/app/staff/dashboard/page.tsx';

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  const trimmed = line.trim();
  if (trimmed.includes("activeTab === 'trash'") || trimmed.includes("activeTab === \"trash\"") || trimmed.includes("('trash')") || trimmed.includes("can_view_trash")) {
    console.log(`${idx + 1}: ${trimmed}`);
  }
});
