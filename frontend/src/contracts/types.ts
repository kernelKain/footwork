export const SCHEMA_VERSION = "1";

export const GENERATION_MODES = [
  "studio_live",
  "route_sketch",
  "cached_example",
  "synthetic_fixture",
] as const;

export const SOURCE_CATEGORIES = ["synthetic", "sanitized_real", "live"] as const;

export const MAPPING_STATUSES = [
  "planned",
  "automated_sketch_verified",
  "human_reviewed_studio",
] as const;

export const EVENT_TYPES = ["turn", "pace_change", "pause", "loop"] as const;

export const AUDIO_FORMATS = ["audio/mpeg", "audio/wav"] as const;

export type GenerationMode = (typeof GENERATION_MODES)[number];
export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];
export type MappingStatus = (typeof MAPPING_STATUSES)[number];
export type EventType = (typeof EVENT_TYPES)[number];
export type AudioFormat = (typeof AUDIO_FORMATS)[number];

export type Provenance = {
  source_category: SourceCategory;
  generation_mode: GenerationMode;
  model_identity: string | null;
  rights_note: string;
  mapping_status: MappingStatus;
};

export type RoutePoint = {
  x: number;
  y: number;
  t_ms: number;
};

export type MovementEvent = {
  id: string;
  type: EventType;
  source_offset_ms: number;
  audio_offset_ms: number;
  confidence: number;
};

export type Chapter = {
  id: string;
  start_ms: number;
  end_ms: number;
  title: string;
};

export type ArrangementPlan = {
  mood: "warm_cinematic";
  style: string[];
  event_refs: string[];
};

export type StoryCard = {
  id: string;
  event_id: string;
  text: string;
};

export type MappingCheck = {
  event_id: string;
  status: MappingStatus;
  note: string;
};

export type SoundprintResult = {
  schema_version: typeof SCHEMA_VERSION;
  job_id: string;
  mode: GenerationMode;
  provenance: Provenance;
  duration_ms: number;
  audio_available: boolean;
  audio_format: AudioFormat | null;
  route: { points: RoutePoint[] };
  events: MovementEvent[];
  chapters: Chapter[];
  arrangement: ArrangementPlan;
  story: { cards: StoryCard[] };
  quality: { usable: boolean; summary: string };
  warnings: string[];
  mapping_verification: MappingCheck[];
};

export type DemoManifest = {
  schema_version: typeof SCHEMA_VERSION;
  source_category: SourceCategory;
  generation_mode: GenerationMode;
  model_identity: string | null;
  asset_hashes: Record<string, string>;
  rights_note: string;
  verification: {
    mapping_status: MappingStatus;
    human_reviewed: boolean;
  };
};

export type DemoFixture = {
  schema_version: typeof SCHEMA_VERSION;
  label: "synthetic";
  purpose: string;
  manifest: DemoManifest;
  result: SoundprintResult;
};

export type ValidationSuccess<T> = { ok: true; value: T };
export type ValidationFailure = { ok: false; errors: string[] };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;
