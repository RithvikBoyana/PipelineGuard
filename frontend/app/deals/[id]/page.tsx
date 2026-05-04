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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ transcriptId: string; isLast: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [offerReanalyze, setOfferReanalyze] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [confirmDeleteDeal, setConfirmDeleteDeal] = useState(false);
  const [deletingDeal, setDeletingDeal] = useState(false);

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

  function requestDeleteTranscript(transcriptId: string) {
    setDeleteError(null);
    setConfirmDelete({ transcriptId, isLast: transcripts.length === 1 });
  }

  async function confirmDeleteTranscript() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.isLast) {
        await api.deals.delete(id);
        router.push("/dashboard");
      } else {
        await api.transcripts.delete(id, confirmDelete.transcriptId);
        const [d, t] = await Promise.all([api.deals.get(id), api.transcripts.list(id)]);
        setDeal(d);
        setTranscripts(t);
        setConfirmDelete(null);
        if (t.some(tr => tr.status === "done")) setOfferReanalyze(true);
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  if (authLoading || loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );

  if (!deal) return null;

  async function handleDeleteDeal() {
    setDeletingDeal(true);
    try {
      await api.deals.delete(id);
      router.push("/dashboard");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
      setConfirmDeleteDeal(false);
    } finally {
      setDeletingDeal(false);
    }
  }

  async function handleReanalyze() {
    setReanalyzing(true);
    setOfferReanalyze(false);
    try {
      const updated = await api.deals.reanalyze(id);
      setDeal(updated);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Re-analysis failed");
    } finally {
      setReanalyzing(false);
    }
  }

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConfirmDeleteDeal(true)}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
              title="Delete deal"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <ScoreBadge score={deal.overall_score} size="lg" />
          </div>
        </div>

        {/* Overall analysis */}
        {deal.overall_analysis && (
          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
            <h2 className="font-medium text-gray-900 dark:text-gray-100">Overall qualification</h2>
            {deal.score_stale && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                <span className="text-sm text-amber-700 dark:text-amber-400">
                  Score may not reflect deleted calls. It will update on the next upload.
                </span>
                <button
                  onClick={() => setOfferReanalyze(true)}
                  disabled={reanalyzing}
                  className="shrink-0 text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-50"
                >
                  {reanalyzing ? "Analyzing…" : "Re-analyze now"}
                </button>
              </div>
            )}
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
                      onClick={() => requestDeleteTranscript(t.id)}
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
                {expandedTranscript === t.id && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-4">
                    {t.raw_text && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {t.file_name ? `Transcript — ${t.file_name}` : "Transcript"}
                          </span>
                        </div>
                        <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 max-h-64 overflow-y-auto">
                          {t.raw_text}
                        </pre>
                      </div>
                    )}
                    {t.individual_analysis && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t.individual_analysis.summary}</p>
                        <SignalBreakdown analysis={t.individual_analysis} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
        {deleteError && (
          <p className="text-sm text-red-500">{deleteError}</p>
        )}
      </main>

      {confirmDeleteDeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delete this deal?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will permanently delete <span className="font-medium text-gray-900 dark:text-gray-100">{deal.name}</span> and all {transcripts.length > 0 ? `${transcripts.length} call${transcripts.length !== 1 ? "s" : ""} and ` : ""}their analyses. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteDeal(false)}
                disabled={deletingDeal}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDeal}
                disabled={deletingDeal}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingDeal ? "Deleting…" : "Delete deal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {offerReanalyze && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Re-analyze deal?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The overall score may not reflect your remaining calls after the deletion. Re-analyzing now will use 1 of your weekly analysis slots. You can also skip — the score will update automatically on your next transcript upload.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setOfferReanalyze(false)}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Skip for now
              </button>
              <button
                onClick={handleReanalyze}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Re-analyze (uses 1 slot)
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {confirmDelete.isLast ? "Delete entire deal?" : "Delete this call?"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {confirmDelete.isLast
                ? "This is the only call in this deal. Deleting it will permanently remove the entire deal and all its data. This cannot be undone."
                : "This will permanently delete this call and its analysis. Any calls after it will be renumbered."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTranscript}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : confirmDelete.isLast ? "Delete deal" : "Delete call"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
