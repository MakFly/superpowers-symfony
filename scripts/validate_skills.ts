#!/usr/bin/env npx tsx

/**
 * Validates the structure of superpowers-symfony plugin
 * - Skills must have SKILL.md with proper frontmatter
 * - Commands must have frontmatter with description
 * - Plugin.json must have required fields
 */

import * as fs from 'fs';
import * as path from 'path';

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PLUGIN_ROOT, 'skills');
const COMMANDS_DIR = path.join(PLUGIN_ROOT, 'commands');
const PLUGIN_JSON = path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json');

interface ValidationError {
  file: string;
  message: string;
}

const errors: ValidationError[] = [];
const warnings: ValidationError[] = [];

function parseFrontmatter(content: string): Record<string, string | string[]> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter: Record<string, string | string[]> = {};
  const lines = match[1].split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');

    if (colonIndex > 0 && !line.startsWith(' ') && !line.startsWith('-')) {
      const key = line.slice(0, colonIndex).trim();
      const rawValue = line.slice(colonIndex + 1).trim();

      if (rawValue === '>' || rawValue === '|') {
        // Multi-line scalar: collect indented continuation lines
        const parts: string[] = [];
        i++;
        while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
          if (lines[i].trim() !== '') parts.push(lines[i].trim());
          i++;
        }
        frontmatter[key] = parts.join(' ').trim();
        continue;
      } else if (rawValue === '') {
        // Could be a YAML list (allowed-tools, tools, skills)
        const items: string[] = [];
        i++;
        while (i < lines.length && lines[i].match(/^\s+-\s/)) {
          items.push(lines[i].replace(/^\s+-\s*/, '').trim());
          i++;
        }
        frontmatter[key] = items.length > 0 ? items : '';
        continue;
      } else {
        frontmatter[key] = rawValue;
      }
    }
    i++;
  }

  return frontmatter;
}

function validateSkills(): void {
  console.log('Validating skills...');

  if (!fs.existsSync(SKILLS_DIR)) {
    errors.push({ file: SKILLS_DIR, message: 'Skills directory does not exist' });
    return;
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  let validCount = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      warnings.push({
        file: path.join(SKILLS_DIR, entry.name),
        message: 'Skills directory should only contain directories',
      });
      continue;
    }

    const skillDir = path.join(SKILLS_DIR, entry.name);
    const skillFile = path.join(skillDir, 'SKILL.md');

    if (!fs.existsSync(skillFile)) {
      errors.push({
        file: skillDir,
        message: 'Missing SKILL.md file',
      });
      continue;
    }

    const content = fs.readFileSync(skillFile, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) {
      errors.push({
        file: skillFile,
        message: 'Missing or invalid frontmatter',
      });
      continue;
    }

    if (!frontmatter.name) {
      errors.push({
        file: skillFile,
        message: 'Missing "name" in frontmatter',
      });
    } else if (!frontmatter.name.startsWith('symfony:')) {
      errors.push({
        file: skillFile,
        message: `Name must start with "symfony:", got "${frontmatter.name}"`,
      });
    }

    if (!frontmatter.description || frontmatter.description.trim() === '') {
      errors.push({
        file: skillFile,
        message: 'Missing or empty "description" in frontmatter',
      });
    }

    validCount++;
  }

  console.log(`  Found ${validCount} valid skills`);
}

function validateCommands(): void {
  console.log('Validating commands...');

  if (!fs.existsSync(COMMANDS_DIR)) {
    warnings.push({ file: COMMANDS_DIR, message: 'Commands directory does not exist (optional)' });
    return;
  }

  const files = fs.readdirSync(COMMANDS_DIR);
  let validCount = 0;

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const commandFile = path.join(COMMANDS_DIR, file);
    const content = fs.readFileSync(commandFile, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) {
      errors.push({
        file: commandFile,
        message: 'Missing or invalid frontmatter',
      });
      continue;
    }

    if (!frontmatter.description || frontmatter.description.trim() === '') {
      errors.push({
        file: commandFile,
        message: 'Missing or empty "description" in frontmatter',
      });
    }

    validCount++;
  }

  console.log(`  Found ${validCount} valid commands`);
}

