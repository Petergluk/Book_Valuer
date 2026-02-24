export enum AppStatus {
  Idle = 'idle',
  Analyzing = 'analyzing',
  Success = 'success',
  Error = 'error',
}

export interface BookDetails {
  title: string;
  author: string;
  year: string;
  publisher: string;
  isbn?: string;
  genre?: string;
  circulation?: string;
  pageCount?: number;
  format?: string;
}

export interface PriceAnalysis {
  suggestedPrice: number;
  min_price: number;
  max_price: number;
  findbookUrl: string;
}

export interface AdContent {
  title: string;
  description: string;
}

export interface BookAnalysisResult {
  bookDetails: BookDetails;
  priceAnalysis: PriceAnalysis;
  adContent: AdContent;
}

export type Theme = 'light' | 'dark' | 'system';

export interface AppSettings {
  theme: Theme;
  model: string;
  prompt: string;
}

export interface HistoryEntry {
  id: string;
  result: BookAnalysisResult;
  images: string[];
  timestamp: number;
}
