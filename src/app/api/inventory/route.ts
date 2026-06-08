import { NextResponse } from 'next/server';

function parseCSV(t: string): string[][] {
  const r: string[][] = [];
  let cur: string[] = [];
  let f = '';
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i], n = t[i + 1];
    if (c === '"') {
      if (q && n === '"') {
        f += '"';
        i++;
      } else {
        q = !q;
      }
    } else if (c === ',' && !q) {
      cur.push(f);
      f = '';
    } else if ((c === '\r' || c === '\n') && !q) {
      if (c === '\r' && n === '\n') i++;
      cur.push(f);
      r.push(cur);
      cur = [];
      f = '';
    } else {
      f += c;
    }
  }
  if (f || cur.length) {
    cur.push(f);
    r.push(cur);
  }
  return r;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    const url = 'https://docs.google.com/spreadsheets/d/1NpSAZNB9xb0pYZxs5sKp9hxXQraMPXcpxWyhUO2o4DM/export?format=csv&gid=1052362499';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv; charset=utf-8',
      },
      next: { revalidate: 60 } // cache for 1 minute for faster staff synchronizations
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return NextResponse.json([]);
    }

    // Detect header row by scanning the first few rows for IMEI column
    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(rows.length, 6); r++) {
      const row = rows[r];
      const hasImei = row.some(cell => cell && cell.toLowerCase().replace(/\s+/g, '').includes('imei'));
      if (hasImei) {
        headerRowIdx = r;
        break;
      }
    }

    const headerRow = rows[headerRowIdx];

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

    // First pass for exact or strong matches
    headerRow.forEach((cell, idx) => {
      const clean = cell.toLowerCase().replace(/\s+/g, '');
      if (clean.includes('입고날짜') || clean.includes('sitedate') || (clean.includes('date') && clean.includes('site'))) {
        siteDateIdx = idx;
      } else if (clean.includes('판매날짜') || clean.includes('saledate') || (clean.includes('date') && clean.includes('sale'))) {
        saleDateIdx = idx;
      } else if (clean.includes('스티커') || clean.includes('sticker') || clean.includes('serial')) {
        stickerIdx = idx;
      } else if (clean.includes('modelname') || clean.includes('모델명') || (clean.includes('model') && !clean.includes('price'))) {
        modelIdx = idx;
      } else if (clean === 'imei' || clean.includes('imei')) {
        imeiIdx = idx;
      } else if (clean.includes('color') || clean.includes('색상')) {
        colorIdx = idx;
      } else if (clean.includes('ขายแล้ว') || clean.includes('issold') || clean.includes('판매여부')) {
        isSoldIdx = idx;
      } else if (clean.includes('location') || clean.includes('stocklocation') || clean.includes('위치')) {
        locationIdx = idx;
      } else if (clean.includes('battery') || clean.includes('배터리')) {
        batteryIdx = idx;
      } else if (clean.includes('คนขาย') || clean.includes('seller') || clean.includes('판매자') || clean.includes('판매사원')) {
        sellerIdx = idx;
      } else if (clean.includes('notes') || clean.includes('note') || clean.includes('비고')) {
        notesIdx = idx;
      } else if (clean.includes('매입원가') || clean.includes('매입') || clean.includes('입고금액') || clean.includes('입고가') || clean.includes('purchasecost') || (clean.includes('cost') && clean.includes('krw'))) {
        purchaseCostIdx = idx;
      } else if (clean.includes('selligprice(b+') || (clean.includes('sellingprice') && !clean.includes('도매') && !clean.includes('마진'))) {
        sellingPriceIdx = idx;
      } else if (clean.includes('marketprice') || clean === 'market' || (clean.includes('market') && !clean.includes('cost'))) {
        marketPriceIdx = idx;
      }
    });

    // Second pass for looser matches
    headerRow.forEach((cell, idx) => {
      const clean = cell.toLowerCase().replace(/\s+/g, '');
      if (sellingPriceIdx === -1 && (clean === 'price' || clean.includes('sellingprice') || clean.includes('판매가') || clean.includes('소매가'))) {
        sellingPriceIdx = idx;
      }
      if (marketPriceIdx === -1 && (clean.includes('도매가격') || (clean.includes('도매') && !clean.includes('마진') && !clean.includes('수수료')))) {
        marketPriceIdx = idx;
      }
    });

    // Fallbacks to default spreadsheet index positions
    if (siteDateIdx === -1) siteDateIdx = 0;
    if (saleDateIdx === -1) saleDateIdx = 1;
    if (stickerIdx === -1) stickerIdx = 3;
    if (modelIdx === -1) modelIdx = 4;
    if (imeiIdx === -1) imeiIdx = 5;
    if (colorIdx === -1) colorIdx = 6;
    if (isSoldIdx === -1) isSoldIdx = 7;
    if (locationIdx === -1) locationIdx = 8;
    if (batteryIdx === -1) batteryIdx = 9;
    if (sellerIdx === -1) sellerIdx = 10;
    if (notesIdx === -1) notesIdx = 11;
    if (sellingPriceIdx === -1) sellingPriceIdx = 15;
    if (marketPriceIdx === -1) marketPriceIdx = 16;
    if (purchaseCostIdx === -1) purchaseCostIdx = 18;

    const inventory = [];

    // Parse data rows starting after header row
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length <= imeiIdx) continue;

      // Filter: only load rows that have sticker data
      const serialNo = row[stickerIdx] ? row[stickerIdx].trim() : '';
      if (!serialNo) {
        continue;
      }

      let imei = row[imeiIdx] ? row[imeiIdx].trim().replace(/\s+/g, '') : '';

      // Fallback: If IMEI is empty but sticker exists, use sticker as temporary IMEI
      if (!imei && serialNo) {
        imei = serialNo.replace(/\s+/g, '');
      }

      // Skip header or invalid rows
      if (!imei || imei.toLowerCase() === 'imei' || imei.toLowerCase() === 'imei/serial' || imei.length < 4) {
        continue;
      }

      // Check if item is already sold
      const isSoldStr = row[isSoldIdx] ? row[isSoldIdx].trim().toUpperCase() : 'FALSE';
      const isSold = isSoldStr === 'TRUE' || isSoldStr === 'YES' || isSoldStr === '예' || isSoldStr === '1';

      if (isSold && !all) {
        continue;
      }

      const model = row[modelIdx] ? row[modelIdx].trim() : '';
      const color = row[colorIdx] ? row[colorIdx].trim() : '';
      const battery = row[batteryIdx] ? row[batteryIdx].trim() : '100';
      const location = row[locationIdx] ? row[locationIdx].trim() : 'Shop';
      const seller = row[sellerIdx] ? row[sellerIdx].trim() : '';
      const notes = row[notesIdx] ? row[notesIdx].trim() : '';
      const saleDate = row[saleDateIdx] ? row[saleDateIdx].trim() : '';
      const siteDate = row[siteDateIdx] ? row[siteDateIdx].trim() : '';
      
      const priceStr = row[sellingPriceIdx] ? row[sellingPriceIdx].trim() : '';
      const priceVal = parseInt(priceStr.replace(/[^\d]/g, '')) || 0;

      const marketPriceStr = row[marketPriceIdx] ? row[marketPriceIdx].trim() : '';
      const marketPriceVal = parseInt(marketPriceStr.replace(/[^\d]/g, '')) || 0;

      const costStr = row[purchaseCostIdx] ? row[purchaseCostIdx].trim() : '';
      const costVal = parseInt(costStr.replace(/[^\d]/g, '')) || 0;

      inventory.push({
        serialNo,
        model,
        imei,
        color,
        price: priceVal,
        isSold,
        battery,
        location,
        seller,
        notes,
        saleDate,
        siteDate,
        marketPrice: marketPriceVal,
        purchaseCost: costVal
      });
    }

    return NextResponse.json(inventory);
  } catch (error: any) {
    console.error('Error fetching sheets inventory:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
