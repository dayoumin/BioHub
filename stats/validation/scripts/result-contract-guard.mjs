import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function parseArgs(argv) {
  const [, , command, ...rest] = argv
  const options = { command }

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const value = rest[i + 1]
    options[key] = value
    i += 1
  }

  return options
}

function normalizePath(value) {
  return value.replace(/\\/g, '/')
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
}

export function globToRegExp(pattern) {
  let regex = '^'

  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i]
    const next = pattern[i + 1]

    if (char === '*' && next === '*') {
      regex += '.*'
      i += 1
      continue
    }

    if (char === '*') {
      regex += '[^/]*'
      continue
    }

    regex += escapeRegex(char)
  }

  regex += '$'
  return new RegExp(regex)
}

export function loadGuardManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  if (!Array.isArray(manifest.criticalPaths) || !Array.isArray(manifest.commands)) {
    throw new Error('Invalid result contract guard manifest shape')
  }

  return manifest
}

export function matchChangedFiles(changedFiles, criticalPaths) {
  const matchers = criticalPaths.map((pattern) => globToRegExp(normalizePath(pattern)))
  return changedFiles
    .map(normalizePath)
    .filter((file) => matchers.some((matcher) => matcher.test(file)))
}

function getRepoRoot() {
  return process.cwd()
}

function getChangedFiles(base, head) {
  const output = execFileSync('git', ['diff', '--name-only', base, head], {
    cwd: getRepoRoot(),
    encoding: 'utf8',
  })

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function emitScopeOutputs(matchedPaths, shouldRun = matchedPaths.length > 0) {
  console.log(`should_run=${shouldRun ? 'true' : 'false'}`)
  console.log(`matched_count=${matchedPaths.length}`)
  console.log('matched_paths<<EOF')
  console.log(matchedPaths.join('\n'))
  console.log('EOF')
}

function runCommand(commandSpec) {
  const cwd = path.resolve(getRepoRoot(), commandSpec.workingDirectory ?? '.')
  console.log(`::group::${commandSpec.name}`)
  console.log(`$ ${commandSpec.run}`)

  const result = spawnSync(commandSpec.run, {
    cwd,
    shell: true,
    stdio: 'inherit',
  })

  console.log('::endgroup::')

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function main() {
  const args = parseArgs(process.argv)
  const command = args.command
  const manifestPath = path.resolve(getRepoRoot(), args.manifest ?? 'stats/validation/result-contract-guard.manifest.json')
  const manifest = loadGuardManifest(manifestPath)

  if (command === 'scope') {
    if (!args.base || !args.head) {
      emitScopeOutputs([], true)
      return
    }

    const changedFiles = getChangedFiles(args.base, args.head)
    const matchedPaths = matchChangedFiles(changedFiles, manifest.criticalPaths)
    emitScopeOutputs(matchedPaths)
    return
  }

  if (command === 'run') {
    for (const commandSpec of manifest.commands) {
      runCommand(commandSpec)
    }
    return
  }

  throw new Error(`Unsupported command: ${command ?? '(missing)'}`)
}

const entryPath = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main()
}
