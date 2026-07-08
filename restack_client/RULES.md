# Post-Patch Validation Rule Sheet

1. After every code patch or file edit, always perform post-patch validation.
2. Post-patch validation means:
   - Read the affected file immediately after the patch.
   - Compare the file contents to the intended changes.
   - Confirm that the patch (additions/removals) is present and visible.
   - If the patch is not present, report failure and attempt to debug or reapply.
   - If the patch is present, show the actual diff and confirm success.
3. Never report “patch applied” or “change made” unless the file contents are verified.
4. This rule applies to all code edits, regardless of request type or file.

## How to enforce this rule
- Simply mention "check RULES.md" or "follow rule sheet" in your prompt.
- I will automatically reference RULES.md and apply post-patch validation for every code edit.
- You can update RULES.md at any time to change or add rules.
