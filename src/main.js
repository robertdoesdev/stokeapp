import './style.css';
import { supabase } from './supabase.js';
import { icons } from './icons.js';
import { esc, splitList, makeId } from './lib/utils.js';
import { recommendProject, projectFromIdea } from './lib/machine.js';
import { getGuidance, splitTask } from './lib/assistant.js';
import {
  emptyProfile, fetchProfile, saveProfile, toMachineProfile, slug, loadUserData, saveUserData,
  newIdea, findActive, findPending, allTasks
} from './store.js';
import { renderLanding, renderLogin, renderSignup } from './pages/public.js';
import { renderOnboarding } from './pages/onboarding.js';
import { renderDashboard, renderRecommendation, renderWorkspace, renderHistory, renderIdeas, renderInsights, renderSettings } from './pages/app.js';

const FULL_PAGE_ROUTES = ['landing', 'login', 'signup', 'onboarding'];
const PAGES = {
  dashboard: { title: 'Dashboard', sub: 'Your next build starts here.', icon: 'dashboard', render: renderDashboard },
  recommendation: { title: 'Recommendation', sub: 'What the Machine picked for you.', render: renderRecommendation },
  workspace: { title: 'Workspace', sub: 'Roadmap, tasks and blockers.', icon: 'tasks', render: renderWorkspace },
  history: { title: 'History', sub: 'Everything you have been recommended and built.', icon: 'layers', render: renderHistory },
  ideas: { title: 'Ideas', sub: 'Save ideas for later.', icon: 'inbox', render: renderIdeas },
  insights: { title: 'Insights', sub: 'Patterns in how you build.', icon: 'barChart', render: renderInsights },
  settings: { title: 'Settings', sub: 'Account, profile and portfolio.', icon: 'settings', render: renderSettings }
};

const ui = {
  route: 'landing', session: null, profile: null, data: null,
  onboardingStep: 1, draft: emptyProfile(), help: null
};

const userId = () => ui.session.user.id;
const userName = () => ui.session.user.user_metadata?.full_name || ui.session.user.email.split('@')[0];

// rendering

function toast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `${type === 'error' ? icons.alert : icons.check}<span></span>`;
  el.querySelector('span').textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.25s ease forwards';
    setTimeout(() => el.remove(), 250);
  }, 3500);
}

function navigate(route) {
  if (!ui.session && !['landing', 'login', 'signup'].includes(route)) route = 'landing';
  ui.route = route;
  render();
  window.scrollTo(0, 0);
}

function commit() {
  if (!saveUserData(userId(), ui.data)) toast('Could not save. Browser storage may be full or disabled.', 'error');
  render();
}

function renderSidebar() {
  const items = Object.entries(PAGES).filter(([, page]) => page.icon);
  const nav = items.map(([name, page]) => `
    <button class="nav-item ${ui.route === name ? 'active' : ''}" data-route="${name}">${icons[page.icon]}<span>${page.title}</span></button>`).join('');
  const initials = esc(userName().split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase());
  return `
    <div class="sidebar-header"><div class="logo-mark">S</div><div class="logo-text">Stoke</div></div>
    <nav class="sidebar-nav" aria-label="Main">${nav}</nav>
    <div class="sidebar-footer"><div class="user-card">
      <div class="avatar">${initials}</div>
      <div class="user-info"><div class="user-name">${esc(userName())}</div><div class="user-email">${esc(ui.session.user.email)}</div></div>
      <button class="icon-btn" id="logoutBtn" title="Log out" aria-label="Log out">${icons.logOut}</button>
    </div></div>`;
}

function renderShell() {
  const page = PAGES[ui.route] || PAGES.dashboard;
  const context = {
    name: userName(), email: ui.session.user.email, data: ui.data, profile: ui.profile, help: ui.help,
    machineProfile: ui.profile ? toMachineProfile(ui.profile) : null
  };
  return `
    <aside class="sidebar" id="sidebar">${renderSidebar()}</aside>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <div class="main-content">
      <header class="topbar">
        <button class="icon-btn mobile-menu-btn" id="menuBtn" aria-label="Open menu">${icons.menu}</button>
        <div><div class="topbar-title">${page.title}</div><div class="topbar-sub">${page.sub}</div></div>
      </header>
      <main class="page-content fade-in">${page.render(context)}</main>
    </div>`;
}

