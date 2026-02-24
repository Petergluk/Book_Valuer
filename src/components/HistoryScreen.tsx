
import React from 'react';
import { HistoryEntry } from '../types';

interface HistoryScreenProps {
  history: HistoryEntry[];
  onViewItem: (item: HistoryEntry) => void;
  onBack: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ history, onViewItem, onBack }) => {
  return (
    <div 
        onClick={onBack} 
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
        aria-modal="true"
        role="dialog"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 sm:p-8 space-y-6 flex flex-col"
      >
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-4">
          История оценок
        </h2>

        {history.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">История пока пуста. Оцените свою первую книгу!</p>
        ) : (
          <ul className="space-y-4 flex-grow overflow-y-auto max-h-[70vh] pr-2">
            {history.map((item) => (
              <li key={item.id}>
                <button onClick={() => onViewItem(item)} className="w-full text-left flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <img src={item.images[0]} alt="Book cover" className="w-16 h-20 object-cover rounded-md flex-shrink-0 bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-grow overflow-hidden">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.result.bookDetails.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{item.result.bookDetails.author}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(item.timestamp).toLocaleString('ru-RU')} &bull; <span className="font-semibold">{item.result.priceAnalysis.suggestedPrice} ₽</span>
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
