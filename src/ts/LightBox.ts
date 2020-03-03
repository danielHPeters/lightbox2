import Effects from './util/Effects'
import Component from './components/Component'
import LbImage from './components/LbImage'
import LbOverlay from './components/LbOverlay'
import LbNumberLabel from './components/LbNumberLabel'
import LightBoxState from './LightBoxState'
import LbCaption from './components/LbCaption'
import LbNavLink from './components/LbNavLink'
import LbNav from './components/LbNav'
import LbContainer from './components/LbContainer'

export interface KeyConfig {
  close: string[]
  next: string[]
  previous: string[]
}

export interface LightBoxOptions {
  albumLabel: string
  alwaysShowNav: boolean
  enableRightClick: boolean
  fadeDuration: number
  fitImagesInViewport: boolean
  maxWidth: number
  maxHeight: number
  imageFadeDuration: number
  positionFromTop: number
  resizeDuration: number
  showImageNumberLabel: boolean
  wrapAround: boolean
  disableScrolling: boolean
  /*
  Sanitize Title
  If the caption data is trusted, for example you are hardcoding it in, then leave this to false.
  This will free you to add html tags, such as links, in the caption.

  If the caption data is user submitted or from some other untrusted source, then set this to true
  to prevent xss and other injection attacks.
   */
  sanitizeTitle: boolean
  keyConfig: KeyConfig
}

export default class LightBox {
  static readonly defaults: Partial<LightBoxOptions> = {
    albumLabel: 'Image %1 of %2',
    alwaysShowNav: false,
    enableRightClick: true,
    fadeDuration: 600,
    fitImagesInViewport: true,
    imageFadeDuration: 600,
    positionFromTop: 50,
    resizeDuration: 700,
    showImageNumberLabel: true,
    wrapAround: false,
    disableScrolling: false,
    sanitizeTitle: false,
    keyConfig: {
      close: ['Escape', 'x', 'X', 'o', 'O', 'c', 'c'],
      next: ['Right', 'ArrowRight', 'n', 'N'],
      previous: ['Left', 'ArrowLeft', 'p', 'P']
    }
  }
  private static instances: LightBox[] = []
  private readonly state: LightBoxState
  private options: Partial<LightBoxOptions>
  private lightBox: HTMLElement
  private overlay: Component<HTMLElement>
  private outerContainer: HTMLElement
  private container: Component<HTMLElement>
  private image: Component<HTMLImageElement>
  private nav: Component<HTMLElement>
  private navPrevious: Component<HTMLElement>
  private navNext: Component<HTMLElement>
  private loader: HTMLElement
  private cancel: HTMLElement
  private dataContainer: HTMLElement
  private dataElement: HTMLElement
  private details: HTMLElement
  private caption: Component<HTMLElement>
  private numberElement: Component<HTMLElement>
  private closeContainer: HTMLElement
  private close: HTMLElement
  private readonly keyboardEventHandler: any
  private readonly resizeListener: any

  private constructor (options?: Partial<LightBoxOptions>) {
    this.state = new LightBoxState()

    // options
    this.options = { ...LightBox.defaults, ...options }
    this.keyboardEventHandler = this.keyboardAction.bind(this)
    this.resizeListener = () => this.sizeOverlay()
  }

  static getInstance (options?: Partial<LightBoxOptions>): LightBox {
    const newInstance = new LightBox(options)

    LightBox.instances.push(newInstance)
    return newInstance
  }

  static destroyAll (): void {
    LightBox.instances.forEach(instance => instance.end())
    LightBox.instances = []
  }

  init (): void {
    this.registerDetectHover()
    this.build()
    this.enable()
  }

  private registerDetectHover (): void {
    self.addEventListener('mouseover', () => {
      this.state.userCanHover = true
    }, { once: true })
  }

