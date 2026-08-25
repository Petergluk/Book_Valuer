import React, { useState } from 'react';
import { AppSettings } from '../types';

interface SettingsScreenProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings, onSave, onBack }) => {
  const [currentSettings, setCurrentSettings] = useState<AppSettings>(settings);

  const handleSave = () => {
    onSave(currentSettings);
    onBack();
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentSettings(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div 
        onClick={onBack} 
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
        aria-modal="true"
        role="dialog"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 sm:p-8 space-y-6 flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              Настройки
            </h2>
            <button onClick={onBack} aria-label="Закрыть" className="p-2 -mr-2 rounded-full text-2xl leading-none hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">&times;</button>
        </div>
        
        <div className="space-y-6 flex-grow overflow-y-auto pr-2">
            <div className="space-y-2">
                <label htmlFor="theme-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Тема оформления
                </label>
                <select
                  id="theme-select"
                  name="theme"
                  value={currentSettings.theme}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="system">Системная</option>
                  <option value="light">Светлая</option>
                  <option value="dark">Темная</option>
                </select>
            </div>
            
            <div className="space-y-2">
                <label htmlFor="model-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Модель Gemini
                </label>
                <select
                  id="model-select"
                  name="model"
                  value={currentSettings.model}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (Рекомендуется)</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Высокое качество)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400">Модели Gemini 3-й серии лучше справляются со сложной структурой данных.</p>
            </div>
            
             <div className="space-y-2">
                <label htmlFor="prompt-textarea" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Шаблон промпта (User Prompt)
                </label>
                <textarea
                  id="prompt-textarea"
                  name="prompt"
                  rows={8}
                  value={currentSettings.prompt}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm text-slate-900 dark:text-white"
                />
                 <p className="text-xs text-slate-500 dark:text-slate-400">Используйте <code>{'{{condition}}'}</code> для подстановки состояния книги.</p>
            </div>
        </div>
        
        <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
                onClick={handleSave}
                className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
                Сохранить
            </button>
        </div>
      </div>
    </div>
  );
};