import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import {
  deleteBookletQuiz,
  getBookletContent,
  listBookletQuizzes,
  saveBookletQuiz,
} from "../lib/bookletFoundationRepository";
import type { EotBooklet, EotBookletChapter, EotBookletQuiz, EotBookletQuizQuestionType } from "../types";

export default function StudioBookletQuizBuilder() {
  const { bookletId } = useParams();
  const [booklet, setBooklet] = useState<EotBooklet | null>(null);
  const [chapters, setChapters] = useState<EotBookletChapter[]>([]);
  const [quizzes, setQuizzes] = useState<EotBookletQuiz[]>([]);
  const [questionType, setQuestionType] = useState<EotBookletQuizQuestionType>("multiple_choice");
  const [targetQuizId, setTargetQuizId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!bookletId) return;
    setLoading(true);
    const [content, quizRows] = await Promise.all([getBookletContent(bookletId), listBookletQuizzes(bookletId)]);
    setBooklet(content.booklet);
    setChapters(content.chapters);
    setQuizzes(quizRows);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load booklet quizzes.");
      setLoading(false);
    });
  }, [bookletId]);

  const selectedQuiz = useMemo(() => quizzes.find((quiz) => quiz.id === targetQuizId) ?? null, [quizzes, targetQuizId]);

  async function submit(form: HTMLFormElement) {
    if (!bookletId) return;
    const formData = new FormData(form);
    const options = questionType === "true_false" ? ["True", "False"] : String(formData.get("options") ?? "").split(/\r?\n/).map((option) => option.trim()).filter(Boolean);
    const question = {
      questionType,
      question: String(formData.get("question") ?? "").trim(),
      options,
      correctAnswer: String(formData.get("correctAnswer") ?? "").trim(),
      explanation: String(formData.get("explanation") ?? "").trim(),
      points: Number(formData.get("points") ?? 1) || 1,
    };
    const title = String(formData.get("title") ?? "").trim();
    const chapterId = String(formData.get("chapterId") ?? "").trim();
    const passMark = Number(formData.get("passMark") ?? 70) || 70;
    const input = selectedQuiz
      ? { ...selectedQuiz, questions: [...selectedQuiz.questions, question] }
      : { bookletId, chapterId, title, passMark, questions: [question] };
    setSaving(true);
    setError("");
    try {
      await saveBookletQuiz(input);
      setMessage(selectedQuiz ? "Question added to quiz." : "Quiz created.");
      form.reset();
      setQuestionType("multiple_choice");
      setTargetQuizId("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading quiz builder..." />;
  if (!booklet || !bookletId) return <ErrorState title="Booklet not found" message="Open quiz builder from a saved booklet." />;

  return (
    <section className="page grid gap-5">
      <PageHeader
        eyebrow={booklet.bookletCode}
        title="Booklet Quiz Builder"
        subtitle="Create offline-capable multiple choice, true/false, and short answer quizzes for this booklet."
        actions={[
          { label: "Booklet", to: `/studio/booklets/${booklet.id}` },
          { label: "Media", to: `/studio/booklets/${booklet.id}/media` },
          { label: "Build Pack", to: `/studio/booklets/${booklet.id}/build-pack`, primary: true },
        ]}
      />
      {message && <div className="border border-ledger bg-ledger/10 p-3 text-sm font-semibold text-ledger">{message}</div>}
      {error && <div className="border border-ember bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</div>}

      <form className="panel grid gap-3 p-4 md:grid-cols-2" onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget).catch((err) => setError(err instanceof Error ? err.message : "Could not save quiz."));
      }}>
        <h2 className="text-app md:col-span-2 text-xl font-black">Quiz setup</h2>
        <label><span className="label">Add to existing quiz</span><select className="field" value={targetQuizId} onChange={(event) => setTargetQuizId(event.currentTarget.value)}><option value="">Create new quiz</option>{quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}</select></label>
        <label><span className="label">Chapter scope</span><select className="field" name="chapterId" disabled={Boolean(selectedQuiz)} defaultValue=""><option value="">Whole booklet</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.chapterNumber}. {chapter.title}</option>)}</select></label>
        <label><span className="label">Quiz title</span><input className="field" name="title" required={!selectedQuiz} disabled={Boolean(selectedQuiz)} defaultValue={selectedQuiz?.title ?? ""} placeholder="Chapter comprehension check" /></label>
        <label><span className="label">Pass mark (%)</span><input className="field" name="passMark" type="number" min="1" max="100" required={!selectedQuiz} disabled={Boolean(selectedQuiz)} defaultValue={selectedQuiz?.passMark ?? 70} /></label>

        <h2 className="text-app md:col-span-2 mt-2 text-xl font-black">Question</h2>
        <label><span className="label">Question type</span><select className="field" value={questionType} onChange={(event) => setQuestionType(event.currentTarget.value as EotBookletQuizQuestionType)}><option value="multiple_choice">Multiple choice</option><option value="true_false">True/False</option><option value="short_answer">Short answer</option></select></label>
        <label><span className="label">Points</span><input className="field" name="points" type="number" min="1" defaultValue={1} /></label>
        <label className="md:col-span-2"><span className="label">Question</span><textarea className="field min-h-24" name="question" required /></label>
        {questionType === "multiple_choice" && <label className="md:col-span-2"><span className="label">Options, one per line</span><textarea className="field min-h-28" name="options" required placeholder={"A strong opening\nA weak ending\nA missing title"} /></label>}
        {questionType === "true_false" && <div className="surface-muted border-app border p-3 text-sm font-semibold text-muted md:col-span-2">Options are fixed as True and False.</div>}
        <label><span className="label">Correct answer</span><input className="field" name="correctAnswer" required placeholder={questionType === "true_false" ? "True" : ""} /></label>
        <label><span className="label">Explanation</span><input className="field" name="explanation" placeholder="Shown after completion" /></label>
        <button className="btn btn-primary md:col-span-2" type="submit" disabled={saving}>{saving ? "Saving..." : selectedQuiz ? "Add Question" : "Create Quiz"}</button>
      </form>

      <section className="panel divide-y divide-white/10">
        <div className="p-4">
          <h2 className="text-app text-xl font-black">Saved quizzes</h2>
          <p className="text-muted mt-2 text-sm leading-6">{quizzes.length} quizzes stored for this booklet.</p>
        </div>
        {quizzes.length === 0 && <div className="p-4"><EmptyState title="No quizzes yet" message="Create a quiz, then add questions to it." /></div>}
        {quizzes.map((quiz) => (
          <article key={quiz.id} className="grid gap-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-accent text-xs font-bold uppercase tracking-[0.14em]">{quiz.chapterId ? "Chapter quiz" : "Booklet quiz"} / pass {quiz.passMark}%</p>
                <h3 className="text-app mt-1 text-lg font-black">{quiz.title}</h3>
                <p className="text-muted mt-1 text-sm">{quiz.questions.length} questions / {quiz.questions.reduce((sum, question) => sum + Number(question.points || 0), 0)} points</p>
              </div>
              <button className="btn border-ember bg-ember/10 text-ember" type="button" onClick={async () => {
                if (!window.confirm("Delete this quiz?")) return;
                await deleteBookletQuiz(quiz.id);
                setMessage("Quiz deleted.");
                await load();
              }}>Delete</button>
            </div>
            <div className="grid gap-2">
              {quiz.questions.map((question, index) => (
                <div key={question.id} className="surface-muted border-app border p-3">
                  <p className="text-soft text-xs font-bold uppercase tracking-[0.12em]">Question {index + 1} / {question.questionType} / {question.points} points</p>
                  <p className="text-app mt-1 font-semibold">{question.question}</p>
                  <p className="text-muted mt-1 text-sm">Answer: {question.correctAnswer}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
