import { icons } from '../icons.js';
import { esc, formatDate } from '../lib/utils.js';
import { analyseProjects } from '../lib/memory.js';
import { BLOCKER_KINDS } from '../lib/assistant.js';
import { findActive, findPending, allTasks, taskProgress } from '../store.js';

const STATUS = {
  recommended: ['Recommended', 'badge-todo'], active: ['In progress', 'badge-in-progress'],
  completed: ['Completed', 'badge-done'], abandoned: ['Abandoned', 'badge-abandoned'], passed: ['Passed on', 'badge-todo']
};
const statusBadge = status => `<span class="badge ${STATUS[status][1]}">${STATUS[status][0]}</span>`;
const tags = items => `<div class="tag-row">${items.map(item => `<span class="badge badge-todo">${esc(item)}</span>`).join('')}</div>`;
const progressBar = percent => `<div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>`;
const bullets = items => `<ul class="plain-list">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
const emptyText = text => `<p class="text-muted text-sm">${text}</p>`;
const lastActivity = p => p.finishedAt || p.startedAt || p.recommendedAt || '';

const stat = (label, value) => `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`;
const countStatus = (projects, status) => projects.filter(p => p.status === status).length;

export function renderDashboard({ name, data }) {
  const { projects, ideas } = data;
  const active = findActive(data);
  const pending = findPending(data);
  const { notes } = analyseProjects(projects, null);

  let current = `<div class="empty-state"><h3>No build in progress</h3><p>Ask the Machine for a project that fits your profile.</p></div>`;
  if (active) {
    const { done, total, percent } = taskProgress(active);
    current = `<h3>${esc(active.title)}</h3><p class="text-muted text-sm mb-4">${done} of ${total} tasks done</p>${progressBar(percent)}
      <button class="btn btn-primary mt-4" data-route="workspace">Open workspace</button>`;
  } else if (pending) {
    current = `<h3>${esc(pending.title)}</h3><p class="text-muted text-sm mb-4">The Machine recommended this. Start it or ask for another.</p>
      <button class="btn btn-primary" data-route="recommendation">See recommendation</button>`;
  }

  return `
    <div class="page-head flex items-center justify-between">
      <div><h1>Hello, ${esc(name.split(' ')[0])}</h1><p>What should you build next?</p></div>
      <button class="btn btn-primary" data-action="next-build">${icons.zap} Give me my next build</button>
    </div>
    <div class="grid grid-3 mb-4">
      ${stat('Finished', countStatus(projects, 'completed'))}${stat('Abandoned', countStatus(projects, 'abandoned'))}${stat('Saved ideas', ideas.length)}
    </div>
    <div class="grid grid-2">
      <div class="card"><div class="card-head"><h3>Current build</h3></div><div class="card-body">${current}</div></div>
      <div class="card"><div class="card-head"><h3>Stoke is noticing</h3></div><div class="card-body">
        ${notes.length ? bullets(notes.slice(0, 3)) : emptyText('No build history yet. Start, finish or abandon a project and patterns will show up here.')}
      </div></div>
    </div>`;
}

export function renderRecommendation({ data }) {
  const project = findPending(data);
  if (!project) {
    return `<div class="empty-state"><h3>No recommendation waiting</h3><p>Ask the Machine for one.</p>
      <button class="btn btn-primary mt-4" data-action="next-build">Give me my next build</button></div>`;
  }
  const phases = project.roadmap.map(phase => `${esc(phase.title)}: ${phase.tasks.length} tasks`);
  return `
    <div class="page-head"><h1>${esc(project.title)}</h1><p>${esc(project.summary)}</p></div>
    ${tags([project.type, `About ${project.hours} hours`, ...project.tech])}
    <div class="grid grid-2 mt-4">
      <div class="card"><div class="card-head"><h3>Why this project</h3></div><div class="card-body">
        ${bullets(project.reasons.length ? project.reasons : ['It was the best remaining match.'])}</div></div>
      <div class="card"><div class="card-head"><h3>Roadmap</h3></div><div class="card-body">${bullets(phases)}</div></div>
    </div>
    <div class="flex gap-3 mt-4">
      <button class="btn btn-primary" data-action="start-recommended">Start this build</button>
      <button class="btn btn-ghost" data-action="another-recommendation">Show me another</button>
    </div>`;
}

function taskRow(task, blockedIds) {
  return `<div class="task-row ${task.done ? 'done' : ''}">
    <input type="checkbox" id="task-${task.id}" data-task-id="${task.id}" ${task.done ? 'checked' : ''} />
    <label for="task-${task.id}">${esc(task.text)}</label>
    ${blockedIds.has(task.id) ? '<span class="badge badge-abandoned">Blocked</span>' : ''}
    ${task.done ? '' : `<button class="btn btn-ghost btn-sm" data-action="stuck-on-task" data-task-id="${task.id}">Stuck?</button>`}
  </div>`;
}

function guidanceBlock(help) {
  if (!help?.guidance) return '';
  const { steps, extraTips, canSplit } = help.guidance;
  return `<div class="card mt-4"><div class="card-head"><h3>Guidance</h3></div><div class="card-body">
    <ol class="plain-list">${steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>
    ${extraTips.length ? `<p class="form-label mt-4">Also worth checking</p>${bullets(extraTips)}` : ''}
    <div class="flex gap-3 mt-4">
      ${canSplit ? `<button class="btn btn-primary btn-sm" data-action="split-task" data-task-id="${help.taskId}">Break this task down</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-action="log-blocker">Log as blocker</button>
    </div></div></div>`;
}

export function renderWorkspace({ data, help }) {
  const project = findActive(data);
  if (!project) {
    return `<div class="empty-state"><h3>No active build</h3><p>Ask the Machine for a project to start building.</p>
      <button class="btn btn-primary mt-4" data-action="next-build">Give me my next build</button></div>`;
  }
  const { done, total, percent } = taskProgress(project);
  const openBlockers = project.blockers.filter(b => !b.resolvedAt);
  const blockedIds = new Set(openBlockers.map(b => b.taskId));
  const selectedTask = help?.taskId;
  const taskOptions = allTasks(project).filter(t => !t.done)
    .map(t => `<option value="${t.id}" ${t.id === selectedTask ? 'selected' : ''}>${esc(t.text)}</option>`).join('');
  const kindOptions = BLOCKER_KINDS.map(k => `<option ${k === help?.kind ? 'selected' : ''}>${esc(k)}</option>`).join('');

  const roadmap = project.roadmap.map(phase => `
    <div class="phase"><h4>${esc(phase.title)} <span class="text-muted text-xs">${phase.tasks.filter(t => t.done).length}/${phase.tasks.length}</span></h4>
    ${phase.tasks.map(task => taskRow(task, blockedIds)).join('')}</div>`).join('');

  const blockers = openBlockers.length ? openBlockers.map(b => `
    <div class="blocker"><div class="text-xs text-muted">${esc(b.kind)}</div><div>${esc(b.taskText)}</div>
    ${b.note ? `<p class="text-sm text-muted">${esc(b.note)}</p>` : ''}
    <button class="btn btn-ghost btn-sm mt-2" data-action="resolve-blocker" data-blocker-id="${b.id}">Mark resolved</button></div>`).join('')
    : emptyText('Nothing blocked right now.');

  return `
    <div class="page-head flex items-center justify-between">
      <div><h1>${esc(project.title)}</h1><p>${esc(project.summary)}</p></div>
      <button class="btn btn-ghost" data-action="abandon">Abandon build</button>
    </div>
    <div class="card mb-4"><div class="card-body">
      <p class="text-sm text-muted mb-4">${done} of ${total} tasks done (${percent}%)</p>${progressBar(percent)}</div></div>
    <div class="grid grid-2">
      <div class="card"><div class="card-head"><h3>Roadmap</h3></div><div class="card-body">${roadmap}</div></div>
      <div>
        <div class="card mb-4"><div class="card-head"><h3>Current blockers</h3></div><div class="card-body">${blockers}</div></div>
        <div class="card"><div class="card-head"><h3>I'm stuck</h3></div><div class="card-body">
          <p class="text-sm text-muted mb-4">A built-in guide that works from rules and your task details. It is not connected to an AI model.</p>
          <form id="assistantForm">
            <div class="form-group"><label class="form-label" for="stuckTask">Task</label><select class="form-select" id="stuckTask">${taskOptions}</select></div>
            <div class="form-group"><label class="form-label" for="stuckKind">What kind of stuck?</label><select class="form-select" id="stuckKind">${kindOptions}</select></div>
            <div class="form-group"><label class="form-label" for="stuckDetails">What is happening? (optional)</label>
              <textarea class="form-textarea" id="stuckDetails" rows="3" placeholder="Paste the error or describe what you tried">${esc(help?.details || '')}</textarea></div>
            <button class="btn btn-primary w-full" type="submit">Get guidance</button>
          </form></div></div>
        ${guidanceBlock(help)}
      </div>
    </div>`;
}

export function renderHistory({ data }) {
  const sorted = [...data.projects].sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));
  const head = `<div class="page-head"><h1>History</h1><p>Every project Stoke has recommended to you, and what happened next.</p></div>`;
  if (!sorted.length) return head + `<div class="empty-state"><h3>Nothing yet</h3><p>Projects appear here once the Machine recommends one.</p></div>`;
  return head + `<div class="grid grid-2">${sorted.map(p => {
    const dates = [['Recommended', p.recommendedAt], ['Started', p.startedAt], ['Ended', p.finishedAt]]
      .filter(([, date]) => date).map(([label, date]) => `${label} ${formatDate(date)}`).join(' · ');
    const progress = p.startedAt ? taskProgress(p) : null;
    return `<div class="card"><div class="card-body">
      <div class="flex items-center justify-between mb-4"><h3>${esc(p.title)}</h3>${statusBadge(p.status)}</div>
      <p class="text-sm text-muted mb-4">${esc(p.summary)}</p>${tags([p.type, ...p.tech])}
      <p class="text-xs text-muted mt-4">${dates}${progress ? ` · ${progress.done}/${progress.total} tasks` : ''}</p></div></div>`;
  }).join('')}</div>`;
}

