import { icons } from '../icons.js';

const featureCard = (color, icon, title, text) => `
  <div class="feature-card">
    <div class="feature-card-icon ${color}">${icons[icon]}</div>
    <h3>${title}</h3>
    <p>${text}</p>
  </div>`;

export function renderLanding() {
  return `
    <div class="landing-page">
      <nav class="landing-nav" id="landingNav">
        <div class="landing-nav-brand"><div class="logo-mark">S</div><div class="logo-text">Stoke</div></div>
        <div class="landing-nav-links">
          <a href="#features">What it does</a>
          <a href="#how-it-works">How it works</a>
        </div>
        <div class="landing-nav-actions">
          <button class="btn btn-ghost btn-sm" data-route="login">Log in</button>
          <button class="btn btn-primary btn-sm" data-route="signup">Get started</button>
        </div>
      </nav>

      <section class="landing-hero">
        <h1>Stop wondering what to build. <span class="accent">Start building it.</span></h1>
        <p>Stoke learns your skills, time and goals, recommends one project that fits, and gives you a roadmap, a place to track it and help when you get stuck.</p>
        <div class="landing-hero-cta">
          <button class="btn btn-primary btn-lg" data-route="signup">${icons.rocket} Create an account</button>
          <button class="btn btn-ghost btn-lg" data-route="login">Log in</button>
        </div>
      </section>

      <section class="landing-section" id="features">
        <div class="landing-section-head">
          <div class="eyebrow">What it does</div>
          <h2>Built for developers who get stuck choosing</h2>
          <p>Most people can learn a framework. Picking a project worth finishing is the harder part.</p>
        </div>
        <div class="feature-grid">
          ${featureCard('orange', 'compass', 'The Machine', 'Recommends one project based on your skills, experience, available time, goals, interests and the things you want to avoid.')}
          ${featureCard('blue', 'tasks', 'Workspace', 'A phased roadmap, task tracking, progress, blockers, and a built-in guide for when you get stuck.')}
          ${featureCard('green', 'barChart', 'Memory', 'Counts what you have built, finished and abandoned, so later recommendations account for your history.')}
          ${featureCard('purple', 'layers', 'History', 'Every project you were recommended, started, completed, abandoned or passed on.')}
          ${featureCard('orange', 'inbox', 'Idea inbox', 'Save your own ideas, build one directly, or combine two into something new.')}
          ${featureCard('blue', 'target', 'Insights', 'See your strongest skills, the ones you have not used yet, and the blockers you hit most often.')}
        </div>
      </section>

      <section class="landing-section" id="how-it-works">
        <div class="landing-section-head">
          <div class="eyebrow">How it works</div>
          <h2>Three steps</h2>
        </div>
        <div class="feature-grid">
          ${featureCard('orange', 'edit', '1. Tell Stoke about you', 'A short profile: what you can build with, how long you have, what you want from the project.')}
          ${featureCard('blue', 'rocket', '2. Get a recommendation', 'You get one project and the reasons it fits. Start it or ask for another.')}
          ${featureCard('green', 'checkCircle', '3. Build and track it', 'Work through the roadmap. Log blockers, ask the guide for help, and finish.')}
        </div>
      </section>

      <section class="landing-cta">
        <div class="landing-cta-inner">
          <h2>Ready for your next build?</h2>
          <div class="landing-hero-cta">
            <button class="btn btn-primary btn-lg" data-route="signup">${icons.arrowRight} Get started</button>
            <button class="btn btn-ghost btn-lg" data-route="login">I have an account</button>
          </div>
        </div>
      </section>

      <footer class="landing-footer">
        <div class="landing-footer-inner">
          <div class="landing-footer-brand"><div class="logo-mark">S</div><div class="logo-text">Stoke</div></div>
          <div class="landing-footer-links">
            <a href="#features">What it does</a>
            <a href="#how-it-works">How it works</a>
            <a data-route="login">Log in</a>
          </div>
        </div>
      </footer>
    </div>`;
}

function passwordField(id, placeholder) {
  return `<div class="pw-input-wrap">
    <input class="form-input" type="password" id="${id}" placeholder="${placeholder}" />
    <button type="button" class="pw-toggle" aria-label="Show or hide password" data-pw-toggle="${id}">${icons.eye}</button>
  </div>`;
}

const authBrand = `<div class="auth-logo"><div class="logo-mark">S</div><div class="logo-text">Stoke</div></div>`;

export function renderLogin() {
  return `
    <div class="auth-page"><div class="auth-card">
      ${authBrand}
      <h2>Welcome back</h2>
      <p class="auth-sub">Log in to continue building.</p>
      <div class="auth-error" id="loginError" role="alert"></div>
      <form id="loginForm" novalidate>
        <div class="form-group"><label class="form-label" for="loginEmail">Email</label>
          <input class="form-input" type="email" id="loginEmail" autocomplete="email" placeholder="you@example.com" /></div>
        <div class="form-group"><label class="form-label" for="loginPassword">Password</label>
          ${passwordField('loginPassword', 'Your password')}</div>
        <button class="btn btn-primary w-full" id="loginSubmitBtn" type="submit">Log in</button>
      </form>
      <div class="auth-foot">Don't have an account? <a data-route="signup">Sign up</a></div>
    </div></div>`;
}

export function renderSignup() {
  return `
    <div class="auth-page"><div class="auth-card">
      ${authBrand}
      <h2>Create your account</h2>
      <p class="auth-sub">Then tell Stoke what you want to build.</p>
      <div class="auth-error" id="signupError" role="alert"></div>
      <form id="signupForm" novalidate>
        <div class="form-group"><label class="form-label" for="signupName">Name</label>
          <input class="form-input" type="text" id="signupName" autocomplete="name" /></div>
        <div class="form-group"><label class="form-label" for="signupEmail">Email</label>
          <input class="form-input" type="email" id="signupEmail" autocomplete="email" placeholder="you@example.com" /></div>
        <div class="form-group"><label class="form-label" for="signupPassword">Password</label>
          ${passwordField('signupPassword', 'At least 8 characters')}</div>
        <button class="btn btn-primary w-full" id="signupSubmitBtn" type="submit">Create account</button>
      </form>
      <div class="auth-foot">Already have an account? <a data-route="login">Log in</a></div>
    </div></div>`;
}
