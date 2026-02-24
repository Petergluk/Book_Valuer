
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { LoadingIndicator } from './components/LoadingIndicator';
// FIX: Correctly import from the newly created component file
import { ResultCard } from './components/ResultCard';
// FIX: Correctly import from the newly created service file
import { analyzeBookImage, DEFAULT_PROMPT_TEMPLATE } from './services/geminiService';
// FIX: Correctly import from the newly created types file
import { AppStatus, BookAnalysisResult, AppSettings, HistoryEntry } from './types';
import useLocalStorage from './hooks/useLocalStorage';
// FIX: Correctly import from the newly created component file
import { SettingsScreen } from './components/SettingsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { Footer } from './components/Footer';

const defaultSettings: AppSettings = {
  theme: 'dark',
  model: 'gemini-2.5-flash',
  prompt: DEFAULT_PROMPT_TEMPLATE,
};

const App: React.FC = () => {
  const [settings, setSettings] = useLocalStorage<AppSettings>('bookValuerSettings', defaultSettings);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>('bookValuerHistory', []);
  const [view, setView] = useState<'main' | 'history' | 'settings'>('main');
  const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
  const [currentResult, setCurrentResult] = useState<BookAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
  }, [settings.theme]);

  const handleImageAnalysis = useCallback(async (files: File[], condition: string) => {
    setStatus(AppStatus.Analyzing);
    setCurrentResult(null);
    setError(null);
    setView('main');

    const imagePromises = files.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    }));

    try {
      const base64Images = await Promise.all(imagePromises);
      const result = await analyzeBookImage(files, condition, settings.model, settings.prompt);

      const newHistoryEntry: HistoryEntry = {
        id: new Date().toISOString(),
        result,
        images: base64Images,
        timestamp: Date.now(),
      };
      setHistory(prevHistory => [newHistoryEntry, ...prevHistory].slice(0, 10));
      
      setCurrentResult(result);
      setStatus(AppStatus.Success);
    } catch (err: any) {
      setError(err.message || 'Произошла неизвестная ошибка.');
      setStatus(AppStatus.Error);
    }
  }, [settings, setHistory]);

  const handleReset = useCallback(() => {
    setStatus(AppStatus.Idle);
    setCurrentResult(null);
    setError(null);
    setView('main');
  }, []);

  const viewHistoryItem = (item: HistoryEntry) => {
    setCurrentResult(item.result);
    setStatus(AppStatus.Success);
    setView('main');
  };

  const renderMainView = () => {
    switch (status) {
      case AppStatus.Analyzing:
        return <LoadingIndicator />;
      case AppStatus.Success:
        return currentResult ? <ResultCard result={currentResult} onReset={handleReset} /> : null;
      case AppStatus.Error:
        return (
          <div className="w-full max-w-lg mx-auto text-center p-6 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Ошибка</h3>
            <p className="text-red-700 dark:text-red-300 mt-2 mb-4">{error}</p>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
            >
              Попробовать снова
            </button>
          </div>
        );
      case AppStatus.Idle:
      default:
        return <ImageUploader onAnalyze={handleImageAnalysis} disabled={false} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <Header onSettingsClick={() => setView('settings')} />
      <main className="flex-grow container mx-auto px-4 py-8 sm:py-12 flex items-center justify-center">
        {renderMainView()}
      </main>
      <Footer onHistoryClick={() => setView('history')} onSettingsClick={() => setView('settings')} />

      {view === 'settings' && (
        <SettingsScreen 
          settings={settings} 
          onSave={setSettings} 
          onBack={() => setView('main')} 
        />
      )}
      {view === 'history' && (
        <HistoryScreen 
          history={history} 
          onViewItem={viewHistoryItem} 
          onBack={() => setView('main')} 
        />
      )}
    </div>
  );
};

export default App;
