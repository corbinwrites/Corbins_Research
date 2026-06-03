# reMarkable 2 → Obsidian: Build Guide
### Firmware 3.27 · Upgrade-resistant · No background scripts · No computer needed day-to-day

---

## What This Builds

By the end you'll have:
- A **tappable icon** on your reMarkable home screen that opens a terminal
- A **Bluetooth or USB keyboard** that types markdown directly on the e-ink screen
- Notes that **automatically sync to your Obsidian vault** over WiFi
- Your **stock reMarkable UI fully intact** — PDFs, EPUBs, annotations unchanged

**The chain:** reMarkable → GitHub (private) → Obsidian iOS

---

## Robustness Principles

Everything in this guide is built around one rule: **your home folder (`/home/root/`) survives every firmware upgrade. The system partition does not.**

That means:
- Scripts and config live in `~/bin/` and `~/.ssh/` — they survive
- `git` must be present on `PATH` — this tested device already had `/home/root/bin/git`
- `micro` is a **static binary** in `~/bin/` — no system library dependencies
- `yaft` is a **static binary** in `~/bin/` — no system library dependencies
- The package manager (Vellum) stores its state in `~/.vellum/` — survives upgrades
- A single `~/setup.sh` script restores tools in ~2 minutes after any upgrade
- Your notes live on **GitHub** — never at risk regardless of what happens to the device

---

## What You'll Need

