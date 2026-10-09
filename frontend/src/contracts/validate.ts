import {
  AUDIO_FORMATS,
  EVENT_TYPES,
  GENERATION_MODES,
  MAPPING_STATUSES,
  SCHEMA_VERSION,
  SOURCE_CATEGORIES,
  type DemoFixture,
  type GenerationMode,
  type SoundprintResult,
  type ValidationResult,
} from "./types";

const FORBIDDEN_KEYS = new Set(["latitude", "longitude", "lat", "lng", "coordinates", "raw_trace"]);

const JOB_ID = /^[a-z0-9-]{8,64}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function push(errors: string[], message: string): void {
  errors.push(message);
}

function rejectForbidden(value: unknown, path: string, errors: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectForbidden(item, `${path}[${index}]`, errors));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) push(errors, `${path}.${key} is not allowed`);
    rejectForbidden(child, `${path}.${key}`, errors);
  }
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  errors: string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) push(errors, `${path}.${key} is not supported`);
  }
  for (const key of allowed) {
    if (!(key in value)) push(errors, `${path}.${key} is required`);
  }
}

function readString(value: unknown, path: string, max: number, errors: string[]): string | null {
  if (typeof value !== "string" || value.trim() === "" || value.length > max) {
    push(errors, `${path} must be a non-empty string up to ${max} characters`);
    return null;
  }
  return value;
}

function readNullableString(
  value: unknown,
  path: string,
  max: number,
  errors: string[],
): string | null {
  if (value === null) return null;
  return readString(value, path, max, errors);
}

function readInteger(
  value: unknown,
  path: string,
  min: number,
  max: number,
  errors: string[],
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    push(errors, `${path} must be an integer from ${min} to ${max}`);
    return null;
  }
  return value;
}

function readUnit(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    push(errors, `${path} must be a finite number from 0 to 1`);
  }
}

function readBoolean(value: unknown, path: string, errors: string[]): boolean | null {
  if (typeof value !== "boolean") {
    push(errors, `${path} must be a boolean`);
    return null;
  }
  return value;
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  errors: string[],
): T | null {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    push(errors, `${path} must be one of ${allowed.join(", ")}`);
    return null;
  }
  return value as T;
}

function readId(value: unknown, path: string, errors: string[]): string | null {
  const id = readString(value, path, 64, errors);
  if (id && !/^[a-z0-9-]{3,64}$/.test(id)) {
    push(errors, `${path} must use lowercase letters, numbers, and hyphens`);
    return null;
  }
  return id;
}

export function validateSoundprintResult(value: unknown): ValidationResult<SoundprintResult> {
  const errors: string[] = [];
  rejectForbidden(value, "result", errors);
  if (!isRecord(value)) {
    push(errors, "result must be an object");
    return { ok: false, errors };
  }
  assertExactKeys(
    value,
    [
      "schema_version",
      "job_id",
      "mode",
      "provenance",
      "duration_ms",
      "audio_available",
      "audio_format",
      "route",
      "events",
      "chapters",
      "arrangement",
      "story",
      "quality",
      "warnings",
      "mapping_verification",
    ],
    "result",
    errors,
  );

  if (value.schema_version !== SCHEMA_VERSION) push(errors, "result.schema_version must be 1");
  const jobId = readString(value.job_id, "result.job_id", 64, errors);
  if (jobId && !JOB_ID.test(jobId)) {
    push(errors, "result.job_id must be an opaque lowercase identifier");
  }
  const mode = readEnum(value.mode, GENERATION_MODES, "result.mode", errors);
  const duration = readInteger(value.duration_ms, "result.duration_ms", 3000, 120000, errors);
  const audioAvailable = readBoolean(value.audio_available, "result.audio_available", errors);
  if (audioAvailable === false && value.audio_format !== null) {
    push(errors, "result.audio_format must be null when audio is absent");
  }
  if (audioAvailable === true) {
    readEnum(value.audio_format, AUDIO_FORMATS, "result.audio_format", errors);
  }

  const provenance = readProvenance(value.provenance, "result.provenance", errors);
  if (mode && provenance && provenance.generation_mode !== mode) {
    push(errors, "result.provenance.generation_mode must match result.mode");
  }
  if (mode === "synthetic_fixture" && provenance) {
    if (provenance.source_category !== "synthetic") {
      push(errors, "synthetic_fixture results must use a synthetic source");
    }
    if (provenance.mapping_status !== "planned") {
      push(errors, "synthetic_fixture mappings must stay planned");
    }
    if (provenance.model_identity !== null) {
      push(errors, "synthetic_fixture results must not name a live model");
    }
  }
  if (mode === "studio_live" && provenance?.source_category === "synthetic") {
    push(errors, "studio_live results must not use a synthetic source");
  }

  const eventIds = readEvents(value.events, duration, errors);
  readRoute(value.route, duration, errors);
  readChapters(value.chapters, duration, errors);
  readArrangement(value.arrangement, eventIds, errors);
  readStory(value.story, eventIds, errors);
  readQuality(value.quality, errors);
  readWarnings(value.warnings, errors);
  readMappingChecks(value.mapping_verification, eventIds, mode, errors);

  if (errors.length > 0 || !mode || duration === null || audioAvailable === null || !provenance) {
    return { ok: false, errors };
  }
  return { ok: true, value: value as SoundprintResult };
}

