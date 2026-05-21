import staticData from '../full_data.json';

export interface BusData {
  id: string;
  title: string;
  date: string;
  url: string;
  category: string;
  content: string;
}

export const getBusData = (): BusData[] => {
  return staticData as BusData[];
};

