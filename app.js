const {app, BrowserWindow, ipcMain} = require('electron');
const path = require("path");
const url = require('url');

let win;
let clients = [];

function createWindow(){
  win = new BrowserWindow({width: 800,height: 700, autoHideMenuBar: true, webPreferences: {experimentalFeatures: true}});

  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  win.webContents.openDevTools();

  win.on('closed', ()=>{
    win = null;
  })
}

function createClient(loc){
  let i = clients.length;
  let client = clients[i] = new BrowserWindow({width: 600, height: 480, autoHideMenuBar: true, webPreferences: {experimentalFeatures: true}});

  client.loadURL(url.format({
    pathname: path.join(__dirname, 'client/index.html'),
    protocol: 'file:',
    slashes: true,
    hash: encodeURIComponent(loc)
  }))

  client.on('closed', ()=>{
    clients.splice(i,1);
    client = null;
  })
}

ipcMain.on('new-client', (e,loc)=>{
  console.log("Opening new Client");
  createClient(loc);
})

app.on('ready', createWindow)

app.on('window-all-closed', ()=>{
  if(process.platform !== 'darwin'){
    app.quit()
  }
})

app.on('activate',()=>{
  if(win === null){
    createWindow();
  }
})
