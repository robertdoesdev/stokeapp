import { makeId, sameText } from "./utils.js";
import { analyseProjects } from "./memory.js";

const LEVEL_BY_EXPERIENCE = { Beginner: 1, Intermediate: 2, Advanced: 3 };
const LEVEL_SHIFT = { Easy: -1, Normal: 0, Stretch: 1, Brutal: 2, "Surprise Me": 0 };

// Hand-written project blueprints. The Machine ranks these, it does not make up new ones.
const CATALOGUE = [
  { id: "reading-queue", title: "Reading Queue", summary: "Save articles and links, tag them, and track what you've actually read.", type: "Web app", level: 1, hours: 8,
    tech: ["JavaScript", "HTML", "CSS", "localStorage"], goals: ["Learning", "Fun", "Solve a problem"], keywords: ["reading", "articles", "links", "bookmarks"],
    tasks: ["Build the add-link form with validation", "Store links in localStorage and render the list", "Add tags and a read/unread filter", "Add search and an export button"] },
  { id: "habit-board", title: "Habit Streak Board", summary: "Track daily habits and show streaks over the last 30 days.", type: "Web app", level: 2, hours: 14,
    tech: ["JavaScript", "CSS", "Date handling"], goals: ["Portfolio", "Learning", "Solve a problem"], keywords: ["habits", "streaks", "calendar", "fitness", "routine"],
    tasks: ["Model habits and daily check-ins as data", "Build the habit list and check-in controls", "Calculate current and longest streaks", "Draw a 30-day grid with CSS"] },
  { id: "notes-cli", title: "Markdown Notes Search", summary: "A command-line tool that indexes a folder of markdown notes and searches them.", type: "CLI tool", level: 2, hours: 12,
    tech: ["Node.js", "File system", "CLI design"], goals: ["Learning", "Solve a problem", "Portfolio"], keywords: ["notes", "markdown", "search", "writing"],
    tasks: ["Parse command-line arguments and show help", "Read and index every .md file in a folder", "Rank search results by match count", "Add colour output and a --tag filter"] },
  { id: "expense-api", title: "Expense Splitter API", summary: "A REST API for groups to log shared expenses and see who owes whom.", type: "API / backend", level: 2, hours: 18,
    tech: ["Node.js", "Express", "SQL", "REST"], goals: ["Portfolio", "Learning", "Income"], keywords: ["money", "expenses", "groups", "finance", "travel"],
    tasks: ["Design the database tables", "Build create and list endpoints for groups and expenses", "Write the settle-up calculation with tests", "Add input validation and error responses"] },
  { id: "tab-saver", title: "Tab Session Saver", summary: "A browser extension that saves open tabs as named sessions and restores them later.", type: "Browser extension", level: 2, hours: 12,
    tech: ["JavaScript", "Browser APIs", "Manifest V3"], goals: ["Solve a problem", "Portfolio", "Fun"], keywords: ["tabs", "browser", "research", "sessions"],
    tasks: ["Create the manifest and popup shell", "Read the open tabs and save them as a session", "List saved sessions and restore one", "Add rename and delete for sessions"] },
  { id: "puzzle-game", title: "Browser Puzzle Game", summary: "A small canvas puzzle game with levels, a restart button and a move counter.", type: "Game", level: 2, hours: 20,
    tech: ["JavaScript", "Canvas", "Game loop"], goals: ["Fun", "Learning", "Portfolio"], keywords: ["game", "puzzle", "levels", "play"],
    tasks: ["Draw the grid and player on the canvas", "Handle keyboard input and movement rules", "Detect wins and load the next level", "Add a move counter and level select"] },
  { id: "csv-explorer", title: "CSV Explorer", summary: "Load a CSV of your own data, summarise it and chart the interesting columns.", type: "Data / ML", level: 2, hours: 16,
    tech: ["Python", "Pandas", "Data visualisation"], goals: ["Learning", "Portfolio", "Solve a problem"], keywords: ["data", "csv", "charts", "analysis", "spending", "stats"],
    tasks: ["Load and clean a real CSV", "Compute summary statistics per column", "Plot three charts that answer real questions", "Write up what the data shows"] },
  { id: "folder-tidy", title: "Folder Tidy Script", summary: "A script that sorts a messy downloads folder into dated, typed folders.", type: "Automation", level: 1, hours: 6,
    tech: ["Python", "File system", "Scheduling"], goals: ["Solve a problem", "Learning", "Fun"], keywords: ["files", "folders", "downloads", "organise", "cleanup"],
    tasks: ["List files and group them by extension", "Move files into typed folders safely", "Add a dry-run mode that only prints", "Schedule it to run daily"] },
  { id: "workout-log", title: "Workout Log App", summary: "A mobile app for logging sets and reps, with history and personal bests.", type: "Mobile app", level: 3, hours: 40,
    tech: ["React Native", "State management", "Local storage"], goals: ["Portfolio", "Income", "Learning"], keywords: ["workout", "gym", "fitness", "health", "mobile"],
    tasks: ["Set up navigation between logging and history", "Build the set and rep entry flow", "Persist workouts on the device", "Calculate and show personal bests"] },
  { id: "live-board", title: "Live Collaboration Board", summary: "A shared board where several people add and move sticky notes in real time.", type: "Web app", level: 3, hours: 45,
    tech: ["Node.js", "WebSockets", "JavaScript", "Databases"], goals: ["Portfolio", "Learning", "Income"], keywords: ["realtime", "collaboration", "teams", "board", "chat"],
    tasks: ["Create a WebSocket server and connect clients", "Render and drag notes on the board", "Broadcast changes to every connected client", "Persist boards and handle reconnects"] }
];

