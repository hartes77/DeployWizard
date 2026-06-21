const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runTerraform: (command) => {
    ipcRenderer.send('run-terraform', command);
  },
  
  onTerraformLog: (callback) => {
    ipcRenderer.on('terraform-log', (event, data) => {
      callback(data);
    });
  },
  
  removeTerraformLogListener: () => {
    ipcRenderer.removeAllListeners('terraform-log');
  }
});