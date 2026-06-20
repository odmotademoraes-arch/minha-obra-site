'use strict'
const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '..', 'resources', 'icon.png')
const destPng = path.join(__dirname, '..', 'resources', 'icon-256.png')
const destIco = path.join(__dirname, '..', 'resources', 'icon.ico')

if (!fs.existsSync(src)) {
  console.error('ERRO: resources/icon.png nao encontrado.')
  process.exit(1)
}

async function run() {
  // jimp reads JPEG, PNG, BMP, GIF — whatever format the file actually is
  const { Jimp } = await import('jimp')

  console.log('Lendo imagem...')
  const image = await Jimp.read(src)

  // Save a proper 256x256 PNG (normalized)
  await image.clone().resize({ w: 256, h: 256 }).write(destPng)
  console.log('PNG 256x256 gerado.')

  // Convert normalized PNG to ICO using png-to-ico
  const mod = await import('png-to-ico')
  const pngToIco = mod.default || mod
  const buf = await pngToIco(destPng)
  fs.writeFileSync(destIco, buf)
  console.log('icon.ico criado com sucesso!')
}

run().catch(err => {
  console.error('Erro ao gerar icones:', err.message)
  process.exit(1)
})
