# Vellum + reMarkable OS 3.27 Compatibility Contribution Plan

Author: Corbin Harris  
Target Device: reMarkable 2  
Firmware Target: reMarkable OS 3.27.x  
Primary Goal: Validate and contribute AppLoad/Vellum compatibility support for reMarkable OS 3.27.

---

# 1. Project Overview

This project aims to determine whether AppLoad and XOVI function correctly on reMarkable OS 3.27 and, if successful, contribute compatibility support upstream to Vellum.

Current blocker:

```bash
depends="qt-resource-rebuilder remarkable-os>=3.26 remarkable-os<3.27"
```

The current package metadata intentionally blocks installation on 3.27.

Important:
This does NOT necessarily mean AppLoad is incompatible.

The real work of this project is:
- compatibility validation
- testing
- rollback verification
- issue investigation
- documentation
- safe contribution workflow

The actual code change may only be a single line.

---

# 2. Success Criteria

This project is successful if:

- AppLoad installs successfully on 3.27
- xochitl remains stable
- the device remains recoverable
- testing is thoroughly documented
- rollback procedures are validated
- a clean upstream PR can be opened

A successful contribution does NOT require:
- advanced programming
- reverse engineering
- architecture changes

---

# 3. High-Level Workflow

This guide follows the safest possible order:

1. Backup and recovery preparation
2. Verify SSH recovery access
3. Research existing upstream work
4. Prepare GitHub workflow
5. Create isolated test branch
6. Modify compatibility metadata
7. Test on-device carefully
8. Document all findings
9. Validate rollback procedures
10. Submit upstream PR if stable

Do NOT skip ahead.

---

# 4. Phase 0 — Backup & Recovery Preparation

This phase is mandatory.

Never experiment on the device without a recovery path.

---

# 5. Backup Strategy

## 5.1 Cloud Sync Verification

Ensure:
- reMarkable cloud sync completes successfully
- all important notebooks appear in mobile/desktop apps

---

## 5.2 Manual Exports

Export critical:
- PDFs
- notebooks
- templates
- personal notes

Store copies in:
- iCloud
- external drive
- GitHub repo (optional)

---

## 5.3 Why This Matters

The most likely failures are:
- launcher instability
- xochitl crashes
- broken UI integration

Not:
- permanent hardware damage

Still, backups eliminate unnecessary stress during testing.

---

# 6. Verify SSH Recovery Access

SSH access is the primary recovery mechanism.

As long as SSH works, the device is usually recoverable.

---

## 6.1 Find Device IP

On the reMarkable:

Settings → Help → Copyrights and licenses

Record:
- IP address
- SSH password

---

## 6.2 Verify SSH Access

From Mac terminal:

```bash
ssh root@192.168.1.X
```

Success looks like:

```bash
root@reMarkable:~#
```

Document:
- device IP
- successful login date

---

## 6.3 Recovery Importance

If xochitl crashes:
- SSH still allows package removal
- services can be restarted
- logs can be inspected

SSH is your safety net.

---

# 7. Research Existing Upstream Work

Before modifying anything:
research whether work already exists.

This avoids duplicate effort and helps you understand project expectations.

---

# 8. Search Existing Issues

Search these repositories:

## Vellum

```text
https://github.com/vellum-dev/vellum
```

---

## AppLoad

```text
https://github.com/asivery/rm-appload
```

---

# 9. Search Terms

Search for:

```text
3.27
appload
xovi
xochitl
compatibility
crash
launcher
```

Also search:
- closed issues
- merged pull requests
- discussions

---

# 10. What to Look For

## Good Signs

Examples:
- "works on 3.27"
- successful screenshots
- compatibility testing
- metadata-only discussions

---

## Warning Signs

Examples:
- xochitl restart loops
- launcher failures
- rendering corruption
- sleep/wake instability
- boot failures

---

# 11. How to Read Issues Properly

Good engineering issue reports contain:
- firmware version
- exact commands
- reproduction steps
- logs
- screenshots
- expected behavior
- observed behavior

Avoid trusting vague reports like:
> "it broke"

---

# 12. Where to Ask Questions

---

# 13. GitHub Issues

Use for:
- reproducible bugs
- compatibility reports
- proposed fixes

Best after:
- local testing
- collecting logs
- documenting steps

---

# 14. GitHub Discussions

Use for:
- exploratory questions
- compatibility curiosity
- asking if a PR would be welcome

Example:

```text
Has anyone validated AppLoad on reMarkable OS 3.27 yet?
```

---

# 15. Discord Communities

Discord is often the best place for beginner troubleshooting.

Advantages:
- fast feedback
- informal support
- easier troubleshooting conversations
- easier clarification questions

Potential places:
- Vellum Discord
- reMarkable community servers
- rm-hacks communities

---

# 16. How to Ask Good Questions

Always include:
- device model
- firmware version
- exact commands
- expected behavior
- observed behavior

Good example:

```text
I'm testing AppLoad compatibility on rmOS 3.27.
I modified the dependency range locally and installation succeeded.
Has anyone observed xochitl instability after sleep/wake cycles?
```

Avoid:
- "it doesn't work"
- giant unexplained logs
- asking before reading issues/docs

---

# 17. Prepare GitHub Workflow

---

# 18. Fork the Repository

Fork:

```text
https://github.com/vellum-dev/vellum
```

Into:
your personal GitHub account.

---

# 19. Clone Locally

```bash
git clone https://github.com/YOUR_USERNAME/vellum.git
cd vellum
```

---

# 20. Create a Feature Branch

```bash
git checkout -b feature/rm327-appload-support
```

Good branch names:
- descriptive
- short
- specific

---

# 21. Make Minimal Changes

Target file:

