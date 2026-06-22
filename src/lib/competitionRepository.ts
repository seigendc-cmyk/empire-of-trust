import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "./firebase";
import {
  awardReaderBadge,
  readerDb,
  refreshLocalRanking,
  savePollVote,
  saveQuizAttempt,
  saveReaderPrediction,
  type ReaderPollVote,
  type ReaderPredictionSubmission,
  type ReaderQuizAttempt,
  type ReaderRanking,
} from "./offlineDb";
import type { EotBadgeDefinition, EotLeaderboardEntry, EotPoll, EotPrediction, EotQuiz, EotRewardDefinition } from "../types";

export const badgeCatalog: EotBadgeDefinition[] = [
  { id: "gateway_reader", badgeCode: "gateway_reader", title: "Gateway Reader", description: "Complete the first Empire of Trust episode.", icon: "GR" },
  { id: "boardroom_predictor", badgeCode: "boardroom_predictor", title: "Boardroom Predictor", description: "Submit the first story prediction.", icon: "BP" },
  { id: "empire_follower", badgeCode: "empire_follower", title: "Empire Follower", description: "Complete three Empire of Trust episodes.", icon: "EF" },
  { id: "corporate_strategist", badgeCode: "business_strategist", title: "Corporate Strategist", description: "Make a business decision.", icon: "CS" },
  { id: "succession_expert", badgeCode: "succession_analyst", title: "Succession Expert", description: "Make a succession choice.", icon: "SE" },
  { id: "market_analyst", badgeCode: "market_analyst", title: "Market Analyst", description: "Vote in market-focused polls.", icon: "MA" },
  { id: "quiz_master", badgeCode: "quiz_master", title: "Quiz Master", description: "Complete three quizzes.", icon: "QM" },
  { id: "top_reader", badgeCode: "top_reader", title: "Top Reader", description: "Reach 500 local points.", icon: "TR" },
];

export const rewardCatalog: EotRewardDefinition[] = [
  { id: "import_pack", title: "Import Pack", description: "Import an episode or vendor pack.", points: 10, trigger: "pack_imported" },
  { id: "open_episode", title: "Open Episode", description: "Open an offline episode.", points: 5, trigger: "episode_opened" },
  { id: "complete_episode", title: "Complete Episode", description: "Finish reading an episode.", points: 25, trigger: "episode_completed" },
  { id: "submit_prediction", title: "Submit Prediction", description: "Submit a prediction.", points: 10, trigger: "prediction_submitted" },
  { id: "vote_poll", title: "Vote in Poll", description: "Vote in a poll.", points: 5, trigger: "poll_voted" },
  { id: "complete_quiz", title: "Complete Quiz", description: "Complete a quiz.", points: 20, trigger: "quiz_completed" },
  { id: "earn_badge", title: "Earn Badge", description: "Earn a local badge.", points: 0, trigger: "badge_earned" },
];

function withId<T>(snapshot: { id: string; data: () => unknown }) {
  return { id: snapshot.id, ...(snapshot.data() as object) } as T;
}

