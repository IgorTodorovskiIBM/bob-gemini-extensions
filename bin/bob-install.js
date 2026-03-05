#!/usr/bin/env node

const { program } = require('commander');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

program
  .name('bob-install')
  .description('Install and manage Bob extensions from git repositories');

program
  .command('install <extension>')
  .description('Install an extension (e.g., skills@latest, skills@v1.0.0, or full git URL)')
  .option('-d, --directory <dir>', 'Installation directory', process.cwd())
  .option('-f, --force', 'Force reinstall if already installed')
  .action(async (extension, options) => {
    try {
      // Parse extension name and version
      let repoUrl, version, extensionName, isLocalPath = false, localPath = null;
      
      if (extension.startsWith('http://') || extension.startsWith('https://') || extension.startsWith('git@')) {
        // Full git URL provided
        repoUrl = extension;
        extensionName = path.basename(repoUrl, '.git');
        version = 'latest';
      } else if (extension.startsWith('/') || extension.startsWith('./') || extension.startsWith('../')) {
        // Local path provided - install directly without temp directory
        isLocalPath = true;
        localPath = path.resolve(extension);
        extensionName = path.basename(localPath);
        version = 'latest';
      } else {
        // Format: extensionName@version
        const parts = extension.split('@');
        extensionName = parts[0];
        version = parts[1] || 'latest';
        
        // Construct GitHub URL (assuming bob-gemini-extensions organization/user)
        // You can customize this to your repository structure
        repoUrl = `https://github.com/bob-extensions/${extensionName}.git`;
      }

      // Check if force reinstall is requested
      if (options.force) {
        try {
          console.log(chalk.dim(`Force reinstall requested, uninstalling existing extension...`));
          execSync(`bob extensions uninstall ${extensionName}`, { stdio: 'pipe' });
          console.log(chalk.dim(`✓ Uninstalled existing ${extensionName}`));
        } catch (error) {
          // Ignore errors if extension doesn't exist
          console.log(chalk.dim(`No existing installation found, proceeding with fresh install...`));
        }
      }
      
      const spinner = ora(`Installing ${chalk.cyan(extensionName)}@${chalk.yellow(version)}...`).start();
      
      // For local paths, install directly. For remote URLs, use temp directory
      let installPath;
      let tempDir = null;
      
      if (isLocalPath) {
        // Install directly from local path
        installPath = localPath;
        spinner.text = `Installing from local path...`;
        
        // Check if gemini-extension.json exists and needs renaming
        const geminiExtPath = path.join(localPath, 'gemini-extension.json');
        const bobExtPath = path.join(localPath, 'bob-extension.json');
        
        if (fs.existsSync(geminiExtPath) && !fs.existsSync(bobExtPath)) {
          spinner.text = `Renaming gemini-extension.json to bob-extension.json...`;
          fs.renameSync(geminiExtPath, bobExtPath);
          console.log(chalk.dim(`✓ Renamed to bob-extension.json`));
        }
        
        // Verify bob-extension.json exists
        if (!fs.existsSync(bobExtPath)) {
          throw new Error('Neither gemini-extension.json nor bob-extension.json found in repository');
        }
      } else {
        // Create temporary directory for cloning remote repositories
        const bobDir = path.join(require('os').homedir(), '.bob');
        if (!fs.existsSync(bobDir)) {
          fs.mkdirSync(bobDir, { recursive: true });
        }
        tempDir = path.join(bobDir, `.bob-install-${Date.now()}`);
        installPath = tempDir;
        
        // Clone the repository
        spinner.text = `Cloning repository...`;
        const cloneCmd = version === 'latest' 
          ? `git clone ${repoUrl} ${tempDir}`
          : `git clone --branch ${version} ${repoUrl} ${tempDir}`;
        
        execSync(cloneCmd, { stdio: 'pipe' });
        
        // Check if gemini-extension.json exists
        const geminiExtPath = path.join(tempDir, 'gemini-extension.json');
        const bobExtPath = path.join(tempDir, 'bob-extension.json');
        
        if (fs.existsSync(geminiExtPath)) {
          spinner.text = `Renaming gemini-extension.json to bob-extension.json...`;
          fs.renameSync(geminiExtPath, bobExtPath);
          console.log(chalk.dim(`✓ Renamed to bob-extension.json`));
        }
        
        // Verify bob-extension.json exists after rename
        if (!fs.existsSync(bobExtPath)) {
          throw new Error('Neither gemini-extension.json nor bob-extension.json found in repository');
        }
      }
      
      try {
        // Now use bob extensions install
        spinner.stop();
        console.log(`Installing extension "${extensionName}".`);
        console.log(chalk.dim(`[DEBUG] Install path: ${installPath}`));
        console.log(chalk.dim(`[DEBUG] Running: bob extensions install ${installPath}`));
        
        // Keep .git folder - extensions may need git history/info
        
        try {
          const output = execSync(`bob extensions install --consent ${installPath}`, { 
            encoding: 'utf-8'
          }).toString();
          
          console.log(output); // Show the output
          
          // Check if output indicates it's already installed
          if (output.includes('already installed')) {
            console.log(chalk.yellow(`\n⚠ Extension ${extensionName} is already installed`));
            console.log(chalk.dim(`To reinstall, first run: bob extensions uninstall ${extensionName}`));
            return; // Exit gracefully
          }
          
          console.log(chalk.green(`✔ Successfully installed ${extensionName}@${version}`));
          
          // Delete .bob-extension-install.json to prevent temp directory reference issues
          const bobExtInstallPath = path.join(require('os').homedir(), '.bob', 'extensions', extensionName, '.bob-extension-install.json');
          if (fs.existsSync(bobExtInstallPath)) {
            fs.unlinkSync(bobExtInstallPath);
            console.log(chalk.dim(`✓ Cleaned up extension metadata`));
          }
          
          // Now cleanup temp directory since we removed the reference
          if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        } catch (installError) {
          // Workaround for Bob CLI bug: Check if installation actually succeeded despite error
          const stdout = installError.stdout ? installError.stdout.toString() : '';
          const stderr = installError.stderr ? installError.stderr.toString() : '';
          
          // Bob CLI bug: Sometimes reports "already installed" in stderr but "installed successfully" in stdout
          if (stdout.includes('installed successfully') && stderr.includes('already installed')) {
            console.log(chalk.green(`✔ Successfully installed ${extensionName}@${version}`));
            console.log(chalk.dim(`(Workaround applied for Bob CLI duplicate detection bug)`));
            
            // Delete .bob-extension-install.json to prevent temp directory reference issues
            const bobExtInstallPath = path.join(require('os').homedir(), '.bob', 'extensions', extensionName, '.bob-extension-install.json');
            if (fs.existsSync(bobExtInstallPath)) {
              fs.unlinkSync(bobExtInstallPath);
              console.log(chalk.dim(`✓ Cleaned up extension metadata`));
            }
            
            // Now cleanup temp directory since we removed the reference
            if (tempDir && fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true });
            }
            
            return; // Exit successfully
          }
          
          // Enhanced error logging for actual failures
          console.log(chalk.red('\n[ERROR] Installation failed with details:'));
          console.log(chalk.red('Error message:'), installError.message);
          
          if (stderr) {
            console.log(chalk.red('stderr:'), stderr);
          }
          if (stdout) {
            console.log(chalk.red('stdout:'), stdout);
          }
          console.log(chalk.red('Exit code:'), installError.status);
          console.log(chalk.red('Command:'), installError.cmd);
          
          // Check if it's just a "already installed" error
          const errorOutput = installError.message || '';
          if (errorOutput.includes('already installed')) {
            console.log(chalk.yellow(`\n⚠ Extension ${extensionName} is already installed`));
            console.log(chalk.dim(`To reinstall, first run: node bin/bob-install.js install --force ${extension}`));
            // DO NOT cleanup - if already installed, the temp dir might be the active source
            return; // Exit gracefully
          } else {
            // On actual failure, cleanup temp directory
            if (tempDir && fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true });
            }
            throw installError;
          }
        }
        
        // DO NOT cleanup temp directory on success - Bob CLI needs it
        
      } catch (error) {
        spinner.fail(chalk.red(`Failed to install ${extensionName}`));
        
        // Cleanup on error (only for remote installs)
        if (tempDir && fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        
        throw error;
      }
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('uninstall <extension>')
  .description('Uninstall an extension')
  .action(async (extension) => {
    try {
      const spinner = ora(`Uninstalling ${chalk.cyan(extension)}...`).start();
      
      try {
        const output = execSync(`bob extensions uninstall ${extension}`, {
          encoding: 'utf-8'
        }).toString();
        
        spinner.succeed(chalk.green(`Successfully uninstalled ${extension}`));
        console.log(output);
      } catch (error) {
        // Workaround for Bob CLI bug: Check if uninstall actually succeeded despite error
        const stdout = error.stdout ? error.stdout.toString() : '';
        const stderr = error.stderr ? error.stderr.toString() : '';
        
        // Bob CLI bug: Sometimes reports "Extension not found" in stderr but "successfully uninstalled" in stdout
        if (stdout.includes('successfully uninstalled') && stderr.includes('Extension not found')) {
          spinner.succeed(chalk.green(`Successfully uninstalled ${extension}`));
          console.log(stdout);
          console.log(chalk.dim(`(Workaround applied for Bob CLI duplicate detection bug)`));
          return; // Exit successfully
        }
        
        spinner.fail(chalk.red(`Failed to uninstall ${extension}`));
        
        // Check if extension doesn't exist
        if (error.message.includes('not found') || error.message.includes('Extension not found')) {
          console.log(chalk.yellow(`\n⚠ Extension ${extension} is not installed`));
          console.log(chalk.dim('Run: bob extensions list to see installed extensions'));
        } else {
          console.error(chalk.red('Error:'), error.message);
          if (stderr) {
            console.error(chalk.red('stderr:'), stderr);
          }
          if (stdout) {
            console.error(chalk.red('stdout:'), stdout);
          }
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all installed extensions')
  .action(async () => {
    try {
      const output = execSync('bob extensions list', {
        encoding: 'utf-8'
      }).toString();
      console.log(output);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();
