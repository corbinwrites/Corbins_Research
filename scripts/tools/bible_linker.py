import os
import re
import sys

BASE_PATH = '/Users/corbin/Downloads/ESV'

# Mapping for book folder names vs abbreviations if needed
# For now, we assume the user types the full folder name (e.g., "John") 
# or we can do a fuzzy match.

def get_verses_from_file(book, chapter):
    # Try to find the file. Folder name is 'John', file might be 'John 3.md' or 'Joh 3.md'
    # Based on our research, it's 'Gen 1.md'. So we need to know the prefix.
    
    book_path = os.path.join(BASE_PATH, book)
    if not os.path.exists(book_path):
        return None
    
    # Find the file that matches 'Prefix <chapter>.md'
    # The prefix seems to be the first few letters or the folder name.
    # Let's look at the folder contents to find the prefix.
    files = os.listdir(book_path)
    prefix = ""
    for f in files:
        if f.endswith('.md') and not f == f"{book}.md":
            match = re.search(r'^(.*?) \d+\.md$', f)
            if match:
                prefix = match.group(1)
                break
    
    file_path = os.path.join(book_path, f"{prefix} {chapter}.md")
    if not os.path.exists(file_path):
        return None
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Verses start with ###### [number]
    verses_raw = re.split(r'###### (\d+)', content)
    verses = {}
    for i in range(1, len(verses_raw), 2):
        v_num = int(verses_raw[i].strip())
        v_text = verses_raw[i+1].strip().split('***')[0].strip()
        verses[v_num] = v_text
    return verses

def parse_reference(ref_str):
    # Regex for various formats:
    # 1. John 3:16-19
    # 2. Exodus 17-19
    # 3. Exodus 17:3-18:4
    
    # Extract Book (can include numbers like 1 John)
    match = re.match(r'^((?:\d\s)?\w+(?:\s\w+)?)\s+(.*)$', ref_str.strip())
    if not match: return None
    book = match.group(1)
    range_part = match.group(2)
    
    # Case: 17:3-18:4 (Cross-chapter verse range)
    cross_match = re.match(r'^(\d+):(\d+)-(\d+):(\d+)$', range_part)
    if cross_match:
        return {
            'book': book,
            'start_ch': int(cross_match.group(1)),
            'start_v': int(cross_match.group(2)),
            'end_ch': int(cross_match.group(3)),
            'end_v': int(cross_match.group(4))
        }
        
    # Case: 3:16-19 (Single chapter verse range)
    verse_range_match = re.match(r'^(\d+):(\d+)-(\d+)$', range_part)
    if verse_range_match:
        return {
            'book': book,
            'start_ch': int(verse_range_match.group(1)),
            'start_v': int(verse_range_match.group(2)),
            'end_ch': int(verse_range_match.group(1)),
            'end_v': int(verse_range_match.group(3))
        }

    # Case: 3:16 (Single verse)
    single_verse_match = re.match(r'^(\d+):(\d+)$', range_part)
    if single_verse_match:
        return {
            'book': book,
            'start_ch': int(single_verse_match.group(1)),
            'start_v': int(single_verse_match.group(2)),
            'end_ch': int(single_verse_match.group(1)),
            'end_v': int(single_verse_match.group(2))
        }

    # Case: 17-19 (Chapter range)
    chapter_range_match = re.match(r'^(\d+)-(\d+)$', range_part)
    if chapter_range_match:
        return {
            'book': book,
            'start_ch': int(chapter_range_match.group(1)),
            'start_v': 1,
            'end_ch': int(chapter_range_match.group(2)),
            'end_v': 999 # Use a high number for "to end"
        }

    return None

def fetch_passage(ref_str):
    parsed = parse_reference(ref_str)
    if not parsed:
        return f"Could not parse reference: {ref_str}"
    
    book = parsed['book']
    start_ch = parsed['start_ch']
    start_v = parsed['start_v']
    end_ch = parsed['end_ch']
    end_v = parsed['end_v']
    
    output = []
    
    for ch in range(start_ch, end_ch + 1):
        verses = get_verses_from_file(book, ch)
        if not verses: continue
        
        # Determine verse range for this chapter
        v_start = start_v if ch == start_ch else 1
        v_end = end_v if ch == end_ch else max(verses.keys())
        
        for v in range(v_start, v_end + 1):
            if v in verses:
                output.append(f"**{book} {ch}:{v}** {verses[v]}")
                
    return "\n\n".join(output)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Join all args in case of spaces like "John 3:16"
        ref = " ".join(sys.argv[1:])
        print(fetch_passage(ref))
    else:
        print("Usage: python3 bible_linker.py <Reference>")
