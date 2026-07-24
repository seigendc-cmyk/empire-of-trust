import type { Database, QueryExecResult } from 'sql.js';
import {
  Book,
  EpisodeProductionChecklist,
  SeriesContinuityRule,
  SeriesEpisode,
  SeriesLocation,
  SeriesObject,
  SeriesProject,
  SeriesRelationship,
  SeriesSeason,
  SeriesStoryArc,
  SeriesTimelineEvent,
} from '../types';
import {
  getAllLocalBooks,
  getSQLiteDB,
  runSQLiteTransaction,
  writeBookToSQLiteTransaction,
} from './sqlite';

type SqlValue = string | number | null;
type SeriesOwnedRecord =
  | SeriesStoryArc
  | SeriesTimelineEvent
  | SeriesContinuityRule
  | SeriesLocation
  | SeriesObject
  | SeriesRelationship;

export interface SeriesContinuityWarning {
  code: string;
  severity: 'warning' | 'error';
  message: string;
  episodeId?: string;
}

export interface SeriesReadiness {
  contentReady: boolean;
  commercialReady: boolean;
  securityReady: boolean;
  published: boolean;
  missing: string[];
}

export interface CreateSeriesStructureInput {
  project: Partial<SeriesProject> & Pick<SeriesProject, 'title'>;
  seasonCount: number;
  episodesPerSeason: number;
  characterIds?: string[];
  newCharacterNames?: string[];
  characterHostBook?: Book;
}

const now = () => new Date().toISOString();
const makeId = (prefix: string) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const json = (value: unknown) => JSON.stringify(value ?? []);
const parseJson = <T>(value: unknown, fallback: T): T => {
  try {
    return value ? JSON.parse(String(value)) as T : fallback;
  } catch {
    return fallback;
  }
};
const bool = (value: unknown) => Number(value) === 1;

function execute(db: Database, sql: string, params: SqlValue[] = []): QueryExecResult[] {
  return db.exec(sql, params);
}

function row(db: Database, sql: string, params: SqlValue[] = []): SqlValue[] | undefined {
  return execute(db, sql, params)[0]?.values[0] as SqlValue[] | undefined;
}

function rows(db: Database, sql: string, params: SqlValue[] = []): SqlValue[][] {
  return (execute(db, sql, params)[0]?.values ?? []) as SqlValue[][];
}

function projectDefaults(input: Partial<SeriesProject> & Pick<SeriesProject, 'title'>): SeriesProject {
  const timestamp = now();
  return {
    id: input.id || makeId('series'),
    title: input.title.trim(),
    subtitle: input.subtitle || '',
    description: input.description || '',
    genre: input.genre || '',
    subGenres: input.subGenres || [],
    targetAudience: input.targetAudience || '',
    language: input.language || 'English (US)',
    status: input.status || 'concept',
    authorIds: input.authorIds || [],
    publisherId: input.publisherId || '',
    coverAssetId: input.coverAssetId,
    bannerAssetId: input.bannerAssetId,
    theme: input.theme || '',
    premise: input.premise || '',
    centralConflict: input.centralConflict || '',
    seriesPromise: input.seriesPromise || '',
    intendedReaderValue: input.intendedReaderValue || '',
    plannedSeasonCount: Math.max(1, input.plannedSeasonCount || 1),
    plannedEpisodeCount: Math.max(1, input.plannedEpisodeCount || 1),
    episodeNamingConvention: input.episodeNamingConvention || 'Episode {number}',
    numberingFormat: input.numberingFormat || 'S{season}E{episode}',
    worldDescription: input.worldDescription || '',
    historicalBackground: input.historicalBackground || '',
    culturalNotes: input.culturalNotes || '',
    organizations: input.organizations || [],
    terminology: input.terminology || [],
    systemRules: input.systemRules || [],
    releaseModel: input.releaseModel || 'irregular',
    pricingStrategy: input.pricingStrategy || '',
    createdAt: input.createdAt || timestamp,
    updatedAt: input.updatedAt || timestamp,
  };
}

function seasonDefaults(
  input: Partial<SeriesSeason> & Pick<SeriesSeason, 'seriesId' | 'seasonNumber' | 'title'>
): SeriesSeason {
  const timestamp = now();
  return {
    id: input.id || makeId('season'),
    seriesId: input.seriesId,
    seasonNumber: input.seasonNumber,
    title: input.title.trim(),
    subtitle: input.subtitle || '',
    synopsis: input.synopsis || '',
    theme: input.theme || '',
    centralConflict: input.centralConflict || '',
    openingSituation: input.openingSituation || '',
    climax: input.climax || '',
    resolution: input.resolution || '',
    nextSeasonHook: input.nextSeasonHook || '',
    status: input.status || 'planned',
    plannedReleaseDate: input.plannedReleaseDate,
    orderIndex: input.orderIndex ?? Math.max(0, input.seasonNumber - 1),
    createdAt: input.createdAt || timestamp,
    updatedAt: input.updatedAt || timestamp,
  };
}

function episodeDefaults(
  input: Partial<SeriesEpisode> &
    Pick<SeriesEpisode, 'seriesId' | 'seasonId' | 'episodeNumber' | 'title'>
): SeriesEpisode {
  const timestamp = now();
  return {
    id: input.id || makeId('episode'),
    seriesId: input.seriesId,
    seasonId: input.seasonId,
    linkedBookId: input.linkedBookId,
    episodeNumber: input.episodeNumber,
    title: input.title.trim(),
    subtitle: input.subtitle || '',
    logline: input.logline || '',
    synopsis: input.synopsis || '',
    openingHook: input.openingHook || '',
    previousEpisodeRecap: input.previousEpisodeRecap || '',
    episodeGoal: input.episodeGoal || '',
    centralConflict: input.centralConflict || '',
    stakes: input.stakes || '',
    subplots: input.subplots || [],
    midpointTurn: input.midpointTurn || '',
    climax: input.climax || '',
    resolution: input.resolution || '',
    cliffhanger: input.cliffhanger || '',
    nextEpisodeTeaser: input.nextEpisodeTeaser || '',
    requiredCharacterIds: input.requiredCharacterIds || [],
    locationIds: input.locationIds || [],
    objectIds: input.objectIds || [],
    continuityObligations: input.continuityObligations || [],
    releaseDate: input.releaseDate,
    writingDeadline: input.writingDeadline,
    editingDeadline: input.editingDeadline,
    coverDeadline: input.coverDeadline,
    signingDeadline: input.signingDeadline,
    marketingLaunchDate: input.marketingLaunchDate,
    status: input.status || 'planned',
    wordCountTarget: Math.max(0, input.wordCountTarget || 0),
    orderIndex: input.orderIndex ?? Math.max(0, input.episodeNumber - 1),
    createdAt: input.createdAt || timestamp,
    updatedAt: input.updatedAt || timestamp,
  };
}

