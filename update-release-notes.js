const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RELEASE_NOTES_PATH = path.resolve(__dirname, "./release-notes.json");
const PACKAGE_JSON_PATH = path.resolve(__dirname, "./package.json");

const COMMIT_LIMIT = 30;
const DAYS_THRESHOLD = 7;
const VERSION_BUMP_RULES = {
  feat: "minor",
  feature: "minor",
  fix: "patch",
  bugfix: "patch",
  hotfix: "patch",
  patch: "patch",
  style: "patch",
  refactor: "patch",
  perf: "patch",
  performance: "patch",
  chore: "patch",
  docs: "patch",
  documentation: "patch",
  test: "patch",
  testing: "patch",
  BREAKING: "major",
  "BREAKING CHANGE": "major",
  other: "patch",
};

function shouldFilterCommit(message) {
  const lowerMessage = message.toLowerCase();
  return (
    lowerMessage.includes("merge") ||
    lowerMessage.includes("rebase") ||
    lowerMessage.includes("release note") ||
    lowerMessage.includes("release-note") ||
    lowerMessage.includes("releasenote") ||
    lowerMessage.startsWith("merge ") ||
    lowerMessage.startsWith("rebase ") ||
    lowerMessage.includes("merge branch") ||
    lowerMessage.includes("rebase branch") ||
    lowerMessage.includes("pull request") ||
    lowerMessage.includes("pr #") ||
    lowerMessage.includes("merge pull request")
  );
}

function detectCommitType(message) {
  const lowerMessage = message.toLowerCase();

  const conventionalMatch = lowerMessage.match(
    /^(feat|fix|style|refactor|perf|chore|docs|test|BREAKING CHANGE)(!?):/
  );
  if (conventionalMatch) {
    return conventionalMatch[1].toLowerCase();
  }

  if (
    lowerMessage.startsWith("feat") ||
    lowerMessage.startsWith("feature") ||
    lowerMessage.startsWith("add") ||
    lowerMessage.startsWith("implement")
  ) {
    return "feat";
  }
  if (
    lowerMessage.startsWith("fix") ||
    lowerMessage.startsWith("bugfix") ||
    lowerMessage.startsWith("bug") ||
    lowerMessage.startsWith("hotfix")
  ) {
    return "fix";
  }
  if (
    lowerMessage.startsWith("chore") ||
    lowerMessage.startsWith("maintenance") ||
    lowerMessage.startsWith("cleanup")
  ) {
    return "chore";
  }
  if (
    lowerMessage.startsWith("style") ||
    lowerMessage.startsWith("format") ||
    lowerMessage.startsWith("css") ||
    lowerMessage.startsWith("ui")
  ) {
    return "style";
  }
  if (
    lowerMessage.startsWith("refactor") ||
    lowerMessage.startsWith("restructure")
  ) {
    return "refactor";
  }
  if (
    lowerMessage.startsWith("perf") ||
    lowerMessage.startsWith("performance") ||
    lowerMessage.startsWith("optimize")
  ) {
    return "perf";
  }
  if (
    lowerMessage.startsWith("test") ||
    lowerMessage.startsWith("testing") ||
    lowerMessage.startsWith("spec")
  ) {
    return "test";
  }
  if (
    lowerMessage.startsWith("docs") ||
    lowerMessage.startsWith("documentation") ||
    lowerMessage.startsWith("doc")
  ) {
    return "docs";
  }
  if (
    lowerMessage.includes("breaking change") ||
    lowerMessage.includes("breaking!")
  ) {
    return "BREAKING";
  }

  return "other";
}

function bumpVersion(version, bumpType = "patch") {
  let [major, minor, patch] = version.split(".").map(Number);

  if (bumpType === "major") {
    major++;
    minor = 0;
    patch = 0;
  } else if (bumpType === "minor") {
    minor++;
    patch = 0;
  } else {
    patch++;
  }

  return `${major}.${minor}.${patch}`;
}

function commitExists(commitMessage, releaseNotes) {
  return releaseNotes.some((note) =>
    note.changes.some(
      (change) =>
        change.toLowerCase().includes(commitMessage.toLowerCase()) ||
        commitMessage.toLowerCase().includes(change.toLowerCase())
    )
  );
}

function shouldBumpMinorVersion(releaseNotes) {
  const lastMinorVersion = releaseNotes.find((note) => {
    const versionParts = note.version.split(".");
    return versionParts[1] !== "0" || versionParts[2] !== "0";
  });

  if (lastMinorVersion) {
    const lastMinorDate = new Date(lastMinorVersion.date);
    const today = new Date();
    const daysDiff = Math.floor(
      (today - lastMinorDate) / (1000 * 60 * 60 * 24)
    );

    console.log(
      `➕ Days since last minor version: ${daysDiff} (threshold: ${DAYS_THRESHOLD})`
    );

    if (daysDiff >= DAYS_THRESHOLD) {
      console.log(
        `✅ Days threshold reached (${daysDiff} >= ${DAYS_THRESHOLD})`
      );
      return true;
    }
  } else {
    console.log("➕ No previous minor version found, allowing minor bump");
    return true;
  }

  console.log("⚠️ Minor version bump conditions not met, using patch bump");
  return false;
}

