import fs from 'fs';
import path from 'path';

const bibleRoot = '/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal/Bible/ESV';

function standardizeFile(filePath) {
    console.log(`Processing: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const newLines = [];
    
    let inVerse = false;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Match verse headings (###### 1) OR plain numbers on their own line (1)
        // Group 1: optional hashes, Group 2: the number
        const verseMatch = line.match(/^(#{0,6})\s*(\d+)\s*$/);
        
        if (verseMatch && i > 0) { // Skip line 0 which might be the title
            const verseNum = verseMatch[2];
            newLines.push(`###### ${verseNum}`);
            inVerse = true;
            continue;
        }
        
        // Ensure the title heading (# Book Chapter) is Level 1
        if (i === 0) {
            if (line.startsWith('# ')) {
                newLines.push(line.trim());
            } else {
                // If it's not a heading but it's the first line, make it one if it looks like a title
                newLines.push(`# ${line.trim()}`);
            }
            continue;
        }

        // If we are in a verse and the line has content, add it.
        if (line.trim() === '' && inVerse) {
            const nextLine = lines[i+1];
            if (nextLine && nextLine.match(/^(#{0,6})\s*(\d+)\s*$/)) {
                continue;
            }
        }
        
        newLines.push(line);
    }
    
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.md')) {
            standardizeFile(fullPath);
        }
    }
}

// Process all directories in the ESV root
processDirectory(bibleRoot);
