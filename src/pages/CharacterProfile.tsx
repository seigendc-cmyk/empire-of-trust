import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { MediaReferencePanel } from "../components/MediaReferencePanel";
import { ErrorState, LoadingState } from "../components/States";
import { listActors, listCastingAssignments } from "../lib/actorRepository";
import { getCharacterContext, listMasterCharacters } from "../lib/characterRepository";
import { logActivity } from "../lib/offlineDb";
import type { EotActor, EotCastingAssignment, EotCharacter, EotCharacterAppearance, EotCharacterTimelineEvent, EotRelationship } from "../types";

export default function CharacterProfile() {
  const { characterId } = useParams();
  const [character, setCharacter] = useState<EotCharacter | null>(null);
  const [relationships, setRelationships] = useState<EotRelationship[]>([]);
  const [appearances, setAppearances] = useState<EotCharacterAppearance[]>([]);
  const [timeline, setTimeline] = useState<EotCharacterTimelineEvent[]>([]);
  const [characters, setCharacters] = useState<EotCharacter[]>([]);
  const [actors, setActors] = useState<EotActor[]>([]);
  const [casting, setCasting] = useState<EotCastingAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!characterId) return;
    Promise.all([getCharacterContext(characterId), listMasterCharacters(), listActors(), listCastingAssignments()])
      .then(([context, allCharacters, actorRows, castingRows]) => {
        setCharacter(context.character ?? null);
        setRelationships(context.relationships);
        setAppearances(context.appearances);
        setTimeline(context.timeline);
        setCharacters(allCharacters);
        setActors(actorRows);
        setCasting(castingRows.filter((row) => row.characterId === characterId));
        logActivity("character_profile_opened", { targetType: "character", targetId: characterId }).catch(() => undefined);
      })
      .finally(() => setLoading(false));
  }, [characterId]);

  const lookup = useMemo(() => new Map(characters.map((row) => [row.id, row.displayName || row.name])), [characters]);

  if (loading) return <LoadingState label="Loading character profile..." />;
  if (!character || !characterId) return <ErrorState title="Character not found" message="This character is not available from Firestore or the local cache." />;

  return (
    <section className="page grid gap-4">
      <PageHeader
        eyebrow={character.characterCode || "Character"}
        title={character.displayName || character.name}
        subtitle={`${character.archetype || "Character"} / ${character.position || character.role || "Role pending"} / ${character.status || "active"}`}
        actions={[{ label: "Edit", to: `/characters/${characterId}/edit`, primary: true }, { label: "Graph", to: "/characters/relationships" }, { label: "Appearances", to: "/characters/appearances" }]}
      />
      <section className="panel grid gap-4 p-4 md:grid-cols-[220px_1fr]">
        <div className="h-72 border border-white/10 bg-black/20">
          {character.portraitUrl || character.imageUrl ? <img className="h-full w-full object-cover" src={character.portraitUrl || character.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-lg font-black text-signal">{character.characterCode}</div>}
        </div>
        <div className="grid gap-4">
          <section className="surface-muted border-app border p-4">
            <div className="flex flex-wrap gap-2">
              <span className="status-badge border-signal text-signal">{character.archetype || "Key Player"}</span>
              <span className="status-badge border-white/15 text-muted">Age {character.age || "-"}</span>
            </div>
            <h2 className="mt-3 text-2xl font-black">{character.position || character.role || character.occupation}</h2>
            {(character.signatureQuote || character.memorableQuotes?.[0]) && (
              <blockquote className="mt-4 border-l-2 border-signal bg-black/20 p-3 font-serif text-base font-bold leading-7 text-muted">
                {character.signatureQuote || character.memorableQuotes?.[0]}
              </blockquote>
            )}
          </section>
          <Info title="Story profile" rows={[
            ["Biography", character.biography || character.backstory],
            ["Current status", character.currentStoryStatus || character.currentStatus],
            ["Current conflict", character.currentConflict],
            ["Current goal", character.currentGoal],
          ]} />
          <Info title="Personality" rows={[
            ["Personality", character.personality],
            ["Core traits", (character.coreTraits ?? []).join(", ") || character.strengths],
            ["Strengths", character.strengths],
            ["Weaknesses", character.weaknesses],
            ["Ambitions", character.ambitions],
            ["Fears", character.fears],
            ["Values", character.values],
          ]} />
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <Info title="Memorable quotes" rows={(character.memorableQuotes?.length ? character.memorableQuotes : character.signatureQuote ? [character.signatureQuote] : []).map((quote, index) => [`Quote ${index + 1}`, quote])} />
        <Info title="Corporate role" rows={[
          ["Position", character.position || character.role],
          ["Occupation", character.occupation],
          ["Businesses owned", (character.businessesOwned ?? []).join(", ")],
          ["Executive roles", (character.executiveRoles ?? []).join(", ")],
          ["Shareholdings", (character.shareholdings ?? []).join(", ")],
        ]} />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <Info title="Identity" rows={[
          ["Name", [character.firstName, character.middleName, character.lastName].filter(Boolean).join(" ")],
          ["Nickname", character.nickname],
          ["Gender", character.gender],
          ["Date of birth", character.dateOfBirth],
          ["Age", String(character.age || "")],
          ["Nationality", character.nationality],
          ["Tribe", character.tribe],
          ["Language", character.language],
        ]} />
        <Info title="Physical profile" rows={[
          ["Description", character.physicalDescription],
          ["Height", character.height],
          ["Build", character.build],
          ["Complexion", character.complexion],
          ["Hair", character.hairStyle],
          ["Eyes", character.eyeColor],
        ]} />
      </section>
      <MediaReferencePanel entityType="character" entityId={characterId} title="Portrait, gallery, and prompt library" />
      <section className="grid gap-4 xl:grid-cols-3">
        <LinkList title="Family" ids={[character.father, character.mother, ...(character.children ?? []), ...(character.siblings ?? []), ...(character.spouses ?? []), ...(character.formerSpouses ?? [])].filter(Boolean) as string[]} lookup={lookup} base="/characters" />
        <LinkList title="Businesses" ids={[...(character.businessesOwned ?? []), ...(character.executiveRoles ?? []), ...(character.shareholdings ?? [])]} base="/businesses" lookup={new Map()} />
        <LinkList title="Assets" ids={[...(character.properties ?? character.propertyIds ?? []), ...(character.vehicles ?? character.vehicleIds ?? [])]} base="/assets" lookup={new Map()} />
      </section>
      <Casting assignments={casting} actors={actors} />
      <section className="panel p-4">
        <h2 className="text-xl font-black">Relationship graph links</h2>
        <div className="mt-4 grid gap-3">
          {relationships.map((rel) => {
            const other = [rel.characterA, rel.characterB, rel.fromCharacterId, rel.toCharacterId].find((id) => id && id !== characterId);
            return (
              <Link key={rel.id} className="border border-white/10 bg-black/20 p-3 hover:bg-white/5" to={other ? `/characters/${other}` : "/characters/relationships"}>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal">{rel.relationshipType || rel.type}</p>
                <h3 className="mt-1 font-black">{other ? lookup.get(other) ?? other : "Relationship record"}</h3>
                <p className="mt-1 text-sm text-paper/60">Strength {rel.relationshipStrength ?? "-"} / Trust {rel.trustLevel ?? "-"} / Conflict {rel.conflictLevel ?? "-"}</p>
              </Link>
            );
          })}
          {relationships.length === 0 && <p className="text-sm text-paper/60">No relationships cached yet.</p>}
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <Appearances rows={appearances} />
        <Timeline rows={timeline} />
      </section>
    </section>
  );
}

function Casting({ assignments, actors }: { assignments: EotCastingAssignment[]; actors: EotActor[] }) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">Casting</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {assignments.map((assignment) => {
          const actor = actors.find((item) => item.id === assignment.actorId);
          return (
            <Link key={assignment.id} className="grid gap-3 border border-white/10 bg-black/20 p-3 hover:bg-white/5 sm:grid-cols-[72px_1fr]" to={`/actors/${assignment.actorId}`}>
              <div className="h-20 border border-white/10 bg-black/30">
                {actor?.headshotUrl || actor?.imageUrl ? <img className="h-full w-full object-cover" src={actor.headshotUrl || actor.imageUrl} alt="" /> : <div className="grid h-full place-items-center text-xs font-black text-signal">ACT</div>}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal">{assignment.status} / {assignment.roleType}</p>
                <h3 className="mt-1 font-black">{actor?.fullName || actor?.name || assignment.actorId}</h3>
                {assignment.notes && <p className="mt-1 text-sm text-paper/60">{assignment.notes}</p>}
              </div>
            </Link>
          );
        })}
        {assignments.length === 0 && <p className="text-sm text-paper/60">No actor assigned yet.</p>}
      </div>
    </section>
  );
}

