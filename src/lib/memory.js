import { countBy, sameText } from "./utils.js";

const STARTED = ["active", "completed", "abandoned"];

// Plain counts over the project records. Nothing is guessed.
export function analyseProjects(projects, profile) {
  const started = projects.filter(p => STARTED.includes(p.status));
  const completed = started.filter(p => p.status === "completed");
  const abandoned = started.filter(p => p.status === "abandoned");

  const strongSkills = countBy(completed.flatMap(p => p.tech)).map(([skill]) => skill);

  const usedSkills = started.flatMap(p => p.tech);
  const declared = [...(profile?.skills || []), ...(profile?.practice || [])];
  const needPractice = declared.filter(skill => !usedSkills.some(used => sameText(used, skill)));

  const typeOf = list => list.map(p => p.type);
  const completedTypes = countBy(typeOf(completed));
  const abandonedTypes = countBy(typeOf(abandoned))
    .filter(([type, count]) => count > completed.filter(p => p.type === type).length)
    .map(([type]) => type);

  const blockerKinds = countBy(projects.flatMap(p => p.blockers || []).map(b => b.kind));
  const topBlocker = blockerKinds.length ? blockerKinds[0][0] : null;

  const notes = [];
  if (started.length) {
    notes.push(`You've finished ${completed.length} of the ${started.length} project${started.length === 1 ? "" : "s"} you started.`);
  }
  if (abandonedTypes.length) {
    notes.push(`You abandon ${abandonedTypes.join(" and ").toLowerCase()} projects more often than you finish them. A smaller scope might help there.`);
  }
  if (topBlocker) notes.push(`Your most common blocker is: ${topBlocker.toLowerCase()}.`);
  if (started.length && needPractice.length) {
    notes.push(`You listed ${needPractice.slice(0, 3).join(", ")} but haven't used ${needPractice.length === 1 ? "it" : "them"} in a project yet.`);
  }

  return { started, completed, abandoned, strongSkills, needPractice, completedTypes, abandonedTypes, blockerKinds, topBlocker, notes };
}
