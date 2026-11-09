import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

function parseHeaders(headerLine) {
  const headers = headerLine.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
  const mapping = {};
  headers.forEach((h, i) => {
    mapping[h] = i;
  });
  return mapping;
}

function parseRecord(line, headers) {
  const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));

  console.log('  Parsing record, columns:', cols.length);
  console.log('  headers.OFFTYP:', headers.OFFTYP);
  console.log('  cols[40]:', cols[40]);
  console.log('  cols[headers.OFFTYP]:', cols[headers.OFFTYP]);

  const offenseCode = cols[headers.OFFTYP] || '';
  console.log('  offenseCode:', offenseCode);

  return { offenseCode };
}

const fileStream = createReadStream('./data/ussc_commission_datafiles/fy2024/opafy24.csv');
const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

let headers = null;
let isFirstLine = true;
let count = 0;

rl.on('line', (line) => {
  if (isFirstLine) {
    console.log('First line raw:', JSON.stringify(line.substring(0, 100)));
    console.log('First line length:', line.length);
    headers = parseHeaders(line);
    console.log('Headers parsed');
    console.log('  headers.OFFTYP:', headers.OFFTYP);
    console.log('  headers[\'OFFTYPE\']:', headers['OFFTYPE']);
    console.log('  Header keys count:', Object.keys(headers).length);
    const offKey = Object.keys(headers).find(k => k.includes('OFFT'));
    console.log('  OFFT key found:', JSON.stringify(offKey));
    console.log('  Key length:', offKey ? offKey.length : 'N/A');
    console.log('  Key chars:', offKey ? [...offKey].map(c => c.charCodeAt(0)) : 'N/A');
    isFirstLine = false;
    return;
  }

  if (!line.trim()) return;
  if (count++ >= 3) return; // Only parse first 3 data rows

  console.log('\nParsing data row', count);
  const record = parseRecord(line, headers);
  console.log('Result:', record);
});

rl.on('close', () => {
  console.log('\nDone');
});