export function renderIdeas({ data }) {
  const list = data.ideas.length ? data.ideas.map(idea => `
    <div class="task-row">
      <input type="checkbox" class="idea-select" id="idea-${idea.id}" data-idea-id="${idea.id}" />
      <label for="idea-${idea.id}">${esc(idea.text)}</label>
      <button class="btn btn-ghost btn-sm" data-action="build-idea" data-idea-id="${idea.id}">Build</button>
      <button class="btn btn-ghost btn-sm" data-action="delete-idea" data-idea-id="${idea.id}">Delete</button>
    </div>`).join('') : emptyText('No ideas saved yet.');
  return `
    <div class="page-head"><h1>Idea inbox</h1><p>Save ideas when they strike. Build one directly, or tick two and combine them.</p></div>
    <div class="card"><div class="card-body">
      <form id="ideaForm" class="flex gap-3 mb-4">
        <label class="visually-hidden" for="newIdea">New idea</label>
        <input class="form-input flex-1" id="newIdea" maxlength="120" placeholder="e.g. GitHub activity tracker" />
        <button class="btn btn-primary" type="submit">Save</button>
      </form>
      ${list}
      <button class="btn btn-ghost mt-4" data-action="combine-ideas">Combine ticked ideas</button>
    </div></div>`;
}

