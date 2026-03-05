# Bob Extensions Installer

A command-line tool to easily install and manage Bob-Shell extensions from git repositories or local paths.

## Quick Start with npx

You can use this tool directly with `npx` without installing it globally:

```bash
# Install an extension from a local path
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions install ./path/to/extension

# Install an extension from a GitHub URL
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions install https://github.com/user/extension.git

# Install with force reinstall
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions install --force ./path/to/extension

# Uninstall an extension
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions uninstall extension-name

# List installed extensions
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions list
```

**Note:** The `-y` flag automatically answers "yes" to the npx installation prompt, allowing non-interactive usage.

## Installation

### Global Installation (Optional)

```bash
npm install -g github:IgorTodorovskiIBM/bob-gemini-extensions
```

After global installation, you can use `bob-install` directly:

```bash
bob-install install ./path/to/extension
bob-install uninstall extension-name
bob-install list
```

## Usage

### Install Command

Install an extension from various sources:

```bash
# From local path (relative or absolute)
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions install ./my-extension
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions install /absolute/path/to/extension

# From GitHub HTTPS URL
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions install https://github.com/user/extension.git

# From GitHub SSH URL
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions install git@github.com:user/extension.git

# Force reinstall (uninstalls first if already installed)
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions install --force ./my-extension
```

### Uninstall Command

Remove an installed extension:

```bash
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions uninstall extension-name
```

### List Command

Show all installed extensions:

```bash
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions list
```

## Features

### ✅ Local Path Installation
- Installs directly from local directories
- Maintains valid source references (no temp directory issues)
- Preserves git history and remote information

### ✅ Remote URL Installation
- Supports HTTPS and SSH git URLs
- Clones to temporary directory for processing
- Automatic cleanup after installation

### ✅ Bob CLI Bug Workarounds
- Handles "already installed" false errors during installation
- Handles "not found" false errors during uninstallation
- Provides clear feedback when workarounds are applied

### ✅ Extension Compatibility
- Automatically renames `gemini-extension.json` to `bob-extension.json`
- Preserves `.git` folder for extensions that need git information
- Full consent handling for third-party extensions

## How It Works

### Local Path Installation
1. Validates the local path exists
2. Checks for `gemini-extension.json` or `bob-extension.json`
3. Renames if needed (without modifying git history)
4. Installs directly from the local path
5. Records the actual local path as source (not a temp directory)

### Remote URL Installation
1. Creates temporary directory under `~/.bob/.bob-install-*`
2. Clones the repository to temp directory
3. Processes extension files (rename if needed)
4. Installs from temp directory
5. Cleans up temp directory after installation

## Extension Format

Extensions should contain:
- `bob-extension.json` (or `gemini-extension.json` which will be auto-renamed)
- Extension files and resources
- Optional `.git` folder for version tracking

Example `bob-extension.json`:
```json
{
  "name": "my-extension",
  "version": "1.0.0",
  "description": "My awesome extension",
  "main": "index.js"
}
```

## Troubleshooting

### "Already installed" error
The tool includes workarounds for Bob CLI bugs. If you see:
```
✔ Successfully installed extension-name
(Workaround applied for Bob CLI duplicate detection bug)
```
This means the installation succeeded despite Bob CLI reporting an error.

### Force Reinstall
If an extension is truly stuck, use the `--force` flag:
```bash
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions install --force ./my-extension
```

### Check Installation
Verify the extension is properly installed:
```bash
npx -y github:IgorTodorovskiIBM/bob-gemini-extensions list
```

## Development

### Local Development
```bash
# Clone the repository
git clone https://github.com/IgorTodorovskiIBM/bob-gemini-extensions.git
cd bob-gemini-extensions

# Install dependencies
npm install

# Run locally
node bin/bob-install.js install ./path/to/extension
```

### Testing
```bash
# Test local installation
node bin/bob-install.js install ./test-extension

# Test uninstallation
node bin/bob-install.js uninstall test-extension

# Test force reinstall
node bin/bob-install.js install --force ./test-extension
```

## Requirements

- Node.js 14 or higher
- Git installed and available in PATH
- Bob-Shell installed and configured

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Known Issues

- Bob CLI sometimes reports duplicate errors (workarounds included)
- Extension names are derived from directory/repo names
- Version specification not yet supported for shorthand names

## Roadmap

- [ ] Support for extension version specification
- [ ] Extension marketplace integration
- [ ] Batch installation from config file
- [ ] Extension update checking
- [ ] Extension dependency resolution