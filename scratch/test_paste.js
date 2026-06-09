const pastedText = `26. 5. 28	Swapmart0528-24	S22 Ultra 512G	351338912074951	GREEN	FALSE	Shop	₩297,700`;

const rows = pastedText.trim().split(/\r?\n/).map(row => row.split('\t'));

console.log('Number of rows:', rows.length);
console.log('Row 0 cells:', rows[0]);
console.log('Row 0 length:', rows[0].length);

// Detect header row by scanning first 6 rows for IMEI keyword
let headerRowIdx = 0;
let headerDetected = false;
for (let r = 0; r < Math.min(rows.length, 6); r++) {
  const row = rows[r];
  const hasImei = row.some(cell => cell && cell.toLowerCase().replace(/\s+/g, '').includes('imei'));
  if (hasImei) {
    headerRowIdx = r;
    headerDetected = true;
    break;
  }
}

console.log('Header detected:', headerDetected);

// Default indices mapping (fallbacks)
let siteDateIdx = -1;
let saleDateIdx = -1;
let stickerIdx = -1;
let modelIdx = -1;
let imeiIdx = -1;
let colorIdx = -1;
let isSoldIdx = -1;
let locationIdx = -1;
let batteryIdx = -1;
let sellerIdx = -1;
let notesIdx = -1;
let sellingPriceIdx = -1;
let marketPriceIdx = -1;
let purchaseCostIdx = -1;

// Fallbacks
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
if (marketPriceIdx === -1) marketPriceIdx = 99;

const records = [];
const startIdx = headerDetected ? headerRowIdx + 1 : 0;

for (let i = startIdx; i < rows.length; i++) {
  const row = rows[i];
  console.log(`Row ${i} length <= imeiIdx (${imeiIdx}):`, row.length <= imeiIdx);
  if (row.length <= imeiIdx) continue;

  const stickerNo = row[stickerIdx] ? row[stickerIdx].trim() : '';
  console.log(`Sticker No: "${stickerNo}"`);
  if (!stickerNo) {
    console.log('Skipping due to empty stickerNo');
    continue;
  }

  let rawImei = row[imeiIdx] ? row[imeiIdx].trim().replace(/\s+/g, '') : '';
  if (!rawImei && stickerNo) {
    rawImei = stickerNo.replace(/\s+/g, '');
  }

  console.log(`Raw IMEI: "${rawImei}"`);
  if (!rawImei || rawImei.toLowerCase() === 'imei' || rawImei.toLowerCase() === 'imei/serial' || rawImei.length < 4) {
    console.log('Skipping due to invalid IMEI');
    continue;
  }

  const siteD = row[siteDateIdx] ? row[siteDateIdx].trim() : '';
  const saleD = row[saleDateIdx] ? row[saleDateIdx].trim() : '';
  const model = row[modelIdx] ? row[modelIdx].trim() : '';
  const colorVal = row[colorIdx] ? row[colorIdx].trim() : '';
  const isSoldStr = row[isSoldIdx] ? row[isSoldIdx].trim().toUpperCase() : 'FALSE';
  const isSoldVal = isSoldStr === 'TRUE' || isSoldStr === 'YES' || isSoldStr === '예' || isSoldStr === '1';
  const loc = row[locationIdx] ? row[locationIdx].trim() : 'Shop';
  const battery = row[batteryIdx] ? row[batteryIdx].trim() : '100';
  const seller = row[sellerIdx] ? row[sellerIdx].trim() : '';
  const note = row[notesIdx] ? row[notesIdx].trim() : '';

  const sellingPriceVal = parseInt(row[sellingPriceIdx]?.replace(/[^\d]/g, '')) || 0;
  const marketPriceVal = parseInt(row[marketPriceIdx]?.replace(/[^\d]/g, '')) || 0;
  const purchaseCostVal = parseInt(row[purchaseCostIdx]?.replace(/[^\d]/g, '')) || 0;

  const newRecord = {
    site_date: siteD,
    sale_date: saleD,
    sticker: stickerNo,
    model_name: model,
    imei: rawImei,
    color: colorVal,
    is_sold: isSoldVal,
    stock_location: loc,
    battery_pct: battery,
    seller_name: seller,
    notes: note,
    selling_price: sellingPriceVal,
    market_price: marketPriceVal,
    purchase_cost_krw: purchaseCostVal
  };

  records.push(newRecord);
}

console.log('Resulting records parsed:', records);
