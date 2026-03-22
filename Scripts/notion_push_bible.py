import os
import sys
import json
import requests
from bible_linker import fetch_passage, parse_reference, get_verses_from_file

# Configuration - You can set these as environment variables or paste them here
NOTION_TOKEN = os.getenv("NOTION_TOKEN", "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")
PAGE_ID = os.getenv("NOTION_PAGE_ID", "32965e4381b280b0b2b1e24b4b150217")

def push_to_notion(reference):
    if NOTION_TOKEN == "ntn_...HERE" or PAGE_ID == "YOUR_PAGE_ID_HERE":
        print("Error: Please set your NOTION_TOKEN and NOTION_PAGE_ID.")
        return

    print(f"Refining passage: {reference}...")
    
    parsed = parse_reference(reference)
    if not parsed:
        print(f"Could not parse reference: {reference}")
        return

    book = parsed['book']
    start_ch = parsed['start_ch']
    start_v = parsed['start_v']
    end_ch = parsed['end_ch']
    end_v = parsed['end_v']

    blocks = []
    
    # Add a heading for the passage
    blocks.append({
        "object": "block",
        "type": "heading_2",
        "heading_2": {
            "rich_text": [{"type": "text", "text": {"content": reference}}]
        }
    })

    for ch in range(start_ch, end_ch + 1):
        verses = get_verses_from_file(book, ch)
        if not verses: continue
        
        v_start = start_v if ch == start_ch else 1
        v_end = end_v if ch == end_ch else max(verses.keys())
        
        for v in range(v_start, v_end + 1):
            if v in verses:
                # Add each verse as a paragraph block
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {"type": "text", "text": {"content": f"{book} {ch}:{v} ", "link": None}, "annotations": {"bold": True}},
                            {"type": "text", "text": {"content": verses[v]}}
                        ]
                    }
                })

    # Notion API has a limit of 100 blocks per request
    # We'll chunk them just in case you request a massive passage (like a whole book)
    chunk_size = 100
    for i in range(0, len(blocks), chunk_size):
        chunk = blocks[i:i + chunk_size]
        url = f"https://api.notion.com/v1/blocks/{PAGE_ID}/children"
        headers = {
            "Authorization": f"Bearer {NOTION_TOKEN}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        }
        payload = {"children": chunk}
        response = requests.patch(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            print(f"Error pushing to Notion: {response.text}")
            return

    print(f"Successfully appended {len(blocks)-1} verses to Notion!")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        ref = " ".join(sys.argv[1:])
        push_to_notion(ref)
    else:
        print("Usage: python3 notion_push_bible.py <Reference>")