function render() {
  const app = document.getElementById('app');
  const pages = { landing: renderLanding, login: renderLogin, signup: renderSignup };
  if (ui.route === 'onboarding') app.innerHTML = renderOnboarding(ui.onboardingStep, ui.draft);
  else if (pages[ui.route]) app.innerHTML = pages[ui.route]();
  else app.innerHTML = renderShell();

  const nav = document.getElementById('landingNav');
  if (nav) window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 20), { passive: true });
}

// accounts and profile

function showAuthError(id, message) {
  const box = document.getElementById(id);
  box.textContent = message;
  box.classList.add('visible');
}

async function startSession(session) {
  ui.session = session;
  ui.data = loadUserData(session.user.id);
  try {
    ui.profile = await fetchProfile(session.user.id);
  } catch {
    ui.profile = null;
    toast('Could not load your build profile.', 'error');
  }
  ui.draft = ui.profile ? { ...emptyProfile(), ...ui.profile } : emptyProfile();
  ui.onboardingStep = 1;
  navigate(ui.profile ? 'dashboard' : 'onboarding');
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email.includes('@') || !password) return showAuthError('loginError', 'Enter your email and password.');
  const button = document.getElementById('loginSubmitBtn');
  button.disabled = true;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    button.disabled = false;
    return showAuthError('loginError', error.message);
  }
  await startSession(data.session);
}

async function handleSignup(event) {
  event.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  if (!name || !email.includes('@')) return showAuthError('signupError', 'Enter your name and a valid email.');
  if (password.length < 8) return showAuthError('signupError', 'Password must be at least 8 characters.');
  const button = document.getElementById('signupSubmitBtn');
  button.disabled = true;
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if (error) {
    button.disabled = false;
    return showAuthError('signupError', error.message);
  }
  if (!data.session) {
    button.disabled = false;
    return showAuthError('signupError', 'Check your email to confirm your account, then log in.');
  }
  await startSession(data.session);
}

function captureOnboardingStep() {
  const value = id => document.getElementById(id)?.value || '';
  if (ui.onboardingStep === 1) {
    ui.draft.skills = splitList(value('profileSkills'));
    ui.draft.experience_level = value('profileExperience') || 'beginner';
  }
  if (ui.onboardingStep === 2) ui.draft.technologies = splitList(value('profileTechnologies'));
  if (ui.onboardingStep === 3) {
    ui.draft.avoid_topics = splitList(value('profileAvoid'));
    ui.draft.interests = splitList(value('profileInterests'));
  }
}

async function handleOnboardingNext() {
  captureOnboardingStep();
  if (ui.onboardingStep === 1 && !ui.draft.skills.length) return toast('Add at least one skill or technology.', 'error');
  if (ui.onboardingStep === 2 && !ui.draft.preferred_project_types.length) return toast('Choose at least one project type.', 'error');
  if (ui.onboardingStep < 3) {
    ui.onboardingStep += 1;
    return render();
  }
  const button = document.getElementById('onboardingNext');
  button.disabled = true;
  try {
    ui.profile = await saveProfile(userId(), ui.draft);
    toast('Build profile saved.');
    navigate('dashboard');
  } catch (error) {
    button.disabled = false;
    toast(error.message || 'Could not save your build profile.', 'error');
  }
}

function handleProfileChoice(button) {
  captureOnboardingStep();
  const field = button.dataset.profileChoice;
  const value = button.dataset.value;
  if (field === 'available_time') ui.draft[field] = value;
  else if (field === 'challenge_level') ui.draft[field] = slug(value);
  else {
    const current = ui.draft[field] || [];
    ui.draft[field] = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
  }
  render();
}

// the Machine

