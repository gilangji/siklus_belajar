import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StudyModule, QuizQuestion, Flashcard, GeneratedSyllabusResponse, GeneratedQuizResponse, GeneratedFlashcardResponse } from "../types";

const apiKey = process.env.API_KEY;

// Initialize Gemini client only when needed to ensure key availability
const getAIClient = () => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Generate a structured Study Plan (Syllabus) - Default or Custom
export const generateSyllabus = async (customConfig?: { topic: string, duration: string, intensity: string }): Promise<StudyModule[]> => {
  const ai = getAIClient();
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      modules: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            week: { type: Type.INTEGER },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            topics: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: ["week", "title", "description", "topics"]
        }
      }
    },
    required: ["modules"]
  };

  let prompt = `
    Buatlah peta jalan belajar sistematis 4 fase yang komprehensif untuk "Belajar Efektif & Berpikir Kritis".
    
    Kurikulum harus:
    1. Progresif (Dasar -> Lanjutan).
    2. Siklus (Konsep -> Praktek -> Tinjauan).
    3. Kembalikan tepat 4 modul (fase).
    4. Gunakan Bahasa Indonesia.
  `;

  if (customConfig) {
    prompt = `
      Buatlah jadwal belajar sistematis kustom berdasarkan preferensi pengguna ini:
      - Topik Utama/Tujuan: ${customConfig.topic}
      - Ketersediaan Waktu: ${customConfig.duration}
      - Intensitas/Gaya Belajar: ${customConfig.intensity}
      
      Buat peta jalan terstruktur. Pecah ini menjadi 4 fase logis (diwakili sebagai 'week' dalam skema) yang bergerak dari dasar hingga penguasaan.
      Pastikan ada campuran teori dan aplikasi praktis.
      PENTING: Gunakan Bahasa Indonesia untuk semua Judul, Deskripsi, dan Topik.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "Anda adalah perancang kurikulum ahli. Buat jalur pembelajaran yang terstruktur dan progresif dalam Bahasa Indonesia."
      }
    });

    const data = JSON.parse(response.text || "{}") as GeneratedSyllabusResponse;
    
    // Transform to internal type with IDs
    return data.modules.map((mod, index) => ({
      ...mod,
      id: `module-${index}-${Date.now()}`,
      completed: false
    }));

  } catch (error) {
    console.error("Error generating syllabus:", error);
    throw error;
  }
};

// 2. Generate Study Notes based on Topic, Link, File, and Preferences
export const generateStudyNotes = async (
  topic: string, 
  referenceLink?: string,
  fileData?: { mimeType: string, data: string },
  customInstructions?: string,
  difficulty: string = "Menengah"
): Promise<string> => {
  const ai = getAIClient();

  let basePrompt = `
    Saya sedang mempelajari topik: "${topic}".
    Tingkat Kesulitan Materi: ${difficulty}.
    
    Tolong buatkan catatan belajar yang mendetail dan terstruktur (dalam format Markdown) menggunakan Bahasa Indonesia.
    
    Catatan harus mencakup:
    - Definisi dan Konsep Kunci
    - Teori atau Prinsip Inti
    - Contoh aplikasi dunia nyata
    - Ringkasan poin-poin penting.
    
    ${customInstructions ? `INSTRUKSI TAMBAHAN DARI PENGGUNA: "${customInstructions}"` : ""}
  `;

  let promptContext = basePrompt;
  const parts: any[] = [];

  // Handle Link Logic
  if (referenceLink) {
    promptContext += `\n
      Saya memiliki tautan referensi: ${referenceLink}.
      1. Gunakan Google Search untuk mengakses konten tautan ini. 
      2. Jika itu adalah video YouTube, temukan transkrip atau ringkasan konten video tersebut.
      3. Gabungkan informasi dari tautan ini dengan pengetahuan umum Anda.
    `;
  }

  // Handle File Logic
  if (fileData) {
    promptContext += `\n
      Saya juga telah mengunggah sebuah dokumen/gambar sebagai referensi utama.
      Analisis dokumen yang dilampirkan dan gunakan sebagai sumber utama untuk membuat catatan.
    `;
    // Add the file as an inline part
    parts.push({
      inlineData: {
        mimeType: fileData.mimeType,
        data: fileData.data
      }
    });
  }

  // Add the text prompt as the last part
  parts.push({ text: promptContext });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Switched from gemini-3-pro-preview to avoid quota limits
      contents: { parts }, // Send parts array
      config: {
        tools: referenceLink ? [{ googleSearch: {} }] : undefined,
        systemInstruction: "Anda adalah tutor pribadi yang cerdas. Buat materi belajar yang mudah dipahami, terstruktur, dan gunakan Bahasa Indonesia yang baik."
      }
    });

    return response.text || "Gagal membuat catatan. Coba lagi.";

  } catch (error) {
    console.error("Error generating notes:", error);
    return `Gagal membuat catatan. Silakan coba lagi. Detail: ${error}`;
  }
};

// 3. Generate a Quiz based on the Notes/Topic
export const generateQuiz = async (topic: string, notesContext?: string): Promise<QuizQuestion[]> => {
  const ai = getAIClient();

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            correctAnswerIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswerIndex", "explanation"]
        }
      }
    },
    required: ["questions"]
  };

  const context = notesContext 
    ? `Berdasarkan catatan ini: ${notesContext.substring(0, 10000)}` 
    : `Berdasarkan pengetahuan umum tentang "${topic}"`;

  const prompt = `
    ${context}
    
    Buatlah kuis pilihan ganda 5 pertanyaan untuk menguji pemahaman tentang ${topic}.
    Pastikan pertanyaan menguji pemahaman dan aplikasi, bukan hanya hafalan.
    Gunakan Bahasa Indonesia untuk Pertanyaan, Opsi, dan Penjelasan.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const data = JSON.parse(response.text || "{}") as GeneratedQuizResponse;
    return data.questions;

  } catch (error) {
    console.error("Error generating quiz:", error);
    return [];
  }
};

