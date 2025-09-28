/**
 * release notes viewer application
 * displays release notes grouped by minor version with collapsible sections
 */
class ReleaseNotesViewer {
  constructor() {
    this.releaseNotes = [];
    this.groupedNotes = {};
    this.init();
  }

  /**
   * initialize the application
   */
  async init() {
    try {
      await this.loadReleaseNotes();
      this.groupNotesByMinorVersion();
      this.renderReleaseNotes();
    } catch (error) {
      console.error("Error initializing release notes viewer:", error);
      this.showError();
    }
  }

  /**
   * load release notes from json file
   * @returns {Promise<Array>} array of release notes
   */
  async loadReleaseNotes() {
    try {
      // try different possible paths for the json file
      const possiblePaths = [
        "./release-notes.json",
        "release-notes.json",
        "./release-notes.json?t=" + Date.now(), // cache buster
      ];

      let response;
      let lastError;

      for (const path of possiblePaths) {
        try {
          response = await fetch(path);
          if (response.ok) {
            break;
          }
        } catch (error) {
          lastError = error;
          console.warn(`Failed to load from ${path}:`, error);
        }
      }

      if (!response || !response.ok) {
        throw new Error(
          `HTTP error! status: ${response?.status || "unknown"}. ${
            lastError?.message || "Failed to load JSON file"
          }`
        );
      }

      this.releaseNotes = await response.json();
      this.hideLoading();
    } catch (error) {
      console.error("Error loading release notes:", error);
      throw error;
    }
  }

  /**
   * group release notes by minor version
   * creates groups based on major.minor version pattern
   */
  groupNotesByMinorVersion() {
    this.groupedNotes = {};

    this.releaseNotes.forEach((note) => {
      const versionParts = note.version.split(".");
      const minorVersion = `${versionParts[0]}.${versionParts[1]}`;

      if (!this.groupedNotes[minorVersion]) {
        this.groupedNotes[minorVersion] = [];
      }

      this.groupedNotes[minorVersion].push(note);
    });

    // sort versions in descending order (newest first)
    Object.keys(this.groupedNotes).forEach((version) => {
      this.groupedNotes[version].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
    });
  }

  /**
   * render all release notes sections
   */
  renderReleaseNotes() {
    const container = document.getElementById("release-notes-container");
    container.innerHTML = "";

    const sortedVersions = Object.keys(this.groupedNotes).sort((a, b) => {
      const [aMajor, aMinor] = a.split(".").map(Number);
      const [bMajor, bMinor] = b.split(".").map(Number);
      return bMajor - aMajor || bMinor - aMinor;
    });

    sortedVersions.forEach((minorVersion, index) => {
      const section = this.createVersionSection(
        minorVersion,
        this.groupedNotes[minorVersion],
        index === 0
      );
      container.appendChild(section);
    });
  }

  /**
   * create a version section element
   * @param {string} minorVersion - the minor version (e.g., "2.1")
   * @param {Array} notes - array of release notes for this version
   * @param {boolean} isFirst - whether this is the first section (should be open)
   * @returns {HTMLElement} the version section element
   */
  createVersionSection(minorVersion, notes, isFirst) {
    const section = document.createElement("div");
    section.className = "version-section";

    const latestNote = notes[0];
    const versionHeader = this.createVersionHeader(
      minorVersion,
      latestNote,
      isFirst
    );
    const versionContent = this.createVersionContent(notes, isFirst);

    section.appendChild(versionHeader);
    section.appendChild(versionContent);

    return section;
  }