function insertProject(db: Database, project: SeriesProject): void {
  db.run(
    `INSERT INTO series_projects (
      id, title, subtitle, description, genre, sub_genres_json, target_audience, language,
      status, author_ids_json, publisher_id, cover_asset_id, banner_asset_id, theme, premise,
      central_conflict, series_promise, intended_reader_value, planned_season_count,
      planned_episode_count, episode_naming_convention, numbering_format, world_description,
      historical_background, cultural_notes, organizations_json, terminology_json,
      system_rules_json, release_model, pricing_strategy, created_at, updated_at
    ) VALUES (${Array(32).fill('?').join(',')});`,
    [
      project.id, project.title, project.subtitle, project.description, project.genre,
      json(project.subGenres), project.targetAudience, project.language, project.status,
      json(project.authorIds), project.publisherId, project.coverAssetId || null,
      project.bannerAssetId || null, project.theme, project.premise, project.centralConflict,
      project.seriesPromise, project.intendedReaderValue, project.plannedSeasonCount,
      project.plannedEpisodeCount, project.episodeNamingConvention, project.numberingFormat,
      project.worldDescription, project.historicalBackground, project.culturalNotes,
      json(project.organizations), json(project.terminology), json(project.systemRules),
      project.releaseModel, project.pricingStrategy, project.createdAt, project.updatedAt,
    ]
  );
}

function updateProjectRow(db: Database, project: SeriesProject): void {
  db.run(
    `UPDATE series_projects SET
      title=?, subtitle=?, description=?, genre=?, sub_genres_json=?, target_audience=?,
      language=?, status=?, author_ids_json=?, publisher_id=?, cover_asset_id=?,
      banner_asset_id=?, theme=?, premise=?, central_conflict=?, series_promise=?,
      intended_reader_value=?, planned_season_count=?, planned_episode_count=?,
      episode_naming_convention=?, numbering_format=?, world_description=?,
      historical_background=?, cultural_notes=?, organizations_json=?, terminology_json=?,
      system_rules_json=?, release_model=?, pricing_strategy=?, updated_at=?
     WHERE id=?;`,
    [
      project.title, project.subtitle, project.description, project.genre, json(project.subGenres),
      project.targetAudience, project.language, project.status, json(project.authorIds),
      project.publisherId, project.coverAssetId || null, project.bannerAssetId || null,
      project.theme, project.premise, project.centralConflict, project.seriesPromise,
      project.intendedReaderValue, project.plannedSeasonCount, project.plannedEpisodeCount,
      project.episodeNamingConvention, project.numberingFormat, project.worldDescription,
      project.historicalBackground, project.culturalNotes, json(project.organizations),
      json(project.terminology), json(project.systemRules), project.releaseModel,
      project.pricingStrategy, project.updatedAt, project.id,
    ]
  );
}

function mapProject(value: SqlValue[]): SeriesProject {
  return {
    id: String(value[0]), title: String(value[1]), subtitle: String(value[2] || ''),
    description: String(value[3] || ''), genre: String(value[4] || ''),
    subGenres: parseJson(value[5], []), targetAudience: String(value[6] || ''),
    language: String(value[7] || ''), status: String(value[8]) as SeriesProject['status'],
    authorIds: parseJson(value[9], []), publisherId: String(value[10] || ''),
    coverAssetId: value[11] ? String(value[11]) : undefined,
    bannerAssetId: value[12] ? String(value[12]) : undefined, theme: String(value[13] || ''),
    premise: String(value[14] || ''), centralConflict: String(value[15] || ''),
    seriesPromise: String(value[16] || ''), intendedReaderValue: String(value[17] || ''),
    plannedSeasonCount: Number(value[18]), plannedEpisodeCount: Number(value[19]),
    episodeNamingConvention: String(value[20] || ''), numberingFormat: String(value[21] || ''),
    worldDescription: String(value[22] || ''), historicalBackground: String(value[23] || ''),
    culturalNotes: String(value[24] || ''), organizations: parseJson(value[25], []),
    terminology: parseJson(value[26], []), systemRules: parseJson(value[27], []),
    releaseModel: String(value[28]) as SeriesProject['releaseModel'],
    pricingStrategy: String(value[29] || ''), createdAt: String(value[30]),
    updatedAt: String(value[31]),
  };
}

const projectSelect = `SELECT id,title,subtitle,description,genre,sub_genres_json,target_audience,
  language,status,author_ids_json,publisher_id,cover_asset_id,banner_asset_id,theme,premise,
  central_conflict,series_promise,intended_reader_value,planned_season_count,
  planned_episode_count,episode_naming_convention,numbering_format,world_description,
  historical_background,cultural_notes,organizations_json,terminology_json,system_rules_json,
  release_model,pricing_strategy,created_at,updated_at FROM series_projects`;

export async function createSeriesProject(
  input: Partial<SeriesProject> & Pick<SeriesProject, 'title'>
): Promise<SeriesProject> {
  if (!input.title.trim()) throw new Error('Series title is required.');
  const project = projectDefaults(input);
  await runSQLiteTransaction((db) => insertProject(db, project));
  return project;
}

export async function createSeriesWithStructure(input: CreateSeriesStructureInput): Promise<SeriesProject> {
  const seasonCount = Math.max(1, input.seasonCount);
  const episodesPerSeason = Math.max(0, input.episodesPerSeason);
  const project = projectDefaults({
    ...input.project,
    plannedSeasonCount: seasonCount,
    plannedEpisodeCount: seasonCount * episodesPerSeason,
  });
  await runSQLiteTransaction((db) => {
    insertProject(db, project);
    for (let seasonNumber = 1; seasonNumber <= seasonCount; seasonNumber += 1) {
      const season = seasonDefaults({
        seriesId: project.id,
        seasonNumber,
        title: `Season ${seasonNumber}`,
      });
      insertSeason(db, season);
      for (let episodeNumber = 1; episodeNumber <= episodesPerSeason; episodeNumber += 1) {
        insertEpisode(db, episodeDefaults({
          seriesId: project.id,
          seasonId: season.id,
          episodeNumber,
          title: `Episode ${episodeNumber}`,
        }));
      }
    }
    const createdCharacters = (input.newCharacterNames || []).map((name) => ({
      id: makeId('character'),
      name,
      role: 'Supporting',
      bio: '',
      images: [],
      aliases: [],
      assetIds: [],
    }));
    if (createdCharacters.length > 0) {
      if (!input.characterHostBook) {
        throw new Error('Choose a Book Studio manuscript to own newly created characters.');
      }
      writeBookToSQLiteTransaction(db, {
        ...input.characterHostBook,
        characters: [...(input.characterHostBook.characters || []), ...createdCharacters],
        updatedAt: now(),
      });
    }
    [...(input.characterIds || []), ...createdCharacters.map((character) => character.id)]
      .forEach((characterId) => {
        const characterName = createdCharacters.find((character) => character.id === characterId)?.name || 'Character';
        db.run(
          `INSERT INTO series_story_arcs (
            id,series_id,character_id,title,description,arc_type,status,milestones_json
          ) VALUES (?,?,?,?,?,?,?,?);`,
          [makeId('arc'), project.id, characterId, `${characterName} Arc`, '', 'character', 'planned', '[]']
        );
      });
  });
  return project;
}

