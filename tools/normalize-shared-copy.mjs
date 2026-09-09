import fs from 'node:fs';

const replacements = [
  [
    '2軸 × 6段階で36通り。事業で何を優先するかを整理するための、無料の入口です。',
    '2軸 × 6段階で36通り。Webサイトで何を優先するかを整理するための、無料の入口です。',
  ],
  [
    '「好きなデザイン」ではなく、「事業で何を優先するか」を四つに分けて聞きます。',
    '「好きなデザイン」だけでなく、「Webサイトで何を優先するか」を四つに分けて聞きます。',
  ],
];

let changed = 0;
for (const file of fs.readdirSync('.').filter((name) => name.endsWith('.html'))) {
  let source = fs.readFileSync(file, 'utf8');
  const before = source;
  for (const [oldCopy, newCopy] of replacements) source = source.replaceAll(oldCopy, newCopy);
  if (source === before) continue;
  fs.writeFileSync(file, source, 'utf8');
  changed += 1;
}

console.log(changed ? `updated ${changed} HTML files` : 'shared copy already normalized');