- reMarkable 2 (firmware 3.27)
- Mac (for initial setup only — ~45 minutes, plus optional 10-minute Docker build)
- iPhone with Obsidian installed
- GitHub account (free) → [github.com](https://github.com)
- Bluetooth or USB keyboard (see Keyboard Guide at the bottom)
- Docker Desktop for Mac — free, only needed if the yaft quick-install doesn't work on your firmware

---

## Part 1 — SSH Into Your reMarkable

SSH is a way to type commands on your reMarkable from your computer. You only need this for the one-time setup.

### 1.1 Find Your Password and IP

On the reMarkable: **≡ menu → Settings → Help → Copyrights and licenses → scroll down**

You'll see:
- **IP address** — looks like `192.168.1.X` (WiFi) or use `10.11.99.1` (USB cable)
- **Password** — a short word like `mango` or `cedar4`

### 1.2 Open Terminal on Your Mac

`Cmd + Space` → type `Terminal` → Enter

### 1.3 Connect

```bash
ssh root@192.168.1.X
```

First connection asks: `Are you sure you want to continue connecting?` → type `yes`

Then enter the password from Step 1.1. You won't see characters as you type — that's normal.

You'll see:
```
root@reMarkable:~#
```

✅ You're in.

> **"Connection refused"?** Make sure the reMarkable is awake, on the same WiFi as your Mac, and the IP matches Settings exactly.

---

## Part 2 — Disable Auto-Updates

Do this before anything else. An unexpected firmware upgrade mid-setup would wipe your tools.

```bash
systemctl disable --now update-engine
systemctl mask update-engine
```

> **To upgrade firmware later:** `systemctl unmask update-engine`, do the upgrade, then run `~/setup.sh` to restore tools.

---

## Part 3 — Set Up GitHub

GitHub is the relay between your reMarkable and Obsidian. reMarkable pushes notes in; Obsidian pulls them out.

### 3.1 Create a Private Repo

1. Go to [github.com/new](https://github.com/new)
2. Name: `obsidian-notes` · Select **Private** · Check **Add a README**
3. Click **Create repository**

### 3.2 Create an SSH Key

On some reMarkable builds, `ssh-keygen` is not available on the device. The working setup for this build generated the key on the Mac, copied it to the reMarkable, and kept a local backup at:

```text
/Users/corbin/Hal9000/secrets/Remarkable2
```

**On your Mac:**

```bash
mkdir -p ~/.ssh/remarkable2
ssh-keygen -t ed25519 -C "remarkable2" -f ~/.ssh/remarkable2/id_remarkable
scp ~/.ssh/remarkable2/id_remarkable* root@10.11.99.1:/home/root/.ssh/
```

**Back on the reMarkable:**

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_remarkable
chmod 644 ~/.ssh/id_remarkable.pub
cat ~/.ssh/id_remarkable.pub
```

Copy the entire line starting with `ssh-ed25519 AAAA...`, including the trailing `remarkable2` comment.

The reMarkable firmware used in this build ships Dropbear SSH. Dropbear may fail on the modern OpenSSH private key with `String too long`, so convert the same key to Dropbear format:

```bash
dropbearconvert openssh dropbear ~/.ssh/id_remarkable ~/.ssh/id_remarkable.db
chmod 600 ~/.ssh/id_remarkable.db
```

If `ssh-keygen` is available directly on the reMarkable, this also works:

```bash
ssh-keygen -t ed25519 -C "remarkable2" -f ~/.ssh/id_remarkable
```

Press Enter twice for no passphrase. Then display the key:

```bash
cat ~/.ssh/id_remarkable.pub
```

Copy the entire line starting with `ssh-ed25519 AAAA...`

### 3.3 Add the Key to GitHub

1. Go to [github.com/settings/ssh/new](https://github.com/settings/ssh/new)
2. Title: `reMarkable 2` · Key type: `Authentication Key`
3. Paste the key → **Add SSH key**

### 3.4 Configure SSH

```bash
mkdir -p ~/.ssh && cat > ~/.ssh/config << 'EOF'
Host github.com
  IdentityFile ~/.ssh/id_remarkable.db
  User git
  StrictHostKeyChecking accept-new
EOF
```

Test it:

```bash
ssh -i ~/.ssh/id_remarkable.db -T git@github.com
```

Should say: `Hi YOUR_USERNAME! You've successfully authenticated...`

If plain `ssh -T git@github.com` says `No auth methods could be used`, that is okay. Use this explicit SSH command for Git:

```bash
git config --global core.sshCommand "ssh -i /home/root/.ssh/id_remarkable.db"
```

---

## Part 4 — Install Tools

### 4.1 `git` — Verify It Exists

On the tested device, `git` was already available at `/home/root/bin/git` from the prior setup:

```bash
command -v git
git --version   # tested: git version 2.16.5
```

If this prints a valid path and version, continue. If `git` is missing, restore the working `git` binary before cloning or syncing notes.

### 4.2 `micro` (text editor)

micro uses familiar shortcuts: **Ctrl+S** to save, **Ctrl+Q** to quit. It highlights markdown syntax — headers, bold markers, and code blocks are visually distinct, which reads well on e-ink.

```bash
mkdir -p ~/bin
cd /tmp && \
wget -q https://github.com/zyedidia/micro/releases/download/v2.0.15/micro-2.0.15-linux-arm.tar.gz && \
tar xzf micro-2.0.15-linux-arm.tar.gz && \
mv micro-2.0.15/micro ~/bin/micro && \
chmod +x ~/bin/micro
~/bin/micro --version   # should print: Version: 2.0.15
```

### 4.3 `yaft` (terminal on the reMarkable screen)

yaft renders a terminal directly on the e-ink display. This is what makes keyboard typing work without a computer.

The reMarkable 2 uses a custom display driver — you need **timower's rM2-specific yaft fork**, not the generic upstream version. There are two ways to get it:

---

#### Option A — Quick Install (try this first)

```bash
# Download the pre-built .ipk, extract the binary, install it
cd /tmp
wget -q -O yaft.ipk \
  "https://github.com/timower/rM2-stuff/releases/download/v0.1.3/yaft.ipk"

# .ipk files are ar archives — extract the data tarball
ar x yaft.ipk
tar xzf data.tar.gz
mv usr/bin/yaft ~/bin/yaft
chmod +x ~/bin/yaft
```

**Test it immediately** (still in SSH):

```bash
export PATH=$HOME/bin:$PATH
export TERM=xterm
~/bin/yaft echo "yaft works"
```

If you see `yaft works` printed and then return to the shell, it's working. Move on to Part 5.

**If it fails** (blank screen, immediate crash, or "Illegal instruction"), the pre-built binary isn't compatible with your exact firmware build. Use Option B below.

---

#### Option B — Build from Source on Mac (guaranteed to work)

This takes about 10 minutes and produces a binary that will work regardless of firmware version.

**On your Mac** (not the reMarkable):

1. Install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) if you haven't already. Start it.

2. Open Terminal on your Mac:

```bash
# Pull the toltec cross-compilation toolchain
docker pull ghcr.io/toltec-dev/toolchain:v3.1

# Build yaft for the reMarkable 2
docker run --rm \
  -v /tmp/rm2build:/build \
  ghcr.io/toltec-dev/toolchain:v3.1 \
  bash -c "
    apt-get update -qq && apt-get install -y -qq cmake git ninja-build &&
    git clone --depth 1 https://github.com/timower/rM2-stuff /src &&
    cd /src &&
    cmake -B /build -DCMAKE_TOOLCHAIN_FILE=/usr/share/cmake/arm-linux-gnueabihf.cmake \
      -DCMAKE_BUILD_TYPE=Release -G Ninja &&
    cmake --build /build --target yaft
  "
```

3. Transfer the binary to the reMarkable:

```bash
# Still on your Mac
scp /tmp/rm2build/apps/yaft/yaft root@192.168.1.X:~/bin/yaft
```

4. Back in your SSH session on the reMarkable:

```bash
chmod +x ~/bin/yaft
~/bin/yaft echo "yaft works"
```

---

### 4.4 Add `~/bin` to PATH

```bash
echo 'export PATH=$HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

---

## Part 5 — Clone Your Notes Repo

```bash
git config --global core.sshCommand "ssh -i /home/root/.ssh/id_remarkable.db"
git clone git@github.com:YOUR_USERNAME/obsidian-notes.git ~/notes
cd ~/notes
git config user.email "you@example.com"
git config user.name "reMarkable"
mkdir -p ~/notes/Remarkable
```

On the tested firmware, the available Git build can clone, commit, and push, but does not include helper commands for `git pull --rebase`. This workflow treats the reMarkable as the writer and Obsidian iOS as the reader, so the reMarkable scripts push only. Keep Obsidian Git auto-push disabled unless you later install a fuller Git build on the reMarkable.

---

## Part 6 — Create Your Scripts

### `note` — Opens today's note, syncs on exit

```bash
cat > ~/bin/note << 'SCRIPT'
#!/bin/sh
export PATH=$HOME/bin:$PATH
export TERM=xterm
export GIT_SSH_COMMAND="ssh -i /home/root/.ssh/id_remarkable.db"
DATE=$(date +%Y-%m-%d)
FILE="$HOME/notes/Remarkable/${DATE}.md"

if [ ! -f "$FILE" ]; then
  printf "# %s\n\n" "$DATE" > "$FILE"
fi

micro "$FILE"

cd "$HOME/notes" || exit 1
git add .
git commit -m "note: $DATE" --allow-empty
git push && echo "Synced" || echo "Offline - run 'push' when back on WiFi"
SCRIPT
chmod +x ~/bin/note
```

### `push` — Manual sync when offline earlier

```bash
cat > ~/bin/push << 'SCRIPT'
#!/bin/sh
export PATH=$HOME/bin:$PATH
export GIT_SSH_COMMAND="ssh -i /home/root/.ssh/id_remarkable.db"
cd "$HOME/notes" || exit 1
git add .
git commit -m "sync: $(date '+%Y-%m-%d %H:%M')" --allow-empty
git push && echo "Synced" || echo "Still offline - try again later"
SCRIPT
chmod +x ~/bin/push
```

**Test end-to-end right now:**

```bash
note
```

Type something → **Ctrl+S** → **Ctrl+Q** → should print `Synced`

---

## Part 7 — Install Vellum + AppLoad

This is the key step that eliminates SSH from your daily workflow. Vellum is the current community package manager for reMarkable 3.x firmware. (Toltec is incompatible with 3.4+ and will soft-brick your device — do not use it.)

AppLoad adds a tappable icon to your normal reMarkable home screen. Tapping it launches the terminal. Your stock UI — PDFs, EPUBs, notebooks, annotations — is completely unchanged and always accessible.

### 7.1 Install Vellum

```bash
wget --no-check-certificate -O bootstrap.sh \
  https://github.com/vellum-dev/vellum-cli/releases/latest/download/bootstrap.sh
echo "3958563255dd98d34a45d11e7884cd53d9f5afdd1f19ce3cbbbf6ee409d3c894 bootstrap.sh" \
  | sha256sum -c && bash bootstrap.sh
```

### 7.2 Install AppLoad

```bash
vellum update
vellum add appload
```

### 7.3 Register the Notes Terminal as a Tappable App

```bash
mkdir -p ~/.local/share/applications

cat > ~/.local/share/applications/notes-terminal.sh << 'EOF'
#!/bin/sh
export PATH=$HOME/bin:$PATH
export TERM=xterm
systemctl stop xochitl
yaft
systemctl start xochitl
EOF
chmod +x ~/.local/share/applications/notes-terminal.sh
```

After a reboot, a **"Notes Terminal"** icon will appear on your reMarkable home screen alongside your notebooks. Tap it → terminal opens on the e-ink screen → connect keyboard → type `note`.

When you quit (`exit` or `Ctrl+D`), xochitl restarts and you're back to the normal reMarkable UI instantly.

---

## Part 8 — The Reinstall Script

After any firmware upgrade, this restores everything in ~2 minutes.

```bash
cat > ~/setup.sh << 'SCRIPT'
#!/bin/sh
set -e
echo "==> Restoring reMarkable environment..."
mkdir -p ~/bin

# git was present at /home/root/bin/git on the tested device — verify it's still on PATH
git --version > /dev/null 2>&1 || echo "WARNING: git not found — restore the working git binary before syncing notes"

# micro
if ! ~/bin/micro --version > /dev/null 2>&1; then
  echo "--> Installing micro..."
  cd /tmp
  wget -q https://github.com/zyedidia/micro/releases/download/v2.0.15/micro-2.0.15-linux-arm.tar.gz
  tar xzf micro-2.0.15-linux-arm.tar.gz
  mv micro-2.0.15/micro ~/bin/micro
  chmod +x ~/bin/micro
fi

# yaft — restore from ~/bin/ (it lives there and survives upgrades)
# If ~/bin/yaft is missing (first setup on new device), re-run Part 4.3 from the guide
if [ ! -f ~/bin/yaft ]; then
  echo "WARNING: ~/bin/yaft not found."
  echo "  If this is after a firmware upgrade, yaft should still be in ~/bin/"
  echo "  since ~/bin/ survives upgrades. If it's genuinely missing, re-run Part 4.3."
fi

# PATH
grep -q 'PATH.*HOME/bin' ~/.bashrc 2>/dev/null || \
  echo 'export PATH=$HOME/bin:$PATH' >> ~/.bashrc

# SSH config
mkdir -p ~/.ssh
if [ -f ~/.ssh/id_remarkable ] && [ ! -f ~/.ssh/id_remarkable.db ]; then
  dropbearconvert openssh dropbear ~/.ssh/id_remarkable ~/.ssh/id_remarkable.db
  chmod 600 ~/.ssh/id_remarkable.db
fi
cat > ~/.ssh/config << 'EOF'
Host github.com
  IdentityFile ~/.ssh/id_remarkable.db
  User git
  StrictHostKeyChecking accept-new
EOF
git config --global core.sshCommand "ssh -i /home/root/.ssh/id_remarkable.db"

# Re-mask updates
systemctl disable --now update-engine 2>/dev/null || true
systemctl mask update-engine 2>/dev/null || true

# Restore notes repo if missing
if [ ! -d ~/notes/.git ]; then
  echo "--> Restoring notes repo..."
  git clone git@github.com:YOUR_USERNAME/obsidian-notes.git ~/notes
fi
cd ~/notes
git config user.email "you@example.com"
git config user.name "reMarkable"
git config core.sshCommand "ssh -i /home/root/.ssh/id_remarkable.db"

# Re-enable Vellum and AppLoad
vellum reenable
vellum upgrade

echo ""
echo "✓ All done. Tap the Notes Terminal icon or run 'note' to start writing."
SCRIPT
chmod +x ~/setup.sh
```

> **After any firmware upgrade:** SSH in once, run `~/setup.sh`. Everything comes back. Your notes were never at risk — they're on GitHub.

---

## Part 9 — Obsidian iOS Setup

### 9.1 Install Obsidian Git Plugin

Obsidian → Settings → Community Plugins → Browse → search **Obsidian Git** → Install → Enable

### 9.2 Configure

Settings → Obsidian Git:

| Setting | Value |
|---------|-------|
| Pull on startup | ✅ On |
| Auto pull interval | `5` minutes |
| Auto push interval | `0` (reMarkable handles pushing) |
| Commit message | `sync: {{date}}` |

### 9.3 Clone Your Vault to iCloud

1. Install [**Working Copy**](https://apps.apple.com/app/working-copy/id896694807) on iPhone (free tier works)
2. Clone `https://github.com/YOUR_USERNAME/obsidian-notes`
3. Save to: **iCloud Drive → Obsidian → obsidian-notes**
4. Obsidian → **Open vault** → select that folder

Working Copy is only needed for this initial clone. Obsidian Git handles all future syncing automatically.

---

## Part 10 — Keyboard Guide

### Bluetooth (Best for on-the-go)

Any standard Bluetooth keyboard pairs natively with the reMarkable.

| Keyboard | Why | Price |
|----------|-----|-------|
| **Logitech K380** | Compact, 2-year battery, rock solid | ~$40 |
| **iClever BK08** | Folds to jacket-pocket size | ~$35 |
| **Keychron K3** | Premium feel, compact TKL | ~$80 |

**To pair:** reMarkable → Settings → Bluetooth → pair your keyboard

Once paired it reconnects automatically. Your daily flow from a park bench:

```
1. Wake reMarkable
2. Tap "Notes Terminal" icon on home screen
3. Keyboard connects automatically
4. Type: note
5. Write in micro (Ctrl+S to save, Ctrl+Q when done)
6. Auto-syncs to GitHub → Obsidian pulls it on iPhone
```

No computer. No SSH. No background processes on any device.

### USB Keyboard (Desk use)

The reMarkable 2 USB-C port supports USB OTG. Get a **USB-C to USB-A OTG adapter** (~$8) and any standard USB keyboard plugs straight in. Zero pairing, works instantly.

### reMarkable Type Folio (~$199)

Works with this setup — the keyboard inputs into yaft like any other. But the smart-integration features (auto-wake, native text mode) are designed for reMarkable's own UI, not a terminal, so they're mostly wasted here. A $35–$40 Bluetooth keyboard does the same job. Only consider it if you want the all-in-one form factor as a luxury.

---

## Part 11 — After a Firmware Upgrade

```bash
# 1. SSH in
ssh root@192.168.1.X

# 2. Run the reinstall script
~/setup.sh

# Done. Tap the Notes Terminal icon and everything works.
```

Your notes are always safe on GitHub. The upgrade only affects system-level tools, and `setup.sh` brings them all back.

---

## Daily Workflow

### In a park, coffee shop, or anywhere:
```
Wake reMarkable → tap Notes Terminal icon
Bluetooth keyboard auto-connects
Type: note
Write your markdown note
Ctrl+Q → auto-pushes to GitHub
Open Obsidian on iPhone → note is there
```

### Offline (no WiFi):
```
Write and quit as normal
Shows: "⚠ Offline — run 'push' when back on WiFi"
When back on WiFi: type push
Obsidian picks it up next time you open the app
```

---

## Quick Reference

| Command | What it does |
|---------|--------------|
| `note` | Open today's note, auto-sync on exit |
| `push` | Manually sync offline notes |
| `~/setup.sh` | Restore everything after a firmware upgrade |
| **Ctrl+S** | Save in micro |
| **Ctrl+Q** | Quit micro (triggers sync) |

---

## Full Setup Checklist

**reMarkable (via SSH, one-time):**
- [ ] SSH confirmed (Part 1)
- [ ] Auto-updates disabled (Part 2)
- [ ] GitHub SSH key created and added (Part 3)
- [ ] `git --version` confirmed (Part 4.1)
- [ ] `micro` in `~/bin/` (Part 4.2)
- [ ] `yaft` in `~/bin/` — Option A or B (Part 4.3)
- [ ] Notes repo cloned to `~/notes/` (Part 5)
- [ ] `note` and `push` scripts created and tested (Part 6)
- [ ] Vellum + AppLoad installed (Part 7)
- [ ] Notes Terminal icon visible on home screen (Part 7)
- [ ] `~/setup.sh` saved (Part 8)

**Obsidian iOS:**
- [ ] Obsidian Git plugin installed and configured (Part 9)
- [ ] Vault cloned into iCloud Drive via Working Copy (Part 9)

**Keyboard:**
- [ ] Bluetooth keyboard paired OR USB OTG adapter ready (Part 10)
- [ ] End-to-end test: tap icon → type note → appears in Obsidian ✓
