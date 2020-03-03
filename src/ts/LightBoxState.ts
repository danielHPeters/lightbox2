import ImageProps from './ImageProps'

export default class LightBoxState {
  album: ImageProps[]
  currentImageIndex: number
  userCanHover: boolean

  constructor () {
    this.album = []
    this.currentImageIndex = 0
    this.userCanHover = false
  }

  isNotLast (): boolean {
    return this.currentImageIndex < this.album.length - 1
  }

  isNotFirst (): boolean {
    return this.currentImageIndex > 0
  }

  addToAlbum (link: HTMLAnchorElement): void {
    this.album.push({
      alt: link.getAttribute('data-alt'),
      href: link.getAttribute('href'),
      title: link.getAttribute('data-title') || link.getAttribute('title')
    })
  }
}
