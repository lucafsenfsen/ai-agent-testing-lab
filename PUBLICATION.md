# Phase 1 publication instructions

This document prepares a manual publication. No script here pushes, uploads, opens a pull request or changes GitHub settings automatically.

## Exactly what to publish

`release-files.txt` is the complete source allowlist. Running the packaging tool creates a clean folder and ZIP containing only those files plus `RELEASE-MANIFEST.json`. The manifest lists every payload file's size and SHA-256, and the ZIP includes it. The manifest itself is not self-hashed. The archive checksum is in an adjacent `.zip.sha256` file.

The allowlist contains the dashboard, generated to-do app and original research README, pinned Playwright tooling and tests, reproduction/publication documentation, and reviewed public reports under `results/experiment-001/`. It excludes raw reports, npm/browser downloads, personal working data, historical machine-specific launch notes, editor state, local backups and credentials. No existing public repository file is scheduled for deletion.

The original experiment files were compared with public main commit `713c528179c364f44c5c9bc717b0d70a80fdd685`. This is a review baseline, not a request to reset Git history. If upstream changes after preparation, compare and reconcile before copying; never overwrite newer research blindly.

## Build a clean package locally

With Python 3 available, from the project root:

```sh
python3 automation/prepare-release.py --output release/phase1-public
```

The tool refuses an existing output directory, copies only allowlisted regular files, rejects private-path/credential patterns, checks original-file hashes, writes the manifest and creates a ZIP. It does not install dependencies or access GitHub. Use a new output name when rebuilding; do not publish multiple drafts.

Inspect the manifest and JSON evidence. Automated secret-pattern checks reduce risk but are not a proof that all sensitive text has been found. Review additions manually, including binary images and any new research artifacts. Never force-add raw reports or credentials because a file is ignored.

## Validate the candidate

From the clean package folder, use:

```sh
npm ci
npm run browsers:install
npm test
```

Testing creates ignored `node_modules/` and `reports/` folders. Do not publish these. For a package that remains physically clean, test a separate copy, then publish the original manifest-verified package. Match source/test hashes to the verified public reports. All required app cases must run; a partial grep or one-browser pass is not the advertised 50/50 result.

The public report exporter accepts only the complete, passing two-engine Phase 1 suite. Preserve failed attempts locally and disclose them; do not use publication filtering to misrepresent future failed model experiments.

## Publish later using a review branch

The transferred working folder has no Git history. Clone the existing repository into a new folder, then overlay the reviewed payload; do not initialize or force-push this downloaded working copy.

Example commands, for you to run only when ready:

```sh
# Set this to the absolute path of the reviewed package folder.
LAB_RELEASE=/path/to/release/phase1-public

git clone https://github.com/lucafsenfsen/ai-agent-testing-lab.git ai-agent-testing-lab-publish
cd ai-agent-testing-lab-publish
git rev-parse HEAD
# Compare upstream changes against the reviewed baseline before continuing.
git switch -c release/phase1
cp -R "$LAB_RELEASE"/. .

git status --short
git diff -- README.md index.html app.js styles.css .gitignore
git diff -- Experiments/001-todo-gpt6
```

The experiment diff should be empty when upstream is still the reviewed baseline. The copied experiment README should match the original; do not rewrite it to reflect later automated findings. Those belong in the new results documentation.

Stage only the allowlist and generated manifest, never the whole personal workspace:

```sh
while IFS= read -r file; do
  [ -z "$file" ] || git add -- "$file"
done < release-files.txt
git add -- RELEASE-MANIFEST.json

git diff --cached --stat
git diff --cached --check
git diff --cached --name-only
# Review the full staged diff, including every new file.
git diff --cached
```

Compare the staged file list with release-files.txt. Existing unchanged experiment files do not appear in the diff, which is expected. Every new or changed file must be in the allowlist or be RELEASE-MANIFEST.json. The manifest describes the copied payload, not unrelated files already present upstream.

Only after your review:

```sh
git commit -m "Prepare Phase 1 reproducible browser evaluation and public evidence"
git push -u origin release/phase1
```

Then open a pull request on GitHub, review it, and merge only when authorized. The preparation tool never executes commit/push steps. PR #1 now contains the release branch and its review fixes; use its existing branch rather than creating a duplicate. Your Git author attribution is controlled by your Git configuration; choose GitHub's private/noreply email if you do not want a personal email in commit history.

Keep the existing GitHub Pages configuration. Merging into its configured publishing branch may update the live site. The site is static; Playwright runs locally. The new published-evidence button reads the reviewed results JSON. Local `reports/` are intentionally absent from GitHub Pages, so latest-local buttons need a local run.

GitHub's [branch workflow](https://docs.github.com/en/get-started/using-github/github-flow) documents the review process. No automated CI workflow or new deployment configuration is added in Phase 1.

## Alternative: GitHub's file uploader

Upload only the clean package contents into the repository root on a new branch, including the original nested folder structure, then open a pull request. Do not upload the ZIP as the repository's source, its enclosing release directory, node_modules, reports, work, or your full Desktop project folder. If your browser's uploader omits dotfiles, add `.gitignore` separately from the reviewed package. Review the original experiment files for accidental changes before committing.
