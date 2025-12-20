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
    Bertindaklah sebagai Konsultan Kurikulum Pendidikan.
    
    TUGAS:
    Buat peta jalan penguasaan materi (Mastery Roadmap) untuk topik "Belajar Efektif & Berpikir Kritis".
    
    KRITERIA KURIKULUM:
    1. Struktur: 4 Fase Logis.
    2. Bahasa: Gunakan Bahasa Indonesia formal.
  `;

  if (customConfig) {
    prompt = `
      Bertindaklah sebagai Perancang Kurikulum Adaptif (Adaptive Curriculum Designer).
      
      KONTEKS PENGGUNA:
      - Topik Target: ${customConfig.topic}
      - Ketersediaan Waktu: ${customConfig.duration}
      - Gaya/Intensitas: ${customConfig.intensity}
      
      TUGAS:
      Rancang kurikulum 4 fase yang SANGAT SESUAI dengan tingkat kedalaman topik yang diminta.

      ATURAN LOGIKA STRUKTUR (PENTING):
      Analisis kata kunci dalam "${customConfig.topic}".

      A. JIKA TOPIK BERSIFAT "DASAR", "PEMULA", "BASIC", "PENGENALAN", atau "INTRODUCTION":
         - Fase 1 (Basic): WAJIB mulai dari SEJARAH, ETIMOLOGI, DEFINISI AWAL, dan ALIRAN PEMIKIRAN LAMA. Jangan langsung masuk ke sains modern yang rumit.
         - Fase 2 (Foundations): Masuk ke konsep-konsep kunci dan teori klasik.
         - Fase 3 (Modern): Perkembangan ilmu modern terkait topik tersebut.
         - Fase 4 (Application): Studi Kasus, Penerapan Nyata, dan Isu Terkini.
         *Contoh untuk Psikologi Dasar: Mulai dari Wundt/Freud (Fase 1), bukan Neurotransmitter.*

      B. JIKA TOPIK BERSIFAT "LANJUT", "ADVANCED", "MASTERING", atau SPESIFIK:
         - Langsung fokus pada inti keilmuan yang mendalam, analisis kritis, dan mekanisme kompleks. Abaikan sejarah dasar jika tidak relevan.

      OUTPUT:
      Kembalikan JSON berisi array 'modules' (tepat 4 modul/fase).
      Gunakan Bahasa Indonesia.
    `;
  }

  try {
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "Anda adalah ahli kurikulum yang peka terhadap konteks. Anda menyusun materi dari akar (sejarah/dasar) menuju daun (aplikasi) jika pengguna meminta materi dasar."
      }
    });

    const data = JSON.parse(response.text || "{}") as GeneratedSyllabusResponse;
    
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

// 2. Generate Study Notes based on Topic
export const generateStudyNotes = async (
  topic: string, 
  referenceLink?: string,
  fileData?: { mimeType: string, data: string },
  customInstructions?: string,
  difficulty: string = "Sangat Mendalam"
): Promise<string> => {
  const ai = getAIClient();

  // Prompt yang diperbarui untuk kedalaman materi & format tanpa "Bab"
  let basePrompt = `
    PERAN: Anda adalah **Dosen Akademik & Penulis Buku Teks**.
    TOPIK FOKUS: "${topic}".
    TARGET AUDIENCE: Pelajar serius yang menginginkan pemahaman utuh (Comprehensive Understanding).
    
    TUGAS UTAMA:
    Susun sebuah **Materi Pembelajaran (Lecture Notes)** yang sangat mendalam, panjang, dan terstruktur.
    
    ATURAN FORMAT (SANGAT PENTING):
    1. **DILARANG KERAS** menggunakan kata "Bab 1", "Chapter I", "Bagian 1", atau penomoran bab sejenisnya.
    2. Gunakan **Judul Besar** (Markdown #) untuk judul materi.
    3. Gunakan **Sub-Judul** (Markdown ## dan ###) untuk membagi bagian.
    4. Gunakan **Tabel Markdown** untuk perbandingan data.

    PEDOMAN KONTEN (ADAPTIF):
    - Jika topik adalah tentang **Sejarah/Dasar**: Jelaskan kronologi, tokoh, pemikiran awal, dan evolusinya secara mendetail.
    - Jika topik adalah tentang **Teknis/Lanjut**: Jelaskan mekanisme, cara kerja, analisis data, dan teori kompleks.
    - **Kedalaman:** Jangan membuat ringkasan pendek. Tulislah selengkap mungkin (minimal 1000 kata jika memungkinkan). Gali "Why" dan "How".
    
    STRUKTUR YANG DIHARAPKAN:
    # [Judul Materi]
    
    ## [Sub-Judul 1: Definisi & Konteks]
    (Jelaskan latar belakang, sejarah, atau definisi fundamental topik ini)

    ## [Sub-Judul 2: Teori Utama / Mekanisme]
    (Inti materi. Jelaskan secara panjang lebar dan mendalam)

    ## [Tabel Analisis / Komparasi]
    (Wajib sertakan Tabel Markdown yang relevan dengan topik)

    ## [Sub-Judul 3: Aplikasi / Studi Kasus / Perspektif Modern]
    (Bagaimana hal ini diterapkan atau dilihat di masa kini)

    ## [Kesimpulan & Poin Kunci]

    ${customInstructions ? `INSTRUKSI TAMBAHAN DARI PENGGUNA: "${customInstructions}"` : ""}
  `;

  let promptContext = basePrompt;
  const parts: any[] = [];

  if (referenceLink) {
    promptContext += `\n
      REFERENSI EKSTERNAL: ${referenceLink}.
      Instruksi: Akses konten tautan tersebut (melalui Google Search). Integrasikan data, argumen, atau temuan spesifik dari tautan tersebut ke dalam analisis Anda.
    `;
  }

  if (fileData) {
    promptContext += `\n
      MATERI SUMBER (FILE):
      Saya menyertakan file dokumen/gambar. Analisis file ini sebagai sumber primer (Primary Source).
      Materi yang Anda buat HARUS berpusat pada isi file ini, lalu diperluas dengan pengetahuan akademis Anda.
    `;
    parts.push({
      inlineData: {
        mimeType: fileData.mimeType,
        data: fileData.data
      }
    });
  }

  parts.push({ text: promptContext });

  try {
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview', 
      contents: { parts },
      config: {
        tools: referenceLink ? [{ googleSearch: {} }] : undefined,
        systemInstruction: "Anda adalah Dosen yang sangat detail. Anda menjelaskan materi dari akar hingga ke buahnya. Anda tidak melompati dasar-dasar jika itu penting untuk pemahaman topik."
      }
    });

    return response.text || "Gagal membuat materi mendalam. Silakan coba lagi.";

  } catch (error) {
    console.error("Error generating notes:", error);
    throw error;
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
    ? `Berdasarkan materi berikut: ${notesContext.substring(0, 25000)}` 
    : `Berdasarkan pengetahuan tentang "${topic}"`;

  const prompt = `
    ${context}
    
    TUGAS:
    Buat 5 pertanyaan kuis tentang topik di atas.
    - Sesuaikan tingkat kesulitan pertanyaan dengan tingkat kesulitan materi.
    - Jika materi bersifat dasar/sejarah, tanyakan tentang konsep kunci dan tokoh.
    - Jika materi bersifat lanjut, tanyakan tentang analisis dan aplikasi.
    
    Format: JSON.
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
    Buat 8 flashcard untuk topik "${topic}".
    Fokus pada definisi istilah, tokoh penting, atau konsep kunci yang relevan dengan topik.
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
    PERAN: Tutor Privat Akademik.
    MATERI:
    ${contextNotes.substring(0, 25000)}
    
    PERTANYAAN SISWA: "${question}"
    
    TUGAS:
    Jawab pertanyaan siswa dengan jelas dan edukatif.
    Gunakan konteks materi yang ada untuk menjawab.
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