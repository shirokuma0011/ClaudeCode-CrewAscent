import fs from 'node:fs';

const previous = ['v=20260817b', 'v=20260817f', 'v=20260817g', 'v=20260817h'];
const current = 'v=20260817i';
const htmlFiles = fs.readdirSync('.').filter((file) => file.endsWith('.html'));

let changed = 0;
for (const file of htmlFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (!previous.some((version) => source.includes(version))) continue;
  let updated = source;
  for (const version of previous) updated = updated.replaceAll(version, current);
  fs.writeFileSync(file, updated, 'utf8');
  changed += 1;
}

console.log(changed ? `updated ${changed} HTML files` : `already using ${current}`);
