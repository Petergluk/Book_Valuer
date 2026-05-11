import React, { useState, useRef, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { CameraIcon } from './icons/CameraIcon';
import { CameraModal } from './CameraModal';

interface ImageUploaderProps {
  onAnalyze: (files: File[], condition: string, comment: string) => void;
  disabled: boolean;
}

interface Thumbnail {
  id: string;
  file: File;
  previewUrl: string | null; // null while generating
}

const MAX_FILES = 5;
const THUMBNAIL_MAX_DIMENSION = 300; // max width/height for thumbnails in pixels

// --- Helper Components ---

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const Spinner: React.FC = () => (
    <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
);

// --- Thumbnail Generation Logic ---

const createThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > THUMBNAIL_MAX_DIMENSION) {
            height *= THUMBNAIL_MAX_DIMENSION / width;
            width = THUMBNAIL_MAX_DIMENSION;
          }
        } else {
          if (height > THUMBNAIL_MAX_DIMENSION) {
            width *= THUMBNAIL_MAX_DIMENSION / height;
            height = THUMBNAIL_MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); 
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onAnalyze, disabled }) => {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [condition, setCondition] = useState<string>('Хорошее');
  const [comment, setComment] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (rawFiles: FileList | File[] | null) => {
    if (!rawFiles) return;
    
    const newFilesArray = Array.isArray(rawFiles) ? rawFiles : Array.from(rawFiles);
    const acceptedFiles = newFilesArray.filter(file => file.type.startsWith('image/'));
    
    const uniqueNewFiles = acceptedFiles.filter(newFile => 
        !thumbnails.some(thumb => 
            thumb.file.name === newFile.name &&
            thumb.file.size === newFile.size &&
            thumb.file.lastModified === newFile.lastModified
        )
    );
    
    if (thumbnails.length + uniqueNewFiles.length > MAX_FILES) {
      alert(`Можно загрузить не более ${MAX_FILES} фотографий.`);
      const remainingSlots = MAX_FILES - thumbnails.length;
      uniqueNewFiles.splice(remainingSlots);
    }
    
    if (uniqueNewFiles.length === 0) return;

    const placeholderThumbnails: Thumbnail[] = uniqueNewFiles.map(file => ({
        id: `${file.name}-${file.lastModified}`,
        file,
        previewUrl: null,
    }));
    
    setThumbnails(prev => [...prev, ...placeholderThumbnails]);

    placeholderThumbnails.forEach(async (placeholder) => {
        try {
            const previewUrl = await createThumbnail(placeholder.file);
            setThumbnails(prev => prev.map(t => t.id === placeholder.id ? { ...t, previewUrl } : t));
        } catch (error) {
            console.error("Error creating thumbnail:", error);
            setThumbnails(prev => prev.filter(t => t.id !== placeholder.id));
        }
    });

  }, [thumbnails]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    if(event.target) {
        event.target.value = "";
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && !disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const openFileDialog = () => fileInputRef.current?.click();
  const openCamera = () => setShowCamera(true);

  const handleRemoveImage = (idToRemove: string) => {
    setThumbnails(thumbs => thumbs.filter(thumb => thumb.id !== idToRemove));
  };
  
  const handleSubmit = () => {
    const files = thumbnails.map(t => t.file);
    if (files.length > 0) {
      onAnalyze(files, condition, comment);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 space-y-6">
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      
      {showCamera && (
        <CameraModal 
            onCapture={(files) => {
                handleFiles(files);
                setShowCamera(false);
            }} 
            onClose={() => setShowCamera(false)} 
        />
      )}

      <div className="space-y-4">
        {thumbnails.length === 0 ? (
           <div 
                className={`border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 transition-colors ${disabled ? 'opacity-50' : 'hover:border-indigo-400 dark:hover:border-indigo-500'}`}
                onDragOver={(e) => !disabled && e.preventDefault()}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center gap-6 text-slate-500 dark:text-slate-400">
                    <div className="text-center space-y-1">
                        <UploadIcon className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                        <p className="font-semibold">Перетащите фото сюда</p>
                        <p className="text-xs">или выберите способ загрузки</p>
                    </div>

                    <div className="flex gap-3 w-full justify-center">
                        <button 
                            onClick={openFileDialog}
                            disabled={disabled}
                            className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200"
                        >
                            <UploadIcon className="w-4 h-4" />
                            Файлы
                        </button>
                        <button 
                            onClick={openCamera}
                            disabled={disabled}
                            className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200"
                        >
                            <CameraIcon className="w-4 h-4" />
                            Камера
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400">До {MAX_FILES} фото</p>
                </div>
            </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {thumbnails.map((thumb) => (
                <div key={thumb.id} className="relative group aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
                  {thumb.previewUrl ? (
                    <img src={thumb.previewUrl} alt={`Предпросмотр ${thumb.file.name}`} className="w-full h-full object-cover" />
                  ) : (
                    <Spinner />
                  )}
                  <button
                    onClick={() => handleRemoveImage(thumb.id)}
                    disabled={disabled}
                    aria-label={`Удалить изображение ${thumb.file.name}`}
                    className="absolute top-1 right-1 p-1 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-all opacity-100 disabled:hidden"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {thumbnails.length < MAX_FILES && !disabled && (
                <>
                    <button
                    onClick={openFileDialog}
                    aria-label="Загрузить файл"
                    className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                    >
                        <UploadIcon className="w-6 h-6 mb-1" />
                        <span className="text-[10px]">Файл</span>
                    </button>
                    
                     <button
                        onClick={openCamera}
                        aria-label="Сделать фото"
                        className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                    >
                        <CameraIcon className="w-6 h-6 mb-1" />
                        <span className="text-[10px]">Камера</span>
                    </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="condition-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Состояние книги
          </label>
          <select
            id="condition-select"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
          >
            <option value="Новая">Новая</option>
            <option value="Отличное">Отличное</option>
            <option value="Хорошее">Хорошее</option>
            <option value="Удовлетворительное">Удовлетворительное</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="user-comment" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Дополнительный комментарий (опционально)
          </label>
          <textarea
            id="user-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={disabled}
            placeholder="Например: 'Обрати внимание на автограф', 'Надорван корешок'..."
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 resize-y"
            rows={2}
          />
        </div>
      </div>

       <p className="text-xs text-center text-slate-500 dark:text-slate-400">
        Сфотографируйте страницу с выходными данными. Можно также добавить фото обложки и дефектов.
       </p>
       
       <button
        onClick={handleSubmit}
        disabled={thumbnails.length === 0 || disabled}
        className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed"
       >
        Оценить книгу
       </button>
    </div>
  );
};