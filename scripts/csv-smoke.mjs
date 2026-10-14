import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result = await build({ entryPoints: ['src/lib/csv.ts'], bundle: true, write: false, format: 'cjs', platform: 'node' });
const module = { exports: {} };
new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
const { serializeCsv } = module.exports;
function parse(csv) {
  const rows = [], row = [];
  let field = '', quoted = false;
  for (let i = 1; i < csv.length; i++) {
    const character = csv[i];
    if (character === '"') {
      if (quoted && csv[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && character === ',') { row.push(field); field = ''; }
    else if (!quoted && character === '\r' && csv[i + 1] === '\n') { row.push(field); rows.push([...row]); row.length = 0; field = ''; i++; }
    else field += character;
  }
  assert.equal(quoted, false);
  row.push(field); rows.push(row);
  return rows;
}
const dangerous = ['=1+2', '+SUM(A1)', '-1+2', '@SUM(A1)', '\t=1+2', '\r=1+2', '\n=1+2', '   =1+2', '\uFEFF=1+2', '＝1+2', '＋1+2', '－1+2', '＠SUM(A1)', '=1+2";=1+2'];
const safe = ['Aditya', 'Nadía', 'comma,name', 'quoted "name"', 'two\nlines', 'a,\"=1+2', 'ordinary - name'];
const data = [['Name', 'Value'], ...dangerous.map(value => [value, 10]), ...safe.map(value => [value, -2]), [null, undefined], [false, 0]];
const csv = serializeCsv(data);
assert.equal(csv.charCodeAt(0), 0xfeff, 'UTF-8 BOM assists spreadsheet decoding');
const parsed = parse(csv);
assert.equal(parsed.length, data.length, 'Quoted separators/newlines cannot create records');
assert.ok(parsed.every(row => row.length === 2), 'Quoted text cannot create extra cells');
dangerous.forEach((value, index) => assert.equal(parsed[index + 1][0], '\t' + value));
safe.forEach((value, index) => assert.equal(parsed[index + 1 + dangerous.length][0], value));
assert.equal(parsed[1 + dangerous.length][1], '-2', 'Trusted numeric values remain numeric strings');
assert.deepEqual(parsed.at(-2), ['', '']);
assert.deepEqual(parsed.at(-1), ['false', '0']);
assert.throws(() => serializeCsv([[Infinity]]), /finite/);
console.log('CSV checks passed: formula/control/full-width prefixes, Unicode, separators, quoted/multiline fields, numeric values and UTF-8.');
