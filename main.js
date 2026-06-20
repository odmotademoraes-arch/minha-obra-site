'use strict'

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const { setupDatabase, getDb } = require('./main/database')
const { setupIpcHandlers }     = require('./main/ipc')
const { setupAIHandlers }      = require('./main/ai')
const { setupAlertasIpc, iniciarVerificacaoPeriodica } = require('./main/alertas')

let mainWindow = null

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'resources', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Abrir URL externa (Stripe checkout, etc.)
  ipcMain.handle('shell:openExternal', (_e, url) => shell.openExternal(url))

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }
}

function setupAutoUpdate() {
  // Só roda quando empacotado
  if (!app.isPackaged) return
  try {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.checkForUpdatesAndNotify()

    autoUpdater.on('update-available', () => {
      const { Notification } = require('electron')
      if (Notification.isSupported()) {
        new Notification({
          title: 'Minha Obra — Atualização disponível',
          body: 'Uma nova versão está sendo baixada automaticamente...',
        }).show()
      }
    })

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Atualização pronta',
        message: 'Nova versão do Minha Obra baixada. Deseja reiniciar agora?',
        buttons: ['Reiniciar agora', 'Depois'],
        defaultId: 0,
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
    })

    autoUpdater.on('error', err => {
      console.error('[autoUpdater] erro:', err.message)
    })
  } catch (err) {
    console.log('[autoUpdater] electron-updater não instalado:', err.message)
  }
}

app.whenReady().then(() => {
  setupDatabase()
  setupIpcHandlers()
  setupAIHandlers()
  setupAlertasIpc()
  iniciarVerificacaoPeriodica(getDb)
  createWindow()
  setupAutoUpdate()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

module.exports = { mainWindow: () => mainWindow }

