import { createClient } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Deals
export const api = {
  deals: {
    list: () => request<Deal[]>("/deals"),
    get: (id: string) => request<DealDetail>(`/deals/${id}`),
    create: (payload: { name: string; company_name?: string }) =>
      request<Deal>("/deals", { method: "POST", body: JSON.stringify(payload) }),
    delete: (id: string) => request<void>(`/deals/${id}`, { method: "DELETE" }),
  },
  transcripts: {
    list: (dealId: string) => request<Transcript[]>(`/deals/${dealId}/transcripts`),
    upload: async (dealId: string, formData: FormData) => {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_URL}/deals/${dealId}/transcripts`, {
        method: "POST",
        headers: authHeader,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Upload failed");
      }
      return res.json() as Promise<Transcript>;
    },
    delete: (dealId: string, transcriptId: string) =>
      request<void>(`/deals/${dealId}/transcripts/${transcriptId}`, { method: "DELETE" }),
  },
  user: {
    usage: () => request<UsageInfo>("/user/usage"),
  },
};

// Types mirroring backend Pydantic models
export interface SignalResult {
  present: boolean;
  score: number;
  reasoning: string;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  signals: {
    decision_maker: SignalResult;
    problem_articulation: SignalResult;
    budget_authority: SignalResult;
    urgency: SignalResult;
    next_steps: SignalResult;
  };
}

export interface Deal {
  id: string;
  name: string;
  company_name: string | null;
  overall_score: number | null;
  transcript_count: number;
  created_at: string;
  updated_at: string;
}

export interface DealDetail extends Deal {
  overall_analysis: AnalysisResult | null;
}

export interface Transcript {
  id: string;
  deal_id: string;
  call_number: number;
  file_name: string | null;
  individual_score: number | null;
  individual_analysis: AnalysisResult | null;
  status: "pending" | "analyzing" | "done" | "error";
  created_at: string;
}

export interface UsageInfo {
  used: number;
  limit: number;
  resets_at: string;
}
