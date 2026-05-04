"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { api, type DealDetail, type Transcript } from "@/lib/api";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SignalBreakdown } from "@/components/SignalBreakdown";
import { useAuth } from "@/hooks/useAuth";

export default function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { loading: authLoading } = useAuth();
  const router = useRouter();

  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    Promise.all([api.deals.get(id), api.transcripts.list(id)])
      .then(([d, t]) => {
        setDeal(d);
        setTranscripts(t);
      })
      .catch(() => router.replace("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, authLoading, router]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.transcripts.upload(id, formData);
      const [d, t] = await Promise.all([api.deals.get(id), api.transcripts.list(id)]);
      setDeal(d);
      setTranscripts(t);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handlePasteUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!pastedText.trim()) return;
    setUploadError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("pasted_text", pastedText);
    try {
      await api.transcripts.upload(id, formData);
      const [d, t] = await Promise.all([api.deals.get(id), api.transcripts.list(id)]);
      setDeal(d);
      setTranscripts(t);
      setPastedText("");
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteTranscript(transcriptId: string) {
    await api.transcripts.delete(id, transcriptId);
    const [d, t] = await Promise.all([api.deals.get(id), api.transcripts.list(id)]);
    setDeal(d);
    setTranscripts(t);
  }

  if (authLoading || loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );

  if (!deal) return null;

  const ordinal = (n: number) => ["1st","2nd","3rd"][n - 1] ?? `${n}th`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold">PipelineGuard</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
        {/* Deal header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{deal.name}</h1>
            {deal.company_name && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{deal.company_name}</p>
            )}
          </div>
          <ScoreBadge score={deal.overall_score} size="lg" />
        </div>

        {/* Overall analysis */}
        {deal.overall_analysis && (
          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
            <h2 className="font-medium text-gray-900 dark:text-gray-100">Overall qualification</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{deal.overall_analysis.summary}</p>
            <SignalBreakdown analysis={deal.overall_analysis} />
          </section>
        )}

        {/* Upload section */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
          <h2 className="font-medium text-gray-900 dark:text-gray-100">Add transcript</h2>
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setUploadMode("file")}
              className={`px-3 py-1 rounded-md ${uploadMode === "file" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            >
              Upload file
            </button>
            <button
              onClick={() => setUploadMode("paste")}
              className={`px-3 py-1 rounded-md ${uploadMode === "paste" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            >
              Paste text
            </button>
          </div>

          {uploadMode === "file" ? (
            <label className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : "border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600"}`}>
              <Upload className="h-6 w-6 text-gray-400" />
              <span className="text-sm text-gray-500">{uploading ? "Analyzing…" : "Click to upload or drag and drop"}</span>
              <span className="text-xs text-gray-400">.txt, .pdf, .docx — max 10MB</span>
              <input type="file" accept=".txt,.pdf,.docx" onChange={handleFileUpload} disabled={uploading} className="hidden" />
            </label>
          ) : (
            <form onSubmit={handlePasteUpload} className="space-y-3">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={8}
                placeholder="Paste transcript text here…"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                type="submit"
                disabled={uploading || !pastedText.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? "Analyzing…" : "Analyze transcript"}
              </button>
            </form>
          )}
          {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
        </section>

        {/* Transcript history */}
        {transcripts.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-medium text-gray-900 dark:text-gray-100">Call history</h2>
            {transcripts.map((t) => (
              <div key={t.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{ordinal(t.call_number)} call</span>
                    <ScoreBadge score={t.individual_score} size="sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <button
                      onClick={() => handleDeleteTranscript(t.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setExpandedTranscript(expandedTranscript === t.id ? null : t.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
                    >
                      {expandedTranscript === t.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {expandedTranscript === t.id && t.individual_analysis && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t.individual_analysis.summary}</p>
                    <SignalBreakdown analysis={t.individual_analysis} />
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