  private enable (): void {
    document.querySelectorAll('a[data-lightbox], area[data-lightbox]')
      .forEach((element: HTMLAnchorElement) => element.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        this.start(element)
      }))
  }

  private generateHtmlLayout (): void {
    const fragment = document.createDocumentFragment()
    this.overlay = new LbOverlay()
    this.lightBox = document.createElement('div')
    this.outerContainer = document.createElement('div')
    this.image = new LbImage('data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==')
    this.navPrevious = new LbNavLink(this.state, this.options.wrapAround, this.options.alwaysShowNav, 'prev')
    this.navNext = new LbNavLink(this.state, this.options.wrapAround, this.options.alwaysShowNav, 'next')
    this.nav = new LbNav()
    this.container = new LbContainer()
    this.nav.childComponents.push(this.navPrevious, this.navNext)
    this.overlay.init()
    this.loader = document.createElement('div')
    this.cancel = document.createElement('a')
    this.dataContainer = document.createElement('div')
    this.dataElement = document.createElement('div')
    this.details = document.createElement('div')
    this.caption = new LbCaption(this.state, this.options.sanitizeTitle)
    this.numberElement = new LbNumberLabel(this.state, this.options.albumLabel)
    this.container.childComponents.push(this.image, this.nav)
    this.container.init()
    this.container.element.appendChild(this.loader)
    this.numberElement.init()
    this.caption.init()
    this.closeContainer = document.createElement('div')
    this.close = document.createElement('a')
    this.lightBox.classList.add('lb')
    this.outerContainer.classList.add('lb-outer-container')
    this.loader.classList.add('lb-loader')
    this.cancel.classList.add('lb-cancel')
    this.dataContainer.classList.add('lb-data-container')
    this.dataElement.classList.add('lb-data')
    this.details.classList.add('lb-details')
    this.closeContainer.classList.add('lb-close-container')
    this.close.classList.add('lb-close')
    this.lightBox.style.display = 'none'
    this.lightBox.appendChild(this.outerContainer)
    this.lightBox.appendChild(this.dataContainer)
    this.outerContainer.appendChild(this.container.element)
    this.loader.appendChild(this.cancel)
    this.dataContainer.appendChild(this.dataElement)
    this.dataElement.appendChild(this.details)
    this.dataElement.appendChild(this.closeContainer)
    this.details.appendChild(this.caption.element)
    this.details.appendChild(this.numberElement.element)
    this.closeContainer.appendChild(this.close)

    fragment.appendChild(this.overlay.element)
    fragment.appendChild(this.lightBox)
    document.body.appendChild(fragment)
  }

  private build (): void {
    this.generateHtmlLayout()

    // Attach event handlers to the newly minted DOM elements
    this.addCloseEvent(this.lightBox, this.overlay.element, this.outerContainer, this.loader, this.close)

    // Prevent lightBox from closing when clicking on image and data containers
    this.container.addListener('click', event => event.stopPropagation())
    this.dataContainer.addEventListener('click', event => event.stopPropagation())

    this.navPrevious.addListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      this.changeImage(this.state.currentImageIndex === 0 ? this.state.album.length - 1 : this.state.currentImageIndex - 1)
    })

    this.navNext.addListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      this.changeImage(this.state.currentImageIndex === this.state.album.length - 1 ? 0 : this.state.currentImageIndex + 1)
    })

    if (this.options.enableRightClick) {
      this.enableImageRightClick()
    }
  }

  private addCloseEvent (...elements: HTMLElement[]): void {
    elements.forEach(element => element.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      this.end()
    }))
  }

  /**
   * Show context menu for image on right-click
   *
   * There is a div containing the navigation that spans the entire image and lives above of it. If
   * you right-click, you are right clicking this div and not the image. This prevents users from
   * saving the image or using other context menu actions with the image.
   *
   * To fix this, when we detect the right mouse button is pressed down, but not yet clicked, we
   * set pointer-events to none on the nav div. This is so that the upcoming right-click event on
   * the next mouseup will bubble down to the image. Once the right-click/contextmenu event occurs
   * we set the pointer events back to auto for the nav div so it can capture hover and left-click
   * events as usual.
   */
  private enableImageRightClick (): void {
    this.nav.element.addEventListener('mousedown', event => {
      if (event.which === 3) {
        this.nav.element.style.pointerEvents = 'none'

        this.lightBox.addEventListener('contextmenu', () => {
          setTimeout(() => this.nav.element.style.pointerEvents = 'auto')
        }, { once: true })
      }
    })
  }

  private start (link: HTMLAnchorElement): void {
    self.addEventListener('resize', this.resizeListener)
    this.sizeOverlay()
    this.state.album = []
    let imageNumber = 0

    const dataLightBoxValue = link.getAttribute('data-lightbox')
    const links = document.querySelectorAll(link.tagName + '[data-lightbox="' + dataLightBoxValue + '"]')

    links.forEach((element: HTMLAnchorElement, key: number) => {
      this.state.addToAlbum(element)

      if (element === link) {
        imageNumber = key
      }
    })

    // Position LightBox
    const top = document.documentElement.scrollTop + this.options.positionFromTop
    const left = document.documentElement.scrollLeft

    this.lightBox.style.top = top + 'px'
    this.lightBox.style.left = left + 'px'
    this.overlay.show(this.options.fadeDuration)
    Effects.fadeIn(this.lightBox, this.options.fadeDuration)

    // Disable scrolling of the page while open
    if (this.options.disableScrolling) {
      document.documentElement.classList.add('lb-disable-scrolling')
    }

    this.changeImage(imageNumber)
  }

  private changeImage (imageNumber: number): void {
    this.disableKeyboardNav()
    Effects.fadeIn(this.loader)

    const elements = [
      this.image.element,
      this.nav.element,
      this.navPrevious.element,
      this.navNext.element,
      this.dataContainer,
      this.numberElement.element,
      this.caption.element
    ]
    elements.forEach((element: HTMLElement) => element.style.display = 'none')

    // When image to show is preloaded, we send the width and height to sizeContainer()
    const preloader = new Image()
    preloader.onload = () => {
      let imageHeight
      let imageWidth
      let maxImageHeight
      let maxImageWidth
      let windowHeight
      let windowWidth

      this.image.element.alt = this.state.album[imageNumber].alt
      this.image.element.src = this.state.album[imageNumber].href
      this.image.setSize(preloader.width, preloader.height)

      if (this.options.fitImagesInViewport) {
        // Fit image inside the viewport.
        // Take into account the border around the image and an additional 10px gutter on each side.

        windowWidth = self.innerWidth
        windowHeight = self.innerHeight
        maxImageWidth = windowWidth - 20
        maxImageHeight = windowHeight - 120

        // Check if image size is larger then maxWidth|maxHeight in settings
        if (this.options.maxWidth && this.options.maxWidth < maxImageWidth) {
          maxImageWidth = this.options.maxWidth
        }
        if (this.options.maxHeight && this.options.maxHeight < maxImageWidth) {
          maxImageHeight = this.options.maxHeight
        }

        // Is the current image's width or height is greater than the maxImageWidth or maxImageHeight
        // option than we need to size down while maintaining the aspect ratio.
        if ((preloader.width > maxImageWidth) || (preloader.height > maxImageHeight)) {
          if ((preloader.width / maxImageWidth) > (preloader.height / maxImageHeight)) {
            imageWidth = maxImageWidth
            imageHeight = preloader.height / (preloader.width / imageWidth)
            this.image.setSize(imageWidth, imageHeight)
          } else {
            imageHeight = maxImageHeight
            imageWidth = preloader.width / (preloader.height / imageHeight)
            this.image.setSize(imageWidth, imageHeight)
          }
        }
      }
      this.sizeContainer(this.image.element.width, this.image.element.height)
    }

    preloader.src = this.state.album[imageNumber].href
    this.state.currentImageIndex = imageNumber
  }

  private sizeOverlay (): void {
    const body = document.body
    const html = document.documentElement
    const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight)
    const width = Math.min(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth)

    this.overlay.setSize(width, height)
  }

  private sizeContainer (imageWidth: number, imageHeight: number): void {
    const oldWidth = this.outerContainer.offsetWidth
    const oldHeight = this.outerContainer.offsetHeight

    if (oldWidth !== imageWidth || oldHeight !== imageHeight) {
      $(this.outerContainer).animate({
        width: imageWidth,
        height: imageHeight
      }, this.options.resizeDuration, 'swing', () => {
        this.postResize(imageWidth, imageHeight)
      })
    } else {
      this.postResize(imageWidth, imageHeight)
    }
  }

  private postResize (newWidth: number, newHeight: number): void {
    this.dataContainer.style.width = newWidth + 'px'
    this.navPrevious.setHeight(newHeight)
    this.navNext.setHeight(newHeight)
    this.showImage()
  }

  private showImage (): void {
    this.loader.style.display = 'none'
    this.image.show(this.options.imageFadeDuration)
    this.nav.render()
    this.navPrevious.render()
    this.navNext.render()
    this.caption.update()
    this.caption.show()

    if (this.options.showImageNumberLabel) {
      this.numberElement.update()
      this.numberElement.show()
    } else {
      this.numberElement.hide(0)
    }

    Effects.fadeIn(this.dataContainer, this.options.resizeDuration, () => this.sizeOverlay())
    this.preloadNeighbouringImages()
    this.enableKeyboardNav()
  }

  private preloadNeighbouringImages (): void {
    if (this.state.album.length > this.state.currentImageIndex + 1) {
      const preloadNext = new Image()
      preloadNext.src = this.state.album[this.state.currentImageIndex + 1].href
    }

    if (this.state.currentImageIndex > 0) {
      const preloadPrev = new Image()
      preloadPrev.src = this.state.album[this.state.currentImageIndex - 1].href
    }
  }

  private enableKeyboardNav (): void {
    document.addEventListener('keyup', this.keyboardEventHandler)
  }

  private disableKeyboardNav (): void {
    document.removeEventListener('keyup', this.keyboardEventHandler)
  }

  private keyboardAction (event: KeyboardEvent): void {
    if (this.options.keyConfig.previous.includes(event.key)) {
      if (this.state.currentImageIndex !== 0) {
        this.changeImage(this.state.currentImageIndex - 1)
      } else if (this.options.wrapAround && this.state.album.length > 1) {
        this.changeImage(this.state.album.length - 1)
      }
    } else if (this.options.keyConfig.next.includes(event.key)) {
      if (this.state.currentImageIndex !== this.state.album.length - 1) {
        this.changeImage(this.state.currentImageIndex + 1)
      } else if (this.options.wrapAround && this.state.album.length > 1) {
        this.changeImage(0)
      }
    } else if (this.options.keyConfig.close.includes(event.key)) {
      this.end()
    }
  }

  private end (): void {
    this.disableKeyboardNav()
    self.removeEventListener('resize', this.resizeListener)
    Effects.fadeOut(this.lightBox, this.options.fadeDuration)
    this.overlay.hide(this.options.fadeDuration)

    if (this.options.disableScrolling) {
      document.documentElement.classList.remove('lb-disable-scrolling')
    }
  }
}
