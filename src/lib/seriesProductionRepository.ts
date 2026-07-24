import type { Database, SqlValue } from 'sql.js';
import { getSQLiteDB, runSQLiteTransaction } from './sqlite';
import type {
  CharacterActorAssignment, CharacterPossession, DialogueBlock, EditorialReview,
  EditorialStatus, ProductionContinuityWarning, ProductionRelationship,
  ProductionScope, SeriesActor, SeriesAsset, SeriesChapter, SeriesCharacter,
  SeriesComment, SeriesCoverProject, SeriesPermission, SeriesPermissionGrant,
  SeriesRevision, SeriesRole, SeriesStaffAssignment, SeriesStoryBlock,
  SeriesStoryBlockLink, StoryScene,
} from '../types/seriesProduction';

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const json = (value: unknown) => JSON.stringify(value);
const parse = <T>(value: SqlValue, fallback: T): T => {
  try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; }
};
const all = (db: Database, sql: string, params: SqlValue[] = []): SqlValue[][] => {
  const statement = db.prepare(sql);
  try {
    statement.bind(params);
    const result: SqlValue[][] = [];
    while (statement.step()) result.push(statement.get());
    return result;
  } finally { statement.free(); }
};
const one = (db: Database, sql: string, params: SqlValue[] = []) => all(db, sql, params)[0];

const rolePermissions: Record<SeriesRole, readonly SeriesPermission[]> = {
  owner: ['create','edit','delete','approve','publish','manage-staff','lock','comment'],
  'lead-writer': ['create','edit','delete','approve','comment'],
  'co-writer': ['create','edit','comment'],
  editor: ['edit','approve','comment'],
  'story-architect': ['create','edit','delete','comment'],
  'character-director': ['create','edit','comment'],
  'asset-manager': ['create','edit','delete','comment'],
  'cover-designer': ['create','edit','comment'],
  'continuity-editor': ['edit','approve','comment'],
  publisher: ['approve','publish','lock','comment'],
  viewer: [],
};

export interface PermissionTarget {
  scopeType: ProductionScope;
  scopeId: string;
  ancestors?: Array<{ scopeType: ProductionScope; scopeId: string }>;
}

export function hasSeriesPermission(
  userId: string,
  permission: SeriesPermission,
  target: PermissionTarget,
  assignments: SeriesStaffAssignment[],
  grants: SeriesPermissionGrant[] = []
): boolean {
  const scopes = [{ scopeType: target.scopeType, scopeId: target.scopeId }, ...(target.ancestors || [])];
  return assignments.filter((item) => item.userId === userId && item.active).some((assignment) => {
    const applies = assignment.scopeType === 'series' ||
      scopes.some((scope) => scope.scopeType === assignment.scopeType && scope.scopeId === assignment.scopeId);
    if (!applies) return false;
    const explicit = grants.find((grant) => grant.assignmentId === assignment.id && grant.permission === permission);
    return explicit ? explicit.allowed : rolePermissions[assignment.role].includes(permission);
  });
}

export function assertSeriesPermission(
  userId: string, permission: SeriesPermission, target: PermissionTarget,
  assignments: SeriesStaffAssignment[], grants: SeriesPermissionGrant[] = []
): void {
  if (!hasSeriesPermission(userId, permission, target, assignments, grants)) {
    throw new Error(`Permission denied: ${permission} on ${target.scopeType}.`);
  }
}

export async function assignSeriesStaff(input: Omit<SeriesStaffAssignment,'id'|'createdAt'|'updatedAt'>): Promise<SeriesStaffAssignment> {
  const value = {...input,id:id('staff'),createdAt:now(),updatedAt:now()};
  await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_staff_assignments
    (id,series_id,user_id,display_name,role,scope_type,scope_id,active,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?);`,[value.id,value.seriesId,value.userId,value.displayName,value.role,value.scopeType,value.scopeId,value.active?1:0,value.createdAt,value.updatedAt]));
  return value;
}
export async function savePermissionGrant(input: Omit<SeriesPermissionGrant,'id'|'createdAt'|'updatedAt'>): Promise<SeriesPermissionGrant> {
  const value={...input,id:id('permission'),createdAt:now(),updatedAt:now()};
  await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_permissions
    (id,assignment_id,permission,allowed,created_at,updated_at) VALUES (?,?,?,?,?,?)
    ON CONFLICT(assignment_id,permission) DO UPDATE SET allowed=excluded.allowed,updated_at=excluded.updated_at;`,
    [value.id,value.assignmentId,value.permission,value.allowed?1:0,value.createdAt,value.updatedAt]));
  return value;
}
export async function getSeriesStaff(seriesId:string):Promise<SeriesStaffAssignment[]> {
  const db=await getSQLiteDB();
  return all(db,`SELECT id,series_id,user_id,display_name,role,scope_type,scope_id,active,created_at,updated_at
    FROM series_staff_assignments WHERE series_id=? ORDER BY display_name;`,[seriesId]).map((r)=>({
      id:String(r[0]),seriesId:String(r[1]),userId:String(r[2]),displayName:String(r[3]),role:String(r[4]) as SeriesRole,
      scopeType:String(r[5]) as ProductionScope,scopeId:String(r[6]),active:Boolean(r[7]),createdAt:String(r[8]),updatedAt:String(r[9]),
    }));
}
export async function getPermissionGrants(seriesId:string):Promise<SeriesPermissionGrant[]> {
  const db=await getSQLiteDB();
  return all(db,`SELECT p.id,p.assignment_id,p.permission,p.allowed,p.created_at,p.updated_at
    FROM series_permissions p JOIN series_staff_assignments s ON s.id=p.assignment_id WHERE s.series_id=?;`,[seriesId]).map((r)=>({
      id:String(r[0]),assignmentId:String(r[1]),permission:String(r[2]) as SeriesPermission,
      allowed:Boolean(r[3]),createdAt:String(r[4]),updatedAt:String(r[5]),
    }));
}