export async function updateSeriesProject(
  id: string,
  update: Partial<SeriesProject>
): Promise<SeriesProject> {
  const current = await getSeriesProject(id);
  if (!current) throw new Error('Series project not found.');
  const project = { ...current, ...update, id, updatedAt: now() };
  await runSQLiteTransaction((db) => updateProjectRow(db, project));
  return project;
}

export async function deleteSeriesProject(id: string, confirmed = false): Promise<void> {
  if (!confirmed) throw new Error('Series deletion requires explicit confirmation.');
  await runSQLiteTransaction((db) => db.run('DELETE FROM series_projects WHERE id=?;', [id]));
}

export async function getSeriesProject(id: string): Promise<SeriesProject | null> {
  const db = await getSQLiteDB();
  const value = row(db, `${projectSelect} WHERE id=?;`, [id]);
  return value ? mapProject(value) : null;
}

export async function getAllSeriesProjects(): Promise<SeriesProject[]> {
  const db = await getSQLiteDB();
  return rows(db, `${projectSelect} ORDER BY updated_at DESC;`).map(mapProject);
}

function insertSeason(db: Database, season: SeriesSeason): void {
  db.run(
    `INSERT INTO series_seasons (
      id,series_id,season_number,title,subtitle,synopsis,theme,central_conflict,
      opening_situation,climax,resolution,next_season_hook,status,planned_release_date,
      order_index,created_at,updated_at
    ) VALUES (${Array(17).fill('?').join(',')});`,
    [
      season.id, season.seriesId, season.seasonNumber, season.title, season.subtitle,
      season.synopsis, season.theme, season.centralConflict, season.openingSituation,
      season.climax, season.resolution, season.nextSeasonHook, season.status,
      season.plannedReleaseDate || null, season.orderIndex, season.createdAt, season.updatedAt,
    ]
  );
}

function mapSeason(value: SqlValue[]): SeriesSeason {
  return {
    id: String(value[0]), seriesId: String(value[1]), seasonNumber: Number(value[2]),
    title: String(value[3]), subtitle: String(value[4] || ''), synopsis: String(value[5] || ''),
    theme: String(value[6] || ''), centralConflict: String(value[7] || ''),
    openingSituation: String(value[8] || ''), climax: String(value[9] || ''),
    resolution: String(value[10] || ''), nextSeasonHook: String(value[11] || ''),
    status: String(value[12]) as SeriesSeason['status'],
    plannedReleaseDate: value[13] ? String(value[13]) : undefined,
    orderIndex: Number(value[14]), createdAt: String(value[15]), updatedAt: String(value[16]),
  };
}

const seasonSelect = `SELECT id,series_id,season_number,title,subtitle,synopsis,theme,
  central_conflict,opening_situation,climax,resolution,next_season_hook,status,
  planned_release_date,order_index,created_at,updated_at FROM series_seasons`;

export async function createSeason(
  input: Partial<SeriesSeason> & Pick<SeriesSeason, 'seriesId' | 'seasonNumber' | 'title'>
): Promise<SeriesSeason> {
  const season = seasonDefaults(input);
  await runSQLiteTransaction((db) => insertSeason(db, season));
  return season;
}

export async function updateSeason(id: string, update: Partial<SeriesSeason>): Promise<SeriesSeason> {
  const db = await getSQLiteDB();
  const existingRow = row(db, `${seasonSelect} WHERE id=?;`, [id]);
  if (!existingRow) throw new Error('Season not found.');
  const value = { ...mapSeason(existingRow), ...update, id, updatedAt: now() };
  await runSQLiteTransaction((transaction) => {
    transaction.run(
      `UPDATE series_seasons SET season_number=?,title=?,subtitle=?,synopsis=?,theme=?,
       central_conflict=?,opening_situation=?,climax=?,resolution=?,next_season_hook=?,
       status=?,planned_release_date=?,order_index=?,updated_at=? WHERE id=?;`,
      [
        value.seasonNumber, value.title, value.subtitle, value.synopsis, value.theme,
        value.centralConflict, value.openingSituation, value.climax, value.resolution,
        value.nextSeasonHook, value.status, value.plannedReleaseDate || null,
        value.orderIndex, value.updatedAt, id,
      ]
    );
  });
  return value;
}

export async function deleteSeason(id: string, confirmed = false): Promise<void> {
  const db = await getSQLiteDB();
  const episodeCount = Number(row(db, 'SELECT COUNT(*) FROM series_episodes WHERE season_id=?;', [id])?.[0] || 0);
  if (episodeCount > 0) {
    throw new Error('Season contains episodes and cannot be deleted.');
  }
  if (!confirmed) throw new Error('Season deletion requires explicit confirmation.');
  await runSQLiteTransaction((transaction) => transaction.run('DELETE FROM series_seasons WHERE id=?;', [id]));
}

export async function reorderSeasons(seriesId: string, orderedIds: string[]): Promise<void> {
  await runSQLiteTransaction((db) => {
    orderedIds.forEach((id, index) => {
      db.run('UPDATE series_seasons SET order_index=?,updated_at=? WHERE id=? AND series_id=?;', [
        index, now(), id, seriesId,
      ]);
    });
  });
}

export async function getSeasonsForSeries(seriesId: string): Promise<SeriesSeason[]> {
  const db = await getSQLiteDB();
  return rows(db, `${seasonSelect} WHERE series_id=? ORDER BY order_index,season_number;`, [seriesId])
    .map(mapSeason);
}

export async function duplicateSeasonStructure(id: string): Promise<SeriesSeason> {
  const db = await getSQLiteDB();
  const sourceRow = row(db, `${seasonSelect} WHERE id=?;`, [id]);
  if (!sourceRow) throw new Error('Season not found.');
  const source = mapSeason(sourceRow);
  const seasons = await getSeasonsForSeries(source.seriesId);
  const seasonNumber = Math.max(0, ...seasons.map((season) => season.seasonNumber)) + 1;
  const duplicate = seasonDefaults({
    ...source,
    id: undefined,
    seasonNumber,
    title: `${source.title} Copy`,
    status: 'planned',
    orderIndex: seasons.length,
    createdAt: undefined,
    updatedAt: undefined,
  });
  await runSQLiteTransaction((transaction) => {
    insertSeason(transaction, duplicate);
    const episodes = rows(
      transaction,
      `${episodeSelect} WHERE season_id=? ORDER BY order_index,episode_number;`,
      [source.id]
    ).map(mapEpisode);
    episodes.forEach((episode) => insertEpisode(transaction, episodeDefaults({
      ...episode,
      id: undefined,
      seasonId: duplicate.id,
      linkedBookId: undefined,
      status: 'planned',
      createdAt: undefined,
      updatedAt: undefined,
    })));
  });
  return duplicate;
}