function normalizeOptions(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function normalizeQuiz(value: EotQuiz): EotQuiz {
  return {
    ...value,
    questions: Array.isArray(value.questions)
      ? value.questions.map((question) => ({ ...question, options: normalizeOptions(question.options), points: Number(question.points || 0) }))
      : [],
  };
}

async function listFromFirestore<T>(collectionName: string, orderField: string) {
  const snapshots = await getDocs(query(collection(db, collectionName), orderBy(orderField)));
  return snapshots.docs.map((item) => withId<T>(item));
}

async function getFromFirestore<T>(collectionName: string, id: string) {
  const snapshot = await getDoc(doc(db, collectionName, id));
  if (!snapshot.exists()) return undefined;
  return withId<T>(snapshot);
}

export async function listQuizzes() {
  try {
    const rows = (await listFromFirestore<EotQuiz>("eotQuizzes", "createdAt")).map(normalizeQuiz);
    await readerDb.quizCache.bulkPut(rows);
    return rows;
  } catch {
    return readerDb.quizCache.toArray();
  }
}

export async function getQuiz(quizId: string) {
  try {
    const row = await getFromFirestore<EotQuiz>("eotQuizzes", quizId);
    if (row) {
      const quiz = normalizeQuiz(row);
      await readerDb.quizCache.put(quiz);
      return quiz;
    }
  } catch {
    return readerDb.quizCache.get(quizId);
  }
  return readerDb.quizCache.get(quizId);
}

export async function listPolls() {
  try {
    const rows = await listFromFirestore<EotPoll>("eotPolls", "createdAt");
    await readerDb.pollCache.bulkPut(rows.map((poll) => ({ ...poll, options: normalizeOptions(poll.options) })));
    return rows.map((poll) => ({ ...poll, options: normalizeOptions(poll.options) }));
  } catch {
    return readerDb.pollCache.toArray();
  }
}

export async function getPoll(pollId: string) {
  try {
    const row = await getFromFirestore<EotPoll>("eotPolls", pollId);
    if (row) {
      const poll = { ...row, options: normalizeOptions(row.options) };
      await readerDb.pollCache.put(poll);
      return poll;
    }
  } catch {
    return readerDb.pollCache.get(pollId);
  }
  return readerDb.pollCache.get(pollId);
}

export async function listPredictions() {
  try {
    const rows = await listFromFirestore<EotPrediction>("eotPredictions", "closingDate");
    await readerDb.predictionCache.bulkPut(rows.map((prediction) => ({ ...prediction, options: normalizeOptions(prediction.options) })));
    return rows.map((prediction) => ({ ...prediction, options: normalizeOptions(prediction.options) }));
  } catch {
    return readerDb.predictionCache.toArray();
  }
}

export async function getPrediction(predictionId: string) {
  try {
    const row = await getFromFirestore<EotPrediction>("eotPredictions", predictionId);
    if (row) {
      const prediction = { ...row, options: normalizeOptions(row.options) };
      await readerDb.predictionCache.put(prediction);
      return prediction;
    }
  } catch {
    return readerDb.predictionCache.get(predictionId);
  }
  return readerDb.predictionCache.get(predictionId);
}

export async function listLeaderboard(period: "weekly" | "monthly" | "allTime") {
  try {
    const snapshots = await getDocs(query(collection(db, "eotLeaderboard"), where("period", "==", period), orderBy("points", "desc")));
    const rows = snapshots.docs.map((item) => withId<EotLeaderboardEntry>(item));
    await readerDb.leaderboardCache.bulkPut(rows);
    return rows;
  } catch {
    return readerDb.leaderboardCache.where("period").equals(period).reverse().sortBy("points");
  }
}

export async function getLocalCompetitionSummary() {
  const ranking = await refreshLocalRanking();
  const [quizAttempts, pollVotes, predictions, rewards, badges] = await Promise.all([
    readerDb.readerQuizAttempts.where("readerId").equals(ranking.readerId).toArray(),
    readerDb.readerPollVotes.where("readerId").equals(ranking.readerId).toArray(),
    readerDb.readerPredictions.where("readerId").equals(ranking.readerId).toArray(),
    readerDb.readerRewards.where("readerId").equals(ranking.readerId).toArray(),
    readerDb.readerBadges.where("readerId").equals(ranking.readerId).toArray(),
  ]);
  return { ranking, quizAttempts, pollVotes, predictions, rewards, badges };
}

export async function submitQuiz(quiz: EotQuiz, answers: Record<number, string>) {
  const score = quiz.questions.reduce((sum, question, index) => sum + (answers[index] === question.correctAnswer ? Number(question.points || 0) : 0), 0);
  const maxScore = quiz.questions.reduce((sum, question) => sum + Number(question.points || 0), 0);
  const attempt = await saveQuizAttempt({ quizId: quiz.id, episodeId: quiz.episodeId, score, maxScore, answersJson: JSON.stringify(answers), title: quiz.title });
  if (score === maxScore && maxScore > 0) {
    await awardReaderBadge({ badgeCode: "quiz_master", title: "Quiz Master", description: "Scored full marks on an Empire of Trust quiz.", icon: "QM" });
  }
  return attempt;
}

export async function submitPoll(poll: EotPoll, selectedOption: string) {
  const vote = await savePollVote({ pollId: poll.id, episodeId: poll.episodeId, selectedOption, optionsJson: JSON.stringify(poll.options), question: poll.question });
  if (poll.question.toLowerCase().includes("market") || poll.title.toLowerCase().includes("market")) {
    await awardReaderBadge({ badgeCode: "market_analyst", title: "Market Analyst", description: "Participated in a market-focused poll.", icon: "MA" });
  }
  return vote;
}

export async function submitPrediction(prediction: EotPrediction, selectedOption: string) {
  return saveReaderPrediction({ predictionId: prediction.id, episodeId: prediction.episodeId, selectedOption, optionsJson: JSON.stringify(prediction.options), question: prediction.question });
}

export async function getReaderQuizHistory(): Promise<ReaderQuizAttempt[]> {
  const summary = await getLocalCompetitionSummary();
  return summary.quizAttempts.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export async function getReaderPollVotes(): Promise<ReaderPollVote[]> {
  const summary = await getLocalCompetitionSummary();
  return summary.pollVotes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReaderPredictionSubmissions(): Promise<ReaderPredictionSubmission[]> {
  const summary = await getLocalCompetitionSummary();
  return summary.predictions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReaderRanking(): Promise<ReaderRanking> {
  return refreshLocalRanking();
}
