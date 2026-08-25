import { GoogleGenAI, Type } from "@google/genai";
import { BookAnalysisResult } from '../types';

const getApiKey = () => {
  const viteKey = (import.meta as any).env?.VITE_API_KEY;
  const procKey = typeof process !== 'undefined' ? (process.env.API_KEY || process.env.VITE_API_KEY) : '';
  return viteKey || procKey || '';
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

const MAX_UPLOAD_DIMENSION = 1500; // Optimized for speed/quality balance

/**
 * Resizes an image if it's too large, maintaining aspect ratio.
 */
const resizeImageForUpload = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                if (width <= MAX_UPLOAD_DIMENSION && height <= MAX_UPLOAD_DIMENSION) {
                    return resolve(file);
                }

                if (width > height) {
                    height *= MAX_UPLOAD_DIMENSION / width;
                    width = MAX_UPLOAD_DIMENSION;
                } else {
                    width *= MAX_UPLOAD_DIMENSION / height;
                    height = MAX_UPLOAD_DIMENSION;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (!blob) {
                        return reject(new Error('Canvas to Blob conversion failed'));
                    }
                    const newFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(newFile);
                }, 'image/jpeg', 0.85); 
            };
            img.onerror = reject;
            img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


async function fileToGenerativePart(file: File) {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      mimeType: file.type,
      data: base64EncodedData,
    },
  };
}

// System Instruction defines the persona and general rules
const SYSTEM_INSTRUCTION = `Ты — эксперт по продаже подержанных книг на Avito.ru. 
Твоя цель — помочь пользователю создать максимально привлекательное и информативное объявление о продаже книги.
Ты должен анализировать фотографии, извлекать метаданные и генерировать продающий текст.

ПРАВИЛА:
1. Ответ должен быть СТРОГО в формате JSON.
2. Не используй Markdown форматирование (без \`\`\`json).
3. Будь объективен, но пиши "вкусно".
4. Если не уверен в годе или издательстве - не выдумывай, пиши "не указано".`;

// User prompt focuses on the specific task structure
export const DEFAULT_PROMPT_TEMPLATE = `Проанализируй эти фотографии книги.
Состояние книги: "{{condition}}".

Заполни следующую JSON структуру:

1. bookDetails:
   - Извлеки: Название, Автор, Год, Издательство, ISBN (если есть), Жанр, Тираж, Стр., Формат.

2. priceAnalysis:
   - min_price/max_price: Оцени примерный диапазон цен на Авито для такого издания и состояния.
   - suggestedPrice: Рекомендуемая цена продажи (чтобы продать за 2-3 недели).
   - findbookUrl: Ссылка поиска (https://www.findbook.ru/search/d1?title=Название&authors=Фамилия).

3. adContent:
   - title: Заголовок объявления (до 50 символов). Формат: "Название, Автор".
   - description: Текст объявления. 
     - Начни с эмоционального крючка (почему эту книгу стоит купить).
     - Затем описание сюжета/содержания (кратко).
     - Зачем - в чем ценность и уникальност этой книги (функциональная/эмоциональная/социальная/контекстная)?
     - Затем состояние и характеристики.
     - Не пиши шаблонные фразы вроде "Продам книгу".`;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        bookDetails: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                author: { type: Type.STRING },
                year: { type: Type.STRING },
                publisher: { type: Type.STRING },
                isbn: { type: Type.STRING, nullable: true },
                genre: { type: Type.STRING, nullable: true },
                circulation: { type: Type.STRING, nullable: true },
                pageCount: { type: Type.INTEGER, nullable: true },
                format: { type: Type.STRING, nullable: true },
            },
            required: ["title", "author", "year", "publisher"]
        },
        priceAnalysis: {
            type: Type.OBJECT,
            properties: {
                suggestedPrice: { type: Type.INTEGER },
                min_price: { type: Type.INTEGER },
                max_price: { type: Type.INTEGER },
                findbookUrl: { type: Type.STRING },
            },
            required: ["suggestedPrice", "min_price", "max_price", "findbookUrl"]
        },
        adContent: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
            },
            required: ["title", "description"]
        }
    },
    required: ["bookDetails", "priceAnalysis", "adContent"]
};

export const analyzeBookImage = async (
  files: File[],
  condition: string,
  comment: string,
  modelName: string,
  promptTemplate: string,
): Promise<BookAnalysisResult> => {
    
  let userPrompt = promptTemplate.replace('{{condition}}', condition);
  
  if (comment && comment.trim() !== '') {
      userPrompt += `\n\nОбрати внимание на комментарий пользователя: "${comment.trim()}"`;
  }

  // Resize images before converting them to base64
  const optimizedFiles = await Promise.all(files.map(resizeImageForUpload));
  const imageParts = await Promise.all(optimizedFiles.map(fileToGenerativePart));

  // Determine the sequence of models to try
  const fallbackChain = [
    modelName,
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash'
  ];
  // Remove duplicates to avoid retrying the same model
  const modelsToTry = [...new Set(fallbackChain)];

  let lastError: any;

  for (const currentModel of modelsToTry) {
    try {
      console.log(`Trying model: ${currentModel}`);
      const response = await ai.models.generateContent({
          model: currentModel,
          contents: [
              ...imageParts,
              { text: userPrompt }
          ],
          config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              responseMimeType: "application/json",
              responseSchema: responseSchema,
              temperature: 0.4,
          }
      });

      const jsonText = response.text?.trim();
      
      if (!jsonText) {
          throw new Error("Пустой ответ от модели.");
      }

      const cleanedJsonText = jsonText.replace(/^```json\s*|^\s*```|```\s*$/g, '');
      const result = JSON.parse(cleanedJsonText);
      
      if (!result.bookDetails || !result.priceAnalysis || !result.adContent) {
          throw new Error("Неполный ответ от AI.");
      }
      
      return result as BookAnalysisResult;

    } catch (error: any) {
      console.warn(`Ошибка при вызове модели ${currentModel}:`, error);
      lastError = error;
      // Do not fallback on certain client errors like Invalid API Key
      if (error.message && error.message.includes('API key not valid')) {
        break; 
      }
      // Otherwise, continue to the next model in the fallback chain
    }
  }

  // If all failed, throw the last error
  console.error('Все модели из цепочки завершились с ошибкой.');
  let errorMessage = "Произошла ошибка при анализе изображения.";
  if (lastError?.message) {
      if (lastError.message.includes('429')) errorMessage = "Слишком много запросов. Подождите немного.";
      else errorMessage += ` Детали: ${lastError.message}`;
  }
  throw new Error(errorMessage);
};