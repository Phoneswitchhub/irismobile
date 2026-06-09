const fs = require('fs');

let content = fs.readFileSync('src/app/staff/dashboard/page.tsx', 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

// ── 1. Update handleCSVImport Fallbacks ──
const oldCSVFallbacks = `      // Fallbacks
      if (siteDateIdx === -1) siteDateIdx = 0;
      if (stickerIdx === -1) stickerIdx = 1;
      if (modelIdx === -1) modelIdx = 2;
      if (imeiIdx === -1) imeiIdx = 3;
      if (colorIdx === -1) colorIdx = 4;
      if (isSoldIdx === -1) isSoldIdx = 5;
      if (locationIdx === -1) locationIdx = 6;
      if (batteryIdx === -1) batteryIdx = 7;
      if (purchaseCostIdx === -1) purchaseCostIdx = 8;
      if (saleDateIdx === -1) saleDateIdx = 99;
      if (sellerIdx === -1) sellerIdx = 99;
      if (notesIdx === -1) notesIdx = 99;
      if (sellingPriceIdx === -1) sellingPriceIdx = 99;
      if (marketPriceIdx === -1) marketPriceIdx = 99;`;

const newCSVFallbacks = `      // Fallbacks (Dynamic based on column count if no header detected)
      const firstRowLength = rows[startIdx] ? rows[startIdx].length : 0;
      if (siteDateIdx === -1) siteDateIdx = 0;
      if (stickerIdx === -1) stickerIdx = 1;
      if (modelIdx === -1) modelIdx = 2;
      if (imeiIdx === -1) imeiIdx = 3;
      if (colorIdx === -1) colorIdx = 4;
      if (isSoldIdx === -1) isSoldIdx = 5;
      if (locationIdx === -1) locationIdx = 6;
      if (batteryIdx === -1) {
        batteryIdx = (firstRowLength <= 8) ? 99 : 7;
      }
      if (purchaseCostIdx === -1) {
        purchaseCostIdx = (firstRowLength <= 8) ? 7 : 8;
      }
      if (saleDateIdx === -1) saleDateIdx = 99;
      if (sellerIdx === -1) sellerIdx = 99;
      if (notesIdx === -1) notesIdx = 99;
      if (sellingPriceIdx === -1) sellingPriceIdx = 99;
      if (marketPriceIdx === -1) marketPriceIdx = 99;`;

// ── 2. Clean battery parsing in handleCSVImport ──
const oldCSVBattery = `        const battery = row[batteryIdx] ? row[batteryIdx].trim() : '100';`;
const newCSVBattery = `        const batteryClean = row[batteryIdx] ? row[batteryIdx].trim().replace(/[^\\d]/g, '') : '100';
        const battery = batteryClean || '100';`;

// ── 3. Update handlePasteImport Splitting ──
const oldPasteSplit = `      const rows = pasteText.trim().split(/\\r?\\n/).map(row => row.split('\\t'));`;
const newPasteSplit = `      const rows = pasteText.trim().split(/\\r?\\n/).map(row => {
        return row.includes('\\t') ? row.split('\\t') : row.split(/ {2,}/);
      });`;

// ── 4. Update handlePasteImport Fallbacks ──
const oldPasteFallbacks = `      // Fallbacks
      if (siteDateIdx === -1) siteDateIdx = 0;
      if (stickerIdx === -1) stickerIdx = 1;
      if (modelIdx === -1) modelIdx = 2;
      if (imeiIdx === -1) imeiIdx = 3;
      if (colorIdx === -1) colorIdx = 4;
      if (isSoldIdx === -1) isSoldIdx = 5;
      if (locationIdx === -1) locationIdx = 6;
      if (batteryIdx === -1) batteryIdx = 7;
      if (purchaseCostIdx === -1) purchaseCostIdx = 8;
      if (saleDateIdx === -1) saleDateIdx = 99;
      if (sellerIdx === -1) sellerIdx = 99;
      if (notesIdx === -1) notesIdx = 99;
      if (sellingPriceIdx === -1) sellingPriceIdx = 99;
      if (marketPriceIdx === -1) marketPriceIdx = 99;`;

const newPasteFallbacks = `      // Fallbacks (Dynamic based on column count if no header detected)
      const firstRowLength = rows[startIdx] ? rows[startIdx].length : 0;
      if (siteDateIdx === -1) siteDateIdx = 0;
      if (stickerIdx === -1) stickerIdx = 1;
      if (modelIdx === -1) modelIdx = 2;
      if (imeiIdx === -1) imeiIdx = 3;
      if (colorIdx === -1) colorIdx = 4;
      if (isSoldIdx === -1) isSoldIdx = 5;
      if (locationIdx === -1) locationIdx = 6;
      if (batteryIdx === -1) {
        batteryIdx = (firstRowLength <= 8) ? 99 : 7;
      }
      if (purchaseCostIdx === -1) {
        purchaseCostIdx = (firstRowLength <= 8) ? 7 : 8;
      }
      if (saleDateIdx === -1) saleDateIdx = 99;
      if (sellerIdx === -1) sellerIdx = 99;
      if (notesIdx === -1) notesIdx = 99;
      if (sellingPriceIdx === -1) sellingPriceIdx = 99;
      if (marketPriceIdx === -1) marketPriceIdx = 99;`;

// ── 5. Clean battery parsing in handlePasteImport ──
const oldPasteBattery = `        const battery = row[batteryIdx] ? row[batteryIdx].trim() : '100';`;
const newPasteBattery = `        const batteryClean = row[batteryIdx] ? row[batteryIdx].trim().replace(/[^\\d]/g, '') : '100';
        const battery = batteryClean || '100';`;

let success = true;

const replaceText = (oldText, newText) => {
  if (content.includes(oldText)) {
    content = content.replace(oldText, newText);
    return true;
  }
  return false;
};

if (replaceText(oldCSVFallbacks, newCSVFallbacks)) {
  console.log('1. ✅ Updated CSV fallbacks mapping');
} else {
  console.log('1. ❌ Failed to update CSV fallbacks mapping');
  success = false;
}

if (replaceText(oldCSVBattery, newCSVBattery)) {
  console.log('2. ✅ Updated CSV battery cleaning');
} else {
  console.log('2. ❌ Failed to update CSV battery cleaning');
  success = false;
}

if (replaceText(oldPasteSplit, newPasteSplit)) {
  console.log('3. ✅ Updated paste split mechanism');
} else {
  console.log('3. ❌ Failed to update paste split mechanism');
  success = false;
}

if (replaceText(oldPasteFallbacks, newPasteFallbacks)) {
  console.log('4. ✅ Updated paste fallbacks mapping');
} else {
  console.log('4. ❌ Failed to update paste fallbacks mapping');
  success = false;
}

if (replaceText(oldPasteBattery, newPasteBattery)) {
  console.log('5. ✅ Updated paste battery cleaning');
} else {
  console.log('5. ❌ Failed to update paste battery cleaning');
  success = false;
}

if (success) {
  const finalContent = content.replace(/\n/g, '\r\n');
  fs.writeFileSync('src/app/staff/dashboard/page.tsx', finalContent, 'utf8');
  console.log('🎉 Bulk Ingestion improvements applied successfully!');
} else {
  console.log('⚠️ Aborted. Please check the mismatches.');
}
