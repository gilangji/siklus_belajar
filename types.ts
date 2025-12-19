export enum AppView {
  DASHBOARD = 'DASHBOARD',
  PLANNER = 'PLANNER',
  STUDY_SESSION = 'STUDY_SESSION',
  QUIZ_MODE = 'QUIZ_MODE'
}

export interface StudyModule {
  id: string;
  week: number;
  title: string;
  description: string;
  topics: string[];
  completed: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface StudySession {
  id: string;
  date: string;
  topic: string;
  referenceLink?: string;
  startTime: string;
  durationMinutes: number;
  notes: string; // Markdown content
  quiz: QuizQuestion[];
  quizScore?: number;
}

export interface UserProgress {
  totalSessions: number;
  topicsLearned: number;
  averageQuizScore: number;
}

// Gemini Response Schemas
export interface GeneratedSyllabusResponse {
  modules: {
    week: number;
    title: string;
    description: string;
    topics: string[];
  }[];
}

export interface GeneratedQuizResponse {
  questions: {
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  }[];
}

export interface GeneratedFlashcardResponse {
  flashcards: {
    front: string;
    back: string;
  }[];
}