function insertEpisode(db: Database, episode: SeriesEpisode): void {
  db.run(
    `INSERT INTO series_episodes (
      id,series_id,season_id,linked_book_id,episode_number,title,subtitle,logline,synopsis,
      opening_hook,previous_episode_recap,episode_goal,central_conflict,stakes,subplots_json,
      midpoint_turn,climax,resolution,cliffhanger,next_episode_teaser,
      required_character_ids_json,location_ids_json,object_ids_json,continuity_obligations_json,
      release_date,writing_deadline,editing_deadline,cover_deadline,signing_deadline,
      marketing_launch_date,status,word_count_target,order_index,created_at,updated_at
    ) VALUES (${Array(35).fill('?').join(',')});`,
    [
      episode.id, episode.seriesId, episode.seasonId, episode.linkedBookId || null,
      episode.episodeNumber, episode.title, episode.subtitle, episode.logline, episode.synopsis,
      episode.openingHook, episode.previousEpisodeRecap, episode.episodeGoal,
      episode.centralConflict, episode.stakes, json(episode.subplots), episode.midpointTurn,
      episode.climax, episode.resolution, episode.cliffhanger, episode.nextEpisodeTeaser,
      json(episode.requiredCharacterIds), json(episode.locationIds), json(episode.objectIds),
      json(episode.continuityObligations), episode.releaseDate || null,
      episode.writingDeadline || null, episode.editingDeadline || null,
      episode.coverDeadline || null, episode.signingDeadline || null,
      episode.marketingLaunchDate || null, episode.status, episode.wordCountTarget,
      episode.orderIndex, episode.createdAt, episode.updatedAt,
    ]
  );
  db.run('INSERT OR IGNORE INTO series_episode_checklists (episode_id) VALUES (?);', [episode.id]);
}

function mapEpisode(value: SqlValue[]): SeriesEpisode {
  return {
    id: String(value[0]), seriesId: String(value[1]), seasonId: String(value[2]),
    linkedBookId: value[3] ? String(value[3]) : undefined, episodeNumber: Number(value[4]),
    title: String(value[5]), subtitle: String(value[6] || ''), logline: String(value[7] || ''),
    synopsis: String(value[8] || ''), openingHook: String(value[9] || ''),
    previousEpisodeRecap: String(value[10] || ''), episodeGoal: String(value[11] || ''),
    centralConflict: String(value[12] || ''), stakes: String(value[13] || ''),
    subplots: parseJson(value[14], []), midpointTurn: String(value[15] || ''),
    climax: String(value[16] || ''), resolution: String(value[17] || ''),
    cliffhanger: String(value[18] || ''), nextEpisodeTeaser: String(value[19] || ''),
    requiredCharacterIds: parseJson(value[20], []), locationIds: parseJson(value[21], []),
    objectIds: parseJson(value[22], []), continuityObligations: parseJson(value[23], []),
    releaseDate: value[24] ? String(value[24]) : undefined,
    writingDeadline: value[25] ? String(value[25]) : undefined,
    editingDeadline: value[26] ? String(value[26]) : undefined,
    coverDeadline: value[27] ? String(value[27]) : undefined,
    signingDeadline: value[28] ? String(value[28]) : undefined,
    marketingLaunchDate: value[29] ? String(value[29]) : undefined,
    status: String(value[30]) as SeriesEpisode['status'], wordCountTarget: Number(value[31]),
    orderIndex: Number(value[32]), createdAt: String(value[33]), updatedAt: String(value[34]),
  };
}

const episodeSelect = `SELECT id,series_id,season_id,linked_book_id,episode_number,title,
  subtitle,logline,synopsis,opening_hook,previous_episode_recap,episode_goal,central_conflict,
  stakes,subplots_json,midpoint_turn,climax,resolution,cliffhanger,next_episode_teaser,
  required_character_ids_json,location_ids_json,object_ids_json,continuity_obligations_json,
  release_date,writing_deadline,editing_deadline,cover_deadline,signing_deadline,
  marketing_launch_date,status,word_count_target,order_index,created_at,updated_at
  FROM series_episodes`;

export async function createEpisode(
  input: Partial<SeriesEpisode> &
    Pick<SeriesEpisode, 'seriesId' | 'seasonId' | 'episodeNumber' | 'title'>
): Promise<SeriesEpisode> {
  const episode = episodeDefaults(input);
  await runSQLiteTransaction((db) => insertEpisode(db, episode));
  return episode;
}

export async function getEpisode(id: string): Promise<SeriesEpisode | null> {
  const db = await getSQLiteDB();
  const value = row(db, `${episodeSelect} WHERE id=?;`, [id]);
  return value ? mapEpisode(value) : null;
}

export async function updateEpisode(id: string, update: Partial<SeriesEpisode>): Promise<SeriesEpisode> {
  const current = await getEpisode(id);
  if (!current) throw new Error('Episode not found.');
  const episode = { ...current, ...update, id, updatedAt: now() };
  await runSQLiteTransaction((db) => {
    db.run(
      `UPDATE series_episodes SET series_id=?,season_id=?,linked_book_id=?,episode_number=?,
       title=?,subtitle=?,logline=?,synopsis=?,opening_hook=?,previous_episode_recap=?,
       episode_goal=?,central_conflict=?,stakes=?,subplots_json=?,midpoint_turn=?,climax=?,
       resolution=?,cliffhanger=?,next_episode_teaser=?,required_character_ids_json=?,
       location_ids_json=?,object_ids_json=?,continuity_obligations_json=?,release_date=?,
       writing_deadline=?,editing_deadline=?,cover_deadline=?,signing_deadline=?,
       marketing_launch_date=?,status=?,word_count_target=?,order_index=?,updated_at=? WHERE id=?;`,
      [
        episode.seriesId, episode.seasonId, episode.linkedBookId || null, episode.episodeNumber,
        episode.title, episode.subtitle, episode.logline, episode.synopsis, episode.openingHook,
        episode.previousEpisodeRecap, episode.episodeGoal, episode.centralConflict, episode.stakes,
        json(episode.subplots), episode.midpointTurn, episode.climax, episode.resolution,
        episode.cliffhanger, episode.nextEpisodeTeaser, json(episode.requiredCharacterIds),
        json(episode.locationIds), json(episode.objectIds), json(episode.continuityObligations),
        episode.releaseDate || null, episode.writingDeadline || null,
        episode.editingDeadline || null, episode.coverDeadline || null,
        episode.signingDeadline || null, episode.marketingLaunchDate || null, episode.status,
        episode.wordCountTarget, episode.orderIndex, episode.updatedAt, id,
      ]
    );
  });
  return episode;
}

