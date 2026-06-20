'use strict'
// Claude Code sets ELECTRON_RUN_AS_NODE=1 which prevents Electron from initializing properly.
// This script clears that env var before spawning our app's Electron process.
const { spawn } = require('child_process')
const path = require('path')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const electronBin = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe')
const args = ['.', ...process.argv.slice(2)]

const child = spawn(electronBin, args, { stdio: 'inherit', env })
child.on('close', code => process.exit(code || 0))