function requestRecommendation() {
  if (!ui.profile) return navigate('onboarding');
  const pending = findPending(ui.data);
  if (pending) pending.status = 'passed';
  const project = recommendProject(toMachineProfile(ui.profile), ui.data.projects);
  if (!project) {
    commit();
    return toast('Your avoid list ruled out every project. Remove some entries in your build profile.', 'error');
  }
  ui.data.projects.push(project);
  commit();
  navigate('recommendation');
}

function requireNoActiveBuild() {
  if (!findActive(ui.data)) return true;
  toast('Finish or abandon your current build first.', 'error');
  navigate('workspace');
  return false;
}

// workspace

function resolveBlockersFor(project, taskId) {
  const now = new Date().toISOString();
  project.blockers.filter(b => b.taskId === taskId && !b.resolvedAt).forEach(b => { b.resolvedAt = now; });
}

function setTaskDone(taskId, done) {
  const project = findActive(ui.data);
  const task = project && allTasks(project).find(t => t.id === taskId);
  if (!task) return;
  task.done = done;
  if (done) resolveBlockersFor(project, taskId);
  if (allTasks(project).every(t => t.done)) {
    project.status = 'completed';
    project.finishedAt = new Date().toISOString();
    ui.help = null;
    commit();
    toast(`"${project.title}" is complete. It is now in your history.`);
    return navigate('history');
  }
  commit();
}

function handleAssistantSubmit(event) {
  event.preventDefault();
  const project = findActive(ui.data);
  const task = project && allTasks(project).find(t => t.id === Number(document.getElementById('stuckTask').value));
  if (!task) return toast('Pick a task first.', 'error');
  const kind = document.getElementById('stuckKind').value;
  const details = document.getElementById('stuckDetails').value.trim();
  ui.help = { taskId: task.id, taskText: task.text, kind, details, guidance: getGuidance({ task: task.text, kind, details }) };
  render();
}

function logBlocker() {
  const project = findActive(ui.data);
  if (!project || !ui.help) return;
  const { taskId, taskText, kind, details } = ui.help;
  const existing = project.blockers.find(b => b.taskId === taskId && !b.resolvedAt);
  if (existing) Object.assign(existing, { kind, note: details });
  else project.blockers.push({ id: makeId(), taskId, taskText, kind, note: details, loggedAt: new Date().toISOString(), resolvedAt: null });
  commit();
  toast('Blocker logged.');
}

function splitTaskIntoSteps(taskId) {
  const project = findActive(ui.data);
  const phase = project?.roadmap.find(p => p.tasks.some(t => t.id === taskId));
  if (!phase) return;
  const index = phase.tasks.findIndex(t => t.id === taskId);
  let nextId = Math.max(...allTasks(project).map(t => t.id)) + 1;
  const steps = splitTask(phase.tasks[index].text).map(text => ({ id: nextId++, text, done: false }));
  phase.tasks.splice(index, 1, ...steps);
  resolveBlockersFor(project, taskId);
  ui.help = null;
  commit();
  toast('Task replaced with three smaller steps.');
}

// click actions

