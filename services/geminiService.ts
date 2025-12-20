import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StudyModule, QuizQuestion, Flashcard, GeneratedSyllabusResponse, GeneratedQuizResponse, GeneratedFlashcardResponse } from "../types";

// Initialize Gemini client only when needed to ensure key availability
const getAIClient = () => {
  // Use process.env.API_KEY directly as per guidelines
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error("API Key not found. Please set API_KEY in your environment variables.");
    throw new Error("API Key hilang. Pastikan konfigurasi environment variable API_KEY sudah benar.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Wrapper for API calls with retry logic
const generateContentWithRetry = async (ai: GoogleGenAI, params: any, retries = 2): Promise<any> => {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    // Check for 429 or quota related errors in various formats
    const msg = error.message?.toLowerCase() || '';
    const isRateLimit = error.status === 429 || 
                        error.code === 429 || 
                        msg.includes('429') || 
                        msg.includes('quota') || 
                        msg.includes('resource_exhausted');
    
    if (isRateLimit && retries > 0) {
      // Try to parse retry time from error message e.g. "Please retry in 27.68s"
      const match = error.message?.match(/retry in ([0-9.]+)s/);
      let waitTime = 3000 * (3 - retries); // Default increasing backoff: 3s, 6s
      
      if (match && match[1]) {
        // Add 1s buffer to the requested wait time
        waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
      }
      
      console.warn(`Rate limit hit. Retrying in ${waitTime}ms... (${retries} retries left)`);
      
      // If wait time is reasonable (< 60s), we wait and retry. 
      // Otherwise we throw to let user know they need to wait a long time.
      if (waitTime < 60000) {
        await delay(waitTime);
        return generateContentWithRetry(ai, params, retries - 1);
      }
    }
    throw error;
  }
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
    const response = await generateContentWithRetry(ai, {
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

  } catch (error: any) {
    console.error("Error generating syllabus:", error);
    throw new Error(error.message || "Gagal menghubungi AI.");
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
    Saya ingin Anda bertindak sebagai **Profesor Akademik Penulis Buku Teks**. 
    Topik saat ini: "${topic}".
    Tingkat Kedalaman: ${difficulty} (Sangat Mendalam).
    
    TUGAS UTAMA:
    Buat materi pembelajaran yang **SANGAT PANJANG, MENDALAM, DAN KOMPREHENSIF** (setara dengan satu bab penuh buku teks). Jangan membuat ringkasan pendek. Gali setiap sub-topik secara detail.
    
    STRUKTUR WAJIB:
    1. **Pendahuluan Menyeluruh**: Latar belakang sejarah, definisi, dan signifikansi topik.
    2. **Konsep & Teori Inti**: Penjelasan panjang lebar tentang mekanisme atau teori di baliknya.
    3. **Tabel Perbandingan (WAJIB)**: Buat Tabel Markdown yang membandingkan minimal 2 konsep/metode/pendekatan dalam topik ini. Gunakan kolom seperti [Aspek | Konsep A | Konsep B | Keterangan].
    4. **Studi Kasus / Contoh Penerapan**: Skenario nyata yang mendetail (bukan poin-poin singkat).
    5. **Analisis Kritis**: Pro dan kontra, perdebatan akademik, atau tantangan saat ini.
    6. **Kesimpulan & Poin Kunci**.

    FORMATTING:
    - Gunakan **Tabel Markdown** untuk menyajikan data terstruktur.
    - Gunakan **Bold** untuk istilah kunci.
    - Tulis minimal 1500 kata jika memungkinkan.
    - Gunakan Bahasa Indonesia yang akademis namun mudah dipahami.
    
    ${customInstructions ? `INSTRUKSI KHUSUS PENGGUNA: "${customInstructions}"` : ""}
  `;

  let promptContext = basePrompt;
  const parts: any[] = [];

  // Handle Link Logic
  if (referenceLink) {
    promptContext += `\n
      Saya memiliki tautan referensi: ${referenceLink}.
      1. Gunakan Google Search untuk mengakses konten tautan ini secara mendalam. 
      2. Ekstrak detail spesifik, statistik, atau argumen utama dari tautan tersebut.
      3. Integrasikan informasi ini ke dalam struktur bab di atas.
    `;
  }

  // Handle File Logic
  if (fileData) {
    promptContext += `\n
      Saya juga telah mengunggah sebuah dokumen/gambar sebagai materi sumber.
      Analisis dokumen ini secara menyeluruh. Jangan lewatkan detail kecil. Gunakan ini sebagai fondasi utama materi.
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
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview', 
      contents: { parts }, // Send parts array
      config: {
        tools: referenceLink ? [{ googleSearch: {} }] : undefined,
        systemInstruction: "Anda adalah Profesor Universitas yang sedang menulis buku teks. Anda sangat menyukai penjelasan yang panjang, mendetail, dan menggunakan tabel untuk data. Jangan pernah memberikan jawaban pendek."
      }
    });

    return response.text || "Gagal membuat catatan. Coba lagi.";

  } catch (error) {
    console.error("Error generating notes:", error);
    throw error; // Rethrow so UI knows it failed
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
    ? `Berdasarkan catatan ini: ${notesContext.substring(0, 20000)}` 
    : `Berdasarkan pengetahuan umum tentang "${topic}"`;

  const prompt = `
    ${context}
    
    Buatlah kuis pilihan ganda 5 pertanyaan untuk menguji pemahaman tentang ${topic}.
    Pastikan pertanyaan menguji pemahaman dan aplikasi, bukan hanya hafalan.
    Gunakan Bahasa Indonesia untuk Pertanyaan, Opsi, dan Penjelasan.
  `;

  try {
    const response = await generateContentWithRetry(ai, {
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
    return []; // Return empty quiz on fail, don't break app
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
    const response = await generateContentWithRetry(ai, {
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
    ${contextNotes.substring(0, 20000)}
    
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
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || "Maaf, saya tidak dapat menjawab saat ini.";
  } catch (error) {
    console.error("Error in tutor chat:", error);
    return "Terjadi kesalahan koneksi.";
  }
};