```text
packages/appload/VELBUILD
```

Likely change:

FROM:

```bash
remarkable-os>=3.26 remarkable-os<3.27
```

TO:

```bash
remarkable-os>=3.26 remarkable-os<3.28
```

Do NOT:
- refactor unrelated code
- rename files
- make speculative edits

Small PRs merge faster.

---

# 22. Commit Properly

```bash
git add .
git commit -m "Allow AppLoad installation on reMarkable OS 3.27"
```

---

# 23. Phase 1 — Testing Framework

This is the most valuable part of the project.

Most open-source maintainers do not have:
- every firmware version
- every hardware version
- extensive recovery validation

You do.

---

# 24. Testing Philosophy

You are NOT only testing:
> "does it install?"

You are validating:
- stability
- persistence
- recoverability
- UI integrity
- sleep/wake behavior
- reboot reliability

---

# 25. Create a Testing Log

Create:

```bash
touch ~/testing-notes.md
```

Template:

```md
## Test Case

Date:
Firmware:
Package Version:

Steps:
1.
2.
3.

Expected:
Observed:

Logs:

Result:
PASS / FAIL
```

---

# 26. Test Case 1 — Clean Installation

Goal:
Verify package installs successfully.

Steps:
1. install modified package
2. reboot device

Pass:
- installation succeeds
- no boot issues

Fail:
- install rejection
- reboot instability

---

# 27. Test Case 2 — xochitl Stability

Goal:
Verify UI remains stable.

Steps:
1. launch AppLoad
2. return to xochitl
3. open notebooks
4. annotate PDFs
5. switch between documents
6. sleep/wake device

Pass:
- no crashes
- no freezes
- launcher functional

Fail:
- hangs
- rendering corruption
- restart loops

---

# 28. Test Case 3 — Long Duration Stability

Goal:
Identify delayed failures.

Steps:
1. use device normally for 24 hours
2. multiple sleep/wake cycles
3. reboot twice

Pass:
- stable behavior

Fail:
- gradual instability
- memory leaks
- degraded responsiveness

---

# 29. Test Case 4 — Rollback Validation

Goal:
Verify recoverability.

Steps:
1. uninstall modified package
2. restart xochitl
3. reboot device

Pass:
- clean restoration

Fail:
- lingering instability

---

# 30. Test Case 5 — Offline/Recovery Validation

Goal:
Ensure SSH recovery works during failures.

Steps:
1. intentionally restart xochitl
2. reconnect over SSH
3. verify commands still work

Pass:
- SSH remains stable
- device recoverable

---

# 31. Recovery Procedures

Never test without understanding recovery steps.

---

# 32. Recovery Level 1 — Restart xochitl

If the UI freezes but SSH still works:

```bash
systemctl restart xochitl
```

This is the most common recovery action.

---

# 33. Recovery Level 2 — Remove AppLoad

```bash
vellum remove appload
```

Then restart xochitl:

```bash
systemctl restart xochitl
```

---

# 34. Recovery Level 3 — Reboot Device

```bash
reboot
```

---

# 35. Recovery Level 4 — Restore Configurations

Restore:
- scripts
- configs
- modified files

Your notes remain safe because:
- GitHub stores them
- Obsidian stores them
- iCloud stores them

---

# 36. Recovery Level 5 — Factory Reset (Last Resort)

Extremely unlikely.

Only necessary if:
- boot process corrupted
- SSH inaccessible
- repeated boot failures occur

This is NOT the expected risk level for AppLoad testing.

---

# 37. Safe Testing Rules

## Rule 1
Only change ONE thing at a time.

---

## Rule 2
Document every command you run.

---

## Rule 3
Verify SSH access after every major change.

---

## Rule 4
Do not test while tired or rushing.

Recovery mistakes happen under stress.

---

## Rule 5
Keep the first PR extremely small.

Tiny compatibility PRs are easier to review and merge.

---

# 38. Submitting the Pull Request

Do NOT submit immediately after installation success.

First validate:
- stability
- reboot behavior
- sleep/wake cycles
- rollback procedures

---

# 39. Recommended PR Structure

Title:

```text
Enable AppLoad installation on reMarkable OS 3.27
```

---

## Suggested PR Contents

Include:
- device model
- firmware version
- testing performed
- rollback validation
- screenshots/logs if helpful

Example:

```md
Tested on:
- reMarkable 2
- rmOS 3.27.x

Validated:
- installation
- reboot
- sleep/wake
- launcher functionality
- package removal

Observed:
- no xochitl instability
- no UI corruption after 24h testing
```

---

# 40. Final Notes

This project is primarily:
- systems validation
- testing
- documentation
- engineering discipline

Not:
- advanced programming

That is still extremely valuable open-source contribution work.

Especially in small hardware communities where:
- maintainers lack device coverage
- compatibility testing is limited
- reproducible validation matters enormously

Your testing and documentation may be more valuable than the code change itself.

---

# Appendix A — Useful Commands

## Restart xochitl

```bash
systemctl restart xochitl
```

---

## Reboot Device

```bash
reboot
```

---

## Remove AppLoad

```bash
vellum remove appload
```

---

## Check Installed Packages

```bash
vellum list
```

---

## Check Current Firmware Version

```bash
cat /etc/version
```

---

## Verify SSH Connectivity

```bash
ssh root@192.168.1.X
```

---

# Appendix B — Suggested Directory Structure

```text
~/notes/
~/bin/
~/testing-notes.md
~/setup.sh
~/recovery-notes.md
~/screenshots/
```

---

# Appendix C — Recommended Mindset

Think like a reliability engineer:
- change slowly
- test methodically
- document everything
- preserve recovery paths

A careful tester with strong documentation habits is incredibly valuable in open source.