export async function deleteEpisode(id: string, confirmed = false): Promise<void> {
  const episode = await getEpisode(id);
  if (!episode) return;
  if (episode.linkedBookId) throw new Error('Unlink the book before deleting this episode.');
  if (!confirmed) throw new Error('Episode deletion requires explicit confirmation.');
  await runSQLiteTransaction((db) => db.run('DELETE FROM series_episodes WHERE id=?;', [id]));
}

export async function reorderEpisodes(seasonId: string, orderedIds: string[]): Promise<void> {
  await runSQLiteTransaction((db) => {
    orderedIds.forEach((id, index) => db.run(
      'UPDATE series_episodes SET order_index=?,updated_at=? WHERE id=? AND season_id=?;',
      [index, now(), id, seasonId]
    ));
  });
}

export async function getEpisodesForSeason(seasonId: string): Promise<SeriesEpisode[]> {
  const db = await getSQLiteDB();
  return rows(db, `${episodeSelect} WHERE season_id=? ORDER BY order_index,episode_number;`, [seasonId])
    .map(mapEpisode);
}

export async function getEpisodesForSeries(seriesId: string): Promise<SeriesEpisode[]> {
  const db = await getSQLiteDB();
  return rows(db, `${episodeSelect} WHERE series_id=? ORDER BY season_id,order_index,episode_number;`, [seriesId])
    .map(mapEpisode);
}

function seriesConfigFor(project: SeriesProject, season: SeriesSeason, episode: SeriesEpisode) {
  return {
    isSeries: true,
    seriesName: project.title,
    seasonNumber: season.seasonNumber,
    episodeNumber: episode.episodeNumber,
    episodeTitle: episode.title,
    previousEpisodeRecap: episode.previousEpisodeRecap,
    nextEpisodeTeaser: episode.nextEpisodeTeaser,
    showSeriesBannerInReader: true,
    seriesProjectId: project.id,
    seriesSeasonId: season.id,
    seriesEpisodeId: episode.id,
  };
}

function defaultLinkedBook(project: SeriesProject, season: SeriesSeason, episode: SeriesEpisode): Book {
  const timestamp = now();
  const bookId = makeId('book');
  const recapChapterId = makeId('chapter');
  const manuscriptChapterId = makeId('chapter');
  const teaserChapterId = makeId('chapter');
  return {
    id: bookId,
    title: episode.title,
    subtitle: episode.subtitle,
    author: project.authorIds[0] || 'Series Author',
    publisherId: project.publisherId,
    description: episode.synopsis || episode.logline,
    category: 'Literature & Fiction',
    genre: project.genre,
    subGenre: project.subGenres[0],
    targetAudience: project.targetAudience,
    language: project.language,
    seriesConfig: seriesConfigFor(project, season, episode),
    price: 0,
    currency: 'USD',
    coverFront: {
      title: episode.title, subtitle: episode.subtitle, author: project.authorIds[0] || 'Series Author',
      bgType: 'solid', bgColor: '#202124', titleColor: '#ffffff', subtitleColor: '#e5e7eb',
      authorColor: '#ffffff', layoutStyle: 'editorial' as Book['coverFront']['layoutStyle'],
    },
    coverBack: {
      synopsis: episode.synopsis, bgColor: '#202124', textColor: '#ffffff',
    },
    chapters: [
      {
        id: recapChapterId, bookId, title: 'Previously On', chapterNumber: 1,
        createdAt: timestamp, updatedAt: timestamp,
        blocks: [{
          id: makeId('block'), chapterId: recapChapterId, type: 'paragraph',
          content: episode.previousEpisodeRecap, orderIndex: 0,
        }],
      },
      {
        id: manuscriptChapterId, bookId, title: 'Episode Manuscript', chapterNumber: 2,
        createdAt: timestamp, updatedAt: timestamp,
        blocks: [{
          id: makeId('block'), chapterId: manuscriptChapterId, type: 'paragraph',
          content: episode.openingHook, orderIndex: 0,
        }],
      },
      {
        id: teaserChapterId, bookId, title: 'Next Episode', chapterNumber: 3,
        createdAt: timestamp, updatedAt: timestamp,
        blocks: [{
          id: makeId('block'), chapterId: teaserChapterId, type: 'paragraph',
          content: episode.nextEpisodeTeaser, orderIndex: 0,
        }],
      },
    ],
    references: [],
    isPublished: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: '1.0.0',
  };
}

async function getSeriesContext(episodeId: string) {
  const episode = await getEpisode(episodeId);
  if (!episode) throw new Error('Episode not found.');
  const project = await getSeriesProject(episode.seriesId);
  const seasons = await getSeasonsForSeries(episode.seriesId);
  const season = seasons.find((candidate) => candidate.id === episode.seasonId);
  if (!project || !season) throw new Error('Series context is incomplete.');
  return { episode, project, season };
}

export async function createLinkedBookFromEpisode(episodeId: string): Promise<Book> {
  const { episode, project, season } = await getSeriesContext(episodeId);
  if (episode.linkedBookId) throw new Error('Episode already has a linked book.');
  const book = defaultLinkedBook(project, season, episode);
  await runSQLiteTransaction((db) => {
    writeBookToSQLiteTransaction(db, book);
    db.run('UPDATE series_episodes SET linked_book_id=?,updated_at=? WHERE id=?;', [
      book.id, now(), episode.id,
    ]);
  });
  return book;
}

export async function linkEpisodeToBook(episodeId: string, bookId: string): Promise<Book> {
  const { episode, project, season } = await getSeriesContext(episodeId);
  const books = await getAllLocalBooks();
  const book = books.find((candidate) => candidate.id === bookId);
  if (!book) throw new Error('Book not found.');
  const updatedBook: Book = {
    ...book,
    seriesConfig: { ...book.seriesConfig, ...seriesConfigFor(project, season, episode) },
    updatedAt: now(),
  };
  await runSQLiteTransaction((db) => {
    writeBookToSQLiteTransaction(db, updatedBook);
    db.run('UPDATE series_episodes SET linked_book_id=?,updated_at=? WHERE id=?;', [
      bookId, now(), episodeId,
    ]);
  });
  return updatedBook;
}

export async function unlinkEpisodeFromBook(episodeId: string): Promise<void> {
  await runSQLiteTransaction((db) => {
    db.run('UPDATE series_episodes SET linked_book_id=NULL,updated_at=? WHERE id=?;', [now(), episodeId]);
  });
}

export async function duplicateEpisodeOutline(episodeId: string): Promise<SeriesEpisode> {
  const source = await getEpisode(episodeId);
  if (!source) throw new Error('Episode not found.');
  const siblings = await getEpisodesForSeason(source.seasonId);
  return createEpisode({
    ...source,
    id: undefined,
    linkedBookId: undefined,
    episodeNumber: Math.max(0, ...siblings.map((episode) => episode.episodeNumber)) + 1,
    title: `${source.title} Copy`,
    status: 'outlined',
    orderIndex: siblings.length,
    createdAt: undefined,
    updatedAt: undefined,
  });
}