const actions = {
  'next-build': () => { if (requireNoActiveBuild()) requestRecommendation(); },
  'another-recommendation': requestRecommendation,
  'start-recommended'() {
    const project = findPending(ui.data);
    if (!project || !requireNoActiveBuild()) return;
    project.status = 'active';
    project.startedAt = new Date().toISOString();
    commit();
    navigate('workspace');
  },
  abandon() {
    const project = findActive(ui.data);
    if (!project || !window.confirm(`Abandon "${project.title}"? It stays in your history as abandoned.`)) return;
    project.status = 'abandoned';
    project.finishedAt = new Date().toISOString();
    ui.help = null;
    commit();
    navigate('history');
  },
  'stuck-on-task'(el) {
    ui.help = { ...ui.help, taskId: Number(el.dataset.taskId), guidance: null };
    render();
    document.getElementById('stuckKind')?.focus();
  },
  'log-blocker': logBlocker,
  'split-task': el => splitTaskIntoSteps(Number(el.dataset.taskId)),
  'resolve-blocker'(el) {
    const blocker = findActive(ui.data)?.blockers.find(b => b.id === el.dataset.blockerId);
    if (blocker) blocker.resolvedAt = new Date().toISOString();
    commit();
  },
  'delete-idea'(el) {
    ui.data.ideas = ui.data.ideas.filter(idea => String(idea.id) !== el.dataset.ideaId);
    commit();
  },
  'build-idea'(el) {
    const idea = ui.data.ideas.find(i => String(i.id) === el.dataset.ideaId);
    if (!idea || !requireNoActiveBuild()) return;
    ui.data.projects.push(projectFromIdea(idea.text));
    commit();
    navigate('workspace');
  },
  'combine-ideas'() {
    const ids = [...document.querySelectorAll('.idea-select:checked')].map(box => box.dataset.ideaId);
    if (ids.length !== 2) return toast('Tick exactly two ideas to combine.', 'error');
    const [first, second] = ids.map(id => ui.data.ideas.find(i => String(i.id) === id).text);
    ui.data.ideas.unshift(newIdea(`${first} + ${second}`));
    commit();
  },
  'reset-data'() {
    if (!window.confirm('Delete all your projects, ideas and history from this browser? This cannot be undone.')) return;
    ui.data = { projects: [], ideas: [] };
    ui.help = null;
    commit();
    toast('Projects, ideas and history deleted.');
  }
};

async function logout() {
  await supabase.auth.signOut();
}

function handleClick(event) {
  const chip = event.target.closest('[data-profile-choice]');
  if (chip) return handleProfileChoice(chip);

  const toggle = event.target.closest('[data-pw-toggle]');
  if (toggle) {
    const input = document.getElementById(toggle.dataset.pwToggle);
    input.type = input.type === 'password' ? 'text' : 'password';
    return;
  }

  const button = event.target.closest('button, [data-route]');
  if (!button) return;
  if (button.id === 'logoutBtn') return logout();
  if (button.id === 'menuBtn' || button.id === 'sidebarOverlay') return toggleSidebar();
  if (button.id === 'onboardingNext') return handleOnboardingNext();
  if (button.id === 'onboardingBack') {
    captureOnboardingStep();
    ui.onboardingStep -= 1;
    return render();
  }
  if (button.id === 'editBuildProfileBtn') {
    ui.draft = ui.profile ? { ...emptyProfile(), ...ui.profile } : emptyProfile();
    ui.onboardingStep = 1;
    return navigate('onboarding');
  }
  if (button.dataset.route) return navigate(button.dataset.route);
  if (actions[button.dataset.action]) actions[button.dataset.action](button);
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('visible');
}

async function handleSubmit(event) {
  const handlers = {
    loginForm: handleLogin,
    signupForm: handleSignup,
    assistantForm: handleAssistantSubmit,
    ideaForm() {
      const text = document.getElementById('newIdea').value.trim();
      if (!text) return;
      ui.data.ideas.unshift(newIdea(text));
      commit();
    },
    async nameForm() {
      const name = document.getElementById('displayName').value.trim();
      if (!name) return toast('Name cannot be empty.', 'error');
      const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (error) return toast(error.message, 'error');
      ui.session.user.user_metadata = { ...ui.session.user.user_metadata, full_name: name };
      render();
      toast('Name updated.');
    }
  };
  const handler = handlers[event.target.id];
  if (handler) {
    event.preventDefault();
    await handler(event);
  }
}

// start up

document.addEventListener('click', handleClick);
document.addEventListener('submit', handleSubmit);
document.addEventListener('change', event => {
  if (event.target.matches('input[type=checkbox][data-task-id]')) setTaskDone(Number(event.target.dataset.taskId), event.target.checked);
});

supabase.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') {
    ui.session = ui.profile = ui.data = ui.help = null;
    navigate('landing');
  }
});

async function boot() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) await startSession(session);
  else render();
}

boot();
