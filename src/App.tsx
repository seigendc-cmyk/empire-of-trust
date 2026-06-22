import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { LoadingState } from "./components/States";
import { FirebaseConfigError } from "./components/FirebaseConfigError";
import { firebaseConfigError, isFirebaseConfigured } from "./lib/firebase";
import { getOrCreateReaderIdentity, logActivity } from "./lib/offlineDb";
import { logStudioAudit, type StudioPermission } from "./lib/staffPermissions";

const Home = lazy(() => import("./pages/Home"));
const StudioLogin = lazy(() => import("./pages/StudioLogin"));
const StudioHome = lazy(() => import("./pages/StudioHome"));
const EpisodesList = lazy(() => import("./pages/EpisodesList"));
const EpisodeNew = lazy(() => import("./pages/EpisodeNew"));
const EpisodeEdit = lazy(() => import("./pages/EpisodeEdit"));
const EpisodePreview = lazy(() => import("./pages/EpisodePreview"));
const BuildPack = lazy(() => import("./pages/BuildPack"));
const ReaderHome = lazy(() => import("./pages/ReaderHome"));
const ReaderImport = lazy(() => import("./pages/ReaderImport"));
const ReaderEpisode = lazy(() => import("./pages/ReaderEpisode"));
const ReaderChapter = lazy(() => import("./pages/ReaderChapter"));
const ReaderProfile = lazy(() => import("./pages/ReaderProfile"));
const ReaderRewards = lazy(() => import("./pages/ReaderRewards"));
const ReaderBadges = lazy(() => import("./pages/ReaderBadges"));
const ReaderParticipation = lazy(() => import("./pages/ReaderParticipation"));
const ReaderPredictions = lazy(() => import("./pages/ReaderPredictions"));
const Packs = lazy(() => import("./pages/Packs"));
const Settings = lazy(() => import("./pages/Settings"));
const UniverseList = lazy(() => import("./pages/UniverseList"));
const UniverseDetail = lazy(() => import("./pages/UniverseDetail"));
const FamilyTree = lazy(() => import("./pages/FamilyTree"));
const CorporateNetwork = lazy(() => import("./pages/CorporateNetwork"));
const MallHome = lazy(() => import("./pages/MallHome"));
const MallVendors = lazy(() => import("./pages/MallVendors"));
const MallVendorDetail = lazy(() => import("./pages/MallVendorDetail"));
const MallProductDetail = lazy(() => import("./pages/MallProductDetail"));
const MallCategory = lazy(() => import("./pages/MallCategory"));
const MallSearch = lazy(() => import("./pages/MallSearch"));
const LicenceHome = lazy(() => import("./pages/LicenceHome"));
const LicenceActivate = lazy(() => import("./pages/LicenceActivate"));
const LicenceStatus = lazy(() => import("./pages/LicenceStatus"));
const LicenceHelp = lazy(() => import("./pages/LicenceHelp"));
const StudioLicensing = lazy(() => import("./pages/StudioLicensing"));
const StudioAgents = lazy(() => import("./pages/StudioAgents"));
const StudioScratchCards = lazy(() => import("./pages/StudioScratchCards"));
const StoryEngineHome = lazy(() => import("./pages/StoryEngineHome"));
const StoryEngineList = lazy(() => import("./pages/StoryEngineList"));
const EpisodePlanner = lazy(() => import("./pages/EpisodePlanner"));
const StoryContinuity = lazy(() => import("./pages/StoryContinuity"));
const PromptBuilder = lazy(() => import("./pages/PromptBuilder"));
const ProductionDashboard = lazy(() => import("./pages/ProductionDashboard"));
const ProductionHandoff = lazy(() => import("./pages/ProductionHandoff"));
const ProductionList = lazy(() => import("./pages/ProductionList"));
const CastingBoard = lazy(() => import("./pages/CastingBoard"));
const ScheduleBoard = lazy(() => import("./pages/ScheduleBoard"));
const ProductionReadiness = lazy(() => import("./pages/ProductionReadiness"));
const ReleaseCommand = lazy(() => import("./pages/ReleaseCommand"));
const BookLibrary = lazy(() => import("./pages/BookLibrary"));
const ProductionTest = lazy(() => import("./pages/ProductionTest"));
const StaffDashboard = lazy(() => import("./pages/StaffDashboard"));
const StaffModulePage = lazy(() => import("./pages/StaffModulePage"));
const StudioStaffList = lazy(() => import("./pages/StudioStaffList"));
const StudioStaffForm = lazy(() => import("./pages/StudioStaffForm"));
const LibraryCatalogue = lazy(() => import("./pages/LibraryCatalogue"));
const LibraryImport = lazy(() => import("./pages/LibraryImport"));
const LibraryBooklet = lazy(() => import("./pages/LibraryBooklet"));
const LibraryRead = lazy(() => import("./pages/LibraryRead"));
const LibraryCategories = lazy(() => import("./pages/LibraryCategories"));
const StudioLibraryList = lazy(() => import("./pages/StudioLibraryList"));
const StudioLibraryForm = lazy(() => import("./pages/StudioLibraryForm"));
const StudioLibraryPreview = lazy(() => import("./pages/StudioLibraryPreview"));
const StudioLibraryBuildPack = lazy(() => import("./pages/StudioLibraryBuildPack"));
const Participation = lazy(() => import("./pages/Participation"));
const StudioCommunity = lazy(() => import("./pages/StudioCommunity"));
const CharacterDirectory = lazy(() => import("./pages/CharacterDirectory"));
const CharacterForm = lazy(() => import("./pages/CharacterForm"));
const CharacterProfile = lazy(() => import("./pages/CharacterProfile"));
const CharacterRelationships = lazy(() => import("./pages/CharacterRelationships"));
const CharacterTimeline = lazy(() => import("./pages/CharacterTimeline"));
const CharacterAppearances = lazy(() => import("./pages/CharacterAppearances"));
const PropertyDirectory = lazy(() => import("./pages/PropertyDirectory"));
const PropertyForm = lazy(() => import("./pages/PropertyForm"));
const PropertyProfile = lazy(() => import("./pages/PropertyProfile"));
const VehicleDirectory = lazy(() => import("./pages/VehicleDirectory"));
const VehicleForm = lazy(() => import("./pages/VehicleForm"));
const VehicleProfile = lazy(() => import("./pages/VehicleProfile"));
const ActorDirectory = lazy(() => import("./pages/ActorDirectory"));
const ActorForm = lazy(() => import("./pages/ActorForm"));
const ActorProfile = lazy(() => import("./pages/ActorProfile"));
const TalentCastingBoard = lazy(() => import("./pages/TalentCastingBoard"));
const SceneDirectory = lazy(() => import("./pages/SceneDirectory"));
const SceneForm = lazy(() => import("./pages/SceneForm"));
const SceneProfile = lazy(() => import("./pages/SceneProfile"));
const TimelineDirectory = lazy(() => import("./pages/TimelineDirectory"));
const TimelineForm = lazy(() => import("./pages/TimelineForm"));
const TimelineDetail = lazy(() => import("./pages/TimelineDetail"));
const ContinuityDashboard = lazy(() => import("./pages/ContinuityDashboard"));
const AssetLibrary = lazy(() => import("./pages/AssetLibrary"));
const AssetForm = lazy(() => import("./pages/AssetForm"));
const AssetDetail = lazy(() => import("./pages/AssetDetail"));
const AssetPrompts = lazy(() => import("./pages/AssetPrompts"));

