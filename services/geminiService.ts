import { GoogleGenAI, Type } from "@google/genai";
import { BookAnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const MAX_UPLOAD_DIMENSION = 2500; // Max width/height for uploaded images

/**
 * Resizes an image if it's too large, maintaining aspect ratio.
 * Returns a promise that resolves to a new File object.
 * @param file The original image file.
 * @returns A promise resolving to the resized File, or the original if no resize was needed.
 */
const resizeImageForUpload = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                if (width <= MAX_UPLOAD_DIMENSION && height <= MAX_UPLOAD_DIMENSION) {
                    // No resize needed
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
                
                // Convert canvas to blob, then to file
                canvas.toBlob((blob) => {
                    if (!blob) {
                        return reject(new Error('Canvas to Blob conversion failed'));
                    }
                    const newFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(newFile);
                }, 'image/jpeg', 0.9); // Use high quality JPEG
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

export const DEFAULT_PROMPT_TEMPLATE = `Ты — эксперт по продаже подержанных книг на Avito.ru. Твоя задача — проанализировать фотографии выходных данных, оценить книгу и подготовить информацию для продажи.

Проанализируй фото и верни результат **строго** в формате JSON, соответствующем структуре, описанной ниже. 

Структура JSON:
{
  "bookDetails": { /* Детали из шага 1 */ },
  "priceAnalysis": { /* Оценка из шага 2 */ },
  "adContent": { /* Объявление из шага 3 */ }
}

ШАГ 1: Извлеки детали для объекта \`bookDetails\`:
Определи точное название (\`title\`), автора(ов) (\`author\`), ISBN (\`isbn\`), жанр (\`genre\`), издательство (\`publisher\`), год издания (\`year\`), тираж (\`circulation\`), количество страниц (\`pageCount\`) и формат (\`format\`). Если какие-то из необязательных полей (genre, circulation, pageCount, format, isbn) найти не удалось, опусти их.

ШАГ 2: Определи коридор цен для объекта \`priceAnalysis\`:

- Определи минимальную цену на книгу (\`min_price\`)
- Определи максимальную цену на книгу (\`max_price\`)
- Предположи (\`suggestedPrice\`): рекомендуемая цена, учитывая коридор цен и "{{condition}}" состояние книги
- Сформируй ( \`findbookUrl\`) поисковый URL для сайта findbook.ru, по шалону: 
  https://www.findbook.ru/search/d1?title=Название+книги&authors=Фамилия+Автора
      - В параметр \`title\` включи не более 3х слов названия.
    - В параметр \`authors\` включи **только фамилию** первого автора (если их несколько).
    - Пример: \`https://www.findbook.ru/search/d1?title=Рассказы+о+книгах&authors=Смирнов-Сокольский
    - URL должен быть правильно закодирован для использования в браузере.


ШАГ 3: Создай объявление для объекта \`adContent\`:

Заголовок (title):
- СТРОГО до 50 символов.
- Формат: "Название книги, Автор". Например: "Мастер и Маргарита, Михаил Булгаков".
- НЕ ИСПОЛЬЗУЙ слова "книга", "продам", "издательство" и т.п.

Описание (description):
- Категорически НЕ начинай со слов "Продам", "Представляем вашему вниманию" и т.п.
- Не упоминай ничего о доставке.
- Структура описания (используй '\\n\\n' для разделения абзацев):
    1. Описание: что это за книга? (фундаментальный труд, увлекательный роман, уникальное издание...)
    2. В чем ценность/уникальность самой книги и букинистическая ценность конкретно этого издания?
    3. О чем книга? Краткое, интригующее описание содержания.
    4. Выходные данные: Автор, Название, Издательство, Год, тираж, кол-во страниц, формат, ISBN и состояние книги: "{{condition}}".
       
Верни результат в формате JSON`;

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
  model: string,
  promptTemplate: string,
): Promise<BookAnalysisResult> => {
    
  const fullPrompt = promptTemplate.replace('{condition}', condition);

  // Resize images before converting them to base64
  const optimizedFiles = await Promise.all(files.map(resizeImageForUpload));
  const imageParts = await Promise.all(optimizedFiles.map(fileToGenerativePart));

  const contentParts = [
      { text: fullPrompt },
      ...imageParts
  ];

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: contentParts },
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });

    const jsonText = response.text.trim();
    const cleanedJsonText = jsonText.replace(/^```json\s*|^\s*```|```\s*$/g, '');
    
    const result = JSON.parse(cleanedJsonText);
    
    if (!result.bookDetails || !result.priceAnalysis || !result.adContent) {
        throw new Error("Неполный ответ от AI. Пожалуйста, попробуйте еще раз.");
    }
    
    return result as BookAnalysisResult;

  } catch (error: any) {
    console.error('Ошибка при вызове Gemini API:', error);
    let errorMessage = "Произошла ошибка при анализе изображения.";
    if (error.message) {
        errorMessage += ` Детали: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
};