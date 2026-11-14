// Rule-based help. Advice is picked from the kind of problem and a few keywords in the
// description. It does not read code and it is not an AI model.

export const BLOCKER_KINDS = [
  "Don't know where to start",
  "Bug or error",
  "UI decision",
  "Task feels too big",
  "Low motivation",
  "Tooling or setup"
];

const STEPS = {
  "Don't know where to start": task => [
    `Write one sentence describing what "${task}" should do when it's finished.`,
    "Do the smallest piece you can finish in 20 minutes, even if it's ugly.",
    "Hard-code the data first. Connect real input once the piece works."
  ],
  "Bug or error": () => [
    "Read the first line of the error and note the file and line number it points to.",
    "Log the values just before that line and compare them with what you expected.",
    "Cut the code down until the bug is the only thing left, then change one thing at a time."
  ],
  "UI decision": task => [
    `Write down the two options for "${task}" and one cost of each.`,
    "Pick the one that's easier to change later. You can swap it once the project works.",
    "Note the decision in your README so you don't reopen it."
  ],
  "Task feels too big": task => [
    `"${task}" is probably several tasks. Use the button below to break it into three.`,
    "Work on only the first piece until it runs.",
    "If a piece still feels vague, split it again."
  ],
  "Low motivation": () => [
    "Set a 15-minute timer and commit to only that.",
    "Pick the task with the quickest visible result and do it first.",
    "Stop when you reach a point you can resume from, and write down the next step."
  ],
  "Tooling or setup": () => [
    "Copy the exact error message into a search and check the tool's official docs first.",
    "Check versions: run the tool with --version and compare with what the guide assumes.",
    "Try a minimal setup in an empty folder. If that works, the problem is in your project config."
  ]
};

const KEYWORD_TIPS = [
  [/undefined|cannot read|null/i, "A value is missing at that point. Log it one step earlier to see where it stops being defined."],
  [/cors/i, "CORS errors are fixed on the server side by allowing your origin. Changing the front end won't solve it."],
  [/404|not found/i, "Check the exact path or URL, including capitalisation and any missing folder."],
  [/async|promise|await/i, "Check that every asynchronous call is awaited, and that the code using the result runs after it resolves."],
  [/import|module|require/i, "Check the file path and the export name match, and that the file type (module or script) is what the tool expects."],
  [/center|align|flex|grid|css/i, "Open the browser's element inspector and look at which rule is winning on the element that looks wrong."]
];

export function getGuidance({ task, kind, details }) {
  const steps = (STEPS[kind] || STEPS["Don't know where to start"])(task);
  const extraTips = KEYWORD_TIPS.filter(([pattern]) => pattern.test(details)).map(([, tip]) => tip);
  return { steps, extraTips, canSplit: kind === "Task feels too big" };
}

export function splitTask(task) {
  return [
    `Define the smallest version of: ${task}`,
    "Build that version with hard-coded data",
    "Replace the hard-coded parts and handle bad input"
  ];
}
