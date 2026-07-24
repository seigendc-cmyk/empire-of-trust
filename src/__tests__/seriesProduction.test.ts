import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import {
  applyDatabaseMigrations, createLocalDatabaseBackup, DATABASE_SCHEMA_VERSION,
  getDatabaseUserVersion, setSQLiteDatabaseForTesting,
} from '../lib/sqlite';
import type {
  CharacterActorAssignment, CharacterPossession, ProductionRelationship,
  SeriesActor, SeriesAsset, SeriesCharacter, SeriesCoverProject, SeriesStaffAssignment,
  StoryScene,
} from '../types/seriesProduction';
import {
  archiveStoryScene, assignActorToCharacter, assignCharacterPossession, assignSeriesStaff,
  createDialogueBlock, createProductionChapter, createSeriesActor, createSeriesAsset,
  createSeriesCharacter, createStoryBlock, createStoryScene, generateProductionContinuityWarnings,
  getActorAssignments, getCoverProjects, getProductionChapters, getProductionRelationships,
  getRevisionHistory, getScenesForChapter, getStoryBlockLinks, getStoryBlocks,
  hasSeriesPermission, linkStoryBlockEntity, publicStoryBlocks, reorderStoryScenes,
  saveCoverProject, saveEditorialReview, saveProductionRelationship, transferCharacterPossession,
  updateStoryBlock, updateStoryScene,
} from '../lib/seriesProductionRepository';
import { projectPublicSeries } from '../types/publicDistribution';

const testDirectory=dirname(fileURLToPath(import.meta.url));
const wasmBinary=readFileSync(join(testDirectory,'../../node_modules/sql.js/dist/sql-wasm.wasm'));
let SQL:SqlJsStatic;let db:Database;
const timestamp='2026-07-24T00:00:00.000Z';

beforeAll(async()=>{SQL=await initSqlJs({wasmBinary});});
beforeEach(()=>{
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:webcrypto});
  globalThis.indexedDB={open:()=>{const request={result:{objectStoreNames:{contains:()=>true},transaction:()=>({objectStore:()=>({put:()=>{const r={} as IDBRequest;queueMicrotask(()=>r.onsuccess?.({} as Event));return r;}})})},onupgradeneeded:null,onsuccess:null,onerror:null} as unknown as IDBOpenDBRequest;queueMicrotask(()=>request.onsuccess?.({} as Event));return request;}} as unknown as IDBFactory;
  db=new SQL.Database();applyDatabaseMigrations(db);db.run(`INSERT INTO series_projects(id,title,status,created_at,updated_at)VALUES('series','Series','active',?,?);`,[timestamp,timestamp]);db.run(`INSERT INTO series_seasons(id,series_id,season_number,title,status,created_at,updated_at)VALUES('season','series',1,'Season 1','active',?,?);`,[timestamp,timestamp]);db.run(`INSERT INTO series_episodes(id,series_id,season_id,episode_number,title,status,created_at,updated_at)VALUES('episode','series','season',1,'Episode 1','writing',?,?);`,[timestamp,timestamp]);setSQLiteDatabaseForTesting(db);
});
afterEach(()=>{setSQLiteDatabaseForTesting(null);vi.restoreAllMocks();});

const chapterInput=()=>({seriesId:'series',seasonId:'season',episodeId:'episode',chapterNumber:1,title:'Chapter One',synopsis:'',status:'draft' as const,orderIndex:0});
const sceneInput=(chapterId:string,number=1):Omit<StoryScene,'id'|'createdAt'|'updatedAt'>=>({seriesId:'series',seasonId:'season',episodeId:'episode',chapterId,sceneNumber:number,title:`Scene ${number}`,purpose:'Purpose',synopsis:'',openingSituation:'',conflict:'',turningPoint:'',outcome:'',characterIds:[],assetIds:[],possessionIds:[],storyTime:'',weather:'',status:'draft',orderIndex:number-1});
const character=(id:string,name:string,status:'alive'|'dead'='alive'):SeriesCharacter=>({id,seriesId:'series',name,aliases:[],description:'',status,createdAt:timestamp,updatedAt:timestamp});
const actor=(id:string):SeriesActor=>({id,seriesId:'series',name:id,bio:'',contactNotes:'',createdAt:timestamp,updatedAt:timestamp});
const asset=(id:string,status:'available'|'lost'|'destroyed'):SeriesAsset=>({id,seriesId:'series',name:id,type:'other',description:'',status,continuityNotes:'',createdAt:timestamp,updatedAt:timestamp});
const emptyWarnings=(overrides:Partial<Parameters<typeof generateProductionContinuityWarnings>[0]>)=>generateProductionContinuityWarnings({scenes:[],characters:[],actors:[],cast:[],assets:[],possessions:[],relationships:[],covers:[],...overrides});

