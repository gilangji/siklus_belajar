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
    Bertindaklah sebagai Konsultan Kurikulum Pendidikan Tinggi untuk persiapan beasiswa elite (seperti LPDP/Ivy League).
    
    TUGAS:
    Buat peta jalan penguasaan materi (Mastery Roadmap) untuk topik "Belajar Efektif & Berpikir Kritis".
    
    KRITERIA KURIKULUM:
    1. **High-Yield Topics Only:** Jangan sertakan materi "filler" atau terlalu dasar. Fokus pada konsep fundamental yang KRUSIAL dan KONTEMPORER.
    2. **Struktur:** 4 Fase Logis (Fase 1: Fondasi Kritis -> Fase 4: Sintesis & Evaluasi).
    3. **Judul Modul:** Gunakan judul yang akademis dan berbobot.
    4. **Bahasa:** Gunakan Bahasa Indonesia formal dan intelektual.
  `;

  if (customConfig) {
    prompt = `
      Bertindaklah sebagai Konsultan Kurikulum Pendidikan Tinggi & Riset.
      
      KONTEKS PENGGUNA:
      - Topik Target: ${customConfig.topic}
      - Tujuan: Penguasaan Mendalam (Deep Mastery)
      - Gaya: ${customConfig.intensity}
      
      TUGAS:
      Rancang kurikulum 4 fase yang sangat strategis.
      
      INSTRUKSI KHUSUS:
      1. **Prioritas Materi:** Identifikasi konsep-konsep "Paling Mahal" atau "Paling Penting" dalam topik ini. Abaikan trivia. Fokus pada inti keilmuan yang mendalam.
      2. **Judul & Deskripsi:** Harus terdengar profesional, meyakinkan, dan mencerminkan kedalaman materi. 
      3. **Alur:** 
         - Fase 1: Prinsip Fundamental & Teori Utama.
         - Fase 2: Mekanisme Kompleks & Analisis.
         - Fase 3: Aplikasi Kritis & Studi Kasus.
         - Fase 4: Integrasi, Inovasi, & Masa Depan Topik.
      4. Gunakan Bahasa Indonesia.
    `;
  }

  try {
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "Anda adalah arsitek kurikulum akademik tingkat lanjut. Anda membenci kedangkalan. Anda menyusun rencana belajar yang padat berisi."
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
    PERAN: Anda adalah **Pakar Riset Utama & Akademisi Senior** di bidang ini.
    TOPIK FOKUS: "${topic}".
    TARGET AUDIENCE: Kandidat PhD atau Persiapan Beasiswa Elite (LPDP).
    
    TUGAS UTAMA:
    Susun sebuah **Diktat Pembelajaran Mendalam (Deep Dive)** yang komprehensif mengenai topik tersebut.
    
    ATURAN FORMAT (SANGAT PENTING):
    1. **DILARANG KERAS** menggunakan kata "Bab 1", "Chapter I", "Bagian 1", atau penomoran bab sejenisnya.
    2. Gunakan **Judul Besar** (Markdown #) untuk judul materi.
    3. Gunakan **Sub-Judul** (Markdown ## dan ###) untuk membagi bagian.
    4. Format harus bersih, langsung pada hierarki topik.

    STANDAR KONTEN:
    1. **Analisis Kritis:** Jangan hanya mendefinisikan. Analisis *mengapa* hal itu terjadi, *bagaimana* mekanismenya, dan *apa* implikasinya.
    2. **Perspektif Multidimensi:** Tinjau topik dari berbagai sudut pandang (teoritis, praktis, etis, historis).
    3. **Kedalaman:** Setiap sub-bagian harus dibahas secara tuntas, detail, dan panjang. Hindari poin-poin singkat (bullet points) jika penjelasan naratif lebih baik.
    4. **Relevansi:** Pastikan materi benar-benar 100% relevan dengan topik "${topic}". Jangan melebar ke hal umum.

    STRUKTUR YANG DIHARAPKAN:
    # [Judul Besar Topik - Gunakan Istilah Akademis]
    
    ## [Sub-Judul 1: Fondasi Filosofis/Teoritis]
    (Jelaskan sejarah pemikiran, teori dasar, dan pergeseran paradigma terkait topik ini secara mendalam)

    ## [Sub-Judul 2: Mekanisme Inti & Analisis Struktural]
    (Jelaskan "How it works" secara sangat detail. Bongkar komponen-komponennya)

    ## [Tabel Komparasi Kritis]
    (Wajib sertakan Tabel Markdown yang membandingkan pendekatan/teori berbeda dalam topik ini secara head-to-head)

    ## [Sub-Judul 3: Isu Kontemporer & Studi Kasus]
    (Bahas perdebatan saat ini, tantangan modern, atau contoh kasus nyata yang kompleks)

    ## [Sintesis & Kesimpulan Kritis]
    (Rangkuman yang menyatukan semua poin menjadi wawasan baru)

    ${customInstructions ? `INSTRUKSI TAMBAHAN DARI PENGGUNA: "${customInstructions}"` : ""}
  `;

  let promptContext = basePrompt;
  const parts: any[] = [];

  if (referenceLink) {
    promptContext += `\n
      REFERENSI EKSTERNAL: ${referenceLink}.
      Instruksi: Akses konten tautan tersebut (melalui Google Search). Integrasikan data, argumen, atau temuan spesifik dari tautan tersebut ke dalam analisis Anda. Jadikan materi ini lebih kaya dengan data eksternal tersebut.
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
        // System instruction diperkuat untuk memaksa format
        systemInstruction: "Anda adalah Akademisi Senior. Gaya penulisan Anda: Formal, Padat, Kritis, dan Mendalam. Anda TIDAK PERNAH menggunakan kata 'Bab' atau 'Chapter' dalam struktur judul, melainkan langsung menggunakan Topik sebagai Judul."
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
    : `Berdasarkan pengetahuan tingkat lanjut tentang "${topic}"`;

  const prompt = `
    ${context}
    
    TUGAS:
    Buat 5 pertanyaan kuis tingkat "Analisis" atau "Evaluasi" (HOTS - Higher Order Thinking Skills).
    Hindari pertanyaan hafalan tahun atau definisi sederhana.
    Pertanyaan harus menguji pemahaman konsep yang mendalam atau aplikasi teori.
    
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
    Fokus pada: Konsep Kunci, Istilah Teknis, atau Hubungan Sebab-Akibat.
    Level: Mahir/Akademik.
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
    PERAN: Tutor Privat Akademik (Level S2/S3).
    MATERI:
    ${contextNotes.substring(0, 25000)}
    
    PERTANYAAN SISWA: "${question}"
    
    TUGAS:
    Jawab dengan mendalam, gunakan analogi cerdas, dan kaitkan kembali ke konsep inti dalam materi.
    Jangan berikan jawaban satu kalimat. Jelaskan "Mengapa" dan "Bagaimana".
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