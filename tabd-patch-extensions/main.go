package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
)

// ExtensionMetadata holds information about a VS Code extension
type ExtensionMetadata struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Publisher   string `json:"publisher"`
}

// getExtensionMetadata reads the package.json file and extracts extension metadata
func getExtensionMetadata(extensionDir string) (*ExtensionMetadata, error) {
	packageJsonPath := filepath.Join(extensionDir, "package.json")

	// Check if package.json exists
	if _, err := os.Stat(packageJsonPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("package.json not found in %s", extensionDir)
	}

	// Read package.json
	content, err := os.ReadFile(packageJsonPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read package.json: %w", err)
	}

	// Parse JSON
	var metadata ExtensionMetadata
	if err := json.Unmarshal(content, &metadata); err != nil {
		return nil, fmt.Errorf("failed to parse package.json: %w", err)
	}

	return &metadata, nil
}

// getDisplayName returns the display name or falls back to name
func (em *ExtensionMetadata) getDisplayName() string {
	if em.DisplayName != "" {
		return em.DisplayName
	}
	return em.Name
}

// getSupportedExtensions returns the list of JavaScript/TypeScript file extensions to check
func getSupportedExtensions() []string {
	return []string{".js", ".ts", ".mjs", ".cjs", ".jsx", ".tsx"}
}

// getVSCodeExtensionsPath returns the VS Code extensions directory path based on the OS
func getVSCodeExtensionsPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %w", err)
	}

	switch runtime.GOOS {
	case "windows":
		return filepath.Join(homeDir, ".vscode", "extensions"), nil
	case "darwin", "linux":
		return filepath.Join(homeDir, ".vscode", "extensions"), nil
	default:
		return "", fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
}

// isSupportedFile checks if the file has a supported extension
func isSupportedFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	supportedExts := getSupportedExtensions()
	for _, supportedExt := range supportedExts {
		if ext == supportedExt {
			return true
		}
	}
	return false
}

// patchFile processes a single file and applies patches if needed
func patchFile(filePath string, extensionMeta *ExtensionMetadata) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read file %s: %w", filePath, err)
	}

	originalContent := string(content)

	// Check if patch is already present
	if strings.Contains(originalContent, "/*tabd*/") {
		fmt.Printf("Patch already exists in %s, skipping\n", filePath)
		return nil
	}

	// Pattern to find the function call with opening brace - handle minified code
	functionPattern := regexp.MustCompile(`(?:handleDidPartiallyAcceptCompletionItem|handleDidShowCompletionItem)\s*\(([^)]*)\)\s*\{`)

	// Find all matches with their positions
	matches := functionPattern.FindAllStringSubmatchIndex(originalContent, -1)
	if len(matches) == 0 {
		return nil // No matches found
	}

	newContent := originalContent
	patchCount := 0

	// Process matches from end to beginning to avoid position shifts
	for i := len(matches) - 1; i >= 0; i-- {
		match := matches[i]
		if len(match) < 4 { // Need at least start, end, param_start, param_end
			continue
		}

		// Extract the full match and parameters
		matchStart := match[0]
		matchEnd := match[1]
		paramStart := match[2]
		paramEnd := match[3]

		fullMatch := originalContent[matchStart:matchEnd]
		params := originalContent[paramStart:paramEnd]

		// Skip if already patched (check if patch code is in the immediate vicinity)
		contextStart := matchStart
		contextEnd := matchEnd + 200 // Check 200 characters after the match
		if contextEnd > len(originalContent) {
			contextEnd = len(originalContent)
		}
		context := originalContent[contextStart:contextEnd]
		if strings.Contains(context, "/*tabd*/") {
			fmt.Printf("Function already patched in %s, skipping\n", filePath)
			continue
		}

		// Extract the first variable from the parameters
		firstVar, err := extractFirstVariableFromParams(params)
		if err != nil {
			fmt.Printf("Warning: Could not extract variable from parameters '%s' in %s: %v\n", params, filePath, err)
			continue
		}

		// Create the patch code with error handling and fallbacks
		extensionName := "unknown"
		if extensionMeta != nil {
			// Escape single quotes in extension name to prevent JavaScript syntax errors
			extensionName = strings.ReplaceAll(extensionMeta.getDisplayName(), "'", "\\'")
		}

		// Create an enhanced data object that includes both the original data and extension metadata
		patchCode := fmt.Sprintf(`/*tabd*/try{require('vscode').commands.executeCommand('tabd._internal',JSON.stringify({...%s,'_extensionName':'%s','_timestamp':new Date().getTime(),'_type':'inlineCompletion'}));}catch(e){}`, firstVar, extensionName)

		// Find the opening brace position within the match
		bracePos := strings.Index(fullMatch, "{")
		if bracePos == -1 {
			continue
		}

		// Create the patched version
		beforeBrace := fullMatch[:bracePos+1]
		afterBrace := fullMatch[bracePos+1:]
		patchedMatch := beforeBrace + patchCode + afterBrace

		// Replace in the content using position-based replacement
		newContent = newContent[:matchStart] + patchedMatch + newContent[matchEnd:]
		patchCount++
	}

	if patchCount > 0 {
		fmt.Printf("Patched %d function(s) in %s\n", patchCount, filePath)
		return os.WriteFile(filePath, []byte(newContent), 0644)
	}

	return nil
}