export function renderInsights({ data, machineProfile }) {
  const memory = analyseProjects(data.projects, machineProfile);
  const typeCounts = memory.completedTypes.map(([type, count]) => `${esc(type)} × ${count}`).join(', ');
  const tagsOrEmpty = (items, empty) => items.length ? tags(items) : emptyText(empty);
  return `
    <div class="page-head"><h1>Insights</h1><p>Counted from your own history, not predictions.</p></div>
    <div class="card mb-4"><div class="card-head"><h3>Memory</h3></div><div class="card-body">
      ${memory.notes.length ? bullets(memory.notes) : emptyText('Finish or abandon a project and patterns will show up here.')}</div></div>
    <div class="grid grid-2 mb-4">
      <div class="card"><div class="card-head"><h3>Used in finished projects</h3></div><div class="card-body">
        ${tagsOrEmpty(memory.strongSkills, 'Not enough finished projects yet.')}</div></div>
      <div class="card"><div class="card-head"><h3>Needs practice</h3></div><div class="card-body">
        ${tagsOrEmpty(memory.needPractice, 'Nothing listed that you have not used.')}</div></div>
    </div>
    <div class="card"><div class="card-head"><h3>Portfolio shape</h3></div><div class="card-body">
      ${memory.completed.length ? `<p>Finished so far: ${typeCounts}.</p>` : emptyText('Finish a few projects to see your portfolio shape.')}</div></div>`;
}

const PROFILE_LABELS = [['Experience', p => p.experience_level], ['Time', p => p.available_time], ['Challenge', p => p.challenge_level],
  ['Goals', p => (p.goals || []).join(', ')], ['Skills', p => (p.skills || []).join(', ')], ['Practising', p => (p.technologies || []).join(', ')]];

export function renderSettings({ name, email, profile, data }) {
  const memory = analyseProjects(data.projects, null);
  const portfolio = memory.completed.map(p => `• ${p.title} (${[p.type, ...p.tech].join(', ')}): ${p.summary}`).join('\n');
  return `
    <div class="page-head"><h1>Profile and settings</h1><p>Your account, build profile and portfolio.</p></div>
    <div class="card mb-4"><div class="card-head"><h3>Account</h3></div><div class="card-body">
      <form id="nameForm" class="flex gap-3 items-center">
        <label class="visually-hidden" for="displayName">Name</label>
        <input class="form-input flex-1" id="displayName" value="${esc(name)}" />
        <button class="btn btn-primary" type="submit">Save name</button>
      </form>
      <p class="text-sm text-muted mt-2">${esc(email)}</p></div></div>
    <div class="card mb-4"><div class="card-head"><h3>Build profile</h3><button class="btn btn-ghost btn-sm" id="editBuildProfileBtn">Edit</button></div><div class="card-body">
      ${profile ? `<div class="grid grid-2">${PROFILE_LABELS.map(([label, read]) =>
        `<div><div class="text-xs text-muted">${label}</div><div class="text-sm">${esc(read(profile)) || 'Not set'}</div></div>`).join('')}</div>` : emptyText('Not set up yet.')}</div></div>
    <div class="card mb-4"><div class="card-head"><h3>Portfolio</h3></div><div class="card-body">
      <p class="text-sm text-muted mb-4">Completed projects, ready to paste into a resume.</p>
      <pre class="code-box">${esc(portfolio || 'No completed builds yet.')}</pre></div></div>
    <div class="card"><div class="card-head"><h3>Your data</h3></div><div class="card-body">
      <p class="text-sm text-muted mb-4">Your account and build profile are stored in Supabase. Projects, ideas and history are stored in this browser only.</p>
      <button class="btn btn-ghost" data-action="reset-data">Delete my projects, ideas and history</button></div></div>`;
}