// 4. Generate Flashcards
export const generateFlashcards = async (topic: string): Promise<Flashcard[]> => {
  const ai = getAIClient();

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      flashcards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING }
          },
          required: ["front", "back"]
        }
      }
    },
    required: ["flashcards"]
  };

  const prompt = `
    Buatlah 8 flashcard berkualitas tinggi untuk topik: "${topic}".
    
    - Depan (Front): Istilah, konsep, atau skenario/pertanyaan spesifik.
    - Belakang (Back): Definisi, penjelasan, atau jawaban.
    - Pertahankan bagian "Belakang" ringkas (di bawah 50 kata) untuk tinjauan yang efektif.
    - Gunakan Bahasa Indonesia.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const data = JSON.parse(response.text || "{}") as GeneratedFlashcardResponse;
    
    return data.flashcards.map((card, i) => ({
      ...card,
      id: `fc-${i}-${Date.now()}`
    }));

  } catch (error) {
    console.error("Error generating flashcards:", error);
    return [];
  }
};

// 5. Interactive Study Tutor
export const askStudyTutor = async (question: string, contextNotes: string): Promise<string> => {
  const ai = getAIClient();
  
  const prompt = `
    KONTEKS MATERI BELAJAR:
    ${contextNotes.substring(0, 15000)}
    
    PERTANYAAN PENGGUNA:
    "${question}"
    
    TUGAS:
    Jawab pertanyaan pengguna berdasarkan konteks materi di atas.
    - Jika pengguna meminta penjelasan lebih lanjut, berikan analogi.
    - Jika pengguna kritis/ahli, berikan jawaban mendalam.
    - Bersikaplah sebagai tutor privat yang suportif.
    - Gunakan Bahasa Indonesia.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || "Maaf, saya tidak dapat menjawab saat ini.";
  } catch (error) {
    console.error("Error in tutor chat:", error);
    return "Terjadi kesalahan koneksi.";
  }
};