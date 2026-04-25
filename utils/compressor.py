from pathlib import Path
import zipfile
import pathspec

# ===== CONFIG =====
PROJECT_DIR = Path(r"D:\LAHacks\LifeLink")
OUTPUT_ZIP = Path(r"C:\Users\paul2\Downloads\lifelink.zip")
GITIGNORE_PATH = PROJECT_DIR / ".gitignore"

# Extra excludes specifically for AI upload optimization
EXTRA_EXCLUDES = {
    ".gitignore",
    "package-lock.json",
    "README.md",
    ".env",
    ".env.local",
}

EXTRA_EXCLUDE_DIRS = {
    ".git",
    "__pycache__",
    ".next",
    "dist",
    "build",
    "coverage",
    "logs",
}

EXTRA_EXCLUDE_PATTERNS = [
    "*.md",
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.gif",
    "*.webp",
    "*.ico",
    "*.woff",
    "*.woff2",
    "*.ttf",
    "*.otf",

    "public/**",
    "app/fonts/**",

    "bus/**",
    "backend/**",
    "scripts/**",
    "supabase/**",

    "app/demo/**",
    "app/data-sources/**",
    "app/volunteer/**",
    "app/cpr/**",
    "app/emergency/cpr/**",
    "app/emergency/dispatch/**",
    "app/emergency/location/**",
    "app/emergency/assessment/**",
    "app/emergency/complete/**",

    "lib/agents/**",
    "lib/data/**",
    "lib/supabase/**",
    "lib/useBusTelemetry.ts",
    "lib/useEmergencyLocation.ts",
    "lib/useEmergencyTelemetry.ts",
    "lib/uclaAedsMock.ts",
]
# ==================


def load_gitignore_spec(gitignore_path: Path):
    if not gitignore_path.exists():
        return None

    with open(gitignore_path, "r", encoding="utf-8") as f:
        return pathspec.PathSpec.from_lines("gitwildmatch", f.readlines())


def should_exclude(rel_path: Path, spec):
    rel_str = str(rel_path).replace("\\", "/")

    if any(part in EXTRA_EXCLUDE_DIRS for part in rel_path.parts):
        return True

    if rel_path.name in EXTRA_EXCLUDES:
        return True

    extra_spec = pathspec.PathSpec.from_lines("gitwildmatch", EXTRA_EXCLUDE_PATTERNS)
    if extra_spec.match_file(rel_str):
        return True

    if spec and spec.match_file(rel_str):
        return True

    return False


def zip_project():
    spec = load_gitignore_spec(GITIGNORE_PATH)

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
        for file_path in PROJECT_DIR.rglob("*"):
            if file_path.is_dir():
                continue

            rel_path = file_path.relative_to(PROJECT_DIR)

            if should_exclude(rel_path, spec):
                print(f"Skipping: {rel_path}")
                continue

            zipf.write(file_path, arcname=rel_path)
            print(f"Added: {rel_path}")

    print(f"\nDone! Created:\n{OUTPUT_ZIP}")


if __name__ == "__main__":
    zip_project()