const mapChapter=(r:SqlValue[]):SeriesChapter=>({id:String(r[0]),seriesId:String(r[1]),seasonId:String(r[2]),episodeId:String(r[3]),chapterNumber:Number(r[4]),title:String(r[5]),synopsis:String(r[6]),status:String(r[7]) as EditorialStatus,orderIndex:Number(r[8]),createdAt:String(r[9]),updatedAt:String(r[10])});
export async function createProductionChapter(input:Omit<SeriesChapter,'id'|'createdAt'|'updatedAt'>):Promise<SeriesChapter>{
  const value={...input,id:id('chapter'),createdAt:now(),updatedAt:now()};
  await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_chapters
    (id,series_id,season_id,episode_id,chapter_number,title,synopsis,status,order_index,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?);`,[value.id,value.seriesId,value.seasonId,value.episodeId,value.chapterNumber,value.title,value.synopsis,value.status,value.orderIndex,value.createdAt,value.updatedAt]));
  return value;
}
export async function getProductionChapters(episodeId:string):Promise<SeriesChapter[]>{
  const db=await getSQLiteDB();return all(db,`SELECT id,series_id,season_id,episode_id,chapter_number,title,synopsis,status,order_index,created_at,updated_at FROM series_chapters WHERE episode_id=? ORDER BY order_index,chapter_number;`,[episodeId]).map(mapChapter);
}

const mapScene=(r:SqlValue[]):StoryScene=>({id:String(r[0]),seriesId:String(r[1]),seasonId:String(r[2]),episodeId:String(r[3]),chapterId:String(r[4]),sceneNumber:Number(r[5]),title:String(r[6]),purpose:String(r[7]),synopsis:String(r[8]),openingSituation:String(r[9]),conflict:String(r[10]),turningPoint:String(r[11]),outcome:String(r[12]),locationId:r[13]?String(r[13]):undefined,characterIds:parse(r[14],[]),assetIds:parse(r[15],[]),possessionIds:parse(r[16],[]),storyDate:r[17]?String(r[17]):undefined,storyTime:String(r[18]),weather:String(r[19]),status:String(r[20]) as EditorialStatus,orderIndex:Number(r[21]),archivedAt:r[22]?String(r[22]):undefined,createdAt:String(r[23]),updatedAt:String(r[24])});
const sceneSelect=`SELECT id,series_id,season_id,episode_id,chapter_id,scene_number,title,purpose,synopsis,
  opening_situation,conflict,turning_point,outcome,location_id,character_ids_json,asset_ids_json,
  possession_ids_json,story_date,story_time,weather,status,order_index,archived_at,created_at,updated_at FROM series_scenes`;
function insertScene(db:Database,value:StoryScene){db.run(`INSERT INTO series_scenes
  (id,series_id,season_id,episode_id,chapter_id,scene_number,title,purpose,synopsis,opening_situation,
  conflict,turning_point,outcome,location_id,character_ids_json,asset_ids_json,possession_ids_json,
  story_date,story_time,weather,status,order_index,archived_at,created_at,updated_at)
  VALUES (${Array(25).fill('?').join(',')});`,[value.id,value.seriesId,value.seasonId,value.episodeId,value.chapterId,value.sceneNumber,value.title,value.purpose,value.synopsis,value.openingSituation,value.conflict,value.turningPoint,value.outcome,value.locationId||null,json(value.characterIds),json(value.assetIds),json(value.possessionIds),value.storyDate||null,value.storyTime,value.weather,value.status,value.orderIndex,value.archivedAt||null,value.createdAt,value.updatedAt]);}
export async function createStoryScene(input:Omit<StoryScene,'id'|'createdAt'|'updatedAt'>):Promise<StoryScene>{const value={...input,id:id('scene'),createdAt:now(),updatedAt:now()};await runSQLiteTransaction((db)=>insertScene(db,value));return value;}
export async function getScenesForChapter(chapterId:string):Promise<StoryScene[]>{const db=await getSQLiteDB();return all(db,`${sceneSelect} WHERE chapter_id=? ORDER BY order_index,scene_number;`,[chapterId]).map(mapScene);}
export async function updateStoryScene(scene:StoryScene,changedBy='system',summary='Scene updated'):Promise<StoryScene>{
  const value={...scene,updatedAt:now()};
  await runSQLiteTransaction((db)=>{
    const locked=one(db,`SELECT status FROM series_scenes WHERE id=?;`,[scene.id]);
    if (locked?.[0]==='locked') throw new Error('Locked content cannot be edited.');
    db.run(`UPDATE series_scenes SET title=?,purpose=?,synopsis=?,opening_situation=?,conflict=?,turning_point=?,
      outcome=?,location_id=?,character_ids_json=?,asset_ids_json=?,possession_ids_json=?,story_date=?,
      story_time=?,weather=?,status=?,order_index=?,archived_at=?,updated_at=? WHERE id=?;`,
      [value.title,value.purpose,value.synopsis,value.openingSituation,value.conflict,value.turningPoint,value.outcome,value.locationId||null,json(value.characterIds),json(value.assetIds),json(value.possessionIds),value.storyDate||null,value.storyTime,value.weather,value.status,value.orderIndex,value.archivedAt||null,value.updatedAt,value.id]);
    insertRevision(db,value.seriesId,'scene',value.id,changedBy,summary,value);
  });return value;
}
export async function duplicateStoryScene(sceneId:string):Promise<StoryScene>{
  const db=await getSQLiteDB();const row=one(db,`${sceneSelect} WHERE id=?;`,[sceneId]);if(!row)throw new Error('Scene not found.');
  const source=mapScene(row);const count=Number(one(db,'SELECT COUNT(*) FROM series_scenes WHERE chapter_id=?;',[source.chapterId])?.[0]||0);
  const value={...source,id:id('scene'),sceneNumber:count+1,title:`${source.title} Copy`,status:'draft' as const,orderIndex:count,archivedAt:undefined,createdAt:now(),updatedAt:now()};
  await runSQLiteTransaction((tx)=>{insertScene(tx,value);const blocks=all(tx,`SELECT block_type,content,image_asset_id,caption,order_index,created_by FROM series_story_blocks WHERE scene_id=? ORDER BY order_index;`,[source.id]);blocks.forEach((r)=>tx.run(`INSERT INTO series_story_blocks(id,series_id,chapter_id,scene_id,block_type,content,image_asset_id,caption,order_index,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?);`,[id('block'),source.seriesId,source.chapterId,value.id,...r,now(),now()]));});return value;
}
export async function reorderStoryScenes(chapterId:string,ids:string[]):Promise<void>{await runSQLiteTransaction((db)=>ids.forEach((sceneId,index)=>db.run('UPDATE series_scenes SET order_index=?,updated_at=? WHERE id=? AND chapter_id=?;',[index,now(),sceneId,chapterId])));}
export async function archiveStoryScene(sceneId:string):Promise<void>{await runSQLiteTransaction((db)=>db.run(`UPDATE series_scenes SET status='locked',archived_at=?,updated_at=? WHERE id=?;`,[now(),now(),sceneId]));}
export async function deleteStoryScene(sceneId:string,confirmed=false):Promise<void>{if(!confirmed)throw new Error('Scene deletion requires confirmation.');await runSQLiteTransaction((db)=>{const r=one(db,`SELECT status,(SELECT COUNT(*) FROM series_story_blocks WHERE scene_id=?) FROM series_scenes WHERE id=?;`,[sceneId,sceneId]);if(!r) return;if(r[0]==='locked'||Number(r[1])>0)throw new Error('Only empty, unlocked scenes can be deleted.');db.run('DELETE FROM series_scenes WHERE id=?;',[sceneId]);});}

const mapBlock=(r:SqlValue[]):SeriesStoryBlock=>({id:String(r[0]),seriesId:String(r[1]),chapterId:String(r[2]),sceneId:String(r[3]),type:String(r[4]) as SeriesStoryBlock['type'],content:String(r[5]),imageAssetId:r[6]?String(r[6]):undefined,caption:String(r[7]),orderIndex:Number(r[8]),createdBy:String(r[9]),createdAt:String(r[10]),updatedAt:String(r[11])});
const blockSelect=`SELECT id,series_id,chapter_id,scene_id,block_type,content,image_asset_id,caption,order_index,created_by,created_at,updated_at FROM series_story_blocks`;
export async function createStoryBlock(input:Omit<SeriesStoryBlock,'id'|'createdAt'|'updatedAt'>):Promise<SeriesStoryBlock>{const value={...input,id:id('block'),createdAt:now(),updatedAt:now()};await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_story_blocks(id,series_id,chapter_id,scene_id,block_type,content,image_asset_id,caption,order_index,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?);`,[value.id,value.seriesId,value.chapterId,value.sceneId,value.type,value.content,value.imageAssetId||null,value.caption,value.orderIndex,value.createdBy,value.createdAt,value.updatedAt]));return value;}
export async function getStoryBlocks(sceneId:string,includeInternal=true):Promise<SeriesStoryBlock[]>{const db=await getSQLiteDB();return all(db,`${blockSelect} WHERE scene_id=? ${includeInternal?'':`AND block_type<>'internal-note'`} ORDER BY order_index;`,[sceneId]).map(mapBlock);}
export async function updateStoryBlock(block:SeriesStoryBlock,changedBy:string):Promise<SeriesStoryBlock>{const value={...block,updatedAt:now()};await runSQLiteTransaction((db)=>{const scene=one(db,`SELECT status FROM series_scenes WHERE id=?;`,[block.sceneId]);if(scene?.[0]==='locked')throw new Error('Locked content cannot be edited.');db.run(`UPDATE series_story_blocks SET block_type=?,content=?,image_asset_id=?,caption=?,order_index=?,updated_at=? WHERE id=?;`,[value.type,value.content,value.imageAssetId||null,value.caption,value.orderIndex,value.updatedAt,value.id]);insertRevision(db,value.seriesId,'story-block',value.id,changedBy,'Story block updated',value);});return value;}
export async function duplicateStoryBlock(blockId:string):Promise<SeriesStoryBlock>{const db=await getSQLiteDB();const r=one(db,`${blockSelect} WHERE id=?;`,[blockId]);if(!r)throw new Error('Block not found.');const source=mapBlock(r);return createStoryBlock({...source,id:undefined,orderIndex:source.orderIndex+1,createdAt:undefined,updatedAt:undefined} as never);}
export async function moveStoryBlock(blockId:string,chapterId:string,sceneId:string,orderIndex:number):Promise<void>{await runSQLiteTransaction((db)=>db.run(`UPDATE series_story_blocks SET chapter_id=?,scene_id=?,order_index=?,updated_at=? WHERE id=?;`,[chapterId,sceneId,orderIndex,now(),blockId]));}
export async function reorderStoryBlocks(sceneId:string,ids:string[]):Promise<void>{await runSQLiteTransaction((db)=>ids.forEach((blockId,index)=>db.run(`UPDATE series_story_blocks SET order_index=?,updated_at=? WHERE id=? AND scene_id=?;`,[index,now(),blockId,sceneId])));}
export async function deleteStoryBlock(blockId:string):Promise<void>{await runSQLiteTransaction((db)=>db.run('DELETE FROM series_story_blocks WHERE id=?;',[blockId]));}
export async function linkStoryBlockEntity(input:Omit<SeriesStoryBlockLink,'id'|'createdAt'>):Promise<SeriesStoryBlockLink>{const value={...input,id:id('link'),createdAt:now()};await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_story_block_links(id,block_id,entity_type,entity_id,label,start_offset,end_offset,created_at)VALUES(?,?,?,?,?,?,?,?);`,[value.id,value.blockId,value.entityType,value.entityId,value.label,value.startOffset,value.endOffset,value.createdAt]));return value;}
export async function getStoryBlockLinks(blockId:string):Promise<SeriesStoryBlockLink[]>{const db=await getSQLiteDB();return all(db,`SELECT id,block_id,entity_type,entity_id,label,start_offset,end_offset,created_at FROM series_story_block_links WHERE block_id=?;`,[blockId]).map((r)=>({id:String(r[0]),blockId:String(r[1]),entityType:String(r[2]) as SeriesStoryBlockLink['entityType'],entityId:String(r[3]),label:String(r[4]),startOffset:Number(r[5]),endOffset:Number(r[6]),createdAt:String(r[7])}));}

export async function createSeriesCharacter(input:Omit<SeriesCharacter,'id'|'createdAt'|'updatedAt'>):Promise<SeriesCharacter>{const value={...input,id:id('character'),createdAt:now(),updatedAt:now()};await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_characters(id,series_id,source_book_character_id,name,aliases_json,description,status,death_scene_id,created_at,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?);`,[value.id,value.seriesId,value.sourceBookCharacterId||null,value.name,json(value.aliases),value.description,value.status,value.deathSceneId||null,value.createdAt,value.updatedAt]));return value;}
export async function getSeriesProductionCharacters(seriesId:string):Promise<SeriesCharacter[]>{const db=await getSQLiteDB();return all(db,`SELECT id,series_id,source_book_character_id,name,aliases_json,description,status,death_scene_id,created_at,updated_at FROM series_characters WHERE series_id=?;`,[seriesId]).map((r)=>({id:String(r[0]),seriesId:String(r[1]),sourceBookCharacterId:r[2]?String(r[2]):undefined,name:String(r[3]),aliases:parse(r[4],[]),description:String(r[5]),status:String(r[6]) as SeriesCharacter['status'],deathSceneId:r[7]?String(r[7]):undefined,createdAt:String(r[8]),updatedAt:String(r[9])}));}
export async function createSeriesActor(input:Omit<SeriesActor,'id'|'createdAt'|'updatedAt'>):Promise<SeriesActor>{const value={...input,id:id('actor'),createdAt:now(),updatedAt:now()};await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_actors(id,series_id,name,bio,contact_notes,image_asset_id,created_at,updated_at)VALUES(?,?,?,?,?,?,?,?);`,[value.id,value.seriesId,value.name,value.bio,value.contactNotes,value.imageAssetId||null,value.createdAt,value.updatedAt]));return value;}
export async function getSeriesActors(seriesId:string):Promise<SeriesActor[]>{const db=await getSQLiteDB();return all(db,`SELECT id,series_id,name,bio,contact_notes,image_asset_id,created_at,updated_at FROM series_actors WHERE series_id=?;`,[seriesId]).map((r)=>({id:String(r[0]),seriesId:String(r[1]),name:String(r[2]),bio:String(r[3]),contactNotes:String(r[4]),imageAssetId:r[5]?String(r[5]):undefined,createdAt:String(r[6]),updatedAt:String(r[7])}));}
export async function assignActorToCharacter(input:Omit<CharacterActorAssignment,'id'|'createdAt'|'updatedAt'>):Promise<CharacterActorAssignment>{const value={...input,id:id('casting'),createdAt:now(),updatedAt:now()};await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_character_actor_assignments(id,series_id,character_id,actor_id,assignment_type,season_id,episode_id,start_date,end_date,notes,created_at,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?,?);`,[value.id,value.seriesId,value.characterId,value.actorId,value.assignmentType,value.seasonId||null,value.episodeId||null,value.startDate||null,value.endDate||null,value.notes,value.createdAt,value.updatedAt]));return value;}
export async function getActorAssignments(seriesId:string):Promise<CharacterActorAssignment[]>{const db=await getSQLiteDB();return all(db,`SELECT id,series_id,character_id,actor_id,assignment_type,season_id,episode_id,start_date,end_date,notes,created_at,updated_at FROM series_character_actor_assignments WHERE series_id=?;`,[seriesId]).map((r)=>({id:String(r[0]),seriesId:String(r[1]),characterId:String(r[2]),actorId:String(r[3]),assignmentType:String(r[4]) as CharacterActorAssignment['assignmentType'],seasonId:r[5]?String(r[5]):undefined,episodeId:r[6]?String(r[6]):undefined,startDate:r[7]?String(r[7]):undefined,endDate:r[8]?String(r[8]):undefined,notes:String(r[9]),createdAt:String(r[10]),updatedAt:String(r[11])}));}

