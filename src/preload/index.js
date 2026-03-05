import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('notion', {
  getSchema: () => ipcRenderer.invoke('notion:get-schema'),
  query: (params) => ipcRenderer.invoke('notion:query', params),
  create: (data) => ipcRenderer.invoke('notion:create-page', data),
  update: (data) => ipcRenderer.invoke('notion:update-page', data),
  archive: (data) => ipcRenderer.invoke('notion:archive-page', data)
})
