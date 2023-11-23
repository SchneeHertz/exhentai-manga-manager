const prepareTemplate = (win) => {
  return [
    {
      label: 'File',
      submenu: [
        {
          label: 'Setting',
          accelerator: 'CommandOrControl+E',
          click: async () => {
            win.webContents.send('send-action', {
              action: 'setting'
            })
          }
        },
        { type: 'separator' },
        {
          role: 'quit',
          accelerator: 'CommandOrControl+Q'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        {
          role: 'toggleDevTools',
          accelerator: 'F12',
          visible: false
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        {
          role: 'zoomIn',
          accelerator: 'CommandOrControl+=',
          visible: false
        },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'togglefullscreen' },
      ]
    },
    {
      label: 'Shortcut',
      submenu: [
        {
          label: 'Tag-fail Non-tag Book',
          click: () => {
            win.webContents.send('send-action', {
              action: 'tag-fail-non-tag-book'
            })
          }
        },
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          accelerator: 'F1',
          click: async () => {
            win.webContents.send('send-action', {
              action: 'about'
            })
          }
        },
        {
          label: 'Accelerator',
          accelerator: 'Shift+F1',
          click: async () => {
            win.webContents.send('send-action', {
              action: 'accelerator'
            })
          }
        }
      ]
    }
  ]
}

module.exports = {
  prepareTemplate
}