function buildRoadmap(buildTasks) {
  const phases = [
    ["Set up", ["Create the repository and project structure", "Sketch the data you need to store and the screens or commands involved"]],
    ["Build the core", buildTasks],
    ["Ship it", ["Test the awkward cases: empty, invalid and repeated input", "Write a README and publish or share the project"]]
  ];
  let nextId = 1;
  return phases.map(([title, tasks]) => ({ title, tasks: tasks.map(text => ({ id: nextId++, text, done: false })) }));
}

function scoreTemplate(template, profile, memory, projects) {
  const searchable = [template.title, template.summary, ...template.keywords, ...template.tech].join(" ").toLowerCase();
  if (profile.avoid.some(item => searchable.includes(item.toLowerCase()))) return null;

  let score = 0;
  const reasons = [];

  if (profile.types.includes(template.type)) {
    score += 4;
    reasons.push(`It's a ${template.type.toLowerCase()}, which you asked for.`);
  } else if (!profile.types.includes("No preference")) {
    score -= 4;
  }

  const targetLevel = Math.min(3, Math.max(1, LEVEL_BY_EXPERIENCE[profile.experience] + LEVEL_SHIFT[profile.challenge]));
  const levelGap = Math.abs(template.level - targetLevel);
  score -= levelGap * 2;
  if (levelGap === 0) reasons.push(`The difficulty suits a ${profile.experience.toLowerCase()} developer on ${profile.challenge} mode.`);
  if (profile.challenge === "Surprise Me") score += Math.random() * 3;

  if (template.hours <= profile.hoursAvailable) {
    score += 1;
    reasons.push(`Around ${template.hours} hours of work fits the time you have.`);
  } else {
    score -= 4;
  }

  const sharedGoals = template.goals.filter(goal => profile.goals.includes(goal));
  score += sharedGoals.length;
  if (sharedGoals.length) reasons.push(`It supports your goal: ${sharedGoals.join(", ").toLowerCase()}.`);

  const practiceHits = template.tech.filter(tech => profile.practice.some(p => sameText(p, tech)));
  if (practiceHits.length) {
    score += 3;
    reasons.push(`It gives you practice with ${practiceHits.join(", ")}.`);
  }

  const skillHits = template.tech.filter(tech => profile.skills.some(s => sameText(s, tech)));
  score += Math.min(skillHits.length, 2);
  if (skillHits.length) reasons.push(`It builds on skills you already have: ${skillHits.join(", ")}.`);

  const interestWords = profile.interests.toLowerCase().split(/\W+/).filter(word => word.length > 3);
  const interestHit = interestWords.find(word => searchable.includes(word));
  if (interestHit) {
    score += 2;
    reasons.push(`It relates to your interest in "${interestHit}".`);
  }

  const untriedHits = template.tech.filter(tech => memory.needPractice.some(s => sameText(s, tech)));
  if (untriedHits.length) {
    score += 2;
    reasons.push(`It uses ${untriedHits.join(", ")}, which you haven't used in a project yet.`);
  }
  if (memory.abandonedTypes.includes(template.type)) score -= 1;

  const seenBefore = projects.filter(p => p.templateId === template.id);
  if (seenBefore.some(p => ["active", "completed", "abandoned"].includes(p.status))) score -= 6;
  else if (seenBefore.length) score -= 4;

  return { template, score, reasons };
}

function newProject(fields) {
  return {
    id: makeId(),
    templateId: null,
    source: "machine",
    level: null,
    hours: null,
    tech: [],
    reasons: [],
    blockers: [],
    status: "recommended",
    recommendedAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    ...fields
  };
}

// Returns a project with status "recommended", or null if every project was ruled out.
export function recommendProject(profile, projects) {
  const memory = analyseProjects(projects, profile);
  const ranked = CATALOGUE
    .map(template => scoreTemplate(template, profile, memory, projects))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return null;

  const { template, reasons } = ranked[0];
  return newProject({
    templateId: template.id,
    title: template.title,
    summary: template.summary,
    type: template.type,
    level: template.level,
    hours: template.hours,
    tech: template.tech,
    reasons,
    roadmap: buildRoadmap(template.tasks)
  });
}

export function projectFromIdea(ideaText) {
  const now = new Date().toISOString();
  return newProject({
    source: "idea",
    title: ideaText,
    summary: "Your own idea, from the idea inbox.",
    type: "Your idea",
    reasons: ["You wrote this idea down yourself."],
    roadmap: buildRoadmap([
      `Write one sentence on what "${ideaText}" does and who it's for`,
      "List the three features it can't work without and cut the rest",
      "Build the first feature end to end with hard-coded data",
      "Add the remaining must-have features"
    ]),
    status: "active",
    startedAt: now
  });
}
export const PROJECT_TYPES = [...new Set(CATALOGUE.map(item => item.type))];
