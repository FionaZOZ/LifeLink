from pathlib import Path
import zipfile
import pathspec

# ===== CONFIG =====
PROJECT_DIR = Path(r"D:\LAHacks\LifeLink")
OUTPUT_ZIP = Path(r"C:\Users\paul2\Downloads\lifelink.zip")
GITIGNORE_PATH = PROJECT_DIR / ".gitignore"

# Explicit files to exclude
EXTRA_EXCLUDES = {
    ".gitignore",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "README.md",
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
}

# Directories to exclude anywhere in the project
EXTRA_EXCLUDE_DIRS = {
    ".git",
    "__pycache__",
    ".next",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "logs",
    ".vercel",
    ".turbo",
}

# Pattern-based excludes for AI upload optimization
EXTRA_EXCLUDE_PATTERNS = [
    # Documentation / notes / prompts
    "*.md",

    # Static binary assets
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.gif",
    "*.webp",
    "*.svg",
    "*.ico",

    # Fonts
    "*.woff",
    "*.woff2",
    "*.ttf",
    "*.otf",

    # Large public/static folders
    "public/**",
    "app/fonts/**",
]
# ==================


def load_gitignore_spec(gitignore_path: Path):
    if not gitignore_path.exists():
        return None

    with open(gitignore_path, "r", encoding="utf-8") as f:
        return pathspec.PathSpec.from_lines("gitwildmatch", f.readlines())


def load_extra_spec():
    return pathspec.PathSpec.from_lines("gitwildmatch", EXTRA_EXCLUDE_PATTERNS)


def should_exclude(rel_path: Path, gitignore_spec, extra_spec):
    rel_str = str(rel_path).replace("\\", "/")

    # Exclude directories anywhere in path
    if any(part in EXTRA_EXCLUDE_DIRS for part in rel_path.parts):
        return True

    # Exclude explicit files by filename
    if rel_path.name in EXTRA_EXCLUDES:
        return True

    # Exclude extra AI-upload optimization patterns
    if extra_spec and extra_spec.match_file(rel_str):
        return True

    # Exclude .gitignore patterns
    if gitignore_spec and gitignore_spec.match_file(rel_str):
        return True

    return False


def zip_project():
    gitignore_spec = load_gitignore_spec(GITIGNORE_PATH)
    extra_spec = load_extra_spec()

    added_count = 0
    skipped_count = 0

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
        for file_path in PROJECT_DIR.rglob("*"):
            if file_path.is_dir():
                continue

            rel_path = file_path.relative_to(PROJECT_DIR)

            if should_exclude(rel_path, gitignore_spec, extra_spec):
                print(f"Skipping: {rel_path}")
                skipped_count += 1
                continue

            zipf.write(file_path, arcname=rel_path)
            print(f"Added: {rel_path}")
            added_count += 1

    print("\nDone!")
    print(f"Created: {OUTPUT_ZIP}")
    print(f"Added files: {added_count}")
    print(f"Skipped files: {skipped_count}")


if __name__ == "__main__":
    zip_project()