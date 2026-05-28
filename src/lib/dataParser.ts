import fullData from '../full_data.json';

export interface BusData {
  id: string;
  title: string;
  date: string;
  url: string;
  category: string;
  content: string;
}

export const getBusData = (): BusData[] => {
  return fullData.map((row: any, index: number) => ({
    id: row.id || `${index}`,
    title: row.title || '',
    date: row.date || '',
    url: row.url || '',
    category: row.category || '',
    content: row.content || ''
  }));
};

