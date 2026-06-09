const fs = require('fs');

let content = fs.readFileSync('src/app/staff/dashboard/page.tsx', 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

// ── 1. Update handlePasteImport Fallbacks ──
const oldPasteFallbacks = `      // Fallbacks (Dynamic based on column count if no header detected)
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

const newPasteFallbacks = `      // Fallbacks (Dynamic based on column count if no header detected)
      const pasteStartIdx = headerDetected ? headerRowIdx + 1 : 0;
      const firstRowLength = rows[pasteStartIdx] ? rows[pasteStartIdx].length : 0;
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

if (content.includes(oldPasteFallbacks)) {
  content = content.replace(oldPasteFallbacks, newPasteFallbacks);
  console.log('✅ Replaced paste fallbacks with fixed version');
  const finalContent = content.replace(/\n/g, '\r\n');
  fs.writeFileSync('src/app/staff/dashboard/page.tsx', finalContent, 'utf8');
} else {
  console.log('❌ Could not find target old paste fallbacks string');
}
