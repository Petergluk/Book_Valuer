
import React, { useState } from 'react';
import { HistoryEntry } from '../types';

interface HistoryScreenProps {
  history: HistoryEntry[];
  onViewItem: (item: HistoryEntry) => void;
  onBack: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ history, onViewItem, onBack }) => {
  const [isClosing, setIsClosing] = useState(false);

  // Handle slide out animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onBack, 300); // Wait for animation
  };

  const exportToMarkdown = () => {
    let mdContent = '# История оценок книг\n\n';
    history.forEach(item => {
      mdContent += `## ${item.result.bookDetails.title}\n`;
      mdContent += `**Автор:** ${item.result.bookDetails.author}\n`;
      mdContent += `**Год:** ${item.result.bookDetails.year}\n`;
      mdContent += `**Издательство:** ${item.result.bookDetails.publisher}\n`;
      mdContent += `**Оценка:** ${item.result.priceAnalysis.suggestedPrice} ₽ (от ${item.result.priceAnalysis.min_price} ₽ до ${item.result.priceAnalysis.max_price} ₽)\n`;
      mdContent += `**Дата оценки:** ${new Date(item.timestamp).toLocaleString('ru-RU')}\n\n`;
      mdContent += `### Текст объявления\n**Заголовок:** ${item.result.adContent.title}\n\n${item.result.adContent.description}\n\n`;
      mdContent += `---\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `avito-book-valuer-history-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
        onClick={handleClose} 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        aria-modal="true"
        role="dialog"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className={`absolute top-0 left-0 w-full sm:w-96 h-full bg-white dark:bg-slate-900 shadow-xl flex flex-col transition-transform duration-300 ${isClosing ? '-translate-x-full' : 'translate-x-0'}`}
      >
        <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            История
          </h2>
          <div className="flex gap-2">
            <button
              onClick={exportToMarkdown}
              disabled={history.length === 0}
              className="text-sm px-3 py-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Экспорт .md
            </button>
            <button onClick={handleClose} className="p-2 -mr-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8 px-6">История пока пуста. Оцените свою первую книгу!</p>
        ) : (
          <ul className="flex-grow overflow-y-auto p-4 space-y-3">
            {history.map((item) => (
              <li key={item.id}>
                <button onClick={() => onViewItem(item)} className="w-full text-left flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]} alt="Book cover" className="w-14 h-16 object-cover rounded flex-shrink-0 bg-slate-200 dark:bg-slate-700" />
                  ) : (
                    <div className="w-14 h-16 rounded flex-shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[10px] text-center border border-slate-200 dark:border-slate-700">Нет фото</div>
                  )}
                  <div className="flex-grow overflow-hidden pt-0.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{item.result.bookDetails.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">{item.result.bookDetails.author}</p>
                    <div className="flex items-center justify-between mt-2">
                       <span className="text-[11px] text-slate-400 dark:text-slate-500">{new Date(item.timestamp).toLocaleDateString('ru-RU')}</span>
                       <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{item.result.priceAnalysis.suggestedPrice} ₽</span>
                    </div>
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
