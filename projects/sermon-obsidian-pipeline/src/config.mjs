import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, "..");

export const VAULT_ROOT =
  process.env.VAULT_ROOT ||
  path.join(
    os.homedir(),
    "Library",
    "Mobile Documents",
    "iCloud~md~obsidian",
    "Documents",
    "Corbin_Personal"
  );

export const CHURCH_DIR = path.join(VAULT_ROOT, "Ministry", "Church");
export const ATTACHMENTS_DIR = path.join(CHURCH_DIR, "Attachments");
export const BIBLE_DIR = path.join(VAULT_ROOT, "Bible", "ESV");

export const SOURCE_DIR =
  process.env.SOURCE_DIR || path.join(os.homedir(), "Downloads");

export const SCHEDULE_XLSX =
  process.env.SCHEDULE_XLSX ||
  path.join(
    os.homedir(),
    "Downloads",
    "City Light Bible Sunday Service Schedule 2025-26.xlsx"
  );

export const BACKUP_DIR = path.join(PROJECT_ROOT, "output", "backup");
export const LAST_RUN_PATH = path.join(
  PROJECT_ROOT,
  "output",
  "sermon-import",
  "last-run.json"
);
