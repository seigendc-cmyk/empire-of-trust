import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LibraryWhatsappButton } from "../components/LibraryWhatsappButton";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { getImportedLibraryPack } from "../lib/libraryRepository";
import { logActivity, saveLibraryQuizAttempt, saveQuizAttempt } from "../lib/offlineDb";
import type { LibraryBookletPack, LibraryBookletQuiz } from "../types";

export default function LibraryQuiz() {
  const { bookletId, quizId } = useParams();
  const [pack, setPack] = useState<LibraryBookletPack | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; maxScore: number; passed: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookletId) return;
    getImportedLibraryPack(bookletId).then((data) => setPack(data ?? null)).finally(() => setLoading(false));
  }, [bookletId]);

  const quiz = useMemo(() => pack?.content.quizzes?.find((item) => item.id === quizId) ?? null, [pack, quizId]);
  const answerSummary = useMemo(() => quiz ? quiz.questions.map((question, index) => `${index + 1}. ${question.question}: ${answers[question.id] ?? ""}`).join("\n") : "", [answers, quiz]);
  const submitPrompts = useMemo(() => (pack?.content.whatsappPrompts ?? []).filter((prompt) => prompt.ctaType === "submit_answers" || prompt.buttonLabel?.toLowerCase().includes("answer")), [pack]);

  useEffect(() => {
    if (!bookletId || !quiz) return;
    logActivity("quiz_started", {
      targetType: "libraryQuiz",
      targetId: quiz.id,
      metadata: { bookletId, title: quiz.title },
    }).catch(() => undefined);
  }, [bookletId, quiz]);

  async function submit(activeQuiz: LibraryBookletQuiz) {
    if (!bookletId) return;
    const maxScore = activeQuiz.questions.reduce((sum, question) => sum + Number(question.points ?? 1), 0);
    const score = activeQuiz.questions.reduce((sum, question) => {
      const submitted = normalizeAnswer(answers[question.id] ?? "");
      const correct = normalizeAnswer(question.answer);
      return submitted && submitted === correct ? sum + Number(question.points ?? 1) : sum;
    }, 0);
    const passed = maxScore > 0 ? Math.round((score / maxScore) * 100) >= activeQuiz.passScore : false;
    setSaving(true);
    setError("");
    try {
      await saveQuizAttempt({
        quizId: activeQuiz.id,
        episodeId: `library:${bookletId}`,
        score,
        maxScore,
        answersJson: JSON.stringify(answers),
        title: activeQuiz.title,
      });
      await saveLibraryQuizAttempt({
        bookletId,
        quizId: activeQuiz.id,
        score,
        maxScore,
        answersJson: JSON.stringify(answers),
      });
      await logActivity("quiz_completed", {
        targetType: "libraryQuiz",
        targetId: activeQuiz.id,
        metadata: { bookletId, score, maxScore, passed },
      });
      setResult({ score, maxScore, passed });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save quiz result.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Opening quiz..." />;
  if (!pack || !bookletId || !quiz) return <ErrorState title="Quiz not found" message="Import the booklet pack again or choose another quiz." />;

  return (
    <section className="page grid gap-5">
      <PageHeader
        eyebrow={`${pack.manifest.bookletCode} / Offline quiz`}
        title={quiz.title}
        subtitle={`${quiz.questions.length} questions / pass mark ${quiz.passScore}% / results saved locally on this device.`}
        actions={[{ label: "Booklet", to: `/library/${bookletId}` }]}
      />
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}
      {result && (
        <div className={`border p-4 text-sm font-semibold ${result.passed ? "border-ledger bg-ledger/10 text-ledger" : "border-signal bg-signal/10 text-signal"}`}>
          Score: {result.score}/{result.maxScore}. {result.passed ? "Pass mark reached." : "Pass mark not reached yet."}
        </div>
      )}
      {result && submitPrompts.length > 0 && (
        <section className="panel grid gap-3 p-4">
          <h2 className="text-app text-xl font-black">Submit answers</h2>
          {submitPrompts.map((prompt) => (
            <LibraryWhatsappButton
              key={prompt.id}
              pack={pack}
              prompt={prompt}
              bookletId={bookletId}
              chapterId={quiz.chapterId}
              selectedAnswers={answerSummary}
            />
          ))}
        </section>
      )}

      <form className="panel divide-y divide-white/10" onSubmit={(event) => {
        event.preventDefault();
        submit(quiz).catch((err) => setError(err instanceof Error ? err.message : "Could not complete quiz."));
      }}>
        {quiz.questions.map((question, index) => (
          <section key={question.id} className="grid gap-3 p-4">
            <div>
              <p className="text-accent text-xs font-bold uppercase tracking-[0.14em]">Question {index + 1} / {question.points ?? 1} points</p>
              <h2 className="text-app mt-1 text-lg font-black">{question.question}</h2>
            </div>
            {(question.questionType === "multiple_choice" || question.questionType === "true_false") ? (
              <div className="grid gap-2">
                {question.options.map((option) => (
                  <label key={option} className="surface-muted border-app flex items-center gap-2 border p-3 text-sm font-semibold">
                    <input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.currentTarget.value }))} required />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <label><span className="label">Short answer</span><input className="field" value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.currentTarget.value }))} required /></label>
            )}
            {result && (
              <div className="surface-muted border-app border p-3 text-sm leading-6">
                <p className="text-app font-bold">Correct answer: {question.answer}</p>
                {question.explanation && <p className="text-muted mt-1">{question.explanation}</p>}
              </div>
            )}
          </section>
        ))}
        <div className="sticky-actions grid gap-3 p-4 sm:grid-cols-2">
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Complete Quiz"}</button>
          <Link className="btn" to={`/library/${bookletId}`}>Back to Booklet</Link>
        </div>
      </form>
    </section>
  );
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
