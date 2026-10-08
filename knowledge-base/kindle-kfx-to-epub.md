# Kindle KFX to EPUB Decryption & Conversion Workflow (2026)

This guide documents the successful process for decrypting Kindle KFX files and converting them to EPUB using Calibre's CLI tools and the latest 2026 plugin versions.

## Prerequisites
- **Calibre:** Installed in `/Applications/calibre.app`.
- **Kindle Serial Number:** Configured in `~/Library/Preferences/calibre/plugins/dedrm.json`.
- **DeDRM Plugin:** v10.0.9+ (Critical for 2026 DRM updates).
- **KFX Input Plugin:** v2.30.0+ (Required for handling KFX containers).

## The Workflow

### 1. Update Plugins (If needed)
If DRM fails, ensure you are on the latest versions:
```bash
# Download and install DeDRM 10.0.9
curl -L -o /tmp/DeDRM_tools_10.0.9.zip https://github.com/noDRM/DeDRM_tools/releases/download/v10.0.9/DeDRM_tools_10.0.9.zip
unzip -p /tmp/DeDRM_tools_10.0.9.zip DeDRM_plugin.zip > /tmp/DeDRM_plugin.zip
/Applications/calibre.app/Contents/MacOS/calibre-customize -a /tmp/DeDRM_plugin.zip
```

### 2. Prepare the Environment
**Crucial:** Close the Calibre GUI application to release the database lock before using `calibredb`.

### 3. Decrypt and Convert
The decryption happens **only during the import** process.

```bash
# 1. Add the KFX file to the library (triggers decryption via serial number)
/Applications/calibre.app/Contents/MacOS/calibredb add "/path/to/book.kfx"

# 2. Find the ID of the newly added book
/Applications/calibre.app/Contents/MacOS/calibredb list --search "title:\"Book Title\""

# 3. Export the decrypted KFX to a temporary folder
/Applications/calibre.app/Contents/MacOS/calibredb export [ID] --to-dir /tmp --single-dir --template "{title}"

# 4. Convert the decrypted KFX to EPUB
/Applications/calibre.app/Contents/MacOS/ebook-convert "/tmp/Book Title.kfx" "/path/to/output.epub"
```

## Helper Script: `convert_kfx.sh`
You can use this automated script for future conversions.

```bash
#!/bin/bash
# Usage: ./convert_kfx.sh "My Book.kfx"

SOURCE_FILE="$1"
TITLE=$(basename "$SOURCE_FILE" .kfx)
OUTPUT_DIR="$HOME/Downloads"

echo "Adding $TITLE to Calibre and decrypting..."
ID=$(/Applications/calibre.app/Contents/MacOS/calibredb add "$SOURCE_FILE" | grep "Added book ids:" | awk '{print $NF}')

if [ -z "$ID" ]; then
    echo "Error: Failed to add book to Calibre."
    exit 1
fi

echo "Exporting decrypted KFX (ID: $ID)..."
/Applications/calibre.app/Contents/MacOS/calibredb export "$ID" --to-dir /tmp --single-dir --template "$TITLE"

echo "Converting to EPUB..."
/Applications/calibre.app/Contents/MacOS/ebook-convert "/tmp/$TITLE.kfx" "$OUTPUT_DIR/$TITLE.epub"

echo "Success! Output saved to: $OUTPUT_DIR/$TITLE.epub"
# Optional: Cleanup
# /Applications/calibre.app/Contents/MacOS/calibredb remove "$ID"
rm "/tmp/$TITLE.kfx" "/tmp/$TITLE.jpg" "/tmp/$TITLE.opf"
```

## Troubleshooting
- **Decryption failed:** Check if the serial number in `dedrm.json` exactly matches the device for which the book was downloaded.
- **KFX-ZIP:** If Calibre lists the format as `KFX-ZIP`, decryption failed. The plugin was unable to unlock the file during import.
