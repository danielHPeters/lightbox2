import LightBox from './LightBox'

document.addEventListener('DOMContentLoaded', () => {
  const instance = LightBox.getInstance()
  instance.enable()
  instance.build()
})