function validatePluginJson(): void {
  console.log('Validating plugin.json...');

  if (!fs.existsSync(PLUGIN_JSON)) {
    errors.push({ file: PLUGIN_JSON, message: 'plugin.json does not exist' });
    return;
  }

  try {
    const content = fs.readFileSync(PLUGIN_JSON, 'utf-8');
    const json = JSON.parse(content);

    const requiredFields = ['name', 'description'];

    for (const field of requiredFields) {
      if (!json[field]) {
        errors.push({
          file: PLUGIN_JSON,
          message: `Missing required field: "${field}"`,
        });
      }
    }

    if (json.name && json.name !== 'superpowers-symfony') {
      warnings.push({
        file: PLUGIN_JSON,
        message: `Plugin name should be "superpowers-symfony", got "${json.name}"`,
      });
    }

    console.log(`  Plugin: ${json.name}${json.version ? ` v${json.version}` : ''}`);
  } catch (e) {
    errors.push({
      file: PLUGIN_JSON,
      message: `Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`,
    });
  }
}

function validateHooks(): void {
  console.log('Validating hooks...');

  const hooksJson = path.join(PLUGIN_ROOT, 'hooks', 'hooks.json');
  const sessionStart = path.join(PLUGIN_ROOT, 'hooks', 'session-start.sh');

  if (!fs.existsSync(hooksJson)) {
    errors.push({ file: hooksJson, message: 'hooks.json does not exist' });
  } else {
    try {
      const content = fs.readFileSync(hooksJson, 'utf-8');
      JSON.parse(content);
      console.log('  hooks.json is valid JSON');
    } catch (e) {
      errors.push({
        file: hooksJson,
        message: `Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`,
      });
    }
  }

  if (!fs.existsSync(sessionStart)) {
    errors.push({ file: sessionStart, message: 'session-start.sh does not exist' });
  } else {
    const stats = fs.statSync(sessionStart);
    if (!(stats.mode & 0o111)) {
      warnings.push({
        file: sessionStart,
        message: 'session-start.sh is not executable',
      });
    }
    console.log('  session-start.sh exists');
  }
}

const AGENTS_DIR = path.join(PLUGIN_ROOT, 'agents');

function validateAgents(): void {
  console.log('Validating agents...');

  if (!fs.existsSync(AGENTS_DIR)) {
    warnings.push({ file: AGENTS_DIR, message: 'Agents directory does not exist (optional)' });
    return;
  }

  const files = fs.readdirSync(AGENTS_DIR);
  let validCount = 0;

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const agentFile = path.join(AGENTS_DIR, file);
    const content = fs.readFileSync(agentFile, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) {
      errors.push({
        file: agentFile,
        message: 'Missing or invalid frontmatter',
      });
      continue;
    }

    if (!frontmatter.name) {
      errors.push({
        file: agentFile,
        message: 'Missing "name" in frontmatter',
      });
    }

    if (!frontmatter.description || (typeof frontmatter.description === 'string' && frontmatter.description.trim() === '')) {
      errors.push({
        file: agentFile,
        message: 'Missing or empty "description" in frontmatter',
      });
    }

    // Validate skill references exist
    if (frontmatter.skills && Array.isArray(frontmatter.skills)) {
      for (const skill of frontmatter.skills) {
        const skillSlug = skill.replace('symfony:', '');
        const skillDir = path.join(SKILLS_DIR, skillSlug);
        if (!fs.existsSync(skillDir)) {
          errors.push({
            file: agentFile,
            message: `Referenced skill "${skill}" not found at ${skillDir}`,
          });
        }
      }
    }

    validCount++;
  }

  console.log(`  Found ${validCount} valid agents`);
}

// Main execution
console.log('\n===========================================');
console.log('Validating superpowers-symfony plugin');
console.log('===========================================\n');

validatePluginJson();
validateHooks();
validateSkills();
validateCommands();
validateAgents();

console.log('\n-------------------------------------------');

if (warnings.length > 0) {
  console.log('\nWarnings:\n');
  for (const warning of warnings) {
    console.log(`  ${warning.file}`);
    console.log(`    -> ${warning.message}\n`);
  }
}

if (errors.length > 0) {
  console.error('\nValidation FAILED with errors:\n');
  for (const error of errors) {
    console.error(`  ${error.file}`);
    console.error(`    -> ${error.message}\n`);
  }
  process.exit(1);
} else {
  console.log('\nAll validations passed!\n');
  process.exit(0);
}
