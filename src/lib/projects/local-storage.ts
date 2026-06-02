import type { Project, ProjectSeed } from "@/lib/projects/types";
import { enrichProject } from "@/lib/projects/utils";

const PROJECTS_KEY = "pg-local-projects:v1";
const SOCIAL_KEY = "pg-project-social:v1";
const PROJECTS_EVENT = "pg-local-projects-change";
const SOCIAL_EVENT = "pg-project-social-change";
const EMPTY_SOCIAL_STATE: LocalSocialState = {
  liked: false,
  saved: false,
  views: 0,
};

type LocalSocialState = {
  liked: boolean;
  saved: boolean;
  views: number;
};

let rawProjectsCache = "__init__";
let parsedProjectsCache: Array<Project | ProjectSeed> = [];
let rawSocialCache = "__init__";
let parsedSocialCache: Record<string, LocalSocialState> = {};
let enrichedProjectsCacheKey = "__init__";
let enrichedProjectsCache: Project[] = [];

function canUseStorage() {
  return typeof window !== "undefined";
}

function emit(eventName: string) {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(eventName));
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readSocialState() {
  if (!canUseStorage()) return parsedSocialCache;

  const raw = window.localStorage.getItem(SOCIAL_KEY) ?? "";
  if (raw === rawSocialCache) return parsedSocialCache;

  rawSocialCache = raw;
  try {
    parsedSocialCache = raw ? (JSON.parse(raw) as Record<string, LocalSocialState>) : {};
  } catch {
    parsedSocialCache = {};
  }
  return parsedSocialCache;
}

function writeSocialState(value: Record<string, LocalSocialState>) {
  rawSocialCache = JSON.stringify(value);
  parsedSocialCache = value;
  writeJson(SOCIAL_KEY, value);
}

function readProjectState() {
  if (!canUseStorage()) return parsedProjectsCache;

  const raw = window.localStorage.getItem(PROJECTS_KEY) ?? "";
  if (raw === rawProjectsCache) return parsedProjectsCache;

  rawProjectsCache = raw;
  try {
    parsedProjectsCache = raw ? (JSON.parse(raw) as Array<Project | ProjectSeed>) : [];
  } catch {
    parsedProjectsCache = [];
  }
  return parsedProjectsCache;
}

export function getLocalProjects() {
  const projects = readProjectState();
  readSocialState();
  const socialKey = rawSocialCache;
  const cacheKey = `${rawProjectsCache}::${socialKey}`;
  if (cacheKey === enrichedProjectsCacheKey) return enrichedProjectsCache;

  enrichedProjectsCacheKey = cacheKey;
  enrichedProjectsCache = projects
    .map((project) => applyLocalProjectMetrics(enrichProject(project as ProjectSeed)))
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );

  return enrichedProjectsCache;
}

export function getLocalProjectBySlug(slug: string) {
  return getLocalProjects().find((project) => project.slug === slug) ?? null;
}

export function saveLocalProject(project: Project) {
  const normalized = enrichProject(project);
  const current = readProjectState();
  const next = [
    normalized,
    ...current.filter((storedProject) => storedProject.slug !== project.slug),
  ];
  rawProjectsCache = JSON.stringify(next);
  parsedProjectsCache = next;
  writeJson(PROJECTS_KEY, next);
  emit(PROJECTS_EVENT);
}

export function getLocalProjectSocialState(slug: string): LocalSocialState {
  const state = readSocialState();
  return state[slug] ?? EMPTY_SOCIAL_STATE;
}

export function toggleLocalProjectLike(slug: string) {
  const state = readSocialState();
  const current = state[slug] ?? EMPTY_SOCIAL_STATE;
  const next = { ...current, liked: !current.liked };
  state[slug] = next;
  writeSocialState(state);
  emit(SOCIAL_EVENT);
  emit(PROJECTS_EVENT);
  return next.liked;
}

export function toggleLocalProjectSave(slug: string) {
  const state = readSocialState();
  const current = state[slug] ?? EMPTY_SOCIAL_STATE;
  const next = { ...current, saved: !current.saved };
  state[slug] = next;
  writeSocialState(state);
  emit(SOCIAL_EVENT);
  emit(PROJECTS_EVENT);
  return next.saved;
}

export function recordLocalProjectView(slug: string) {
  if (!canUseStorage()) return 0;

  const sessionKey = `pg-project-viewed:${slug}`;
  if (window.sessionStorage.getItem(sessionKey)) {
    return getLocalProjectSocialState(slug).views;
  }

  window.sessionStorage.setItem(sessionKey, "1");

  const state = readSocialState();
  const current = state[slug] ?? EMPTY_SOCIAL_STATE;
  const next = { ...current, views: current.views + 1 };
  state[slug] = next;
  writeSocialState(state);
  emit(SOCIAL_EVENT);
  emit(PROJECTS_EVENT);
  return next.views;
}

export function applyLocalProjectMetrics(project: Project): Project {
  const state = getLocalProjectSocialState(project.slug);
  return {
    ...project,
    likes: project.likes + (state.liked ? 1 : 0),
    saves: project.saves + (state.saved ? 1 : 0),
    views: project.views + state.views,
    viewerHasLiked: project.viewerHasLiked || state.liked,
    viewerHasSaved: project.viewerHasSaved || state.saved,
  };
}

function subscribe(eventName: string, callback: () => void) {
  if (!canUseStorage()) {
    return () => undefined;
  }

  const handler = () => callback();
  window.addEventListener(eventName, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(eventName, handler);
    window.removeEventListener("storage", handler);
  };
}

export function subscribeLocalProjects(callback: () => void) {
  return subscribe(PROJECTS_EVENT, callback);
}

export function subscribeLocalProjectSocial(callback: () => void) {
  return subscribe(SOCIAL_EVENT, callback);
}
