import * as pdfjsLib from 'pdfjs-dist';

// Set up worker source
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface ExtractedPdfData {
  text: string;
  numPages: number;
  fileName: string;
  fileSizeBytes: number;
}

export async function extractTextFromPdfFile(file: File): Promise<ExtractedPdfData> {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => item.str || '')
        .filter(str => str.trim().length > 0);
      
      fullText += pageStrings.join(' ') + '\n\n';
    }

    return {
      text: fullText.trim(),
      numPages: pdf.numPages,
      fileName: file.name,
      fileSizeBytes: file.size,
    };
  } catch (error) {
    console.warn('PDF.js worker failed or restricted, falling back to binary string parse:', error);
    // Fallback: simple text stream extraction from PDF bytes
    const textDecoder = new TextDecoder('latin1');
    const binary = textDecoder.decode(arrayBuffer);
    const matches = binary.match(/\(([^()]{3,})\)Tj|\[([^\[\]]+)\]TJ/g) || [];
    const extracted = matches
      .map(m => m.replace(/^[(\[]|[)\]](?:Tj|TJ)$/g, ''))
      .join(' ')
      .replace(/\\([()\\])/g, '$1')
      .trim();

    return {
      text: extracted || `Uploaded PDF document: ${file.name}. (Please review contents)`,
      numPages: 1,
      fileName: file.name,
      fileSizeBytes: file.size,
    };
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1] || res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