// extractFirstVariableFromParams extracts the first variable name from function parameters
func extractFirstVariableFromParams(params string) (string, error) {
	// Split by comma and take the first parameter
	parts := strings.Split(params, ",")
	if len(parts) == 0 {
		return "", fmt.Errorf("no parameters found")
	}

	// Clean up the first parameter (remove whitespace)
	firstParam := strings.TrimSpace(parts[0])

	// Extract variable name using regex
	pattern := `^([a-zA-Z_$][a-zA-Z0-9_$]*)`
	re := regexp.MustCompile(pattern)
	matches := re.FindStringSubmatch(firstParam)

	if len(matches) < 2 {
		return "", fmt.Errorf("could not extract variable name from parameter: %s", firstParam)
	}

	return matches[1], nil
}

// walkExtensions recursively walks through the extensions directory and processes files
func walkExtensions(extensionsPath string) error {
	// First, find all extension directories (they should contain package.json)
	entries, err := os.ReadDir(extensionsPath)
	if err != nil {
		return fmt.Errorf("failed to read extensions directory: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		extensionDir := filepath.Join(extensionsPath, entry.Name())

		// Try to get extension metadata
		extensionMeta, err := getExtensionMetadata(extensionDir)
		if err != nil {
			// If we can't get metadata, still try to patch files but with nil metadata
			fmt.Printf("Warning: Could not read extension metadata for %s: %v\n", entry.Name(), err)
		} else {
			fmt.Printf("Processing extension: %s\n", extensionMeta.getDisplayName())
		}

		// Walk through all files in this extension directory
		err = filepath.WalkDir(extensionDir, func(path string, d fs.DirEntry, walkErr error) error {
			if walkErr != nil {
				fmt.Printf("Warning: Error accessing %s: %v\n", path, walkErr)
				return nil // Continue walking even if there's an error with one file/directory
			}

			// Skip directories
			if d.IsDir() {
				return nil
			}

			// Check if this is a supported file type
			if !isSupportedFile(path) {
				return nil
			}

			// Process the file with extension metadata
			if err := patchFile(path, extensionMeta); err != nil {
				fmt.Printf("Warning: Error processing %s: %v\n", path, err)
			}

			return nil
		})

		if err != nil {
			fmt.Printf("Warning: Error walking extension directory %s: %v\n", extensionDir, err)
		}
	}

	return nil
}

func main() {
	fmt.Println("VS Code Extension Patcher")
	fmt.Println("========================")

	// Get the VS Code extensions path
	extensionsPath, err := getVSCodeExtensionsPath()
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Extensions path: %s\n", extensionsPath)

	// Check if the extensions directory exists
	if _, err := os.Stat(extensionsPath); os.IsNotExist(err) {
		fmt.Printf("Error: VS Code extensions directory does not exist: %s\n", extensionsPath)
		os.Exit(1)
	}

	// Walk through all extensions and patch files
	fmt.Println("Scanning for files to patch...")
	if err := walkExtensions(extensionsPath); err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Patching complete!")
}
