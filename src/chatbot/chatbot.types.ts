export type UserRole = "Guest" | "Student" | "Employer" | "Admin";

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  /** Keywords used for fuzzy matching */
  keywords: string[];
  /** Which roles this FAQ is relevant for. Empty = all roles */
  roles: UserRole[];
  /** Category for grouping / quick-option chips */
  category: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  /** Conversation history (last N turns) */
  history?: ChatMessage[] | undefined;
  /** If user is authenticated, pass their role for personalised context */
  userRole?: UserRole | undefined;
}

export interface SuggestedQuestion {
  id: string;
  question: string;
  category: string;
}

export interface ChatResponse {
  answer: string;
  source: "faq" | "ai" | "fallback";
  /** Contextual quick-option chips to show above the input */
  suggestions: SuggestedQuestion[];
  matchedFaqId?: string;
}

export interface SuggestionsRequest {
  /** Current text in the input box (can be empty) */
  input: string;
  userRole?: UserRole | undefined;
}
