import ImageProps from './ImageProps'
import Effects from './util/Effects'

export interface LightBoxOptions {
  albumLabel: string
  alwaysShowNavOnTouchDevices: boolean
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
}

export default class LightBox {
  static readonly defaults: Partial<LightBoxOptions> = {
    albumLabel: 'Image %1 of %2',
    alwaysShowNavOnTouchDevices: false,
    fadeDuration: 600,
    fitImagesInViewport: true,
    imageFadeDuration: 600,
    positionFromTop: 50,
    resizeDuration: 700,
    showImageNumberLabel: true,
    wrapAround: false,
    disableScrolling: false,
    sanitizeTitle: false
  }
  private static instance: LightBox = undefined
  private album: ImageProps[]
  private currentImageIndex: number
  private options: Partial<LightBoxOptions>
  private lightBox: HTMLElement
  private overlay: HTMLElement
  private outerContainer: HTMLElement
  private container: HTMLElement
  private image: HTMLImageElement
  private nav: HTMLElement
  private navPrevious: HTMLElement
  private navNext: HTMLElement
  private loader: HTMLElement
  private cancel: HTMLElement
  private dataContainer: HTMLElement
  private dataElement: HTMLElement
  private details: HTMLElement
  private caption: HTMLElement
  private numberElement: HTMLElement
  private closeContainer: HTMLElement
  private close: HTMLElement
  private readonly keyboardEventHandler: any
  private readonly resizeListener: any

  private constructor (options?: Partial<LightBoxOptions>) {
    this.album = []

    // options
    this.options = { ...LightBox.defaults, ...options }
    this.keyboardEventHandler = this.keyboardAction.bind(this)
    this.resizeListener = () => this.sizeOverlay()
  }

  static getInstance (options?: Partial<LightBoxOptions>): LightBox {
    if (LightBox.instance === undefined) {
      LightBox.instance = new LightBox(options)
    }
    return LightBox.instance
  }

  init (): void {
    this.enable()
    this.build()
  }

  private imageCountLabel (currentImageIndex: number, totalImages: number): string {
    return this.options.albumLabel.replace(
      /%1/g, currentImageIndex.toString()).replace(/%2/g, totalImages.toString()
    )
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
    this.overlay = document.createElement('div')
    this.lightBox = document.createElement('div')
    this.outerContainer = document.createElement('div')
    this.container = document.createElement('div')
    this.image = document.createElement('img')
    this.nav = document.createElement('div')
    this.navPrevious = document.createElement('a')
    this.navNext = document.createElement('a')
    this.loader = document.createElement('div')
    this.cancel = document.createElement('a')
    this.dataContainer = document.createElement('div')
    this.dataElement = document.createElement('div')
    this.details = document.createElement('div')
    this.caption = document.createElement('span')
    this.numberElement = document.createElement('span')
    this.closeContainer = document.createElement('div')
    this.close = document.createElement('a')
    this.overlay.classList.add('lb-overlay')
    this.lightBox.classList.add('lb')
    this.outerContainer.classList.add('lb-outer-container')
    this.container.classList.add('lb-container')
    this.image.classList.add('lb-image')
    this.image.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
    this.nav.classList.add('lb-nav')
    this.navPrevious.classList.add('lb-prev')
    this.navNext.classList.add('lb-next')
    this.loader.classList.add('lb-loader')
    this.cancel.classList.add('lb-cancel')
    this.dataContainer.classList.add('lb-data-container')
    this.dataElement.classList.add('lb-data')
    this.details.classList.add('lb-details')
    this.caption.classList.add('lb-caption')
    this.numberElement.classList.add('lb-number')
    this.closeContainer.classList.add('lb-close-container')
    this.close.classList.add('lb-close')
    this.lightBox.appendChild(this.outerContainer)
    this.lightBox.appendChild(this.dataContainer)
    this.outerContainer.appendChild(this.container)
    this.container.appendChild(this.image)
    this.container.appendChild(this.nav)
    this.container.appendChild(this.loader)
    this.nav.appendChild(this.navPrevious)
    this.nav.appendChild(this.navNext)
    this.loader.appendChild(this.cancel)
    this.dataContainer.appendChild(this.dataElement)
    this.dataElement.appendChild(this.details)
    this.dataElement.appendChild(this.closeContainer)
    this.details.appendChild(this.caption)
    this.details.appendChild(this.numberElement)
    this.closeContainer.appendChild(this.close)

    fragment.appendChild(this.overlay)
    fragment.appendChild(this.lightBox)
    document.body.appendChild(fragment)
  }

