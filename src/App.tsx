import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { LoadingState } from "./components/States";
import { FirebaseConfigError } from "./components/FirebaseConfigError";
import { firebaseConfigError, isFirebaseConfigured } from "./lib/firebase";
import { getOrCreateReaderIdentity, logActivity } from "./lib/offlineDb";

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

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, user } = useAuth();
  if (!isFirebaseConfigured) return <>{children}</>;
  if (loading) return <LoadingState label="Checking studio access..." />;
  if (!user || !isAdmin) return <Navigate to="/studio/login" replace />;
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    getOrCreateReaderIdentity()
      .then((identity) => logActivity("app_opened", { metadata: { path: window.location.pathname } }, identity))
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
            <Route path="/studio" element={<AdminRoute><StudioHome /></AdminRoute>} />
            <Route path="/studio/episodes" element={<AdminRoute><EpisodesList /></AdminRoute>} />
            <Route path="/studio/episodes/new" element={<AdminRoute><EpisodeNew /></AdminRoute>} />
            <Route path="/studio/episodes/:episodeId/edit" element={<AdminRoute><EpisodeEdit /></AdminRoute>} />
            <Route path="/studio/episodes/:episodeId/preview" element={<AdminRoute><EpisodePreview /></AdminRoute>} />
            <Route path="/studio/episodes/:episodeId/build-pack" element={<AdminRoute><BuildPack /></AdminRoute>} />
            <Route path="/studio/release-command" element={<AdminRoute><ReleaseCommand /></AdminRoute>} />
            <Route path="/studio/books" element={<AdminRoute><BookLibrary /></AdminRoute>} />
            <Route path="/reader" element={<ReaderHome />} />
            <Route path="/reader/import" element={<ReaderImport />} />
            <Route path="/reader/profile" element={<ReaderProfile />} />
            <Route path="/reader/rewards" element={<ReaderRewards />} />
            <Route path="/reader/badges" element={<ReaderBadges />} />
            <Route path="/reader/participation" element={<ReaderParticipation />} />
            <Route path="/reader/predictions" element={<ReaderPredictions />} />
            <Route path="/reader/:episodeId" element={<ReaderEpisode />} />
            <Route path="/reader/:episodeId/chapter/:chapterId" element={<ReaderChapter />} />
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
            <Route path="/characters" element={<UniverseList kind="characters" />} />
            <Route path="/characters/:characterId" element={<UniverseDetail kind="characters" />} />
            <Route path="/actors" element={<UniverseList kind="actors" />} />
            <Route path="/actors/:actorId" element={<UniverseDetail kind="actors" />} />
            <Route path="/assets" element={<UniverseList kind="assets" />} />
            <Route path="/assets/:assetId" element={<UniverseDetail kind="assets" />} />
            <Route path="/businesses" element={<UniverseList kind="businesses" />} />
            <Route path="/businesses/:businessId" element={<UniverseDetail kind="businesses" />} />
            <Route path="/properties" element={<UniverseList kind="properties" />} />
            <Route path="/properties/:propertyId" element={<UniverseDetail kind="properties" />} />
            <Route path="/vehicles" element={<UniverseList kind="vehicles" />} />
            <Route path="/vehicles/:vehicleId" element={<UniverseDetail kind="vehicles" />} />
            <Route path="/family-tree" element={<FamilyTree />} />
            <Route path="/corporate-network" element={<CorporateNetwork />} />
            <Route path="/studio/licensing" element={<AdminRoute><StudioLicensing /></AdminRoute>} />
            <Route path="/studio/agents" element={<AdminRoute><StudioAgents /></AdminRoute>} />
            <Route path="/studio/scratch-cards" element={<AdminRoute><StudioScratchCards /></AdminRoute>} />
            <Route path="/studio/story-engine" element={<AdminRoute><StoryEngineHome /></AdminRoute>} />
            <Route path="/studio/story-engine/timeline" element={<AdminRoute><StoryEngineList kind="timeline" /></AdminRoute>} />
            <Route path="/studio/story-engine/arcs" element={<AdminRoute><StoryEngineList kind="arcs" /></AdminRoute>} />
            <Route path="/studio/story-engine/continuity" element={<AdminRoute><StoryContinuity /></AdminRoute>} />
            <Route path="/studio/story-engine/episode-planner" element={<AdminRoute><EpisodePlanner /></AdminRoute>} />
            <Route path="/studio/story-engine/prompt-builder" element={<AdminRoute><PromptBuilder /></AdminRoute>} />
            <Route path="/studio/story-engine/conflict-map" element={<AdminRoute><StoryEngineList kind="conflictMap" /></AdminRoute>} />
            <Route path="/studio/story-engine/business-timeline" element={<AdminRoute><StoryEngineList kind="businessTimeline" /></AdminRoute>} />
            <Route path="/studio/story-engine/rules" element={<AdminRoute><StoryEngineList kind="rules" /></AdminRoute>} />
            <Route path="/studio/production" element={<AdminRoute><ProductionDashboard /></AdminRoute>} />
            <Route path="/studio/production/handoff" element={<AdminRoute><ProductionHandoff /></AdminRoute>} />
            <Route path="/studio/production/casting-board" element={<AdminRoute><CastingBoard /></AdminRoute>} />
            <Route path="/studio/production/schedule-board" element={<AdminRoute><ScheduleBoard /></AdminRoute>} />
            <Route path="/studio/production/readiness" element={<AdminRoute><ProductionReadiness /></AdminRoute>} />
            <Route path="/studio/production/actors" element={<AdminRoute><ProductionList kind="actors" /></AdminRoute>} />
            <Route path="/studio/production/casting" element={<AdminRoute><ProductionList kind="casting" /></AdminRoute>} />
            <Route path="/studio/production/characters" element={<AdminRoute><ProductionList kind="characters" /></AdminRoute>} />
            <Route path="/studio/production/scenes" element={<AdminRoute><ProductionList kind="scenes" /></AdminRoute>} />
            <Route path="/studio/production/locations" element={<AdminRoute><ProductionList kind="locations" /></AdminRoute>} />
            <Route path="/studio/production/properties" element={<AdminRoute><ProductionList kind="properties" /></AdminRoute>} />
            <Route path="/studio/production/vehicles" element={<AdminRoute><ProductionList kind="vehicles" /></AdminRoute>} />
            <Route path="/studio/production/assets" element={<AdminRoute><ProductionList kind="assets" /></AdminRoute>} />
            <Route path="/studio/production/schedules" element={<AdminRoute><ProductionList kind="schedules" /></AdminRoute>} />
            <Route path="/studio/production/continuity" element={<AdminRoute><ProductionList kind="continuity" /></AdminRoute>} />
          </Routes>
        </Suspense>
      </Layout>
    </AuthProvider>
  );
}