export async function createSeriesAsset(input:Omit<SeriesAsset,'id'|'createdAt'|'updatedAt'>):Promise<SeriesAsset>{const value={...input,id:id('asset'),createdAt:now(),updatedAt:now()};await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_assets(id,series_id,name,asset_type,description,owner_character_id,custodian_character_id,status,acquired_scene_id,lost_scene_id,destroyed_scene_id,first_appearance_scene_id,continuity_notes,file_url,created_at,updated_at)VALUES(${Array(16).fill('?').join(',')});`,[value.id,value.seriesId,value.name,value.type,value.description,value.ownerCharacterId||null,value.custodianCharacterId||null,value.status,value.acquiredSceneId||null,value.lostSceneId||null,value.destroyedSceneId||null,value.firstAppearanceSceneId||null,value.continuityNotes,value.fileUrl||null,value.createdAt,value.updatedAt]));return value;}
export async function getSeriesProductionAssets(seriesId:string):Promise<SeriesAsset[]>{const db=await getSQLiteDB();return all(db,`SELECT id,series_id,name,asset_type,description,owner_character_id,custodian_character_id,status,acquired_scene_id,lost_scene_id,destroyed_scene_id,first_appearance_scene_id,continuity_notes,file_url,created_at,updated_at FROM series_assets WHERE series_id=?;`,[seriesId]).map((r)=>({id:String(r[0]),seriesId:String(r[1]),name:String(r[2]),type:String(r[3]) as SeriesAsset['type'],description:String(r[4]),ownerCharacterId:r[5]?String(r[5]):undefined,custodianCharacterId:r[6]?String(r[6]):undefined,status:String(r[7]) as SeriesAsset['status'],acquiredSceneId:r[8]?String(r[8]):undefined,lostSceneId:r[9]?String(r[9]):undefined,destroyedSceneId:r[10]?String(r[10]):undefined,firstAppearanceSceneId:r[11]?String(r[11]):undefined,continuityNotes:String(r[12]),fileUrl:r[13]?String(r[13]):undefined,createdAt:String(r[14]),updatedAt:String(r[15])}));}
export async function updateSeriesAsset(value:SeriesAsset):Promise<void>{await runSQLiteTransaction((db)=>db.run(`UPDATE series_assets SET name=?,asset_type=?,description=?,owner_character_id=?,custodian_character_id=?,status=?,acquired_scene_id=?,lost_scene_id=?,destroyed_scene_id=?,first_appearance_scene_id=?,continuity_notes=?,file_url=?,updated_at=? WHERE id=?;`,[value.name,value.type,value.description,value.ownerCharacterId||null,value.custodianCharacterId||null,value.status,value.acquiredSceneId||null,value.lostSceneId||null,value.destroyedSceneId||null,value.firstAppearanceSceneId||null,value.continuityNotes,value.fileUrl||null,now(),value.id]));}
export async function assignCharacterPossession(input:Omit<CharacterPossession,'id'|'createdAt'|'updatedAt'>):Promise<CharacterPossession>{const value={...input,id:id('possession'),createdAt:now(),updatedAt:now()};await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_character_possessions(id,series_id,asset_id,character_id,status,acquired_scene_id,transferred_scene_id,transferred_to_character_id,lost_scene_id,destroyed_scene_id,notes,created_at,updated_at)VALUES(${Array(13).fill('?').join(',')});`,[value.id,value.seriesId,value.assetId,value.characterId,value.status,value.acquiredSceneId||null,value.transferredSceneId||null,value.transferredToCharacterId||null,value.lostSceneId||null,value.destroyedSceneId||null,value.notes,value.createdAt,value.updatedAt]));return value;}
export async function transferCharacterPossession(possessionId:string,toCharacterId:string,sceneId:string):Promise<void>{await runSQLiteTransaction((db)=>{const r=one(db,`SELECT status FROM series_character_possessions WHERE id=?;`,[possessionId]);if(!r)throw new Error('Possession not found.');if(r[0]==='transferred')throw new Error('Possession has already been transferred.');db.run(`UPDATE series_character_possessions SET status='transferred',transferred_scene_id=?,transferred_to_character_id=?,updated_at=? WHERE id=?;`,[sceneId,toCharacterId,now(),possessionId]);});}
export async function getCharacterPossessions(seriesId:string):Promise<CharacterPossession[]>{const db=await getSQLiteDB();return all(db,`SELECT id,series_id,asset_id,character_id,status,acquired_scene_id,transferred_scene_id,transferred_to_character_id,lost_scene_id,destroyed_scene_id,notes,created_at,updated_at FROM series_character_possessions WHERE series_id=?;`,[seriesId]).map((r)=>({id:String(r[0]),seriesId:String(r[1]),assetId:String(r[2]),characterId:String(r[3]),status:String(r[4]) as CharacterPossession['status'],acquiredSceneId:r[5]?String(r[5]):undefined,transferredSceneId:r[6]?String(r[6]):undefined,transferredToCharacterId:r[7]?String(r[7]):undefined,lostSceneId:r[8]?String(r[8]):undefined,destroyedSceneId:r[9]?String(r[9]):undefined,notes:String(r[10]),createdAt:String(r[11]),updatedAt:String(r[12])}));}

