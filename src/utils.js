function getWidth (el, type) {
  if (type === 'inner') // .innerWidth()
    return el.clientWidth
  else if (type === 'outer') // .outerWidth()
    return el.offsetWidth
  let s = window.getComputedStyle(el, null)
  if (type === 'width') // .width()
    return el.clientWidth - parseInt(s.getPropertyValue('padding-left')) - parseInt(s.getPropertyValue('padding-right'))
  else if (type === 'full') // .outerWidth(includeMargins = true)
    return el.offsetWidth + parseInt(s.getPropertyValue('margin-left')) + parseInt(s.getPropertyValue('margin-right'))
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
      'PreviousPage': 'ArrowLeft / ArrowUp / WheelUp',
      'NextPage': 'ArrowRight / ArrowDown / WheelDown',
      'ScrollUp': 'Ctrl+ArrowUp / Ctrl+ArrowLeft',
      'ScrollDown': 'Ctrl+ArrowDown / Ctrl+ArrowRight',
      'FirstPage': 'Home',
      'LastPage': 'End',
      'InsertEmptyPage': '/',
      'SwitchThumbnail': '=',
    }
  }
]

export {
  getWidth,
  acceleratorInfo
}