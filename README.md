# Automated Release Notes Generator

A simple yet powerful script that automatically creates release notes from your git commit messages. This tool helps front-end developers and DevOps teams generate proper release notes without manual effort, making it perfect for integration with Husky post-commit hooks.

**Live Demo:** [https://amin-norollah.github.io/auto-release-notes/](https://amin-norollah.github.io/auto-release-notes/)

## What This Script Does

The `update-release-notes.js` script automatically:

- Reads your recent git commits
- Groups them by developer and version
- Detects commit types (features, bug fixes, etc.)
- Updates your package.json version
- Saves everything to a JSON file
- Creates a commit with the changes

## Why Use This Script

### For Frontend Developers

- **No DevOps dependency**: Create release notes without waiting for DevOps support
- **Automatic version bumping**: The script handles version updates based on commit types
- **Zero manual work**: Just write good commit messages and the script does the rest
- **Husky integration**: Works perfectly with post-commit hooks for seamless automation

### For DevOps Teams

- **Easy integration**: Simple script that can be added to any project
- **Consistent output**: Standardized release note format across all projects
- **Version management**: Automatically handles semantic versioning
- **Git integration**: Creates commits and updates package.json automatically

## How It Works

The script analyzes your git commits and:

1. Filters out merge commits and noise
2. Groups commits by author
3. Detects commit types (feat, fix, style, etc.)
4. Determines version bump type (major, minor, patch)
5. Updates package.json with new version
6. Saves release notes to JSON file
7. Creates a commit with all changes

## Quick Setup

### 1. Add the Script to Your Project

Copy `update-release-notes.js` to your project root or scripts folder.

### 2. Install Dependencies

The script only needs Node.js built-in modules (fs, path, child_process). No additional packages required.

### 3. Configure Paths

Update these paths in the script to match your project structure:

```javascript
const RELEASE_NOTES_PATH = path.resolve(
  __dirname,
  "./release-notes.json" // Change this path
);
const PACKAGE_JSON_PATH = path.resolve(__dirname, "./package.json"); // Change this path
```

### 4. Add to Husky Post-Commit Hook

In your `.husky/post-commit` file:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

node scripts/update-release-notes.js
```

### 5. Run the Script

```bash
node update-release-notes.js
```

## Commit Message Format

The script works best with conventional commit messages:

```
feat: add user authentication system
fix: resolve login button styling issue
style: update button colors
refactor: improve code structure
perf: optimize image loading
chore: update dependencies
docs: add API documentation
test: add unit tests for auth
BREAKING CHANGE: remove deprecated API
```

## Supported Commit Types

- **feat/feature**: New features (minor version bump)
- **fix/bugfix**: Bug fixes (patch version bump)
- **style**: Code style changes (patch version bump)
- **refactor**: Code refactoring (patch version bump)
- **perf/performance**: Performance improvements (patch version bump)
- **chore**: Maintenance tasks (patch version bump)
- **docs/documentation**: Documentation updates (patch version bump)
- **test/testing**: Test-related changes (patch version bump)
- **BREAKING CHANGE**: Breaking changes (major version bump)
- **other**: Unclassified changes (patch version bump)

## Configuration Options

You can customize the script behavior by modifying these constants:

```javascript
const COMMIT_LIMIT = 30; // Number of recent commits to process
const DAYS_THRESHOLD = 7; // Days before allowing minor version bump
```

## Integration with Angular Projects

This script works perfectly with Angular projects:

1. Place the script in your Angular project 'scripts' folder
2. Update the paths to point to your Angular assets folder
3. Add to your Husky post-commit hook
4. The script will automatically update your Angular project's version and create release notes

## Web Viewer

This project also includes a beautiful web viewer (`index.html`) to display your release notes:

- **Modern Interface**: Clean, responsive design that works on all devices
- **Version Grouping**: Automatically groups releases by minor version
- **Developer Organization**: Shows commits grouped by developer
- **Color-Coded Tags**: Different commit types are visually distinguished

The viewer automatically loads and displays the JSON file created by the script, making it easy to share release notes with your team or stakeholders.

## License

This project is open source and available under the MIT License. Feel free to use, modify, and distribute as needed.

## Support

For questions, issues, or contributions, please refer to the project repository or create an issue with detailed information about your use case.
