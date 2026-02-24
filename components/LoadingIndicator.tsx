import React from 'react';

const messages = [
  'Анализируем фотографии...',
  'Ищем детали книги в выходных данных...',
  'Сравниваем цены на похожие книги...',
  'Подбираем лучшее описание для объявления...',
  'Это может занять до минуты...',
];

export const LoadingIndicator: React.FC = () => {
  const [messageIndex, setMessageIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto text-center p-6 space-y-6">
      <div className="relative w-24 h-24 mx-auto">
        <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-indigo-500 border-l-indigo-500 border-b-indigo-500 rounded-full animate-spin"></div>
      </div>
      <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
        Идет оценка...
      </h2>
      <p className="text-slate-500 dark:text-slate-400 min-h-[2.5rem]">
        {messages[messageIndex]}
      </p>
    </div>
  );
};