export function validateDemoFixture(value: unknown): ValidationResult<DemoFixture> {
  const errors: string[] = [];
  rejectForbidden(value, "fixture", errors);
  if (!isRecord(value)) {
    push(errors, "fixture must be an object");
    return { ok: false, errors };
  }
  assertExactKeys(
    value,
    ["schema_version", "label", "purpose", "manifest", "result"],
    "fixture",
    errors,
  );
  if (value.schema_version !== SCHEMA_VERSION) push(errors, "fixture.schema_version must be 1");
  if (value.label !== "synthetic") push(errors, "fixture.label must be synthetic");
  readString(value.purpose, "fixture.purpose", 280, errors);
  const manifest = readManifest(value.manifest, errors);
  const result = validateSoundprintResult(value.result);
  if (!result.ok) errors.push(...result.errors);

  if (manifest && result.ok) {
    if (manifest.generation_mode !== result.value.mode) {
      push(errors, "fixture.manifest.generation_mode must match result.mode");
    }
    if (manifest.source_category !== result.value.provenance.source_category) {
      push(errors, "fixture.manifest.source_category must match result provenance");
    }
    if (manifest.verification.mapping_status !== result.value.provenance.mapping_status) {
      push(errors, "fixture.manifest.verification.mapping_status must match result provenance");
    }
    if (manifest.model_identity !== result.value.provenance.model_identity) {
      push(errors, "fixture.manifest.model_identity must match result provenance");
    }
    if (result.value.mode === "synthetic_fixture" && manifest.verification.human_reviewed) {
      push(errors, "synthetic fixtures cannot be marked human reviewed");
    }
  }

  if (errors.length > 0 || !result.ok || !manifest) return { ok: false, errors };
  return { ok: true, value: value as DemoFixture };
}

function readProvenance(
  value: unknown,
  path: string,
  errors: string[],
): SoundprintResult["provenance"] | null {
  if (!isRecord(value)) {
    push(errors, `${path} must be an object`);
    return null;
  }
  assertExactKeys(
    value,
    ["source_category", "generation_mode", "model_identity", "rights_note", "mapping_status"],
    path,
    errors,
  );
  const source = readEnum(
    value.source_category,
    SOURCE_CATEGORIES,
    `${path}.source_category`,
    errors,
  );
  const mode = readEnum(value.generation_mode, GENERATION_MODES, `${path}.generation_mode`, errors);
  const model = readNullableString(value.model_identity, `${path}.model_identity`, 120, errors);
  const rights = readString(value.rights_note, `${path}.rights_note`, 400, errors);
  const mapping = readEnum(
    value.mapping_status,
    MAPPING_STATUSES,
    `${path}.mapping_status`,
    errors,
  );
  if (!source || !mode || rights === null || !mapping) return null;
  return {
    source_category: source,
    generation_mode: mode,
    model_identity: model,
    rights_note: rights,
    mapping_status: mapping,
  };
}

function readManifest(value: unknown, errors: string[]): DemoFixture["manifest"] | null {
  if (!isRecord(value)) {
    push(errors, "fixture.manifest must be an object");
    return null;
  }
  assertExactKeys(
    value,
    [
      "schema_version",
      "source_category",
      "generation_mode",
      "model_identity",
      "asset_hashes",
      "rights_note",
      "verification",
    ],
    "fixture.manifest",
    errors,
  );
  if (value.schema_version !== SCHEMA_VERSION) {
    push(errors, "fixture.manifest.schema_version must be 1");
  }
  const source = readEnum(
    value.source_category,
    SOURCE_CATEGORIES,
    "fixture.manifest.source_category",
    errors,
  );
  const mode = readEnum(
    value.generation_mode,
    GENERATION_MODES,
    "fixture.manifest.generation_mode",
    errors,
  );
  readNullableString(value.model_identity, "fixture.manifest.model_identity", 120, errors);
  readString(value.rights_note, "fixture.manifest.rights_note", 400, errors);
  readAssetHashes(value.asset_hashes, errors);
  if (!isRecord(value.verification)) {
    push(errors, "fixture.manifest.verification must be an object");
    return null;
  }
  assertExactKeys(
    value.verification,
    ["mapping_status", "human_reviewed"],
    "fixture.manifest.verification",
    errors,
  );
  const mapping = readEnum(
    value.verification.mapping_status,
    MAPPING_STATUSES,
    "fixture.manifest.verification.mapping_status",
    errors,
  );
  const reviewed = readBoolean(
    value.verification.human_reviewed,
    "fixture.manifest.verification.human_reviewed",
    errors,
  );
  if (!source || !mode || !mapping || reviewed === null) return null;
  return value as DemoFixture["manifest"];
}

