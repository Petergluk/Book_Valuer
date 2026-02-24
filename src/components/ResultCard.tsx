import React, { useState, useCallback } from 'react';
import { BookAnalysisResult } from '../types';
import { CopyIcon, CheckIcon } from './icons/CopyIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { ShareIcon } from './icons/ShareIcon';

interface ResultCardProps {
  result: BookAnalysisResult;
  onReset: () => void;
}

const copyToClipboard = (text: string) => {
  return navigator.clipboard.writeText(text);
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">{title}</h3>
        {children}
    </div>
);

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        copyToClipboard(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [textToCopy]);

    return (
        <button onClick={handleCopy} className="absolute top-2 right-2 p-2 text-slate-400 hover:text-indigo-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
        </button>
    );
};

const BookDetailsSection: React.FC<{details: BookAnalysisResult['bookDetails']}> = ({ details }) => {
    const detailItems = [
        { label: 'Издательство', value: details.publisher },
        { label: 'Год издания', value: details.year },
        { label: 'Жанр', value: details.genre },
        { label: 'Тираж', value: details.circulation },
        { label: 'Страниц', value: details.pageCount },
        { label: 'Формат', value: details.format },
        { label: 'ISBN', value: details.isbn },
    ];

    return (
        <Section title="Детали книги">
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                {detailItems.filter(item => item.value).map(item => (
                    <li key={item.label}><strong>{item.label}:</strong> {item.value}</li>
                ))}
            </ul>
        </Section>
    );
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onReset }) => {
  const { bookDetails, priceAnalysis, adContent } = result;
  const [shareFeedback, setShareFeedback] = useState<string>('');
  
  const handleShare = async () => {
    const shareText = `${adContent.title}\n\n${adContent.description.replace(/\\n/g, '\n')}`;
    if (navigator.share) {
        try {
            await navigator.share({
                title: `Объявление: ${adContent.title}`,
                text: shareText,
            });
        } catch (error) {
            console.error('Ошибка при попытке поделиться:', error);
        }
    } else {
        await copyToClipboard(shareText);
        setShareFeedback('Объявление скопировано!');
        setTimeout(() => setShareFeedback(''), 2000);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 sm:p-8 space-y-8 animate-fade-in">
        
        <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">{bookDetails.title}</h2>
            <p className="text-md text-slate-500 dark:text-slate-400 mt-1">{bookDetails.author}</p>
        </div>

        <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-lg text-center space-y-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Рекомендуемая цена</p>
                <p className="text-5xl font-bold text-slate-800 dark:text-white mt-1">{priceAnalysis.suggestedPrice} ₽</p>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Предполагаемый коридор цен: {priceAnalysis.min_price} ₽ ↔ {priceAnalysis.max_price} ₽
              </p>
              <a
                href={priceAnalysis.findbookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Поиск на FindBook.ru
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                     <BookDetailsSection details={bookDetails} />
                </div>
                 <div className="space-y-6">
                    <Section title="Готовое объявление">
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Заголовок</label>
                                <p className="text-sm p-3 pr-12 bg-slate-50 dark:bg-slate-800 rounded-md mt-1">{adContent.title}</p>
                                <CopyButton textToCopy={adContent.title} />
                            </div>
                             <div className="relative">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Описание</label>
                                <textarea readOnly value={adContent.description.replace(/\\n/g, '\n')} className="w-full text-sm p-3 pr-12 bg-slate-50 dark:bg-slate-800 rounded-md mt-1 h-48 resize-y border-none"></textarea>
                                <CopyButton textToCopy={adContent.description.replace(/\\n/g, '\n')} />
                            </div>
                        </div>
                    </Section>
                </div>
            </div>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <button
                    onClick={onReset}
                    className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                >
                    Оценить другую книгу
                </button>
                 <button
                    onClick={handleShare}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-semibold rounded-lg shadow-md hover:bg-slate-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all flex items-center justify-center gap-2"
                >
                    <ShareIcon className="w-5 h-5" />
                    <span>Поделиться</span>
                </button>
            </div>
             {shareFeedback && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-4 animate-fade-in">{shareFeedback}</p>
            )}
        </div>
    </div>
  );
};