export async function moveEpisodeToSeason(
  episodeId: string,
  seasonId: string,
  episodeNumber: number
): Promise<SeriesEpisode> {
  return updateEpisode(episodeId, { seasonId, episodeNumber });
}

const secondaryConfig = {
  storyArc: {
    table: 'series_story_arcs',
    columns: [
      'id','series_id','season_id','character_id','title','description','arc_type',
      'start_episode_id','end_episode_id','status','milestones_json','series_role',
      'starting_condition','desire','need','fear','secret','transformation','end_condition',
      'unresolved_thread',
    ],
    values: (item: SeriesStoryArc): SqlValue[] => [
      item.id,item.seriesId,item.seasonId || null,item.characterId || null,item.title,
      item.description,item.arcType,item.startEpisodeId || null,item.endEpisodeId || null,
      item.status,json(item.milestones),item.seriesRole || '',item.startingCondition || '',
      item.desire || '',item.need || '',item.fear || '',item.secret || '',
      item.transformation || '',item.endCondition || '',item.unresolvedThread || '',
    ],
  },
  timeline: {
    table: 'series_timeline_events',
    columns: ['id','series_id','season_id','episode_id','title','description','story_date','sequence_number','location','character_ids_json','consequence','continuity_notes'],
    values: (item: SeriesTimelineEvent): SqlValue[] => [item.id,item.seriesId,item.seasonId || null,item.episodeId || null,item.title,item.description,item.storyDate || null,item.sequenceNumber,item.location,json(item.characterIds),item.consequence,item.continuityNotes],
  },
  rule: {
    table: 'series_continuity_rules',
    columns: ['id','series_id','category','subject_id','statement','source_episode_id','severity','active'],
    values: (item: SeriesContinuityRule): SqlValue[] => [item.id,item.seriesId,item.category,item.subjectId || null,item.statement,item.sourceEpisodeId || null,item.severity,item.active ? 1 : 0],
  },
  location: {
    table: 'series_locations',
    columns: ['id','series_id','name','description','geography','cultural_notes','visual_notes','first_appearance_episode_id','asset_ids_json'],
    values: (item: SeriesLocation): SqlValue[] => [item.id,item.seriesId,item.name,item.description,item.geography,item.culturalNotes,item.visualNotes,item.firstAppearanceEpisodeId || null,json(item.assetIds)],
  },
  object: {
    table: 'series_objects',
    columns: ['id','series_id','name','type','description','owner_character_id','first_appearance_episode_id','importance','asset_ids_json'],
    values: (item: SeriesObject): SqlValue[] => [item.id,item.seriesId,item.name,item.type,item.description,item.ownerCharacterId || null,item.firstAppearanceEpisodeId || null,item.importance,json(item.assetIds)],
  },
  relationship: {
    table: 'series_relationships',
    columns: ['id','series_id','source_character_id','target_character_id','relationship_type','status','description','started_episode_id','ended_episode_id','trust_level','conflict','changes_by_episode_json'],
    values: (item: SeriesRelationship): SqlValue[] => [item.id,item.seriesId,item.sourceCharacterId,item.targetCharacterId,item.relationshipType,item.status,item.description,item.startedEpisodeId || null,item.endedEpisodeId || null,item.trustLevel ?? null,item.conflict || '',json(item.changesByEpisode)],
  },
} as const;

async function upsertSecondary(
  kind: keyof typeof secondaryConfig,
  item: SeriesOwnedRecord
): Promise<void> {
  const config = secondaryConfig[kind] as {
    table: string;
    columns: readonly string[];
    values: (record: never) => SqlValue[];
  };
  const values = config.values(item as never);
  const updates = config.columns.slice(1).map((column) => `${column}=excluded.${column}`).join(',');
  await runSQLiteTransaction((db) => db.run(
    `INSERT INTO ${config.table} (${config.columns.join(',')})
     VALUES (${config.columns.map(() => '?').join(',')})
     ON CONFLICT(id) DO UPDATE SET ${updates};`,
    values
  ));
}

async function deleteSecondary(table: string, id: string): Promise<void> {
  await runSQLiteTransaction((db) => db.run(`DELETE FROM ${table} WHERE id=?;`, [id]));
}

export const saveStoryArc = (item: SeriesStoryArc) => upsertSecondary('storyArc', item);
export const deleteStoryArc = (id: string) => deleteSecondary('series_story_arcs', id);
export const saveTimelineEvent = (item: SeriesTimelineEvent) => upsertSecondary('timeline', item);
export const deleteTimelineEvent = (id: string) => deleteSecondary('series_timeline_events', id);
export const saveContinuityRule = (item: SeriesContinuityRule) => upsertSecondary('rule', item);
export const deleteContinuityRule = (id: string) => deleteSecondary('series_continuity_rules', id);
export const saveSeriesLocation = (item: SeriesLocation) => upsertSecondary('location', item);
export const deleteSeriesLocation = (id: string) => deleteSecondary('series_locations', id);
export const saveSeriesObject = (item: SeriesObject) => upsertSecondary('object', item);
export const deleteSeriesObject = (id: string) => deleteSecondary('series_objects', id);
export const saveSeriesRelationship = (item: SeriesRelationship) => upsertSecondary('relationship', item);
export const deleteSeriesRelationship = (id: string) => deleteSecondary('series_relationships', id);

export async function getStoryArcs(seriesId: string): Promise<SeriesStoryArc[]> {
  const db = await getSQLiteDB();
  return rows(db, `SELECT id,series_id,season_id,character_id,title,description,arc_type,
    start_episode_id,end_episode_id,status,milestones_json,series_role,starting_condition,
    desire,need,fear,secret,transformation,end_condition,unresolved_thread
    FROM series_story_arcs WHERE series_id=? ORDER BY title;`, [seriesId]).map((value) => ({
      id:String(value[0]),seriesId:String(value[1]),seasonId:value[2]?String(value[2]):undefined,
      characterId:value[3]?String(value[3]):undefined,title:String(value[4]),
      description:String(value[5]||''),arcType:String(value[6]||''),
      startEpisodeId:value[7]?String(value[7]):undefined,endEpisodeId:value[8]?String(value[8]):undefined,
      status:String(value[9]) as SeriesStoryArc['status'],milestones:parseJson(value[10],[]),
      seriesRole:String(value[11]||''),startingCondition:String(value[12]||''),
      desire:String(value[13]||''),need:String(value[14]||''),fear:String(value[15]||''),
      secret:String(value[16]||''),transformation:String(value[17]||''),
      endCondition:String(value[18]||''),unresolvedThread:String(value[19]||''),
    }));
}