function readAssetHashes(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    push(errors, "fixture.manifest.asset_hashes must be an object");
    return;
  }
  const entries = Object.entries(value);
  if (entries.length > 8) push(errors, "fixture.manifest.asset_hashes has too many entries");
  for (const [name, hash] of entries) {
    if (!/^[a-z0-9-]{1,64}$/.test(name)) {
      push(errors, "fixture.manifest.asset_hashes keys must be lowercase identifiers");
    }
    if (typeof hash !== "string" || !SHA256.test(hash)) {
      push(errors, `fixture.manifest.asset_hashes.${name} must be a sha256 hex digest`);
    }
  }
}

function readRoute(value: unknown, duration: number | null, errors: string[]): void {
  if (!isRecord(value)) {
    push(errors, "result.route must be an object");
    return;
  }
  assertExactKeys(value, ["points"], "result.route", errors);
  if (!Array.isArray(value.points) || value.points.length < 2 || value.points.length > 3000) {
    push(errors, "result.route.points must contain 2 to 3000 points");
    return;
  }
  let previous = -1;
  value.points.forEach((point, index) => {
    const path = `result.route.points[${index}]`;
    if (!isRecord(point)) {
      push(errors, `${path} must be an object`);
      return;
    }
    assertExactKeys(point, ["x", "y", "t_ms"], path, errors);
    if (typeof point.x !== "number" || !Number.isFinite(point.x) || point.x < 0 || point.x > 1) {
      push(errors, `${path}.x must be a finite number from 0 to 1`);
    }
    if (typeof point.y !== "number" || !Number.isFinite(point.y) || point.y < 0 || point.y > 1) {
      push(errors, `${path}.y must be a finite number from 0 to 1`);
    }
    const time = readInteger(point.t_ms, `${path}.t_ms`, 0, duration ?? 120000, errors);
    if (time !== null) {
      if (time <= previous) push(errors, `${path}.t_ms must increase`);
      if (duration !== null && time > duration) {
        push(errors, `${path}.t_ms must stay within the result duration`);
      }
      previous = time;
    }
  });
}

function readEvents(value: unknown, duration: number | null, errors: string[]): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(value) || value.length > 64) {
    push(errors, "result.events must be an array of at most 64 events");
    return ids;
  }
  value.forEach((event, index) => {
    const path = `result.events[${index}]`;
    if (!isRecord(event)) {
      push(errors, `${path} must be an object`);
      return;
    }
    assertExactKeys(
      event,
      ["id", "type", "source_offset_ms", "audio_offset_ms", "confidence"],
      path,
      errors,
    );
    const id = readId(event.id, `${path}.id`, errors);
    if (id) {
      if (ids.has(id)) push(errors, `${path}.id must be unique`);
      ids.add(id);
    }
    readEnum(event.type, EVENT_TYPES, `${path}.type`, errors);
    readInteger(event.source_offset_ms, `${path}.source_offset_ms`, 0, 1_800_000, errors);
    const audioOffset = readInteger(
      event.audio_offset_ms,
      `${path}.audio_offset_ms`,
      0,
      duration ?? 120000,
      errors,
    );
    if (audioOffset !== null && duration !== null && audioOffset > duration) {
      push(errors, `${path}.audio_offset_ms must stay within the result duration`);
    }
    readUnit(event.confidence, `${path}.confidence`, errors);
  });
  return ids;
}

