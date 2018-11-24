export default class Effects {
  static fadeIn (el: HTMLElement, time: number = 400, callback: () => void = undefined) {
    el.style.opacity = ''
    let baseOpacity = parseFloat(getComputedStyle(el)['opacity'])
    console.log(baseOpacity)
    el.style.opacity = '0'
    el.style.display = ''

    let last = +new Date()
    const tick = () => {
      el.style.opacity = (+el.style.opacity + (+new Date() - last) / time).toString()
      last = +new Date()

      if (+el.style.opacity < baseOpacity) {
        (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16)
      } else {
        if (callback) {
          callback()
        }
      }
    }

    tick()
  }

  static fadeOut (el: HTMLElement, time: number = 400, callback: () => void = undefined) {
    el.style.opacity = '1'

    let last = +new Date()
    const tick = () => {
      el.style.opacity = (+el.style.opacity - (+new Date() - last) / time).toString()
      last = +new Date()

      if (+el.style.opacity > 0) {
        (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16)
      } else {
        el.style.display = 'none'
        el.style.opacity = ''
        if (callback) {
          callback()
        }
      }
    }

    tick()
  }
}
