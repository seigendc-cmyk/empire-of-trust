export type AppView = 'studio' | 'portal' | 'reader';

export type BlockType = 
  | 'heading' 
  | 'paragraph' 
  | 'image' 
  | 'quote' 
  | 'reference' 
  | 'divider' 
  | 'latex' 
  | 'code' 
  | 'table' 
  | 'spreadsheet'
  | 'callout' 
  | 'list' 
  | 'footnote'
  | 'mcq';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';

export interface McqQuestion {
  id: string;
  questionText: string;
  options: string[]; // e.g. ["Option A", "Option B", "Option C", "Option D"]
  correctOptionIndex: number; // 0-based
  explanation?: string; // Step-by-step revision solution/explanation
  marks?: number; // e.g., 1, 2, 5
  topic?: string; // e.g., "Algebra", "Financial Accounting"
}

export interface McqQuizData {
  title?: string;
  instructions?: string;
  questions: McqQuestion[];
  passingScorePercentage?: number; // default 70
}

export interface QuizAttempt {
  id: string;
  bookId: string;
  chapterId: string;
  blockId: string;
  quizTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  attemptedAt: string;
}

export interface CoachingProgressReport {
  bookId: string;
  bookTitle: string;
  author: string;
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  overallAccuracyPercentage: number;
  totalMarksEarned: number;
  totalPossibleMarks: number;
  chapterScores: Array<{
    chapterId: string;
    chapterTitle: string;
    quizzesCount: number;
    score: number;
    totalMarks: number;
    percentage: number;
  }>;
  generatedAt: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  hasHeaderRow?: boolean;
  striped?: boolean;
  bordered?: boolean;
}

export interface SpreadsheetColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'currency' | 'formula';
  formula?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';
}

export interface SpreadsheetData {
  title?: string;
  columns: SpreadsheetColumn[];
  rows: Record<string, any>[];
  showTotalRow?: boolean;
  currencySymbol?: string;
}

export interface ContentBlock {
  id: string;
  chapterId: string;
  type: BlockType;
  content: string; // Text, image URL, LaTeX equation source, raw code string, etc.
  meta?: {
    headingLevel?: HeadingLevel;
    alignment?: 'left' | 'center' | 'right' | 'justify';
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    dropCap?: boolean;
    fontSize?: 'small' | 'medium' | 'large' | 'huge';
    textColor?: string;
    bgColor?: string;
    caption?: string;
    figureLabel?: string; // e.g. "Figure 1.1", "Illustration 1", "Cartoon #2"
    imageNumber?: number; // e.g. 1, 2, 3
    imageNumberPrefix?: string; // e.g. "Figure", "Illustration", "Cartoon", "Plate"
    linkUrl?: string; // Hyperlink destination for interactive book image
    linkTarget?: '_blank' | '_self';
    cartoonStyle?: string; // e.g. "3D Pixar", "2D Vector", "Watercolor", "Cute Chibi"
    cartoonPrompt?: string;
    imageWidthPercentage?: number; // e.g. 50, 75, 100
    altText?: string;
    referenceId?: string; // Links to ReferenceItem
    calloutType?: 'info' | 'note' | 'warning' | 'tip' | 'quote';
    fontStyle?: string;
    // LaTeX math equation specific
    latexMode?: 'inline' | 'display';
    mathLabel?: string; // e.g. "Eq. 1.1" or "(2.4)"
    // Code block specific
    codeLanguage?: string; // 'javascript' | 'typescript' | 'python' | 'cpp' | 'latex' | 'html' | 'css' | 'sql' | 'json'
    showLineNumbers?: boolean;
    // Table specific
    tableData?: TableData;
    // Spreadsheet specific
    spreadsheetData?: SpreadsheetData;
    // List specific
    listType?: 'bullet' | 'number' | 'check';
    listItems?: Array<{ id: string; text: string; checked?: boolean }>;
    // Footnote specific
    footnoteNumber?: number;
    footnoteLabel?: string;
    // Divider specific
    dividerStyle?: 'solid' | 'dashed' | 'dotted' | 'ornament';
    // MCQ & Practice Quiz specific
    mcqData?: McqQuizData;
  };
  orderIndex: number;
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  chapterNumber: number;
  createdAt: string;
  updatedAt: string;
  blocks: ContentBlock[];
}

export interface FrontCover {
  title: string;
  subtitle?: string;
  author: string;
  bgType: 'solid' | 'gradient' | 'image';
  bgColor: string;
  gradientStart?: string;
  gradientEnd?: string;
  bgImageUrl?: string;
  titleColor: string;
  subtitleColor?: string;
  authorColor: string;
  layoutStyle: 'classic' | 'modern' | 'minimal' | 'bold';
  badgeText?: string;
  badgeColor?: string;
  badgeBg?: string;
  textPosition?: 'top' | 'center' | 'bottom';
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: 'serif' | 'sans' | 'mono' | 'display';
  titleSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  overlayOpacity?: number; // 0 to 1
  overlayColor?: string;
  imageFit?: 'cover' | 'contain' | 'center';
}

