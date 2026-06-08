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

    const url = 'https://docs.google.com/spreadsheets/d/1NpSAZNB9xb0pYZxs5sKp9hxXQraMPXcpxWyhUO2o4DM/export?format=csv';
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

    const inventory = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Row needs to have at least the IMEI column (index 5)
      if (row.length <= 6) continue;

      const imei = row[5] ? row[5].trim().replace(/\s+/g, '') : '';
      if (!imei || imei.toLowerCase() === 'imei' || isNaN(Number(imei.slice(0, 5)))) {
        // Skip header or invalid rows
        continue;
      }

      // Check if item is already sold (Index 7: 'ขาย แล้ว')
      const isSold = row[7] ? row[7].trim().toUpperCase() === 'TRUE' : false;
      if (isSold && !all) {
        continue;
      }

      const serialNo = row[3] ? row[3].trim() : '';
      const model = row[4] ? row[4].trim() : '';
      const color = row[6] ? row[6].trim() : '';
      const battery = row[9] ? row[9].trim() : '100';
      const location = row[8] ? row[8].trim() : 'Shop';
      const seller = row[10] ? row[10].trim() : '';
      const notes = row[11] ? row[11].trim() : '';
      const saleDate = row[1] ? row[1].trim() : '';
      const siteDate = row[0] ? row[0].trim() : '';
      
      // Parse price from index 15 (Column P: 'Sellig Price (B+,other)')
      const priceStr = row[15] ? row[15].trim() : '';
      const priceVal = parseInt(priceStr.replace(/[^\d]/g, '')) || 0;

      // Parse market price from index 16 (Column Q)
      const marketPriceStr = row[16] ? row[16].trim() : '';
      const marketPriceVal = parseInt(marketPriceStr.replace(/[^\d]/g, '')) || 0;

      // Parse KRW cost from index 18 (Column S)
      const costStr = row[18] ? row[18].trim() : '';
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
