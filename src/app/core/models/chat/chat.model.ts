// ────────── REQUEST ──────────
export interface ChatRequest {
  message: string;
  sessionId?: string;
}

// ────────── RESPONSE (unwrapped from ApiResponse) ──────────
export interface ChatResponse {
  reply: string;
  sessionId: string;
  timestamp: string;                     // ISO-8601 UTC
  intentType?: string | null;
  suggestedActions?: SuggestedAction[] | null;
  structuredData?: unknown | null;
}

export interface SuggestedAction {
  label: string;
  action: string;                        // "CHAT:..." hoặc "NAVIGATE:..."
}

// ────────── API WRAPPER ──────────
export interface ChatApiResponse {
  status: number;
  message: string;
  data: ChatResponse;
}

// ────────── UI Message ──────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestedActions?: SuggestedAction[] | null;
  isLoading?: boolean;
}
