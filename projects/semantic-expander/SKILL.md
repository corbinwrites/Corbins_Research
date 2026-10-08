---
name: semantic-expander
description: Expands simple, "low-fidelity" user requests into comprehensive, multi-faceted plans or queries. Use when a user provides a general instruction (e.g., "research taxes") that requires broader context, specific technical components, or multi-step execution.
---

# Semantic Expander

This skill serves as a "pre-processor" for general requests. It intercepts simple instructions and expands them into high-fidelity plans.

## Strategy

When a general or low-fidelity request is received:
1. **Identify the Domain**: Determine if the request falls into categories like Finance, Software, Research, etc.
2. **Read Reference Patterns**: Refer to [references/expansion-patterns.md](references/expansion-patterns.md) for domain-specific expansion keys.
3. **Brainstorm & Expand**: For each expansion key, generate specific sub-tasks or search queries.
4. **Present the High-Fidelity Plan**: Show the user the expanded plan before executing, or execute the expanded components in parallel.

## Example Workflow

**User:** "Fix the bug in the login form."

**Semantic Expander Action:**
1. Identify Domain: Software Development.
2. Load Expansion Keys from `references/expansion-patterns.md`.
3. Generate Expansion:
   - Reproduction: "Identify the exact error message and steps to reproduce."
   - Analysis: "Check `src/auth/login.ts` and related server logs."
   - Validation: "Add a unit test for the failing case."
4. **Execution/Response:** "I'll start by reproducing the login bug, checking the auth logs, and preparing a new unit test to verify the fix."

## Continuous Expansion

If a domain is not found in the references, apply general "Who, What, Where, When, Why, How" heuristics to ensure the request is thoroughly addressed.
