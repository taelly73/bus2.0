import { rawMarkdown } from '../data';

export interface BusData {
  id: string;
  title: string;
  date: string;
  url: string;
  category: string;
  content: string;
}

export const getBusData = (): BusData[] => {
  const lines = rawMarkdown.split('\n');
  const results: BusData[] = [];
  let currentCategory = '';
  let currentItem: Partial<BusData> | null = null;
  let idCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('## ')) {
      currentCategory = line.substring(3).split(' ')[0]; // e.g. "临时运营"
    } else if (line.startsWith('- **')) {
      const dateMatch = line.match(/- \*\*(.*?)\*\* \((.*?)\)/);
      if (dateMatch) {
        currentItem = {
          id: String(idCounter++),
          title: dateMatch[1],
          date: dateMatch[2],
          category: currentCategory,
          content: '',
        };
      } else {
        const titleMatch = line.match(/- \*\*(.*?)\*\*/);
        if (titleMatch) {
          currentItem = {
            id: String(idCounter++),
            title: titleMatch[1],
            date: '',
            category: currentCategory,
            content: '',
          };
        }
      }
    } else if (line.startsWith('[') && line.includes('](')) {
      const urlMatch = line.match(/\[.*?\]\((.*?)\)/);
      if (urlMatch && currentItem) {
        currentItem.url = urlMatch[1];
        results.push(currentItem as BusData);
        currentItem = null;
      }
    }
  }
  
  return results;
};