function AccessDenied({ permission }: { permission?: StudioPermission }) {
  return (
    <section className="page grid min-h-[calc(100dvh-8rem)] content-center">
      <div className="panel mx-auto w-full max-w-xl border-ember p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ember">Access denied</p>
        <h1 className="mt-2 text-2xl font-black">Permission required</h1>
        <p className="mt-3 text-sm leading-6 text-paper/65">
          Your staff account is not active for this module{permission ? ` (${permission})` : ""}. Contact the studio super admin.
        </p>
      </div>
    </section>
  );
}

function PermissionRoute({ children, permission, allowLocalDraft = false }: { children: React.ReactNode; permission: StudioPermission; allowLocalDraft?: boolean }) {
  const { loading, hasPermission, user, staff } = useAuth();
  if (!isFirebaseConfigured && allowLocalDraft) return <>{children}</>;
  if (loading) return <LoadingState label="Checking studio access..." />;
  if (!user) return <Navigate to="/studio/login" replace />;
  if (!staff?.active || !hasPermission(permission)) {
    logStudioAudit(user.email ?? "", "access denied", "permission", permission, { path: window.location.pathname }).catch(() => undefined);
    return <AccessDenied permission={permission} />;
  }
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    getOrCreateReaderIdentity()
      .then((identity) => {
        logActivity("app_opened", { metadata: { path: window.location.pathname } }, identity).catch(() => undefined);
        import("./lib/communityRepository").then(({ recordDailyLogin }) => recordDailyLogin()).catch(() => undefined);
      })
      .catch(() => undefined);
  }, []);

  return (
    <AuthProvider>
      <Layout>
        {!isFirebaseConfigured && <FirebaseConfigError message={`${firebaseConfigError} Episode builder is running in local draft mode.`} />}
        <Suspense fallback={<LoadingState label="Loading workspace..." />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/studio/login" element={<StudioLogin />} />
            <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="/staff/dashboard" element={<PermissionRoute permission="studio.access"><StaffDashboard /></PermissionRoute>} />
            <Route path="/staff/episodes" element={<PermissionRoute permission="episodes.read"><StaffModulePage module="episodes" /></PermissionRoute>} />
            <Route path="/staff/packs" element={<PermissionRoute permission="packs.build"><StaffModulePage module="packs" /></PermissionRoute>} />
            <Route path="/staff/licensing" element={<PermissionRoute permission="licensing.read"><StaffModulePage module="licensing" /></PermissionRoute>} />
            <Route path="/staff/agents" element={<PermissionRoute permission="agents.manage"><StaffModulePage module="agents" /></PermissionRoute>} />
            <Route path="/staff/mall" element={<PermissionRoute permission="mall.read"><StaffModulePage module="mall" /></PermissionRoute>} />
            <Route path="/staff/assets" element={<PermissionRoute permission="assets.read"><StaffModulePage module="assets" /></PermissionRoute>} />
            <Route path="/staff/story" element={<PermissionRoute permission="story.read"><StaffModulePage module="story" /></PermissionRoute>} />
            <Route path="/staff/production" element={<PermissionRoute permission="production.read"><StaffModulePage module="production" /></PermissionRoute>} />
            <Route path="/staff/analytics" element={<PermissionRoute permission="console.analytics.read"><StaffModulePage module="analytics" /></PermissionRoute>} />
            <Route path="/staff/library" element={<PermissionRoute permission="library.read"><StaffModulePage module="library" /></PermissionRoute>} />
            <Route path="/studio" element={<PermissionRoute permission="staff.manage" allowLocalDraft><StudioHome /></PermissionRoute>} />
            <Route path="/studio/staff" element={<PermissionRoute permission="staff.manage"><StudioStaffList /></PermissionRoute>} />
            <Route path="/studio/staff/new" element={<PermissionRoute permission="staff.manage"><StudioStaffForm /></PermissionRoute>} />
            <Route path="/studio/staff/:staffId/edit" element={<PermissionRoute permission="staff.manage"><StudioStaffForm /></PermissionRoute>} />
            <Route path="/studio/episodes" element={<PermissionRoute permission="episodes.read" allowLocalDraft><EpisodesList /></PermissionRoute>} />
            <Route path="/studio/episodes/new" element={<PermissionRoute permission="episodes.write" allowLocalDraft><EpisodeNew /></PermissionRoute>} />
            <Route path="/studio/episodes/:episodeId/edit" element={<PermissionRoute permission="episodes.write" allowLocalDraft><EpisodeEdit /></PermissionRoute>} />
            <Route path="/studio/episodes/:episodeId/preview" element={<PermissionRoute permission="episodes.read" allowLocalDraft><EpisodePreview /></PermissionRoute>} />
            <Route path="/studio/episodes/:episodeId/build-pack" element={<PermissionRoute permission="packs.build" allowLocalDraft><BuildPack /></PermissionRoute>} />
            <Route path="/studio/release-command" element={<PermissionRoute permission="packs.publish"><ReleaseCommand /></PermissionRoute>} />
            <Route path="/studio/books" element={<PermissionRoute permission="packs.build"><BookLibrary /></PermissionRoute>} />
            <Route path="/studio/library" element={<PermissionRoute permission="library.read" allowLocalDraft><StudioLibraryList /></PermissionRoute>} />
            <Route path="/studio/library/new" element={<PermissionRoute permission="library.write" allowLocalDraft><StudioLibraryForm /></PermissionRoute>} />
            <Route path="/studio/library/:bookletId/edit" element={<PermissionRoute permission="library.write" allowLocalDraft><StudioLibraryForm /></PermissionRoute>} />
            <Route path="/studio/library/:bookletId/preview" element={<PermissionRoute permission="library.read" allowLocalDraft><StudioLibraryPreview /></PermissionRoute>} />
            <Route path="/studio/library/:bookletId/build-pack" element={<PermissionRoute permission="library.write" allowLocalDraft><StudioLibraryBuildPack /></PermissionRoute>} />
            <Route path="/studio/community" element={<PermissionRoute permission="reader.analytics.read"><StudioCommunity /></PermissionRoute>} />
            <Route path="/reader" element={<ReaderHome />} />
            <Route path="/reader/import" element={<ReaderImport />} />
            <Route path="/reader/profile" element={<ReaderProfile />} />
            <Route path="/reader/rewards" element={<ReaderRewards />} />
            <Route path="/reader/badges" element={<ReaderBadges />} />
            <Route path="/reader/participation" element={<ReaderParticipation />} />
            <Route path="/reader/predictions" element={<ReaderPredictions />} />
            <Route path="/reader/:episodeId" element={<ReaderEpisode />} />
            <Route path="/reader/:episodeId/chapter/:chapterId" element={<ReaderChapter />} />
            <Route path="/library" element={<LibraryCatalogue />} />
            <Route path="/library/catalogue" element={<LibraryCatalogue />} />
            <Route path="/library/import" element={<LibraryImport />} />
            <Route path="/library/categories" element={<LibraryCategories />} />
            <Route path="/library/:bookletId" element={<LibraryBooklet />} />
            <Route path="/library/:bookletId/chapter/:chapterId/section/:sectionId" element={<LibraryRead />} />
            <Route path="/participation" element={<Participation />} />
            <Route path="/participation/profile" element={<Participation view="profile" />} />
            <Route path="/participation/rewards" element={<Participation view="rewards" />} />
            <Route path="/participation/badges" element={<Participation view="badges" />} />
            <Route path="/participation/rankings" element={<Participation view="rankings" />} />
            <Route path="/participation/history" element={<Participation view="history" />} />
            <Route path="/packs" element={<Packs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/licence" element={<LicenceHome />} />
            <Route path="/licence/activate" element={<LicenceActivate />} />
            <Route path="/licence/status" element={<LicenceStatus />} />
            <Route path="/licence/request-help" element={<LicenceHelp />} />
            <Route path="/mall" element={<MallHome />} />
            <Route path="/mall/vendors" element={<MallVendors />} />
            <Route path="/mall/vendors/:vendorId" element={<MallVendorDetail />} />
            <Route path="/mall/products/:productId" element={<MallProductDetail />} />
            <Route path="/mall/categories/:categoryId" element={<MallCategory />} />
            <Route path="/mall/search" element={<MallSearch />} />
            <Route path="/universe/search" element={<UniverseList kind="search" />} />
            <Route path="/characters" element={<CharacterDirectory />} />
            <Route path="/characters/new" element={<PermissionRoute permission="story.write" allowLocalDraft><CharacterForm /></PermissionRoute>} />
            <Route path="/characters/relationships" element={<CharacterRelationships />} />
            <Route path="/characters/timeline" element={<CharacterTimeline />} />
            <Route path="/characters/appearances" element={<CharacterAppearances />} />
            <Route path="/characters/:characterId" element={<CharacterProfile />} />
            <Route path="/characters/:characterId/edit" element={<PermissionRoute permission="story.write" allowLocalDraft><CharacterForm /></PermissionRoute>} />
            <Route path="/actors" element={<ActorDirectory />} />
            <Route path="/actors/new" element={<PermissionRoute permission="actors.write" allowLocalDraft><ActorForm /></PermissionRoute>} />
            <Route path="/actors/:actorId" element={<ActorProfile />} />
            <Route path="/actors/:actorId/edit" element={<PermissionRoute permission="actors.write" allowLocalDraft><ActorForm /></PermissionRoute>} />
            <Route path="/actors/:actorId/portfolio" element={<ActorProfile view="portfolio" />} />
            <Route path="/actors/:actorId/availability" element={<ActorProfile view="availability" />} />
            <Route path="/actors/:actorId/episodes" element={<ActorProfile view="episodes" />} />
            <Route path="/actors/:actorId/scenes" element={<ActorProfile view="scenes" />} />
            <Route path="/assets" element={<UniverseList kind="assets" />} />
            <Route path="/assets/:assetId" element={<UniverseDetail kind="assets" />} />
            <Route path="/businesses" element={<UniverseList kind="businesses" />} />
            <Route path="/businesses/:businessId" element={<UniverseDetail kind="businesses" />} />
            <Route path="/properties" element={<PropertyDirectory />} />
            <Route path="/properties/new" element={<PermissionRoute permission="properties.write" allowLocalDraft><PropertyForm /></PermissionRoute>} />
            <Route path="/properties/:propertyId" element={<PropertyProfile />} />
            <Route path="/properties/:propertyId/edit" element={<PermissionRoute permission="properties.write" allowLocalDraft><PropertyForm /></PermissionRoute>} />
            <Route path="/properties/:propertyId/ownership" element={<PropertyProfile view="ownership" />} />
            <Route path="/properties/:propertyId/tenants" element={<PropertyProfile view="tenants" />} />
            <Route path="/properties/:propertyId/valuation" element={<PropertyProfile view="valuation" />} />
            <Route path="/properties/:propertyId/assets" element={<PropertyProfile view="assets" />} />
            <Route path="/properties/:propertyId/episodes" element={<PropertyProfile view="episodes" />} />
            <Route path="/vehicles" element={<VehicleDirectory />} />
            <Route path="/vehicles/new" element={<PermissionRoute permission="vehicles.write" allowLocalDraft><VehicleForm /></PermissionRoute>} />
            <Route path="/vehicles/:vehicleId" element={<VehicleProfile />} />
            <Route path="/vehicles/:vehicleId/edit" element={<PermissionRoute permission="vehicles.write" allowLocalDraft><VehicleForm /></PermissionRoute>} />
            <Route path="/vehicles/:vehicleId/ownership" element={<VehicleProfile view="ownership" />} />
            <Route path="/vehicles/:vehicleId/usage" element={<VehicleProfile view="usage" />} />
            <Route path="/vehicles/:vehicleId/maintenance" element={<VehicleProfile view="maintenance" />} />
            <Route path="/vehicles/:vehicleId/episodes" element={<VehicleProfile view="episodes" />} />
            <Route path="/family-tree" element={<FamilyTree />} />
            <Route path="/corporate-network" element={<CorporateNetwork />} />
            <Route path="/studio/properties" element={<PermissionRoute permission="properties.read" allowLocalDraft><PropertyDirectory studio /></PermissionRoute>} />
            <Route path="/studio/properties/new" element={<PermissionRoute permission="properties.write" allowLocalDraft><PropertyForm /></PermissionRoute>} />
            <Route path="/studio/properties/:propertyId/edit" element={<PermissionRoute permission="properties.write" allowLocalDraft><PropertyForm /></PermissionRoute>} />
            <Route path="/studio/vehicles" element={<PermissionRoute permission="vehicles.read" allowLocalDraft><VehicleDirectory studio /></PermissionRoute>} />
            <Route path="/studio/vehicles/new" element={<PermissionRoute permission="vehicles.write" allowLocalDraft><VehicleForm /></PermissionRoute>} />
            <Route path="/studio/vehicles/:vehicleId/edit" element={<PermissionRoute permission="vehicles.write" allowLocalDraft><VehicleForm /></PermissionRoute>} />
            <Route path="/studio/actors" element={<PermissionRoute permission="actors.read" allowLocalDraft><ActorDirectory studio /></PermissionRoute>} />
            <Route path="/studio/actors/new" element={<PermissionRoute permission="actors.write" allowLocalDraft><ActorForm /></PermissionRoute>} />
            <Route path="/studio/actors/:actorId/edit" element={<PermissionRoute permission="actors.write" allowLocalDraft><ActorForm /></PermissionRoute>} />
            <Route path="/studio/casting" element={<PermissionRoute permission="casting.read" allowLocalDraft><TalentCastingBoard /></PermissionRoute>} />
            <Route path="/studio/casting/board" element={<PermissionRoute permission="casting.read" allowLocalDraft><TalentCastingBoard /></PermissionRoute>} />
            <Route path="/studio/casting/auditions" element={<PermissionRoute permission="casting.read" allowLocalDraft><TalentCastingBoard /></PermissionRoute>} />
            <Route path="/studio/casting/new" element={<PermissionRoute permission="casting.write" allowLocalDraft><TalentCastingBoard /></PermissionRoute>} />
            <Route path="/studio/casting/:castingId" element={<PermissionRoute permission="casting.read" allowLocalDraft><TalentCastingBoard /></PermissionRoute>} />
            <Route path="/studio/casting/:castingId/edit" element={<PermissionRoute permission="casting.write" allowLocalDraft><TalentCastingBoard /></PermissionRoute>} />
            <Route path="/studio/scenes" element={<PermissionRoute permission="scenes.read" allowLocalDraft><SceneDirectory /></PermissionRoute>} />
            <Route path="/studio/scenes/new" element={<PermissionRoute permission="scenes.write" allowLocalDraft><SceneForm /></PermissionRoute>} />
            <Route path="/studio/scenes/:sceneId" element={<PermissionRoute permission="scenes.read" allowLocalDraft><SceneProfile /></PermissionRoute>} />
            <Route path="/studio/scenes/:sceneId/edit" element={<PermissionRoute permission="scenes.write" allowLocalDraft><SceneForm /></PermissionRoute>} />
            <Route path="/studio/scenes/:sceneId/breakdown" element={<PermissionRoute permission="scenes.breakdown.manage" allowLocalDraft><SceneProfile view="breakdown" /></PermissionRoute>} />
            <Route path="/studio/scenes/:sceneId/cast" element={<PermissionRoute permission="scenes.cast.manage" allowLocalDraft><SceneProfile view="cast" /></PermissionRoute>} />
            <Route path="/studio/scenes/:sceneId/assets" element={<PermissionRoute permission="scenes.assets.manage" allowLocalDraft><SceneProfile view="assets" /></PermissionRoute>} />
            <Route path="/studio/scenes/:sceneId/continuity" element={<PermissionRoute permission="scenes.continuity.manage" allowLocalDraft><SceneProfile view="continuity" /></PermissionRoute>} />
            <Route path="/studio/scenes/:sceneId/schedule" element={<PermissionRoute permission="scenes.schedule.manage" allowLocalDraft><SceneProfile view="schedule" /></PermissionRoute>} />
            <Route path="/studio/timeline" element={<PermissionRoute permission="timeline.read" allowLocalDraft><TimelineDirectory /></PermissionRoute>} />
            <Route path="/studio/timeline/events" element={<PermissionRoute permission="timeline.read" allowLocalDraft><TimelineDirectory /></PermissionRoute>} />
            <Route path="/studio/timeline/new" element={<PermissionRoute permission="timeline.write" allowLocalDraft><TimelineForm /></PermissionRoute>} />
            <Route path="/studio/timeline/:timelineEventId" element={<PermissionRoute permission="timeline.read" allowLocalDraft><TimelineDetail /></PermissionRoute>} />
            <Route path="/studio/timeline/:timelineEventId/edit" element={<PermissionRoute permission="timeline.write" allowLocalDraft><TimelineForm /></PermissionRoute>} />
            <Route path="/studio/continuity" element={<PermissionRoute permission="continuity.read" allowLocalDraft><ContinuityDashboard /></PermissionRoute>} />
            <Route path="/studio/continuity/checks" element={<PermissionRoute permission="continuity.read" allowLocalDraft><ContinuityDashboard view="checks" /></PermissionRoute>} />
            <Route path="/studio/continuity/warnings" element={<PermissionRoute permission="continuity.read" allowLocalDraft><ContinuityDashboard view="warnings" /></PermissionRoute>} />
            <Route path="/studio/continuity/rules" element={<PermissionRoute permission="continuity.rules.manage" allowLocalDraft><ContinuityDashboard view="rules" /></PermissionRoute>} />
            <Route path="/studio/continuity/episode/:episodeId" element={<PermissionRoute permission="continuity.read" allowLocalDraft><ContinuityDashboard view="entity" entityType="episode" /></PermissionRoute>} />
            <Route path="/studio/continuity/character/:characterId" element={<PermissionRoute permission="continuity.read" allowLocalDraft><ContinuityDashboard view="entity" entityType="character" /></PermissionRoute>} />
            <Route path="/studio/continuity/business/:businessId" element={<PermissionRoute permission="continuity.read" allowLocalDraft><ContinuityDashboard view="entity" entityType="business" /></PermissionRoute>} />
            <Route path="/studio/continuity/property/:propertyId" element={<PermissionRoute permission="continuity.read" allowLocalDraft><ContinuityDashboard view="entity" entityType="property" /></PermissionRoute>} />
            <Route path="/studio/continuity/vehicle/:vehicleId" element={<PermissionRoute permission="continuity.read" allowLocalDraft><ContinuityDashboard view="entity" entityType="vehicle" /></PermissionRoute>} />
            <Route path="/studio/assets" element={<PermissionRoute permission="assets.read" allowLocalDraft><AssetLibrary /></PermissionRoute>} />
            <Route path="/studio/assets/library" element={<PermissionRoute permission="assets.read" allowLocalDraft><AssetLibrary /></PermissionRoute>} />
            <Route path="/studio/assets/upload" element={<PermissionRoute permission="assets.upload" allowLocalDraft><AssetForm /></PermissionRoute>} />
            <Route path="/studio/assets/prompts" element={<PermissionRoute permission="assets.prompts.manage" allowLocalDraft><AssetPrompts /></PermissionRoute>} />
            <Route path="/studio/assets/posters" element={<PermissionRoute permission="assets.read" allowLocalDraft><AssetLibrary view="posters" /></PermissionRoute>} />
            <Route path="/studio/assets/characters" element={<PermissionRoute permission="assets.read" allowLocalDraft><AssetLibrary category="character" /></PermissionRoute>} />
            <Route path="/studio/assets/actors" element={<PermissionRoute permission="assets.read" allowLocalDraft><AssetLibrary category="actor" /></PermissionRoute>} />
            <Route path="/studio/assets/businesses" element={<PermissionRoute permission="assets.read" allowLocalDraft><AssetLibrary category="business" /></PermissionRoute>} />
            <Route path="/studio/assets/properties" element={<PermissionRoute permission="assets.read" allowLocalDraft><AssetLibrary category="property" /></PermissionRoute>} />
            <Route path="/studio/assets/vehicles" element={<PermissionRoute permission="assets.read" allowLocalDraft><AssetLibrary category="vehicle" /></PermissionRoute>} />
            <Route path="/studio/assets/scenes" element={<PermissionRoute permission="assets.read" allowLocalDraft><AssetLibrary category="scene" /></PermissionRoute>} />
            <Route path="/studio/assets/marketing" element={<PermissionRoute permission="assets.read" allowLocalDraft><AssetLibrary view="marketing" /></PermissionRoute>} />
            <Route path="/studio/assets/:assetId" element={<PermissionRoute permission="assets.read" allowLocalDraft><AssetDetail /></PermissionRoute>} />
            <Route path="/studio/assets/:assetId/edit" element={<PermissionRoute permission="assets.write" allowLocalDraft><AssetForm /></PermissionRoute>} />
            <Route path="/studio/licensing" element={<PermissionRoute permission="licensing.write"><StudioLicensing /></PermissionRoute>} />
            <Route path="/studio/agents" element={<PermissionRoute permission="agents.manage"><StudioAgents /></PermissionRoute>} />
            <Route path="/studio/scratch-cards" element={<PermissionRoute permission="scratchcards.manage"><StudioScratchCards /></PermissionRoute>} />
            <Route path="/studio/story-engine" element={<PermissionRoute permission="story.read"><StoryEngineHome /></PermissionRoute>} />
            <Route path="/studio/story-engine/timeline" element={<PermissionRoute permission="story.read"><StoryEngineList kind="timeline" /></PermissionRoute>} />
            <Route path="/studio/story-engine/arcs" element={<PermissionRoute permission="story.read"><StoryEngineList kind="arcs" /></PermissionRoute>} />
            <Route path="/studio/story-engine/continuity" element={<PermissionRoute permission="story.read"><StoryContinuity /></PermissionRoute>} />
            <Route path="/studio/story-engine/episode-planner" element={<PermissionRoute permission="story.write"><EpisodePlanner /></PermissionRoute>} />
            <Route path="/studio/story-engine/prompt-builder" element={<PermissionRoute permission="story.write"><PromptBuilder /></PermissionRoute>} />
            <Route path="/studio/story-engine/conflict-map" element={<PermissionRoute permission="story.read"><StoryEngineList kind="conflictMap" /></PermissionRoute>} />
            <Route path="/studio/story-engine/business-timeline" element={<PermissionRoute permission="story.read"><StoryEngineList kind="businessTimeline" /></PermissionRoute>} />
            <Route path="/studio/story-engine/rules" element={<PermissionRoute permission="story.write"><StoryEngineList kind="rules" /></PermissionRoute>} />
            <Route path="/studio/production" element={<PermissionRoute permission="production.read"><ProductionDashboard /></PermissionRoute>} />
            <Route path="/studio/production/handoff" element={<PermissionRoute permission="production.write"><ProductionHandoff /></PermissionRoute>} />
            <Route path="/studio/production/casting-board" element={<PermissionRoute permission="production.write"><CastingBoard /></PermissionRoute>} />
            <Route path="/studio/production/schedule-board" element={<PermissionRoute permission="production.write"><ScheduleBoard /></PermissionRoute>} />
            <Route path="/studio/production/readiness" element={<PermissionRoute permission="production.read"><ProductionReadiness /></PermissionRoute>} />
            <Route path="/studio/production/actors" element={<PermissionRoute permission="production.read"><ProductionList kind="actors" /></PermissionRoute>} />
            <Route path="/studio/production/casting" element={<PermissionRoute permission="production.read"><ProductionList kind="casting" /></PermissionRoute>} />
            <Route path="/studio/production/characters" element={<PermissionRoute permission="production.read"><ProductionList kind="characters" /></PermissionRoute>} />
            <Route path="/studio/production/scenes" element={<PermissionRoute permission="production.read"><ProductionList kind="scenes" /></PermissionRoute>} />
            <Route path="/studio/production/scenes/:sceneId" element={<PermissionRoute permission="production.planning.read" allowLocalDraft><SceneProfile /></PermissionRoute>} />
            <Route path="/studio/production/locations" element={<PermissionRoute permission="production.read"><ProductionList kind="locations" /></PermissionRoute>} />
            <Route path="/studio/production/properties" element={<PermissionRoute permission="production.read"><ProductionList kind="properties" /></PermissionRoute>} />
            <Route path="/studio/production/vehicles" element={<PermissionRoute permission="production.read"><ProductionList kind="vehicles" /></PermissionRoute>} />
            <Route path="/studio/production/assets" element={<PermissionRoute permission="production.read"><ProductionList kind="assets" /></PermissionRoute>} />
            <Route path="/studio/production/schedules" element={<PermissionRoute permission="production.read"><ProductionList kind="schedules" /></PermissionRoute>} />
            <Route path="/studio/production/continuity" element={<PermissionRoute permission="production.read"><ProductionList kind="continuity" /></PermissionRoute>} />
            <Route path="/studio/production-test" element={<PermissionRoute permission="studio.access"><ProductionTest /></PermissionRoute>} />
          </Routes>
        </Suspense>
      </Layout>
    </AuthProvider>
  );
}