describe('interactive series production persistence',()=>{
  it('1. assigns staff roles',async()=>expect((await assignSeriesStaff({seriesId:'series',userId:'u1',displayName:'Owner',role:'owner',scopeType:'series',scopeId:'series',active:true})).role).toBe('owner'));
  it('2. denies permissions outside assignment scope',()=>{const assignment:SeriesStaffAssignment={id:'s',seriesId:'series',userId:'u',displayName:'Viewer',role:'viewer',scopeType:'series',scopeId:'series',active:true,createdAt:timestamp,updatedAt:timestamp};expect(hasSeriesPermission('u','edit',{scopeType:'scene',scopeId:'x'},[assignment])).toBe(false);});
  it('3. creates a normalized chapter',async()=>expect((await createProductionChapter(chapterInput())).title).toBe('Chapter One'));
  it('4. creates a normalized scene',async()=>{const c=await createProductionChapter(chapterInput());expect((await createStoryScene(sceneInput(c.id))).sceneNumber).toBe(1);});
  it('5. reorders scenes transactionally',async()=>{const c=await createProductionChapter(chapterInput());const a=await createStoryScene(sceneInput(c.id,1));const b=await createStoryScene(sceneInput(c.id,2));await reorderStoryScenes(c.id,[b.id,a.id]);expect((await getScenesForChapter(c.id)).map(x=>x.id)).toEqual([b.id,a.id]);});
  for(const [number,type] of [[6,'heading'],[7,'paragraph'],[8,'dialogue'],[9,'image']] as const){
    it(`${number}. adds a ${type} story block`,async()=>{const c=await createProductionChapter(chapterInput());const s=await createStoryScene(sceneInput(c.id));const b=await createStoryBlock({seriesId:'series',chapterId:c.id,sceneId:s.id,type,content:type==='image'?'':'text',imageAssetId:type==='image'?'image-1':undefined,caption:'',orderIndex:0,createdBy:'u'});expect(b.type).toBe(type);});
  }
  it('creates structured dialogue linked to a story block',async()=>{const c=await createProductionChapter(chapterInput());const s=await createStoryScene(sceneInput(c.id));const ch=await createSeriesCharacter({seriesId:'series',name:'Hero',aliases:[],description:'',status:'alive'});const b=await createStoryBlock({seriesId:'series',chapterId:c.id,sceneId:s.id,type:'dialogue',content:'Hello',caption:'',orderIndex:0,createdBy:'u'});expect((await createDialogueBlock({seriesId:'series',sceneId:s.id,storyBlockId:b.id,characterId:ch.id,dialogue:'Hello',emotion:'calm',delivery:'soft',actionBefore:'',actionAfter:'',orderIndex:0})).dialogue).toBe('Hello');});
  it('10. creates actors separately from characters',async()=>expect((await createSeriesActor({seriesId:'series',name:'Actor',bio:'',contactNotes:''})).name).toBe('Actor'));
  it('11. links actors to characters with version type',async()=>{const ch=await createSeriesCharacter({seriesId:'series',name:'Hero',aliases:[],description:'',status:'alive'});const a=await createSeriesActor({seriesId:'series',name:'Actor',bio:'',contactNotes:''});await assignActorToCharacter({seriesId:'series',characterId:ch.id,actorId:a.id,assignmentType:'young-version',seasonId:'season',notes:''});expect((await getActorAssignments('series'))[0].assignmentType).toBe('young-version');});
  it('12. adds normalized assets',async()=>expect((await createSeriesAsset({seriesId:'series',name:'Sword',type:'weapon',description:'',status:'available',continuityNotes:''})).type).toBe('weapon'));
  it('13. assigns character possession',async()=>{const ch=await createSeriesCharacter({seriesId:'series',name:'Hero',aliases:[],description:'',status:'alive'});const a=await createSeriesAsset({seriesId:'series',name:'Sword',type:'weapon',description:'',status:'available',continuityNotes:''});expect((await assignCharacterPossession({seriesId:'series',assetId:a.id,characterId:ch.id,status:'owned',notes:''})).status).toBe('owned');});
  it('14. transfers possession once and rejects double transfer',async()=>{const ch=await createSeriesCharacter({seriesId:'series',name:'Hero',aliases:[],description:'',status:'alive'});const a=await createSeriesAsset({seriesId:'series',name:'Sword',type:'weapon',description:'',status:'available',continuityNotes:''});const p=await assignCharacterPossession({seriesId:'series',assetId:a.id,characterId:ch.id,status:'owned',notes:''});await transferCharacterPossession(p.id,'other','scene');await expect(transferCharacterPossession(p.id,'third','scene2')).rejects.toThrow(/already/);});
  it('15. warns when a lost asset appears',()=>{const s={...sceneInput('c'),id:'s',assetIds:['a'],createdAt:timestamp,updatedAt:timestamp};expect(emptyWarnings({scenes:[s],assets:[asset('a','lost')]}).some(w=>w.code==='asset-after-loss')).toBe(true);});
  it('16. warns when a destroyed asset appears',()=>{const s={...sceneInput('c'),id:'s',assetIds:['a'],createdAt:timestamp,updatedAt:timestamp};expect(emptyWarnings({scenes:[s],assets:[asset('a','destroyed')]}).some(w=>w.code==='asset-after-destruction')).toBe(true);});
  it('17. warns when a character appears after death',()=>{const death={...sceneInput('c',1),id:'death',createdAt:timestamp,updatedAt:timestamp};const later={...sceneInput('c',2),id:'later',characterIds:['ch'],createdAt:timestamp,updatedAt:timestamp};expect(emptyWarnings({scenes:[death,later],characters:[{...character('ch','Hero','dead'),deathSceneId:'death'}]}).some(w=>w.code==='character-after-death')).toBe(true);});
  it('18. warns when one actor plays conflicting characters in a scene',()=>{const s={...sceneInput('c'),id:'s',characterIds:['a','b'],createdAt:timestamp,updatedAt:timestamp};const cast:CharacterActorAssignment[]=[{id:'1',seriesId:'series',characterId:'a',actorId:'actor',assignmentType:'primary',createdAt:timestamp,updatedAt:timestamp,notes:''},{id:'2',seriesId:'series',characterId:'b',actorId:'actor',assignmentType:'primary',createdAt:timestamp,updatedAt:timestamp,notes:''}];expect(emptyWarnings({scenes:[s],characters:[character('a','A'),character('b','B')],actors:[actor('actor')],cast}).some(w=>w.code==='actor-conflict')).toBe(true);});
  it('19. persists production relationships',async()=>{const value:ProductionRelationship={id:'rel',seriesId:'series',sourceCharacterId:'a',targetCharacterId:'b',type:'rival',trustLevel:10,conflictLevel:90,active:true,betrayal:'Past betrayal',reconciliation:'',description:'',createdAt:timestamp,updatedAt:timestamp};await saveProductionRelationship(value);expect((await getProductionRelationships('series'))[0].type).toBe('rival');});
  it('20. persists cover projects',async()=>{const value:SeriesCoverProject={id:'cover',seriesId:'series',type:'marketing-poster',title:'Title',subtitle:'',author:'',gradientStart:'#000',gradientEnd:'#fff',seriesBadge:'',seasonBadge:'',episodeBadge:'',actorIds:[],characterIds:[],price:'5',status:'draft',createdAt:timestamp,updatedAt:timestamp};await saveCoverProject(value);expect((await getCoverProjects('series'))[0].type).toBe('marketing-poster');});
  it('21. persists editorial approval',async()=>{const c=await createProductionChapter(chapterInput());const s=await createStoryScene(sceneInput(c.id));await saveEditorialReview({id:'review',seriesId:'series',scopeType:'scene',scopeId:s.id,status:'approved',reviewedBy:'editor',reviewNote:'Good',createdAt:timestamp,updatedAt:timestamp});expect((await getScenesForChapter(c.id))[0].status).toBe('approved');});
  it('22. locked content cannot be edited',async()=>{const c=await createProductionChapter(chapterInput());const s=await createStoryScene(sceneInput(c.id));await archiveStoryScene(s.id);await expect(updateStoryScene({...s,title:'Changed'},'u')).rejects.toThrow(/Locked/);});
  it('23. records revision history',async()=>{const c=await createProductionChapter(chapterInput());const s=await createStoryScene(sceneInput(c.id));const b=await createStoryBlock({seriesId:'series',chapterId:c.id,sceneId:s.id,type:'paragraph',content:'A',caption:'',orderIndex:0,createdBy:'u'});await updateStoryBlock({...b,content:'B'},'u');expect((await getRevisionHistory('story-block',b.id))[0].revisionNumber).toBe(1);});
  it('24. SQLite failures roll back controlled writes',async()=>{await createProductionChapter(chapterInput());await expect(createProductionChapter(chapterInput())).rejects.toThrow();expect((await getProductionChapters('episode'))).toHaveLength(1);});
  it('25. backup bytes retain production records',async()=>{await createProductionChapter(chapterInput());const zip=await createLocalDatabaseBackup(db.export());expect(await zip.arrayBuffer()).toBeInstanceOf(ArrayBuffer);const clone=new SQL.Database(db.export());expect(clone.exec(`SELECT COUNT(*) FROM series_chapters;`)[0].values[0][0]).toBe(1);});
  it('26. persists linked entity chips',async()=>{const c=await createProductionChapter(chapterInput());const s=await createStoryScene(sceneInput(c.id));const b=await createStoryBlock({seriesId:'series',chapterId:c.id,sceneId:s.id,type:'paragraph',content:'Hero arrives',caption:'',orderIndex:0,createdBy:'u'});await linkStoryBlockEntity({blockId:b.id,entityType:'character',entityId:'hero',label:'Hero',startOffset:0,endOffset:4});expect((await getStoryBlockLinks(b.id))[0].label).toBe('Hero');});
  it('27. scene inspector persists structured fields',async()=>{const c=await createProductionChapter(chapterInput());const s=await createStoryScene({...sceneInput(c.id),weather:'Rain',conflict:'Escape'});expect((await getScenesForChapter(c.id))[0]).toMatchObject({weather:'Rain',conflict:'Escape'});});
  it('28. production UI declares mobile stacked/back layout',()=>{const source=readFileSync(join(process.cwd(),'src/components/studio/series/InteractiveSeriesProductionStudio.tsx'),'utf8');expect(source).toContain('lg:grid-cols-[230px_minmax(0,1fr)_300px]');expect(source).toContain('Back to workspace');});
  it('29. Reader projection excludes internal notes',()=>{const blocks=[{id:'1',type:'paragraph'},{id:'2',type:'internal-note'}] as never;expect(publicStoryBlocks(blocks).map(b=>b.id)).toEqual(['1']);});
  it('30. public publishing projection excludes production records',()=>{const projected=projectPublicSeries({id:'series',title:'S',subtitle:'',description:'',genre:'',subGenres:[],targetAudience:'',language:'en',status:'active',authorIds:[],publisherId:'',theme:'',premise:'',centralConflict:'',seriesPromise:'',intendedReaderValue:'',plannedSeasonCount:1,plannedEpisodeCount:1,episodeNamingConvention:'',numberingFormat:'',worldDescription:'',historicalBackground:'',culturalNotes:'',organizations:[],terminology:[],systemRules:[],releaseModel:'irregular',pricingStrategy:'',createdAt:timestamp,updatedAt:timestamp},[],[],[]);expect(JSON.stringify(projected)).not.toMatch(/staff|scene|internal-note|actor|possession/);});
  it('migration advances schema and creates every production table',()=>{expect(getDatabaseUserVersion(db)).toBe(DATABASE_SCHEMA_VERSION);for(const table of ['series_staff_assignments','series_permissions','series_chapters','series_scenes','series_story_blocks','series_story_block_links','series_actors','series_character_actor_assignments','series_assets','series_character_possessions','series_scene_characters','series_scene_assets','series_dialogue_blocks','series_editorial_reviews','series_comments','series_revision_history','series_cover_projects'])expect(db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}';`)[0]?.values[0]?.[0]).toBe(table);});
});
