#!/usr/bin/env node
/**
 * bin/sermon-import.mjs
 *
 * Entry point for the `sermon-import` CLI command.
 *
 * Usage:
 *   sermon-import <file.pdf|docx|doc> [options]
 *
 *   --paste                 read the WhatsApp text message from the macOS clipboard (pbpaste)
 *   --message-file <path>   same, from a file
 *   --message "<text>"      same, inline
 *   --title "..."           override sermon title
 *   --date YYYY-MM-DD       override date
 *   --passage "Book Ch:V"   override passage
 *   --teacher "Name"        override teacher
 *   --dry-run               print parsed result and link report, write nothing
 *   --force                 overwrite existing note (old copy backed up outside vault)
 *   --no-bare-refs          don't link "v. 21" / "verses 14-19"
 *   --no-schedule           skip spreadsheet enrichment
 *   --open                  open the note in Obsidian when done
 *   --latest                use newest "* (City Light).*" in the source dir
 *   --strict                exit code 3 if any warnings
 */

import { run } from "../src/cli.mjs";

const exitCode = await run(process.argv);
process.exit(exitCode ?? 0);
