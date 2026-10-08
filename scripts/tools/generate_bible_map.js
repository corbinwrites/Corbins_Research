import fs from 'fs';
import path from 'path';

const bibleRoot = '/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal/Bible/ESV';

function generateInputBookMap() {
    const map = {};
    const folders = fs.readdirSync(bibleRoot).filter(f => fs.statSync(path.join(bibleRoot, f)).isDirectory());

    folders.forEach(folder => {
        const fullPath = path.join(bibleRoot, folder);
        const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.md') && !f.includes(' (up::'));
        
        if (files.length > 0) {
            // Take the first chapter file to extract the abbreviation
            // Example: "1 Chr 1.md" -> "1 Chr"
            const firstFile = files[0];
            const match = firstFile.match(/^(.+?)\s+\d+\.md$/);
            if (match) {
                const abbreviation = match[1];
                const fullName = folder;
                
                // Add mapping: "Full Name" -> "Abbreviation"
                // The plugin searches by filename, so if user types "1 Chronicles 1", 
                // it needs to map "1 Chronicles" to "1 Chr" to find "1 Chr 1.md"
                map[fullName.toLowerCase()] = abbreviation;
                
                // Also common variations
                if (fullName.includes(' ')) {
                   // No special action needed for simple spaces
                }
            }
        }
    });

    // Convert to the format the plugin expects (From:To)
    const outputLines = Object.entries(map).map(([full, abbr]) => `${full}:${abbr}`);
    console.log(outputLines.join('\n'));
}

generateInputBookMap();
