import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import type { Book, SeriesEpisode, SeriesProject, SeriesSeason } from '../../types';
import { auth, googleProvider } from '../../lib/firebase';
import { getAllLocalBooks } from '../../lib/sqlite';
import {
  getEpisodesForSeries, getSeasonsForSeries, getSeriesProject,
} from '../../lib/seriesRepository';
import { useStaffRoute } from '../../contexts/StaffRouteContext';
import { BookStudio } from '../studio/BookStudio';
import { SeriesBookStudio } from '../studio/SeriesBookStudio';
import { InteractiveSeriesProductionStudio } from '../studio/series/InteractiveSeriesProductionStudio';

const staffIdentity = (user: NonNullable<ReturnType<typeof useStaffRoute>['user']>) => ({
  uid: user.uid,
  name: user.displayName || user.email || 'Staff User',
});

export const StaffLoginRoute: React.FC = () => {
  const { resolved, user } = useStaffRoute();
  const location = useLocation();
  const [error, setError] = useState('');
  const destination = (location.state as { from?: string } | null)?.from || '/staff';
  if (resolved && user && !user.isAnonymous) return <Navigate to={destination} replace />;
  return <div className="grid min-h-screen place-items-center bg-[#24282c] p-4 text-white">
    <section className="w-full max-w-md border border-white/15 bg-[#2d3237] p-7">
      <p className="text-[10px] font-bold uppercase text-[#ff8e5e]">Protected staff portal</p>
      <h1 className="mt-2 text-2xl font-extrabold">Staff Login</h1>
      <p className="mt-2 text-sm text-gray-300">Authenticate with Firebase to open Book Builder or Series Studio.</p>
      <button onClick={() => void signInWithPopup(auth, googleProvider).catch((cause) => setError(cause instanceof Error ? cause.message : 'Sign in failed.'))} className="mt-5 w-full bg-[#ff6321] px-4 py-3 text-sm font-bold">Continue with Google</button>
      {error && <p role="alert" className="mt-3 border border-red-400 p-3 text-xs">{error}</p>}
    </section>
  </div>;
};

export const StaffDashboardRoute: React.FC = () => (
  <section className="p-5 sm:p-8">
    <p className="text-[10px] font-bold uppercase text-[#ff6321]">Staff dashboard</p>
    <h1 className="mt-1 text-2xl font-extrabold">Publishing workspaces</h1>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <a href="/staff/books" className="border bg-white p-5"><strong>Book Builder</strong><p className="mt-1 text-sm text-[#666]">Create and publish individual books.</p></a>
      <a href="/staff/series" className="border bg-white p-5"><strong>Series Studio</strong><p className="mt-1 text-sm text-[#666]">Plan series, seasons, and episodes.</p></a>
    </div>
  </section>
);

export const BookBuilderRoute: React.FC = () => {
  const { bookId } = useParams();
  const { user } = useStaffRoute();
  const profile = user ? {
    uid: user.uid, email: user.email || '', displayName: user.displayName || 'Staff User',
    photoURL: user.photoURL || undefined, phoneNumber: user.phoneNumber || '',
    deviceId: 'staff-browser', registeredAt: new Date().toISOString(),
  } : null;
  return <BookStudio user={profile} onOpenAuth={() => undefined} initialBookId={bookId} />;
};

export const SeriesStudioRoute: React.FC = () => {
  const { seriesId } = useParams();
  const { user } = useStaffRoute();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const loadBooks = async () => {
    const next = await getAllLocalBooks();
    setBooks(next);
    return next;
  };
  useEffect(() => { void loadBooks(); }, []);
  if (!user) return null;
  const identity = staffIdentity(user);
  return <SeriesBookStudio
    books={books}
    initialSeriesId={seriesId}
    currentUserId={identity.uid}
    currentUserName={identity.name}
    onBackToBooks={() => navigate('/staff/books')}
    onBooksChanged={loadBooks}
    onOpenProduction={(id) => navigate(`/staff/series/${id}/production`)}
    onOpenBook={(book) => navigate(`/staff/books/${book.id}`)}
  />;
};

export const InteractiveProductionRoute: React.FC = () => {
  const { seriesId } = useParams();
  const { user } = useStaffRoute();
  const navigate = useNavigate();
  const [project, setProject] = useState<SeriesProject | null>();
  const [seasons, setSeasons] = useState<SeriesSeason[]>([]);
  const [episodes, setEpisodes] = useState<SeriesEpisode[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!seriesId) return;
    let active = true;
    void Promise.all([
      getSeriesProject(seriesId), getSeasonsForSeries(seriesId), getEpisodesForSeries(seriesId),
    ]).then(([nextProject, nextSeasons, nextEpisodes]) => {
      if (!active) return;
      setProject(nextProject); setSeasons(nextSeasons); setEpisodes(nextEpisodes);
    }).catch((cause) => active && setError(cause instanceof Error ? cause.message : 'Unable to load production console.'));
    return () => { active = false; };
  }, [seriesId]);
  if (!user) return null;
  if (error) return <p role="alert" className="m-5 border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>;
  if (project === undefined) return <div role="status" className="grid min-h-[50vh] place-items-center text-sm font-bold">Loading production console…</div>;
  if (!project) return <div className="p-8"><h1 className="text-xl font-extrabold">Series not found</h1><button onClick={() => navigate('/staff/series')} className="mt-4 border px-3 py-2 text-xs font-bold">Back to Series Studio</button></div>;
  const identity = staffIdentity(user);
  return <div className="p-3 sm:p-5">
    <button onClick={() => navigate(`/staff/series/${project.id}`)} className="mb-3 border bg-white px-3 py-2 text-xs font-bold">← Series Studio</button>
    <InteractiveSeriesProductionStudio
      project={project} seasons={seasons} episodes={episodes}
      currentUserId={identity.uid} currentUserName={identity.name}
    />
  </div>;
};
