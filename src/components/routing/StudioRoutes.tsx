import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Book, SeriesEpisode, SeriesProject, SeriesSeason } from '../../types';
import { getAllLocalBooks } from '../../lib/sqlite';
import {
  getEpisodesForSeries, getSeasonsForSeries, getSeriesProject,
} from '../../lib/seriesRepository';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { BookStudio } from '../studio/BookStudio';
import { SeriesBookStudio } from '../studio/SeriesBookStudio';
import { InteractiveSeriesProductionStudio } from '../studio/series/InteractiveSeriesProductionStudio';

const staffIdentity = (user: NonNullable<ReturnType<typeof useStaffAuth>['firebaseUser']>) => ({
  uid: user.uid,
  name: user.displayName || user.email || 'Staff User',
});

export const BookBuilderRoute: React.FC = () => {
  const { bookId } = useParams();
  const { firebaseUser, staffUser } = useStaffAuth();
  const profile = firebaseUser && staffUser ? {
    uid: firebaseUser.uid,
    email: firebaseUser.email || staffUser.email,
    displayName: firebaseUser.displayName || staffUser.displayName,
    photoURL: firebaseUser.photoURL || undefined,
    phoneNumber: firebaseUser.phoneNumber || '',
    deviceId: 'staff-browser', registeredAt: new Date().toISOString(),
  } : null;
  return <BookStudio user={profile} onOpenAuth={() => undefined} initialBookId={bookId} />;
};

export const SeriesStudioRoute: React.FC = () => {
  const { seriesId } = useParams();
  const { firebaseUser } = useStaffAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const loadBooks = async () => {
    const next = await getAllLocalBooks();
    setBooks(next);
    return next;
  };
  useEffect(() => { void loadBooks(); }, []);
  if (!firebaseUser) return null;
  const identity = staffIdentity(firebaseUser);
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
  const { firebaseUser } = useStaffAuth();
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
  if (!firebaseUser) return null;
  if (error) return <p role="alert" className="m-5 border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>;
  if (project === undefined) return <div role="status" className="grid min-h-[50vh] place-items-center text-sm font-bold">Loading production console…</div>;
  if (!project) return <div className="p-8"><h1 className="text-xl font-extrabold">Series not found</h1><button onClick={() => navigate('/staff/series')} className="mt-4 border px-3 py-2 text-xs font-bold">Back to Series Studio</button></div>;
  const identity = staffIdentity(firebaseUser);
  return <div className="p-3 sm:p-5">
    <button onClick={() => navigate(`/staff/series/${project.id}`)} className="mb-3 border bg-white px-3 py-2 text-xs font-bold">← Series Studio</button>
    <InteractiveSeriesProductionStudio
      project={project} seasons={seasons} episodes={episodes}
      currentUserId={identity.uid} currentUserName={identity.name}
    />
  </div>;
};
