import { supabase } from './supabase.js';
import { PROJECT_TYPES } from './lib/machine.js';
import { makeId } from './lib/utils.js';

// build profile (Supabase table build_profiles)

export const TIME_OPTIONS = { 'Under 5 hours': 5, '5-15 hours': 15, '15-40 hours': 40, '40+ hours': 80 };
export const GOAL_OPTIONS = ['Learning', 'Portfolio', 'Fun', 'Income', 'Solve a problem'];
export const TYPE_OPTIONS = [...PROJECT_TYPES, 'No preference'];
export const CHALLENGE_OPTIONS = ['Easy', 'Normal', 'Stretch', 'Brutal', 'Surprise Me'];

export const slug = label => label.toLowerCase().replace(/ /g, '-');
const capitalise = text => text.charAt(0).toUpperCase() + text.slice(1);
// Values saved by the first version of the onboarding, mapped to the current options.
const LEGACY_CHALLENGE = { 'gentle-start': 'Easy', balanced: 'Normal', 'stretch-me': 'Stretch' };

export function emptyProfile() {
  return {
    skills: [], experience_level: 'beginner', available_time: '5-15 hours', goals: [],
    preferred_project_types: [], technologies: [], avoid_topics: [], interests: [], challenge_level: 'normal'
  };
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('build_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(userId, draft) {
  const payload = { ...draft, user_id: userId, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('build_profiles').upsert(payload, { onConflict: 'user_id' }).select().maybeSingle();
  if (error) throw error;
  return data;
}

// Converts the database row into the shape the Machine scores against.
export function toMachineProfile(row) {
  const types = (row.preferred_project_types || []).filter(type => TYPE_OPTIONS.includes(type));
  const challenge = CHALLENGE_OPTIONS.find(option => slug(option) === row.challenge_level) || LEGACY_CHALLENGE[row.challenge_level] || 'Normal';
  return {
    skills: row.skills || [],
    experience: capitalise(row.experience_level || 'beginner'),
    hoursAvailable: TIME_OPTIONS[row.available_time] || 15,
    goals: row.goals || [],
    types: types.length ? types : ['No preference'],
    practice: row.technologies || [],
    avoid: row.avoid_topics || [],
    interests: (row.interests || []).join(' '),
    challenge
  };
}

// projects, ideas and history (this browser's localStorage, per account)

const dataKey = userId => `stoke:data:${userId}`;

export function loadUserData(userId) {
  try {
    return { projects: [], ideas: [], ...JSON.parse(localStorage.getItem(dataKey(userId)) || '{}') };
  } catch {
    return { projects: [], ideas: [] };
  }
}

export function saveUserData(userId, data) {
  try {
    localStorage.setItem(dataKey(userId), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export const newIdea = text => ({ id: makeId(), text });
export const findActive = data => data.projects.find(p => p.status === 'active') || null;
export const findPending = data => data.projects.find(p => p.status === 'recommended') || null;
export const allTasks = project => project.roadmap.flatMap(phase => phase.tasks);

export function taskProgress(project) {
  const tasks = allTasks(project);
  const done = tasks.filter(task => task.done).length;
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}