export interface BackCover {
  synopsis: string;
  blurb?: string;
  authorBio?: string;
  isbn?: string;
  publisherName?: string;
  publisherLogoUrl?: string;
  bgColor: string;
  textColor: string;
  showBarcode?: boolean;
  bgType?: 'solid' | 'gradient' | 'image';
  bgImageUrl?: string;
  gradientStart?: string;
  gradientEnd?: string;
  textPosition?: 'top' | 'center' | 'bottom';
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: 'serif' | 'sans' | 'mono' | 'display';
  overlayOpacity?: number;
  overlayColor?: string;
  imageFit?: 'cover' | 'contain' | 'center';
}

export interface ReferenceItem {
  id: string;
  bookId: string;
  citationKey: string; // e.g., [1], [Smith2024]
  title: string;
  authors: string;
  publicationYear?: string;
  journalOrPublisher?: string;
  url?: string;
  notes?: string;
}

export const DEFAULT_BOOK_CATEGORIES = [
  'Academic & Textbooks',
  'Revision & Past Exam Papers',
  'Coaching & Practice Exams',
  'Accounting & Finance',
  'Software & Code Scripts',
  'Software Architecture & Systems',
  'Business & Management',
  'Science & Engineering',
  'Education & Academic',
  'Literature & Fiction',
  'General Non-Fiction',
] as const;

export type NumberingStyle = 'arabic' | 'roman' | 'alphabetic' | 'spelled' | 'custom';
export type ChapterDesignStyle = 'classic' | 'modern' | 'editorial' | 'minimal' | 'bold' | 'accounting' | 'tech_code';

export interface BookNumberingConfig {
  numberingStyle: NumberingStyle; // 'arabic' (1,2,3), 'roman' (I,II,III), 'alphabetic' (A,B,C), 'spelled' (One, Two)
  numberingPrefix: string;        // e.g. "Chapter", "Section", "Module", "Script", "Ledger"
  numberingSuffix: string;        // e.g. ":", ".", "-"
  chapterDesignStyle: ChapterDesignStyle; // Visual style of chapter header
  showChapterNumbersInTOC: boolean;
  pageNumberPosition?: 'bottom-center' | 'bottom-right' | 'top-right';
}

export interface BookSeriesConfig {
  isSeries?: boolean;
  seriesName?: string;           // e.g. "The Tech Founder Chronicles" or "Financial Accounting Masterclass"
  seasonNumber?: number;         // e.g. 1, 2
  episodeNumber?: number;        // e.g. 1, 2, 3
  episodeTitle?: string;         // e.g. "The Genesis Ledger"
  previousEpisodeRecap?: string; // Synopsis / "Previously on..." catch-up from earlier episodes
  nextEpisodeTeaser?: string;    // Teaser / "In the next episode..." sneak peek
  nextEpisodeTitle?: string;     // e.g. "Episode 3: The Boardroom Showdown"
  nextEpisodeReleaseDate?: string; // e.g. "Releasing August 2026"
  showSeriesBannerInReader?: boolean;
}

export interface AuthorDetails {
  bio?: string;
  avatarUrl?: string;
  website?: string;
  email?: string;
  socialTwitter?: string;
  socialLinkedin?: string;
  socialGithub?: string;
}

export type ContributorRole = 
  | 'Co-Author' 
  | 'Editor' 
  | 'Illustrator' 
  | 'Translator' 
  | 'Foreword By' 
  | 'Technical Reviewer' 
  | 'Researcher' 
  | 'Designer'
  | 'Proofreader'
  | 'Custom';

export interface Contributor {
  id: string;
  name: string;
  role: ContributorRole | string;
  bio?: string;
  avatarUrl?: string;
  email?: string;
  website?: string;
}

export interface CharacterAsset {
  id: string;
  name: string;                // e.g. "Aegis Plasma Rifle", "Neural Interface Cyberdeck", "Hover-Bike"
  type?: string;               // e.g. "Weapon", "Vehicle", "Gadget", "Artifact", "Clothing / Armor", "Relic"
  description?: string;        // Brief description
  images: string[];            // Visual images for this asset across different state/angles
  keywords?: string[];         // Mention trigger keywords (e.g. ["Plasma Rifle", "Cyberdeck", "Aegis"])
  ownerCharacterId?: string;   // ID of linked Character / Actor
}

export interface Character {
  id: string;
  name: string;                // e.g. "Dr. Elena Vance", "Captain Jax", "Lady Seraphina"
  role?: string;               // e.g. "Protagonist", "Antagonist", "Supporting", "Companion"
  bio?: string;                // Bio & Background
  avatarUrl?: string;          // Primary portrait URL
  images: string[];            // Visual images / scene poses / outfits for dynamic scene feature
  aliases?: string[];          // Keywords / aliases for matching in text (e.g. ["Elena", "Vance", "Captain"])
  assetIds?: string[];         // Owned asset IDs
}

