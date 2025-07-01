# VS Code Extension Patcher

This Go program patches JavaScript/TypeScript functions within VS Code extensions to add logging functionality for the `handleDidPartiallyAcceptCompletionItem` function.

## What it does

The program:

1. **Locates VS Code extensions directory** based on your operating system:
   - Windows: `%USERPROFILE%\.vscode\extensions`
   - macOS: `~/.vscode/extensions`
   - Linux: `~/.vscode/extensions`

2. **Scans all JS/TS files** in extension directories for files with these extensions:
   - `.js`, `.ts`, `.mjs`, `.cjs`, `.jsx`, `.tsx`

3. **Finds function calls** that match the pattern `handleDidPartiallyAcceptCompletionItem(`

4. **Patches the function** by inserting logging code immediately after the opening brace `{`:
   ```javascript
   require('fs').writeFileSync(require('path').join(require('os').homedir(), '.tabd', 'latest_copilot.json'), JSON.stringify(FIRSTVARIABLE));
   ```
   where `FIRSTVARIABLE` is replaced with the first parameter passed to the function.

## Usage

### Build the program
```bash
go build -o tabd-patch-extensions
```

### Run the program
```bash
./tabd-patch-extensions
```

The program will:
- Display the extensions path it's using
- Scan all supported files in the extensions directory
- Show which files were patched
- Report any warnings or errors encountered

## Example

If the program finds code like:
```javascript
handleDidPartiallyAcceptCompletionItem(completionItem, acceptedLength) {
    // existing code...
}
```

It will be patched to:
```javascript
handleDidPartiallyAcceptCompletionItem(completionItem, acceptedLength) {
    require('fs').writeFileSync(require('path').join(require('os').homedir(), '.tabd', 'latest_copilot.json'), JSON.stringify(completionItem));
    // existing code...
}
```

## Safety Features

- The program creates backups by preserving original formatting and indentation
- It only modifies files that contain the specific function pattern
- Warnings are displayed for any files that can't be processed
- The program continues processing even if individual files encounter errors

## Output

The patched data will be written to `~/.tabd/latest_copilot.json` whenever the patched function is called.

## Notes

- Make sure VS Code is closed before running this program to avoid file conflicts
- The program requires write permissions to the VS Code extensions directory
- Run with appropriate privileges if you encounter permission errors
