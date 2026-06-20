'use strict'

const os = require('os')
const crypto = require('crypto')

function gerarHWID() {
  const dados = [
    os.hostname(),
    os.cpus()[0]?.model || '',
    String(os.totalmem()),
    os.platform(),
    os.arch(),
  ].join('|')
  return crypto.createHash('sha256').update(dados).digest('hex')
}

function getPcNome() {
  return os.hostname()
}

module.exports = { gerarHWID, getPcNome }
