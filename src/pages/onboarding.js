import { icons } from '../icons.js';
import { esc } from '../lib/utils.js';
import { TIME_OPTIONS, GOAL_OPTIONS, TYPE_OPTIONS, CHALLENGE_OPTIONS, slug } from '../store.js';

const chips = (items, selected, field) => items.map(item => `
  <button type="button" class="choice-chip ${selected.includes(item) ? 'selected' : ''}" data-profile-choice="${field}" data-value="${esc(item)}">${esc(item)}</button>`).join('');
const joined = values => esc((values || []).join(', '));
const question = (label, body, hint = '') => `
  <div class="onboarding-question"><label>${label}</label>${body}${hint ? `<div class="form-hint">${hint}</div>` : ''}</div>`;

const EXPERIENCE = [
  ['beginner', 'Beginner: learning the fundamentals'],
  ['intermediate', 'Intermediate: comfortable building on my own'],
  ['advanced', 'Advanced: ready for ambitious projects']
];

function stepContent(step, draft) {
  if (step === 1) {
    const options = EXPERIENCE.map(([value, label]) =>
      `<option value="${value}" ${draft.experience_level === value ? 'selected' : ''}>${label}</option>`).join('');
    return `
      <h1>Build your profile</h1><p>Tell Stoke what you can do so recommendations fit you.</p>
      ${question('What can you already build with?', `<input class="form-input" id="profileSkills" value="${joined(draft.skills)}" placeholder="JavaScript, React, SQL" />`, 'Separate with commas.')}
      ${question('Experience level', `<select class="form-select" id="profileExperience">${options}</select>`)}
      ${question('How much time can you put toward one project?', `<div class="choice-grid">${chips(Object.keys(TIME_OPTIONS), [draft.available_time], 'available_time')}</div>`)}`;
  }
  if (step === 2) {
    return `
      <h1>Choose your direction</h1><p>These preferences steer which project the Machine picks.</p>
      ${question('Why are you building right now?', `<div class="choice-grid">${chips(GOAL_OPTIONS, draft.goals, 'goals')}</div>`)}
      ${question('What kind of project?', `<div class="choice-grid">${chips(TYPE_OPTIONS, draft.preferred_project_types, 'preferred_project_types')}</div>`)}
      ${question('Technologies you want to practise', `<input class="form-input" id="profileTechnologies" value="${joined(draft.technologies)}" placeholder="Rust, GraphQL, SQL" />`, 'Optional. Separate with commas.')}`;
  }
  const selectedChallenge = CHALLENGE_OPTIONS.filter(option => slug(option) === draft.challenge_level);
  return `
    <h1>Make it yours</h1><p>The last constraints and interests.</p>
    ${question('Anything you do not want to build?', `<input class="form-input" id="profileAvoid" value="${joined(draft.avoid_topics)}" placeholder="todo, weather" />`, 'Projects mentioning these are skipped.')}
    ${question('Interests or problems you would like to solve', `<input class="form-input" id="profileInterests" value="${joined(draft.interests)}" placeholder="music, reading, budgeting" />`, 'Optional. Separate with commas.')}
    ${question('Challenge level', `<div class="choice-grid">${chips(CHALLENGE_OPTIONS, selectedChallenge, 'challenge_level')}</div>`)}`;
}

export function renderOnboarding(step, draft) {
  const dot = n => `<span class="${step >= n ? 'active' : ''}"></span>`;
  return `
    <div class="onboarding-page"><div class="onboarding-shell">
      <div class="onboarding-top">
        <div class="onboarding-brand"><div class="logo-mark">S</div><div class="logo-text">Stoke</div></div>
        <div class="onboarding-step-label">Step ${step} of 3</div>
      </div>
      <div class="onboarding-progress">${dot(1)}${dot(2)}${dot(3)}</div>
      <div class="onboarding-card">
        ${stepContent(step, draft)}
        <div class="onboarding-actions">
          <button class="btn btn-ghost" id="onboardingBack" ${step === 1 ? 'style="visibility:hidden"' : ''}>${icons.arrowLeft} Back</button>
          <button class="btn btn-primary" id="onboardingNext">${step === 3 ? 'Save profile' : 'Continue'} ${icons.arrowRight}</button>
        </div>
      </div>
    </div></div>`;
}
