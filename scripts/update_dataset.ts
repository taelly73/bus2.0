import fs from 'fs';
import Papa from 'papaparse';

try {
  let rawStr1 = fs.readFileSync('src/data.csv.ts', 'utf-8');
  let rawStr2 = fs.readFileSync('src/data_part2.ts', 'utf-8');
  let csvContent1 = '';
  let csvContent2 = '';
  
  const extractContent = (raw: string) => {
    const startIdx = raw.indexOf('`');
    const endIdx = raw.lastIndexOf('`');
    return (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) ? raw.substring(startIdx + 1, endIdx) : raw;
  };
  
  csvContent1 = extractContent(rawStr1);
  csvContent2 = extractContent(rawStr2);
  
  const combinedCsv = csvContent1.trim() + '\n' + csvContent2.trim();

  const parsed = Papa.parse(combinedCsv, { header: true, skipEmptyLines: true });
  
  const data = parsed.data.filter((item: any) => item.title).map((item: any, index: number) => ({
    id: String(index + 1),
    title: item.title || '',
    date: item.date || '',
    url: item.url || '',
    category: item.category || '',
    content: item.content || ''
  }));

  // Write to src/full_data.json
  fs.writeFileSync('src/full_data.json', JSON.stringify(data, null, 2));

  // Generate markdown for src/data.ts
  const grouped: Record<string, any[]> = data.reduce((acc: any, curr: any) => {
    const cat = curr.category || '未分类';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {});

  let md = '# 北京公交公告分类汇总\n\n';
  for (const [cat, items] of Object.entries(grouped)) {
    md += `## ${cat} (${items.length}条)\n\n`;
    for (const item of items) {
      md += `- **${item.title}** (${item.date})\n  [查看详情](${item.url})\n\n`;
    }
  }

  const dsContent = `export const rawMarkdown = \`\n${md.replace(/`/g, '\\`')}\`;\n`;
  fs.writeFileSync('src/data.ts', dsContent);
  console.log('Successfully updated full_data.json and data.ts. Parsed ' + data.length + ' items.');

} catch (err) {
  console.error('Error updating dataset:', err);
}
