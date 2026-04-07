import os
import csv
import re

def parse_bible_to_csv(base_path, output_csv):
    books = [d for d in os.listdir(base_path) if os.path.isdir(os.path.join(base_path, d))]
    
    with open(output_csv, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['Title', 'Book', 'Chapter', 'Verse', 'Text']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for book_name in sorted(books):
            book_path = os.path.join(base_path, book_name)
            for file_name in sorted(os.listdir(book_path)):
                if file_name.endswith('.md') and not file_name == f"{book_name}.md":
                    # Extract chapter number from file name (e.g., "Gen 1.md" -> 1)
                    match = re.search(r' (\d+)\.md$', file_name)
                    if not match:
                        continue
                    chapter_num = match.group(1)
                    
                    file_path = os.path.join(book_path, file_name)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    # Find all verses
                    # Verses start with ###### [number]
                    verses = re.split(r'###### (\d+)', content)
                    
                    # split results in: [prefix, verse_num1, text1, verse_num2, text2, ...]
                    for i in range(1, len(verses), 2):
                        verse_num = verses[i].strip()
                        verse_text = verses[i+1].strip()
                        
                        # Clean up text (remove trailing markdown/links if any)
                        verse_text = verse_text.split('***')[0].strip()
                        
                        writer.writerow({
                            'Title': f"{book_name} {chapter_num}:{verse_num}",
                            'Book': book_name,
                            'Chapter': chapter_num,
                            'Verse': verse_num,
                            'Text': verse_text
                        })

if __name__ == "__main__":
    parse_bible_to_csv('/Users/corbin/Downloads/ESV', 'bible_verses.csv')
