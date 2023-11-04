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

export {
  getWidth
}