function readChapters(value: unknown, duration: number | null, errors: string[]): void {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    push(errors, "result.chapters must contain 1 to 10 chapters");
    return;
  }
  let previousEnd = 0;
  value.forEach((chapter, index) => {
    const path = `result.chapters[${index}]`;
    if (!isRecord(chapter)) {
      push(errors, `${path} must be an object`);
      return;
    }
    assertExactKeys(chapter, ["id", "start_ms", "end_ms", "title"], path, errors);
    readId(chapter.id, `${path}.id`, errors);
    readString(chapter.title, `${path}.title`, 80, errors);
    const start = readInteger(chapter.start_ms, `${path}.start_ms`, 0, duration ?? 120000, errors);
    const end = readInteger(chapter.end_ms, `${path}.end_ms`, 0, duration ?? 120000, errors);
    if (start === null || end === null) return;
    if (end - start < 3000) push(errors, `${path} must last at least 3000 ms`);
    if (index === 0 && start !== 0) push(errors, `${path}.start_ms must begin at 0`);
    if (start < previousEnd) push(errors, `${path} must not overlap the previous chapter`);
    if (duration !== null && end > duration) {
      push(errors, `${path}.end_ms must stay within the result duration`);
    }
    previousEnd = end;
  });
}

function readArrangement(value: unknown, eventIds: Set<string>, errors: string[]): void {
  if (!isRecord(value)) {
    push(errors, "result.arrangement must be an object");
    return;
  }
  assertExactKeys(value, ["mood", "style", "event_refs"], "result.arrangement", errors);
  if (value.mood !== "warm_cinematic") {
    push(errors, "result.arrangement.mood must be warm_cinematic");
  }
  if (!Array.isArray(value.style) || value.style.length < 1 || value.style.length > 6) {
    push(errors, "result.arrangement.style must contain 1 to 6 descriptors");
  } else {
    value.style.forEach((item, index) => {
      readString(item, `result.arrangement.style[${index}]`, 40, errors);
    });
  }
  readEventRefs(value.event_refs, "result.arrangement.event_refs", eventIds, errors);
}

function readStory(value: unknown, eventIds: Set<string>, errors: string[]): void {
  if (!isRecord(value)) {
    push(errors, "result.story must be an object");
    return;
  }
  assertExactKeys(value, ["cards"], "result.story", errors);
  if (!Array.isArray(value.cards) || value.cards.length > 12) {
    push(errors, "result.story.cards must be an array of at most 12 cards");
    return;
  }
  value.cards.forEach((card, index) => {
    const path = `result.story.cards[${index}]`;
    if (!isRecord(card)) {
      push(errors, `${path} must be an object`);
      return;
    }
    assertExactKeys(card, ["id", "event_id", "text"], path, errors);
    readId(card.id, `${path}.id`, errors);
    const eventId = readId(card.event_id, `${path}.event_id`, errors);
    if (eventId && !eventIds.has(eventId)) push(errors, `${path}.event_id must match an event`);
    readString(card.text, `${path}.text`, 400, errors);
  });
}

function readQuality(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    push(errors, "result.quality must be an object");
    return;
  }
  assertExactKeys(value, ["usable", "summary"], "result.quality", errors);
  readBoolean(value.usable, "result.quality.usable", errors);
  readString(value.summary, "result.quality.summary", 280, errors);
}

function readWarnings(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length > 20) {
    push(errors, "result.warnings must be an array of at most 20 warnings");
    return;
  }
  value.forEach((warning, index) => {
    readString(warning, `result.warnings[${index}]`, 280, errors);
  });
}

function readMappingChecks(
  value: unknown,
  eventIds: Set<string>,
  mode: GenerationMode | null,
  errors: string[],
): void {
  if (!Array.isArray(value) || value.length > 64) {
    push(errors, "result.mapping_verification must be an array of at most 64 checks");
    return;
  }
  value.forEach((check, index) => {
    const path = `result.mapping_verification[${index}]`;
    if (!isRecord(check)) {
      push(errors, `${path} must be an object`);
      return;
    }
    assertExactKeys(check, ["event_id", "status", "note"], path, errors);
    const eventId = readId(check.event_id, `${path}.event_id`, errors);
    if (eventId && !eventIds.has(eventId)) push(errors, `${path}.event_id must match an event`);
    const status = readEnum(check.status, MAPPING_STATUSES, `${path}.status`, errors);
    if (mode === "synthetic_fixture" && status && status !== "planned") {
      push(errors, `${path}.status must stay planned for a synthetic fixture`);
    }
    readString(check.note, `${path}.note`, 240, errors);
  });
}

function readEventRefs(
  value: unknown,
  path: string,
  eventIds: Set<string>,
  errors: string[],
): void {
  if (!Array.isArray(value) || value.length > 64) {
    push(errors, `${path} must be an array of at most 64 event ids`);
    return;
  }
  value.forEach((item, index) => {
    const id = readId(item, `${path}[${index}]`, errors);
    if (id && !eventIds.has(id)) push(errors, `${path}[${index}] must match an event`);
  });
}