export async function createDialogueBlock(input:Omit<DialogueBlock,'id'|'createdAt'|'updatedAt'>):Promise<DialogueBlock>{const value={...input,id:id('dialogue'),createdAt:now(),updatedAt:now()};await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_dialogue_blocks(id,series_id,scene_id,story_block_id,character_id,actor_id,dialogue,emotion,delivery,action_before,action_after,audio_asset_id,image_asset_id,order_index,created_at,updated_at)VALUES(${Array(16).fill('?').join(',')});`,[value.id,value.seriesId,value.sceneId,value.storyBlockId,value.characterId,value.actorId||null,value.dialogue,value.emotion,value.delivery,value.actionBefore,value.actionAfter,value.audioAssetId||null,value.imageAssetId||null,value.orderIndex,value.createdAt,value.updatedAt]));return value;}
export function requirePossessionChangeConfirmation(confirmed:boolean):void{if(!confirmed)throw new Error('Dialogue cannot change possessions without explicit confirmation.');}

export async function saveProductionRelationship(value:ProductionRelationship):Promise<void>{await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_relationships(id,series_id,source_character_id,target_character_id,relationship_type,status,description,started_episode_id,ended_episode_id,trust_level,conflict,changes_by_episode_json,conflict_level,active,betrayal,reconciliation,created_at,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET relationship_type=excluded.relationship_type,status=excluded.status,description=excluded.description,trust_level=excluded.trust_level,conflict_level=excluded.conflict_level,active=excluded.active,betrayal=excluded.betrayal,reconciliation=excluded.reconciliation,updated_at=excluded.updated_at;`,[value.id,value.seriesId,value.sourceCharacterId,value.targetCharacterId,value.type,value.active?'active':'ended',value.description,value.startEpisodeId||null,value.endEpisodeId||null,value.trustLevel,'','[]',value.conflictLevel,value.active?1:0,value.betrayal,value.reconciliation,value.createdAt,value.updatedAt]));}
export async function getProductionRelationships(seriesId:string):Promise<ProductionRelationship[]>{const db=await getSQLiteDB();return all(db,`SELECT id,series_id,source_character_id,target_character_id,relationship_type,trust_level,conflict_level,active,betrayal,reconciliation,started_episode_id,ended_episode_id,description,created_at,updated_at FROM series_relationships WHERE series_id=?;`,[seriesId]).map((r)=>({id:String(r[0]),seriesId:String(r[1]),sourceCharacterId:String(r[2]),targetCharacterId:String(r[3]),type:String(r[4]) as ProductionRelationship['type'],trustLevel:Number(r[5]||0),conflictLevel:Number(r[6]||0),active:Boolean(r[7]),betrayal:String(r[8]||''),reconciliation:String(r[9]||''),startEpisodeId:r[10]?String(r[10]):undefined,endEpisodeId:r[11]?String(r[11]):undefined,description:String(r[12]||''),createdAt:String(r[13]||''),updatedAt:String(r[14]||'')}));}
export async function saveCoverProject(value:SeriesCoverProject):Promise<void>{await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_cover_projects(id,series_id,season_id,episode_id,book_id,cover_type,title,subtitle,author,background_image_asset_id,gradient_start,gradient_end,series_badge,season_badge,episode_badge,actor_ids_json,character_ids_json,publisher_mark_asset_id,price,release_date,template_id,status,created_at,updated_at)VALUES(${Array(24).fill('?').join(',')}) ON CONFLICT(id) DO UPDATE SET title=excluded.title,subtitle=excluded.subtitle,author=excluded.author,background_image_asset_id=excluded.background_image_asset_id,gradient_start=excluded.gradient_start,gradient_end=excluded.gradient_end,series_badge=excluded.series_badge,season_badge=excluded.season_badge,episode_badge=excluded.episode_badge,actor_ids_json=excluded.actor_ids_json,character_ids_json=excluded.character_ids_json,publisher_mark_asset_id=excluded.publisher_mark_asset_id,price=excluded.price,release_date=excluded.release_date,template_id=excluded.template_id,status=excluded.status,updated_at=excluded.updated_at;`,[value.id,value.seriesId,value.seasonId||null,value.episodeId||null,value.bookId||null,value.type,value.title,value.subtitle,value.author,value.backgroundImageAssetId||null,value.gradientStart,value.gradientEnd,value.seriesBadge,value.seasonBadge,value.episodeBadge,json(value.actorIds),json(value.characterIds),value.publisherMarkAssetId||null,value.price,value.releaseDate||null,value.templateId||null,value.status,value.createdAt,value.updatedAt]));}
export async function getCoverProjects(seriesId:string):Promise<SeriesCoverProject[]>{const db=await getSQLiteDB();return all(db,`SELECT id,series_id,season_id,episode_id,book_id,cover_type,title,subtitle,author,background_image_asset_id,gradient_start,gradient_end,series_badge,season_badge,episode_badge,actor_ids_json,character_ids_json,publisher_mark_asset_id,price,release_date,template_id,status,created_at,updated_at FROM series_cover_projects WHERE series_id=?;`,[seriesId]).map((r)=>({id:String(r[0]),seriesId:String(r[1]),seasonId:r[2]?String(r[2]):undefined,episodeId:r[3]?String(r[3]):undefined,bookId:r[4]?String(r[4]):undefined,type:String(r[5]) as SeriesCoverProject['type'],title:String(r[6]),subtitle:String(r[7]),author:String(r[8]),backgroundImageAssetId:r[9]?String(r[9]):undefined,gradientStart:String(r[10]),gradientEnd:String(r[11]),seriesBadge:String(r[12]),seasonBadge:String(r[13]),episodeBadge:String(r[14]),actorIds:parse(r[15],[]),characterIds:parse(r[16],[]),publisherMarkAssetId:r[17]?String(r[17]):undefined,price:String(r[18]),releaseDate:r[19]?String(r[19]):undefined,templateId:r[20]?String(r[20]):undefined,status:String(r[21]) as EditorialStatus,createdAt:String(r[22]),updatedAt:String(r[23])}));}

export async function saveEditorialReview(value:EditorialReview):Promise<void>{await runSQLiteTransaction((db)=>{db.run(`INSERT INTO series_editorial_reviews(id,series_id,scope_type,scope_id,status,assigned_to,requested_by,reviewed_by,review_note,created_at,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,assigned_to=excluded.assigned_to,reviewed_by=excluded.reviewed_by,review_note=excluded.review_note,updated_at=excluded.updated_at;`,[value.id,value.seriesId,value.scopeType,value.scopeId,value.status,value.assignedTo||null,value.requestedBy||null,value.reviewedBy||null,value.reviewNote,value.createdAt,value.updatedAt]);if(value.scopeType==='scene')db.run(`UPDATE series_scenes SET status=?,updated_at=? WHERE id=?;`,[value.status,now(),value.scopeId]);});}
export async function getEditorialReviews(seriesId:string):Promise<EditorialReview[]>{const db=await getSQLiteDB();return all(db,`SELECT id,series_id,scope_type,scope_id,status,assigned_to,requested_by,reviewed_by,review_note,created_at,updated_at FROM series_editorial_reviews WHERE series_id=? ORDER BY updated_at DESC;`,[seriesId]).map((r)=>({id:String(r[0]),seriesId:String(r[1]),scopeType:String(r[2]) as ProductionScope,scopeId:String(r[3]),status:String(r[4]) as EditorialStatus,assignedTo:r[5]?String(r[5]):undefined,requestedBy:r[6]?String(r[6]):undefined,reviewedBy:r[7]?String(r[7]):undefined,reviewNote:String(r[8]),createdAt:String(r[9]),updatedAt:String(r[10])}));}
export async function addSeriesComment(value:SeriesComment):Promise<void>{await runSQLiteTransaction((db)=>db.run(`INSERT INTO series_comments(id,series_id,scope_type,scope_id,author_id,body,mention_user_ids_json,resolved,created_at,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?);`,[value.id,value.seriesId,value.scopeType,value.scopeId,value.authorId,value.body,json(value.mentionUserIds),value.resolved?1:0,value.createdAt,value.updatedAt]));}
function insertRevision(db:Database,seriesId:string,entityType:string,entityId:string,changedBy:string,summary:string,snapshot:unknown):SeriesRevision{const revision=Number(one(db,`SELECT COALESCE(MAX(revision_number),0)+1 FROM series_revision_history WHERE entity_type=? AND entity_id=?;`,[entityType,entityId])?.[0]||1);const value:SeriesRevision={id:id('revision'),seriesId,entityType,entityId,revisionNumber:revision,changedBy,summary,snapshot:json(snapshot),createdAt:now()};db.run(`INSERT INTO series_revision_history(id,series_id,entity_type,entity_id,revision_number,changed_by,summary,snapshot,created_at)VALUES(?,?,?,?,?,?,?,?,?);`,[value.id,value.seriesId,value.entityType,value.entityId,value.revisionNumber,value.changedBy,value.summary,value.snapshot,value.createdAt]);return value;}
export async function getRevisionHistory(entityType:string,entityId:string):Promise<SeriesRevision[]>{const db=await getSQLiteDB();return all(db,`SELECT id,series_id,entity_type,entity_id,revision_number,changed_by,summary,snapshot,created_at FROM series_revision_history WHERE entity_type=? AND entity_id=? ORDER BY revision_number DESC;`,[entityType,entityId]).map((r)=>({id:String(r[0]),seriesId:String(r[1]),entityType:String(r[2]),entityId:String(r[3]),revisionNumber:Number(r[4]),changedBy:String(r[5]),summary:String(r[6]),snapshot:String(r[7]),createdAt:String(r[8])}));}

export function generateProductionContinuityWarnings(input:{
  scenes:StoryScene[];characters:SeriesCharacter[];actors:SeriesActor[];
  cast:CharacterActorAssignment[];assets:SeriesAsset[];possessions:CharacterPossession[];
  relationships:ProductionRelationship[];covers:SeriesCoverProject[];
  expectedLocationByScene?:Record<string,string>;
  requiredCharacterIdsByEpisode?:Record<string,string[]>;
}):ProductionContinuityWarning[]{
  const warnings:ProductionContinuityWarning[]=[];
  const sceneOrder=new Map(input.scenes.map((scene,index)=>[scene.id,index]));
  const seenNumbers=new Set<string>();
  input.scenes.forEach((scene,index)=>{
    const key=`${scene.chapterId}:${scene.sceneNumber}`;if(seenNumbers.has(key))warnings.push({code:'duplicate-scene-number',severity:'error',message:`Duplicate scene number ${scene.sceneNumber}.`,sceneId:scene.id});seenNumbers.add(key);
    if(index>0&&scene.storyDate&&input.scenes[index-1].storyDate&&scene.storyDate<input.scenes[index-1].storyDate!)warnings.push({code:'scene-date-order',severity:'warning',message:'Scene date is earlier than the preceding scene.',sceneId:scene.id});
    const expectedLocation=input.expectedLocationByScene?.[scene.id];if(expectedLocation&&scene.locationId!==expectedLocation)warnings.push({code:'location-mismatch',severity:'warning',message:'Scene location conflicts with its continuity location.',sceneId:scene.id});
    scene.characterIds.forEach((characterId)=>{const character=input.characters.find((item)=>item.id===characterId);if(character?.status==='dead'&&character.deathSceneId&&(sceneOrder.get(scene.id)??0)>(sceneOrder.get(character.deathSceneId)??Infinity))warnings.push({code:'character-after-death',severity:'error',message:`${character.name} appears after death.`,sceneId:scene.id,entityId:characterId});});
    scene.assetIds.forEach((assetId)=>{const asset=input.assets.find((item)=>item.id===assetId);if(asset?.status==='lost')warnings.push({code:'asset-after-loss',severity:'warning',message:`${asset.name} appears after being lost.`,sceneId:scene.id,entityId:assetId});if(asset?.status==='destroyed')warnings.push({code:'asset-after-destruction',severity:'error',message:`${asset.name} appears after destruction.`,sceneId:scene.id,entityId:assetId});});
    scene.assetIds.forEach((assetId)=>{if(!input.possessions.some((item)=>item.assetId===assetId&&scene.characterIds.includes(item.characterId)&&!['lost','destroyed','transferred'].includes(item.status)))warnings.push({code:'asset-not-possessed',severity:'warning',message:'A character uses an asset they do not possess.',sceneId:scene.id,entityId:assetId});});
    const actorCharacters=new Map<string,string>();input.cast.filter((item)=>scene.characterIds.includes(item.characterId)&&(!item.episodeId||item.episodeId===scene.episodeId)).forEach((item)=>{const previous=actorCharacters.get(item.actorId);if(previous&&previous!==item.characterId)warnings.push({code:'actor-conflict',severity:'error',message:'Actor is assigned to conflicting characters in the same scene.',sceneId:scene.id,entityId:item.actorId});actorCharacters.set(item.actorId,item.characterId);});
    scene.possessionIds.forEach((possessionId)=>{const possession=input.possessions.find((item)=>item.id===possessionId);if(possession&&!scene.characterIds.includes(possession.characterId))warnings.push({code:'possession-owner-missing',severity:'warning',message:'Asset is used without its possessor present.',sceneId:scene.id,entityId:possessionId});});
  });
  Object.entries(input.requiredCharacterIdsByEpisode||{}).forEach(([episodeId,required])=>required.forEach((characterId)=>{if(!input.scenes.some((scene)=>scene.episodeId===episodeId&&scene.characterIds.includes(characterId)))warnings.push({code:'episode-missing-character',severity:'warning',message:'Episode is missing a required character.',entityId:characterId});}));
  const transfers=new Set<string>();input.possessions.filter((item)=>item.status==='transferred').forEach((item)=>{const key=`${item.assetId}:${item.transferredSceneId}`;if(transfers.has(key))warnings.push({code:'possession-double-transfer',severity:'error',message:'Possession is transferred twice in the same scene.',entityId:item.assetId});transfers.add(key);});
  input.relationships.forEach((relationship)=>{if(relationship.active&&relationship.endEpisodeId)warnings.push({code:'relationship-contradiction',severity:'warning',message:'Active relationship also has an end episode.',entityId:relationship.id});});
  input.covers.forEach((cover)=>cover.actorIds.forEach((actorId)=>{if(!input.actors.some((actor)=>actor.id===actorId)||cover.characterIds.some((characterId)=>!input.cast.some((item)=>item.actorId===actorId&&item.characterId===characterId)))warnings.push({code:'cover-wrong-actor',severity:'error',message:'Cover references an actor not assigned to its character.',entityId:cover.id});}));
  return warnings;
}

export function publicStoryBlocks(blocks:SeriesStoryBlock[]):SeriesStoryBlock[]{
  return blocks.filter((block)=>block.type!=='internal-note').map((block)=>({...block}));
}