function Info({ title, rows }: { title: string; rows: Array<[string, string | undefined]> }) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">{title}</h2>
      <dl className="mt-3 grid gap-2">
        {rows.filter(([, value]) => value).map(([label, value]) => (
          <div key={label} className="border border-white/10 bg-black/20 p-3">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-paper/45">{label}</dt>
            <dd className="mt-1 text-sm leading-6 text-paper/75">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function LinkList({ title, ids, base, lookup }: { title: string; ids: string[]; base: string; lookup: Map<string, string> }) {
  return (
    <section className="panel p-4">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {ids.map((id) => <Link key={id} className="border border-signal px-3 py-2 text-sm font-bold text-signal" to={`${base}/${id}`}>{lookup.get(id) ?? id}</Link>)}
        {ids.length === 0 && <p className="text-sm text-paper/60">No links recorded.</p>}
      </div>
    </section>
  );
}

function Appearances({ rows }: { rows: EotCharacterAppearance[] }) {
  return <section className="panel p-4"><h2 className="text-xl font-black">Story presence</h2><div className="mt-3 grid gap-2">{rows.map((row) => <p key={row.id} className="border border-white/10 bg-black/20 p-3 text-sm text-paper/70">S{row.seasonNumber}E{row.episodeNumber} C{row.chapterNumber} / {row.importance} / impact {row.storyImpactScore}</p>)}{rows.length === 0 && <p className="text-sm text-paper/60">No appearances tracked.</p>}</div></section>;
}

function Timeline({ rows }: { rows: EotCharacterTimelineEvent[] }) {
  return <section className="panel p-4"><h2 className="text-xl font-black">Timeline</h2><div className="mt-3 grid gap-2">{rows.map((row) => <div key={row.id} className="border border-white/10 bg-black/20 p-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-signal">{row.eventType} / {row.eventDate}</p><h3 className="mt-1 font-black">{row.title}</h3><p className="mt-1 text-sm text-paper/60">{row.description}</p></div>)}{rows.length === 0 && <p className="text-sm text-paper/60">No timeline events tracked.</p>}</div></section>;
}