export async function getTimelineEvents(seriesId: string): Promise<SeriesTimelineEvent[]> {
  const db = await getSQLiteDB();
  return rows(db, `SELECT id,series_id,season_id,episode_id,title,description,story_date,
    sequence_number,location,character_ids_json,consequence,continuity_notes
    FROM series_timeline_events WHERE series_id=? ORDER BY sequence_number;`, [seriesId]).map((value) => ({
      id:String(value[0]),seriesId:String(value[1]),seasonId:value[2]?String(value[2]):undefined,
      episodeId:value[3]?String(value[3]):undefined,title:String(value[4]),
      description:String(value[5]||''),storyDate:value[6]?String(value[6]):undefined,
      sequenceNumber:Number(value[7]),location:String(value[8]||''),
      characterIds:parseJson(value[9],[]),consequence:String(value[10]||''),
      continuityNotes:String(value[11]||''),
    }));
}

export async function getContinuityRules(seriesId: string): Promise<SeriesContinuityRule[]> {
  const db = await getSQLiteDB();
  return rows(db, `SELECT id,series_id,category,subject_id,statement,source_episode_id,severity,active
    FROM series_continuity_rules WHERE series_id=? ORDER BY severity DESC;`, [seriesId]).map((value) => ({
      id:String(value[0]),seriesId:String(value[1]),category:String(value[2]),
      subjectId:value[3]?String(value[3]):undefined,statement:String(value[4]),
      sourceEpisodeId:value[5]?String(value[5]):undefined,
      severity:String(value[6]) as SeriesContinuityRule['severity'],active:bool(value[7]),
    }));
}

export async function getSeriesLocations(seriesId: string): Promise<SeriesLocation[]> {
  const db = await getSQLiteDB();
  return rows(db, `SELECT id,series_id,name,description,geography,cultural_notes,visual_notes,
    first_appearance_episode_id,asset_ids_json FROM series_locations WHERE series_id=? ORDER BY name;`,
  [seriesId]).map((value) => ({
    id:String(value[0]),seriesId:String(value[1]),name:String(value[2]),
    description:String(value[3]||''),geography:String(value[4]||''),
    culturalNotes:String(value[5]||''),visualNotes:String(value[6]||''),
    firstAppearanceEpisodeId:value[7]?String(value[7]):undefined,assetIds:parseJson(value[8],[]),
  }));
}

export async function getSeriesObjects(seriesId: string): Promise<SeriesObject[]> {
  const db = await getSQLiteDB();
  return rows(db, `SELECT id,series_id,name,type,description,owner_character_id,
    first_appearance_episode_id,importance,asset_ids_json FROM series_objects
    WHERE series_id=? ORDER BY name;`, [seriesId]).map((value) => ({
      id:String(value[0]),seriesId:String(value[1]),name:String(value[2]),type:String(value[3]||''),
      description:String(value[4]||''),ownerCharacterId:value[5]?String(value[5]):undefined,
      firstAppearanceEpisodeId:value[6]?String(value[6]):undefined,
      importance:String(value[7]||''),assetIds:parseJson(value[8],[]),
    }));
}

export async function getSeriesRelationships(seriesId: string): Promise<SeriesRelationship[]> {
  const db = await getSQLiteDB();
  return rows(db, `SELECT id,series_id,source_character_id,target_character_id,
    relationship_type,status,description,started_episode_id,ended_episode_id,trust_level,
    conflict,changes_by_episode_json FROM series_relationships WHERE series_id=?;`,
  [seriesId]).map((value) => ({
    id:String(value[0]),seriesId:String(value[1]),sourceCharacterId:String(value[2]),
    targetCharacterId:String(value[3]),relationshipType:String(value[4]),status:String(value[5]),
    description:String(value[6]||''),startedEpisodeId:value[7]?String(value[7]):undefined,
    endedEpisodeId:value[8]?String(value[8]):undefined,
    trustLevel:value[9]===null?undefined:Number(value[9]),conflict:String(value[10]||''),
    changesByEpisode:parseJson(value[11],[]),
  }));
}

export async function getEpisodeChecklist(episodeId: string): Promise<EpisodeProductionChecklist> {
  const db = await getSQLiteDB();
  const value = row(db, `SELECT episode_id,outline_complete,manuscript_complete,
    continuity_reviewed,references_reviewed,legal_reviewed,cover_complete,pricing_complete,
    marketing_complete,signing_ready,publication_ready FROM series_episode_checklists
    WHERE episode_id=?;`, [episodeId]);
  return value ? {
    episodeId:String(value[0]),outlineComplete:bool(value[1]),manuscriptComplete:bool(value[2]),
    continuityReviewed:bool(value[3]),referencesReviewed:bool(value[4]),legalReviewed:bool(value[5]),
    coverComplete:bool(value[6]),pricingComplete:bool(value[7]),marketingComplete:bool(value[8]),
    signingReady:bool(value[9]),publicationReady:bool(value[10]),
  } : {
    episodeId,outlineComplete:false,manuscriptComplete:false,continuityReviewed:false,
    referencesReviewed:false,legalReviewed:false,coverComplete:false,pricingComplete:false,
    marketingComplete:false,signingReady:false,publicationReady:false,
  };
}

export async function saveEpisodeChecklist(checklist: EpisodeProductionChecklist): Promise<void> {
  await runSQLiteTransaction((db) => db.run(
    `INSERT INTO series_episode_checklists VALUES (${Array(11).fill('?').join(',')})
     ON CONFLICT(episode_id) DO UPDATE SET
     outline_complete=excluded.outline_complete,manuscript_complete=excluded.manuscript_complete,
     continuity_reviewed=excluded.continuity_reviewed,references_reviewed=excluded.references_reviewed,
     legal_reviewed=excluded.legal_reviewed,cover_complete=excluded.cover_complete,
     pricing_complete=excluded.pricing_complete,marketing_complete=excluded.marketing_complete,
     signing_ready=excluded.signing_ready,publication_ready=excluded.publication_ready;`,
    [
      checklist.episodeId,checklist.outlineComplete?1:0,checklist.manuscriptComplete?1:0,
      checklist.continuityReviewed?1:0,checklist.referencesReviewed?1:0,
      checklist.legalReviewed?1:0,checklist.coverComplete?1:0,checklist.pricingComplete?1:0,
      checklist.marketingComplete?1:0,checklist.signingReady?1:0,
      checklist.publicationReady?1:0,
    ]
  ));
}