export interface BookFrontMatter {
  executiveSummary?: string;    // Executive Summary or Preamble
  legalNotes?: string;          // Legal Notes & Terms of Use
  copyrightNotice?: string;     // e.g. "Copyright © 2026 Publisher Name. All rights reserved."
  isbnNumber?: string;          // ISBN / Cataloging Number
  edition?: string;             // e.g. "First Edition, 2026"
  dedication?: string;          // Dedication
  acknowledgements?: string;    // Acknowledgements
  disclaimer?: string;          // Disclaimers (Financial, Legal, Medical, etc.)
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  authorEmail?: string;
  authorDetails?: AuthorDetails; // Extended bio, photo, socials for Author
  contributors?: Contributor[];  // Co-authors, Editors, Illustrators, Translators, etc.
  publisherId: string;
  description: string;
  category?: string; // e.g. Accounting & Finance, Software Architecture, etc.
  genre?: string;    // e.g. Non-Fiction, Technical, Academic, Business, Fiction
  subGenre?: string; // e.g. Cloud Computing, Distributed Systems, Financial Reporting
  tags?: string[];   // e.g. ["SQLite", "PWA", "Offline-First", "React"]
  targetAudience?: string; // e.g. "Software Architects & Tech Founders"
  language?: string; // e.g. "English (US)", "Spanish", "French"
  numberingConfig?: BookNumberingConfig; // Book numbering formats & design style
  frontMatter?: BookFrontMatter; // Executive Summary, Legal Notes, Copyrights, Disclaimers
  seriesConfig?: BookSeriesConfig; // Series, Seasons, Episodes, Recaps & Teasers
  characters?: Character[];        // Series characters / actors with image galleries
  assets?: CharacterAsset[];       // Owned weapons, vehicles, relics & items linked to actors
  price: number; // 0 for free
  currency: string;
  coverFront: FrontCover;
  coverBack: BackCover;
  chapters: Chapter[];
  references: ReferenceItem[];
  isPublished: boolean;
  publishedAt?: string;
  isArchived?: boolean; // Archived in publisher repository
  archivedAt?: string;
  whatsappNumber?: string; // Publisher's WhatsApp number for POP verification
  accessCodes?: string[];  // Custom valid access codes for this book
  requiresAccessCode?: boolean; // True if code verification is required
  createdAt: string;
  updatedAt: string;
  version: string;
}

export interface ReaderProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  deviceId: string;
  registeredAt: string;
}

export interface BookDataPack {
  packVersion: string;
  exportTimestamp: string;
  downloadedAt?: string;
  expiresAt?: string; // Expire date (30 days after download)
  appSignature?: string; // 'EMPIRE_OF_TRUST_MY_LIBRARY_V2'
  boundPhoneNumber: string;
  boundDeviceId: string;
  securityHash: string; // Cryptographic verification token
  book: Book;
}

export interface ReaderLibraryItem {
  id: string;
  bookId: string;
  bookTitle: string;
  author: string;
  coverFront: FrontCover;
  boundPhoneNumber: string;
  boundDeviceId: string;
  downloadedAt: string;
  isUnlocked: boolean;
  dataPackJson: string;
  lastReadChapterId?: string;
  lastReadScrollPos?: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  blockId: string;
  snippet: string;
  createdAt: string;
}

export interface HighlightNote {
  id: string;
  bookId: string;
  chapterId: string;
  text: string;
  note?: string;
  color: 'yellow' | 'orange' | 'green' | 'blue' | 'purple';
  createdAt: string;
}

export interface ActivationRequest {
  id: string;
  bookId: string;
  bookTitle: string;
  readerPhone: string;
  whatsappNumber: string; // e.g. +263774479121
  status: 'pending' | 'activated' | 'rejected';
  generatedCode?: string;
  requestedAt: string;
  activatedAt?: string;
  notes?: string;
}

export interface RenewalAuthorization {
  activationCode: string;
  bookId: string;
  boundPhoneNumber: string;
  issuedAt: string;
  extensionDays: number;
}

export interface SqlQueryResult {
  columns: string[];
  values: any[][];
}

export interface VendorProfile {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string; // WhatsApp number, e.g. +263774479121
  email?: string;
  address?: string;
  logoUrl?: string;
  description: string;
  category: string;
  tagline?: string;
  currency: string;
  updatedAt: string;
}

export interface VendorProduct {
  id: string;
  vendorId: string;
  vendorBusinessName: string;
  vendorPhone: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  imageUrl: string;
  badge?: string; // e.g. "Featured", "Best Seller", "New Arrival", "Special Discount"
  whatsappMsgTemplate?: string;
  inStock: boolean;
  createdAt: string;
}