  private build (): void {
    this.generateHtmlLayout()

    // Attach event handlers to the newly minted DOM elements
    this.overlay.style.display = 'none'
    this.overlay.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      this.end()
    })

    this.lightBox.style.display = 'none'
    this.lightBox.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      this.end()
    })

    // Prevent lightBox from closing when clicking on image and data containers
    this.container.addEventListener('click', event => event.stopPropagation())
    this.dataContainer.addEventListener('click', event => event.stopPropagation())

    this.outerContainer.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      this.end()
    })

    this.navPrevious.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      this.changeImage(this.currentImageIndex === 0 ? this.album.length - 1 : this.currentImageIndex - 1)
    })

    this.navNext.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      this.changeImage(this.currentImageIndex === this.album.length - 1 ? 0 : this.currentImageIndex + 1)
    })

    /*
      Show context menu for image on right-click

      There is a div containing the navigation that spans the entire image and lives above of it. If
      you right-click, you are right clicking this div and not the image. This prevents users from
      saving the image or using other context menu actions with the image.

      To fix this, when we detect the right mouse button is pressed down, but not yet clicked, we
      set pointer-events to none on the nav div. This is so that the upcoming right-click event on
      the next mouseup will bubble down to the image. Once the right-click/contextmenu event occurs
      we set the pointer events back to auto for the nav div so it can capture hover and left-click
      events as usual.
     */
    this.nav.addEventListener('mousedown', event => {
      if (event.which === 3) {
        this.nav.style.pointerEvents = 'none'

        this.lightBox.addEventListener('contextmenu', () => {
          setTimeout(() => this.nav.style.pointerEvents = 'auto')
        }, { once: true })
      }
    })

    this.lightBox.querySelectorAll('.lb-loader, .lb-close').forEach(element =>
      element.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        this.end()
      }))
  }

  private start (link: HTMLAnchorElement): void {
    self.addEventListener('resize', this.resizeListener)

    document.querySelectorAll('select, object, embed')
      .forEach((element: HTMLElement) => element.style.visibility = 'hidden')

    this.sizeOverlay()

    this.album = []
    let imageNumber = 0

    const dataLightBoxValue = link.getAttribute('data-lightbox')
    const links = document.querySelectorAll(link.tagName + '[data-lightbox="' + dataLightBoxValue + '"]')

    links.forEach((element: HTMLAnchorElement, key: number) => {
      this.addToAlbum(element)

      if (element === link) {
        imageNumber = key
      }
    })

    // Position LightBox
    const top = document.documentElement.scrollTop + this.options.positionFromTop
    const left = document.documentElement.scrollLeft

    this.lightBox.style.top = top + 'px'
    this.lightBox.style.left = left + 'px'
    Effects.fadeIn(this.overlay, this.options.fadeDuration)
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
    this.lightBox
      .querySelectorAll('.lb-image, .lb-nav, .lb-prev, .lb-next, .lb-data-container, .lb-numbers, .lb-caption')
      .forEach((element: HTMLElement) => element.style.display = 'none')

    this.outerContainer.classList.add('animating')

    // When image to show is preloaded, we send the width and height to sizeContainer()
    const preloader = new Image()
    preloader.onload = () => {
      let imageHeight
      let imageWidth
      let maxImageHeight
      let maxImageWidth
      let windowHeight
      let windowWidth

      this.image.alt = this.album[imageNumber].alt
      this.image.src = this.album[imageNumber].href

      this.image.width = preloader.width
      this.image.height = preloader.height

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
            this.image.width = imageWidth
            this.image.height = imageHeight
          } else {
            imageHeight = maxImageHeight
            imageWidth = preloader.width / (preloader.height / imageHeight)
            this.image.width = imageWidth
            this.image.height = imageHeight
          }
        }
      }
      this.sizeContainer(this.image.width, this.image.height)
    }

    preloader.src = this.album[imageNumber].href
    this.currentImageIndex = imageNumber
  }

  private addToAlbum (link: HTMLAnchorElement): void {
    this.album.push({
      alt: link.getAttribute('data-alt'),
      href: link.getAttribute('href'),
      title: link.getAttribute('data-title') || link.getAttribute('title')
    })
  }

  private sizeOverlay (): void {
    const body = document.body
    const html = document.documentElement
    const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight)
    const width = Math.min(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth)

    this.overlay.style.width = width + 'px'
    this.overlay.style.height = height + 'px'
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
    this.navPrevious.style.height = newHeight + 'px'
    this.navNext.style.height = newHeight + 'px'
    this.showImage()
  }

  private showImage (): void {
    this.loader.style.display = 'none'
    Effects.fadeIn(this.image, this.options.imageFadeDuration)
    this.updateNav()
    this.updateDetails()
    this.preloadNeighbouringImages()
    this.enableKeyboardNav()
  }

  private updateNav (): void {
    // Check to see if the browser supports touch events. If so, we take the conservative approach
    // and assume that mouse hover events are not supported and always show prev/next navigation
    // arrows in image sets.
    let alwaysShowNav = false
    try {
      document.createEvent('TouchEvent')
      alwaysShowNav = this.options.alwaysShowNavOnTouchDevices
    } catch (e) {
      console.error(e)
    }

    this.nav.style.display = ''

    if (this.album.length > 1) {
      if (this.options.wrapAround) {
        if (alwaysShowNav) {
          this.navNext.style.opacity = '1'
          this.navPrevious.style.opacity = '1'
        }
        this.navNext.style.display = ''
        this.navPrevious.style.display = ''
      } else {
        if (this.currentImageIndex > 0) {
          this.navPrevious.style.display = ''

          if (alwaysShowNav) {
            this.navPrevious.style.opacity = '1'
          }
        }
        if (this.currentImageIndex < this.album.length - 1) {
          this.navNext.style.display = ''
          if (alwaysShowNav) {
            this.navNext.style.opacity = '1'
          }
        }
      }
    }
  }

  private updateDetails (): void {
    // Enable anchor clicks in the injected caption html.
    // Thanks Nate Wright for the fix. @https://github.com/NateWr
    if (typeof this.album[this.currentImageIndex].title !== undefined &&
      this.album[this.currentImageIndex].title !== '') {

      if (this.options.sanitizeTitle) {
        this.caption.textContent = this.album[this.currentImageIndex].title
      } else {
        this.caption.innerHTML = this.album[this.currentImageIndex].title
      }
      Effects.fadeIn(this.caption)
      this.caption.querySelectorAll('a')
        .forEach((element: HTMLElement) => element.addEventListener('click', event => {
          const anchor = event.currentTarget as HTMLAnchorElement
          if (anchor.target !== undefined) {
            self.open(anchor.href, anchor.target)
          } else {
            location.href = anchor.href
          }
        }))
    }

    if (this.album.length > 1 && this.options.showImageNumberLabel) {
      this.numberElement.textContent = this.imageCountLabel(this.currentImageIndex + 1, this.album.length)
      Effects.fadeIn(this.numberElement)
    } else {
      this.numberElement.style.display = 'none'
    }

    this.outerContainer.classList.remove('animating')
    Effects.fadeIn(this.dataContainer, this.options.resizeDuration, () => this.sizeOverlay())
  }

  private preloadNeighbouringImages (): void {
    if (this.album.length > this.currentImageIndex + 1) {
      const preloadNext = new Image()
      preloadNext.src = this.album[this.currentImageIndex + 1].href
    }
    if (this.currentImageIndex > 0) {
      const preloadPrev = new Image()
      preloadPrev.src = this.album[this.currentImageIndex - 1].href
    }
  }

  private enableKeyboardNav (): void {
    document.addEventListener('keyup', this.keyboardEventHandler)
  }

  private disableKeyboardNav (): void {
    document.removeEventListener('keyup', this.keyboardEventHandler)
  }

  private keyboardAction (event: KeyboardEvent): void {
    if (['Left', 'ArrowLeft', 'p', 'P'].includes(event.key)) {
      if (this.currentImageIndex !== 0) {
        this.changeImage(this.currentImageIndex - 1)
      } else if (this.options.wrapAround && this.album.length > 1) {
        this.changeImage(this.album.length - 1)
      }
    } else if (['Right', 'ArrowRight', 'n', 'N'].includes(event.key)) {
      if (this.currentImageIndex !== this.album.length - 1) {
        this.changeImage(this.currentImageIndex + 1)
      } else if (this.options.wrapAround && this.album.length > 1) {
        this.changeImage(0)
      }
    } else if (['Escape', 'x', 'X', 'o', 'O', 'c', 'c'].includes(event.key)) {
      this.end()
    }
  }

  private end (): void {
    this.disableKeyboardNav()
    self.removeEventListener('resize', this.resizeListener)
    Effects.fadeOut(this.lightBox, this.options.fadeDuration)
    Effects.fadeOut(this.overlay, this.options.fadeDuration)
    document.querySelectorAll('select, object, embed')
      .forEach((element: HTMLElement) => element.style.visibility = 'visible')

    if (this.options.disableScrolling) {
      document.documentElement.classList.remove('lb-disable-scrolling')
    }
  }
}