  /**
   * create version header with toggle functionality
   * @param {string} minorVersion - the minor version
   * @param {Object} latestNote - the most recent note for this version
   * @param {boolean} isFirst - whether this section should be open initially
   * @returns {HTMLElement} the version header element
   */
  createVersionHeader(minorVersion, latestNote, isFirst) {
    const header = document.createElement("div");
    header.className = `version-header ${isFirst ? "active" : ""}`;

    const date = new Date(latestNote.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    header.innerHTML = `
                    <div class="version-title">
                        <span class="version-number">v${minorVersion}.x</span>
                        <span>Release ${minorVersion}</span>
                    </div>
                    <div class="version-date">Latest: ${date}</div>
                    <div class="toggle-icon">▼</div>
                `;

    // add click handler for toggle functionality
    header.addEventListener("click", () => {
      this.toggleSection(header);
    });

    return header;
  }

  /**
   * create version content with commits grouped by developer
   * @param {Array} notes - array of release notes for this version
   * @param {boolean} isFirst - whether this section should be open initially
   * @returns {HTMLElement} the version content element
   */
  createVersionContent(notes, isFirst) {
    const content = document.createElement("div");
    content.className = `version-content ${isFirst ? "active" : ""}`;

    const commitsContainer = document.createElement("div");
    commitsContainer.className = "commits-container";

    // group notes by developer
    const developerGroups = this.groupNotesByDeveloper(notes);

    Object.entries(developerGroups).forEach(([developer, developerNotes]) => {
      const developerSection = this.createDeveloperSection(
        developer,
        developerNotes
      );
      commitsContainer.appendChild(developerSection);
    });

    content.appendChild(commitsContainer);
    return content;
  }

  /**
   * group notes by developer
   * @param {Array} notes - array of release notes
   * @returns {Object} notes grouped by developer
   */
  groupNotesByDeveloper(notes) {
    const groups = {};

    notes.forEach((note) => {
      if (!groups[note.developer]) {
        groups[note.developer] = [];
      }
      groups[note.developer].push(note);
    });

    return groups;
  }

  /**
   * create developer section with commit list
   * @param {string} developer - developer name
   * @param {Array} notes - notes for this developer
   * @returns {HTMLElement} the developer section element
   */
  createDeveloperSection(developer, notes) {
    const section = document.createElement("div");
    section.className = "developer-section";

    const totalCommits = notes.reduce(
      (sum, note) => sum + note.changes.length,
      0
    );

    const header = document.createElement("div");
    header.className = "developer-header";
    header.innerHTML = `
                    <div class="developer-name">${developer}</div>
                    <div class="commit-count">${totalCommits} commits</div>
                `;

    const commitsList = document.createElement("ul");
    commitsList.className = "commits-list";

    // flatten all commits from all notes for this developer
    const allCommits = [];
    notes.forEach((note) => {
      note.changes.forEach((change) => {
        allCommits.push({
          message: change,
          date: note.date,
        });
      });
    });

    // sort commits by date (newest first)
    allCommits.sort((a, b) => new Date(b.date) - new Date(a.date));

    allCommits.forEach((commit) => {
      const commitItem = this.createCommitItem(commit.message);
      commitsList.appendChild(commitItem);
    });

    section.appendChild(header);
    section.appendChild(commitsList);

    return section;
  }

  /**
   * create individual commit item
   * @param {string} message - commit message
   * @returns {HTMLElement} the commit item element
   */
  createCommitItem(message) {
    const item = document.createElement("li");
    item.className = "commit-item";

    const commitType = this.detectCommitType(message);
    const tag = document.createElement("span");
    tag.className = `commit-tag ${commitType}`;
    tag.textContent = commitType;

    const messageSpan = document.createElement("span");
    messageSpan.className = "commit-message";
    messageSpan.textContent = message;

    item.appendChild(tag);
    item.appendChild(messageSpan);

    return item;
  }

  /**
   * detect commit type from message
   * @param {string} message - commit message
   * @returns {string} detected commit type
   */
  detectCommitType(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.startsWith("feat") || lowerMessage.startsWith("feature")) {
      return "feat";
    }
    if (lowerMessage.startsWith("fix") || lowerMessage.startsWith("bugfix")) {
      return "fix";
    }
    if (lowerMessage.startsWith("style")) {
      return "style";
    }
    if (lowerMessage.startsWith("refactor")) {
      return "refactor";
    }
    if (
      lowerMessage.startsWith("perf") ||
      lowerMessage.startsWith("performance")
    ) {
      return "perf";
    }
    if (lowerMessage.startsWith("chore")) {
      return "chore";
    }
    if (
      lowerMessage.startsWith("docs") ||
      lowerMessage.startsWith("documentation")
    ) {
      return "docs";
    }
    if (lowerMessage.startsWith("test") || lowerMessage.startsWith("testing")) {
      return "test";
    }
    if (
      lowerMessage.includes("breaking") ||
      lowerMessage.includes("breaking change")
    ) {
      return "breaking";
    }

    return "other";
  }

  /**
   * toggle section visibility
   * @param {HTMLElement} header - the header element that was clicked
   */
  toggleSection(header) {
    const section = header.parentElement;
    const content = section.querySelector(".version-content");
    const isActive = header.classList.contains("active");

    if (isActive) {
      header.classList.remove("active");
      content.classList.remove("active");
    } else {
      header.classList.add("active");
      content.classList.add("active");
    }
  }

  /**
   * hide loading indicator
   */
  hideLoading() {
    const loading = document.getElementById("loading");
    if (loading) {
      loading.style.display = "none";
    }
  }

  /**
   * show error message
   */
  showError() {
    const loading = document.getElementById("loading");
    const error = document.getElementById("error");

    if (loading) {
      loading.style.display = "none";
    }
    if (error) {
      error.style.display = "block";
    }
  }
}

// initialize the application when dom is loaded
document.addEventListener("DOMContentLoaded", () => {
  new ReleaseNotesViewer();
});
