import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { config } from 'dotenv'
import { getSchema, queryDatabase, createPage, updatePage, archivePage } from './notion.js'

const isDev = !app.isPackaged
const envPath = isDev
  ? join(app.getAppPath(), '.env')
  : join(process.resourcesPath, '.env')
config({ path: envPath })
config({ path: join(app.getAppPath(), '.env') })

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1410',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function registerIpcHandlers() {
  ipcMain.handle('notion:get-schema', async () => {
    try {
      return await getSchema()
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('notion:query', async (_event, { filter, sorts, startCursor } = {}) => {
    try {
      return await queryDatabase({ filter, sorts, startCursor })
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('notion:create-page', async (_event, data) => {
    try {
      return await createPage(data)
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('notion:update-page', async (_event, data) => {
    try {
      return await updatePage(data)
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('notion:archive-page', async (_event, data) => {
    try {
      return await archivePage(data)
    } catch (err) {
      return { error: err.message }
    }
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
