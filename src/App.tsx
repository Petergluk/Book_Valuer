import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { LoadingIndicator } from './components/LoadingIndicator';
import { ResultCard } from './components/ResultCard';
import { analyzeBookImage, DEFAULT_PROMPT_TEMPLATE } from './services/geminiService';
import { AppStatus, BookAnalysisResult, AppSettings, HistoryEntry } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { SettingsScreen } from './components/SettingsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { Footer } from './components/Footer';

const defaultSettings: AppSettings = {
  theme: 'dark',
  model: 'gemini-3.7-flash',
  prompt: DEFAULT_PROMPT_TEMPLATE,
};

type ViewState = 'main' | 'history' | 'settings';

const App: React.FC = () => {
  const [settings, setSettings] = useLocalStorage<AppSettings>('bookValuerSettings', defaultSettings);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>('bookValuerHistory', []);
  const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
  const [currentResult, setCurrentResult] = useState<BookAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Routing Logic ---

  const getHashView = (): ViewState => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash === 'settings' || hash === 'history') return hash;
    return 'main';
  };

  const [view, setView] = useState<ViewState>(getHashView);

  useEffect(() => {
    const handleHashChange = () => {
      setView(getHashView());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (newView: ViewState) => {
    if (newView === 'main') {
        // Clear hash to go to main view
        window.location.hash = '';
    } else {
        window.location.hash = newView;
    }
  };

  // --- Theme Logic ---

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
  }, [settings.theme]);

  // --- Actions ---

  const handleImageAnalysis = useCallback(async (files: File[], condition: string, comment: string) => {
    setStatus(AppStatus.Analyzing);
    setCurrentResult(null);
    setError(null);
    
    // Ensure we are on the main view
    if (view !== 'main') navigateTo('main');

    try {
      // Create a tiny thumbnail for history
      let thumbnailBase64 = '';
      if (files.length > 0) {
        thumbnailBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const maxSize = 100;
              let width = img.width;
              let height = img.height;
              if (width > height) {
                if (width > maxSize) {
                  height *= maxSize / width;
                  width = maxSize;
                }
              } else {
                if (height > maxSize) {
                  width *= maxSize / height;
                  height = maxSize;
                }
              }
              canvas.width = width;
              canvas.height = height;
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(files[0]);
        });
      }

      const result = await analyzeBookImage(files, condition, comment, settings.model, settings.prompt);

      const newHistoryEntry: HistoryEntry = {
        id: new Date().toISOString(),
        result,
        images: thumbnailBase64 ? [thumbnailBase64] : [], 
        timestamp: Date.now(),
      };
      setHistory(prevHistory => [newHistoryEntry, ...prevHistory].slice(0, 50));
      
      setCurrentResult(result);
      setStatus(AppStatus.Success);
    } catch (err: any) {
      setError(err.message || 'Произошла неизвестная ошибка.');
      setStatus(AppStatus.Error);
    }
  }, [settings, setHistory, view]);

  const handleReset = useCallback(() => {
    setStatus(AppStatus.Idle);
    setCurrentResult(null);
    setError(null);
  }, []);

  const viewHistoryItem = (item: HistoryEntry) => {
    setCurrentResult(item.result);
    setStatus(AppStatus.Success);
    navigateTo('main');
  };

  // --- Render ---

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
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200 transition-colors duration-200">
      <Header onHomeClick={() => navigateTo('main')} onSettingsClick={() => navigateTo('settings')} onHistoryClick={() => navigateTo('history')} />
      <main className="flex-grow container mx-auto px-4 py-8 sm:py-12 flex items-center justify-center">
        {renderMainView()}
      </main>
      <Footer onHistoryClick={() => navigateTo('history')} onSettingsClick={() => navigateTo('settings')} />

      {view === 'settings' && (
        <SettingsScreen 
          settings={settings} 
          onSave={setSettings} 
          onBack={() => navigateTo('main')} 
        />
      )}
      {view === 'history' && (
        <HistoryScreen 
          history={history} 
          onViewItem={viewHistoryItem} 
          onBack={() => navigateTo('main')} 
        />
      )}
    </div>
  );
};

export default App;