export function generateContinuityWarnings(
  seasons: SeriesSeason[],
  episodes: SeriesEpisode[],
  timeline: SeriesTimelineEvent[] = [],
  relationships: SeriesRelationship[] = []
): SeriesContinuityWarning[] {
  const warnings: SeriesContinuityWarning[] = [];
  const seasonIds = new Set(seasons.map((season) => season.id));
  const episodeIds = new Set(episodes.map((episode) => episode.id));
  const seasonNumbers = new Set<number>();
  seasons.forEach((season) => {
    if (seasonNumbers.has(season.seasonNumber)) warnings.push({
      code:'duplicate-season-number',severity:'error',message:`Season ${season.seasonNumber} is duplicated.`,
    });
    seasonNumbers.add(season.seasonNumber);
  });
  const numbersBySeason = new Map<string, Set<number>>();
  episodes.forEach((episode) => {
    if (!seasonIds.has(episode.seasonId)) warnings.push({
      code:'wrong-season',severity:'error',episodeId:episode.id,
      message:`${episode.title} is linked to a missing season.`,
    });
    const numbers = numbersBySeason.get(episode.seasonId) || new Set<number>();
    if (numbers.has(episode.episodeNumber)) warnings.push({
      code:'duplicate-episode-number',severity:'error',episodeId:episode.id,
      message:`Episode ${episode.episodeNumber} is duplicated in its season.`,
    });
    numbers.add(episode.episodeNumber);
    numbersBySeason.set(episode.seasonId, numbers);
    if (episode.episodeNumber > 1 && !episode.previousEpisodeRecap.trim()) warnings.push({
      code:'missing-recap',severity:'warning',episodeId:episode.id,
      message:`${episode.title} needs a Previously On recap.`,
    });
    if (episode.nextEpisodeTeaser.trim()) {
      const nextExists = episodes.some((candidate) =>
        candidate.seasonId === episode.seasonId &&
        candidate.episodeNumber === episode.episodeNumber + 1
      );
      if (!nextExists) warnings.push({
        code:'teaser-missing-next',severity:'warning',episodeId:episode.id,
        message:`${episode.title} has a teaser but no next episode.`,
      });
    }
  });
  const orderedReleases = [...episodes].filter((episode) => episode.releaseDate)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  for (let index = 1; index < orderedReleases.length; index += 1) {
    if (String(orderedReleases[index].releaseDate) < String(orderedReleases[index - 1].releaseDate)) {
      warnings.push({
        code:'release-order',severity:'warning',episodeId:orderedReleases[index].id,
        message:`${orderedReleases[index].title} releases before the preceding episode.`,
      });
    }
  }
  const deathByCharacter = new Map<string, number>();
  timeline.forEach((event) => {
    if (/\b(dies|died|death|killed)\b/i.test(`${event.title} ${event.description}`)) {
      event.characterIds.forEach((id) => deathByCharacter.set(id, event.sequenceNumber));
    }
  });
  timeline.forEach((event) => event.characterIds.forEach((id) => {
    const deathSequence = deathByCharacter.get(id);
    if (deathSequence !== undefined && event.sequenceNumber > deathSequence) warnings.push({
      code:'appearance-after-death',severity:'error',episodeId:event.episodeId,
      message:`A character appears after a recorded death in "${event.title}".`,
    });
  }));
  relationships.forEach((relationship, index) => {
    const contradiction = relationships.slice(index + 1).find((candidate) =>
      candidate.sourceCharacterId === relationship.sourceCharacterId &&
      candidate.targetCharacterId === relationship.targetCharacterId &&
      candidate.status !== relationship.status
    );
    if (contradiction) warnings.push({
      code:'relationship-contradiction',severity:'warning',
      message:'Relationship records contain conflicting current states.',
    });
  });
  return warnings;
}

export function calculateEpisodeReadiness(
  episode: SeriesEpisode,
  book: Book | undefined,
  checklist: EpisodeProductionChecklist,
  nextEpisodeExists: boolean,
  signingIssuanceAvailable = false
): SeriesReadiness {
  const missing: string[] = [];
  if (!book) missing.push('Linked manuscript');
  if (!episode.title.trim()) missing.push('Title');
  if (!book?.chapters.length) missing.push('Chapter');
  if (!episode.synopsis.trim() || !episode.logline.trim()) missing.push('Required metadata');
  if (episode.episodeNumber > 1 && !episode.previousEpisodeRecap.trim()) missing.push('Previous episode recap');
  if (nextEpisodeExists && !episode.nextEpisodeTeaser.trim()) missing.push('Next episode teaser');
  if (!checklist.continuityReviewed) missing.push('Continuity review');
  if (!checklist.referencesReviewed) missing.push('References review');
  if (!checklist.legalReviewed) missing.push('Legal/front matter');
  if (!checklist.coverComplete) missing.push('Cover');
  if (!checklist.pricingComplete) missing.push('Pricing');
  if (!checklist.marketingComplete) missing.push('Marketing assets');
  if (!checklist.signingReady || !signingIssuanceAvailable) missing.push('Signed-data-pack issuance');
  const contentReady = Boolean(
    book && book.chapters.length && episode.title.trim() && episode.synopsis.trim() &&
    (episode.episodeNumber === 1 || episode.previousEpisodeRecap.trim()) &&
    checklist.continuityReviewed && checklist.referencesReviewed && checklist.legalReviewed
  );
  const commercialReady = checklist.coverComplete && checklist.pricingComplete && checklist.marketingComplete;
  const securityReady = checklist.signingReady && signingIssuanceAvailable;
  return {
    contentReady,
    commercialReady,
    securityReady,
    published: episode.status === 'published' && Boolean(book?.isPublished),
    missing,
  };
}

export async function convertLegacyBookSeries(
  book: Book,
  selectedSeriesId?: string
): Promise<{ project: SeriesProject; season: SeriesSeason; episode: SeriesEpisode; book: Book }> {
  if (!book.seriesConfig?.isSeries) throw new Error('This book has no legacy series settings.');
  const legacy = book.seriesConfig;
  const existingProject = selectedSeriesId ? await getSeriesProject(selectedSeriesId) : null;
  const project = existingProject || projectDefaults({
    title: legacy.seriesName || `${book.title} Series`,
    genre: book.genre || '',
    targetAudience: book.targetAudience || '',
    language: book.language || 'English (US)',
    publisherId: book.publisherId,
    authorIds: [book.author],
    status: 'active',
  });
  const existingSeasons = existingProject ? await getSeasonsForSeries(project.id) : [];
  const seasonNumber = legacy.seasonNumber || 1;
  const season = existingSeasons.find((item) => item.seasonNumber === seasonNumber) ||
    seasonDefaults({ seriesId: project.id, seasonNumber, title: `Season ${seasonNumber}` });
  const episode = episodeDefaults({
    seriesId: project.id,
    seasonId: season.id,
    episodeNumber: legacy.episodeNumber || 1,
    title: legacy.episodeTitle || book.title,
    synopsis: book.description,
    previousEpisodeRecap: legacy.previousEpisodeRecap || '',
    nextEpisodeTeaser: legacy.nextEpisodeTeaser || '',
    linkedBookId: book.id,
  });
  const convertedAt = now();
  const convertedBook: Book = {
    ...book,
    seriesConfig: {
      ...legacy,
      ...seriesConfigFor(project, season, episode),
      legacyConvertedAt: convertedAt,
    },
    updatedAt: convertedAt,
  };
  await runSQLiteTransaction((db) => {
    if (!existingProject) insertProject(db, project);
    if (!existingSeasons.some((item) => item.id === season.id)) insertSeason(db, season);
    insertEpisode(db, episode);
    writeBookToSQLiteTransaction(db, convertedBook);
  });
  return { project, season, episode, book: convertedBook };
}
