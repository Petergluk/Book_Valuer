import React from 'react';
import { BookIcon } from './icons/BookIcon';
import { SettingsIcon } from './icons/SettingsIcon';

interface HeaderProps {
    onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  return (
    <header className="w-full bg-white dark:bg-slate-900 shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
            <BookIcon className="w-8 h-8 text-indigo-500" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Оценщик книг для <span className="text-indigo-500">Авито</span>
            </h1>
        </div>
        <button
            onClick={onSettingsClick}
            aria-label="Настройки"
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
            <SettingsIcon className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};