function main() {
  console.log("➕ Starting release notes update process...");
  console.log(`➕ Fetching last ${COMMIT_LIMIT} commits...`);
  const commitsRaw = execSync(
    `git log -${COMMIT_LIMIT} --pretty=format:"%h|%an|%ae|%ad|%s" --date=iso`,
    { encoding: "utf8" }
  );

  const commits = commitsRaw
    .trim()
    .split("\n")
    .map((line) => {
      const [hash, author, email, date, ...messageParts] = line.split("|");
      return {
        hash: hash.trim(),
        author: author.trim(),
        email: email.trim(),
        date: date.trim(),
        message: messageParts.join("|").trim(),
      };
    })
    .filter((commit) => !shouldFilterCommit(commit.message));

  console.log(
    `➕ Found ${commits.length} valid commits (filtered out merge/rebase commits)`
  );

  if (commits.length === 0) {
    console.log("⚠️ No valid commits found to process.");
    return;
  }

  let releaseNotes = [];
  try {
    const existingData = fs.readFileSync(RELEASE_NOTES_PATH, "utf8");
    releaseNotes = JSON.parse(existingData);
    console.log(`➕ Loaded ${releaseNotes.length} existing release notes`);
  } catch (err) {
    console.log("⚠️ No existing release-notes.json found. Starting fresh.");
  }

  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
  const currentVersion = packageJson.version || "0.0.0";
  console.log(`➕ Current package version: ${currentVersion}`);

  const newCommits = commits.filter(
    (commit) => !commitExists(commit.message, releaseNotes)
  );
  console.log(`➕ Found ${newCommits.length} new commits to process`);

  if (newCommits.length === 0) {
    console.log("✅ No new commits to add to release notes.");
    return;
  }

  const commitsByAuthor = newCommits.reduce((acc, commit) => {
    if (!acc[commit.author]) {
      acc[commit.author] = [];
    }
    acc[commit.author].push(commit);
    return acc;
  }, {});

  console.log(
    `➕ Commits grouped by ${Object.keys(commitsByAuthor).length} authors`
  );

  let newVersion = currentVersion;
  const today = new Date().toISOString();
  let hasChanges = false;
  for (const [author, authorCommits] of Object.entries(commitsByAuthor)) {
    console.log(
      `\n➕ Processing ${authorCommits.length} commits for ${author}`
    );

    const commitTypes = authorCommits.map((commit) =>
      detectCommitType(commit.message)
    );
    const highestPriorityType = commitTypes.reduce((highest, current) => {
      const currentPriority = VERSION_BUMP_RULES[current] || "patch";
      const highestPriority = VERSION_BUMP_RULES[highest] || "patch";

      const priorityOrder = { major: 3, minor: 2, patch: 1 };
      return priorityOrder[currentPriority] > priorityOrder[highestPriority]
        ? current
        : highest;
    });

    let versionBumpType = VERSION_BUMP_RULES[highestPriorityType] || "patch";
    const shouldBumpMinor = shouldBumpMinorVersion(releaseNotes);
    if (versionBumpType === "minor" && !shouldBumpMinor) {
      versionBumpType = "patch";
      console.log(
        `⚠️ Overriding minor bump to patch for ${author} (conditions not met)`
      );
    }

    newVersion = bumpVersion(newVersion, versionBumpType);

    const releaseNote = {
      version: newVersion,
      date: today,
      developer: author,
      changes: authorCommits.map((commit) => commit.message),
    };

    releaseNotes.unshift(releaseNote);
    hasChanges = true;

    console.log(
      `✅ Added version ${newVersion} for ${author} with ${authorCommits.length} commits (${highestPriorityType} - ${versionBumpType} bump)`
    );
  }

  if (hasChanges) {
    packageJson.version = newVersion;
    fs.writeFileSync(
      PACKAGE_JSON_PATH,
      JSON.stringify(packageJson, null, 2),
      "utf8"
    );
    console.log(`\n➕ Updated package.json to version ${newVersion}`);

    fs.writeFileSync(
      RELEASE_NOTES_PATH,
      JSON.stringify(releaseNotes, null, 2),
      "utf8"
    );
    console.log(`✅ Saved updated release notes to ${RELEASE_NOTES_PATH}`);
    console.log(
      `\n✅ Successfully processed ${newCommits.length} new commits across ${
        Object.keys(commitsByAuthor).length
      } authors`
    );
    console.log(`✅ Version bumped from ${currentVersion} to ${newVersion}`);
  } else {
    console.log("⚠️ No changes were made to release notes.");
  }

  console.log("\n➕ Creating commit...");
  try {
    execSync("git add .", { stdio: "inherit" });
    execSync('git commit -m "release note"', { stdio: "inherit" });
    console.log("✅ Commit created successfully");
  } catch (error) {
    console.error("❌ Error creating commit:", error.message);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("❌ Error updating release notes:", error.message);
    process.exit(1);
  }
}

module.exports = { main };
