import React from 'react';

interface FooterProps {
    onHistoryClick: () => void;
    onSettingsClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onHistoryClick, onSettingsClick }) => {
  return (
    <footer className="w-full text-center py-4">
        <div className="flex justify-center items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>Создано с помощью AI</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <button onClick={onSettingsClick} className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">Настройки</button>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <button onClick={onHistoryClick} className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">История</button>
        </div>
    </footer>
  );
};
