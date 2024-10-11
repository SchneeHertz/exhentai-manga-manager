function getWidth (el, type) {
  if (el === null) return null
  if (type === 'inner') // .innerWidth()
    return el.clientWidth
  else if (type === 'outer') // .outerWidth()
    return el.offsetWidth
  const s = window.getComputedStyle(el, null)
  if (type === 'width') // .width()
    return el.clientWidth - parseInt(s.getPropertyValue('padding-left'), 10) - parseInt(s.getPropertyValue('padding-right'), 10)
  else if (type === 'full') // .outerWidth(includeMargins = true)
    return el.offsetWidth + parseInt(s.getPropertyValue('margin-left'), 10) + parseInt(s.getPropertyValue('margin-right'), 10)
  return null
}

const acceleratorInfo = [
  {
    group: 'Global',
    accelerators: {
      'OpenSetting': 'Ctrl+E',
      'QuitApplication': 'Ctrl+Q',
      'ZoomIn': 'Ctrl++ / Ctrl+= / Ctrl+WheelUp',
      'ZoomOut': 'Ctrl+- / Ctrl+WheelDown',
      'ZoomReset': 'Ctrl+0',
      'FullScreen': 'F11',
      'Minimize': 'Ctrl+M',
      'Reload': 'Ctrl+R',
      'ShowAbout': 'F1',
      'ShowAccelerator': 'Shift+F1',
      'Escape': 'Escape / Backspace / MouseButton3'
    }
  },
  {
    group: 'Home',
    accelerators: {
      'PreviousPage': 'PageUp',
      'NextPage': 'PageDown',
      'FocusUp': 'ArrowUp',
      'FocusDown': 'ArrowDown',
      'FocusLeft': 'ArrowLeft',
      'FocusRight': 'ArrowRight',
      'OpenBook': 'Enter',
      'ManualScan': 'F5',
      'FocusSearch': 'Ctrl+L / F6',
      'ShuffleBook': 'Ctrl+S',
    }
  },
  {
    group: 'BookDetail',
    accelerators: {
      'PreviousBook': 'PageUp',
      'NextBook': 'PageDown',
      'NextRandomBook': 'Shift+PageDown',
      'OpenInnerViewer': 'Enter',
      'DeleteBook': 'Delete',
    }
  },
  {
    group: 'InnerViewer',
    accelerators: {
      'PreviousBook': 'PageUp',
      'NextBook': 'PageDown',
      'NextRandomBook': 'Shift+PageDown',
      'ScrollUp': 'Ctrl+ArrowUp / Ctrl+ArrowLeft',
      'ScrollDown': 'Ctrl+ArrowDown / Ctrl+ArrowRight',
      'FirstPage': 'Home',
      'LastPage': 'End',
      'InsertEmptyPage': '/',
      'SwitchThumbnail': '=',
      'PreviousPage': 'ArrowLeft / ArrowUp / WheelUp',
      'NextPage': 'ArrowRight / ArrowDown / WheelDown / Space',
    }
  }
]

export {
  getWidth,
  acceleratorInfo
}