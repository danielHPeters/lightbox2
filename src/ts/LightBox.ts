import Box from './Box'
import ImageProps from './ImageProps'

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
  private lightbox: JQuery<HTMLElement>
  private overlay: JQuery<HTMLElement>
  private outerContainer: JQuery<HTMLElement>
  private container: JQuery<HTMLElement>
  private image: JQuery<HTMLElement>
  private nav: JQuery<HTMLElement>
  private containerPadding: Box
  private imageBorderWidth: Box
  private readonly keyboardEventHandler: any

  private constructor (options?: Partial<LightBoxOptions>) {
    this.album = []
    this.currentImageIndex = undefined

    // options
    this.options = $.extend({}, options, LightBox.defaults)
    this.keyboardEventHandler = this.keyboardAction.bind(this)
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
    $('body').on(
      'click',
      'a[data-lightbox], area[data-lightbox]',
      event => {
        this.start($(event.currentTarget))
        return false
      })
  }

  private generateHtmlLayout (): void {
    $('body').append(
      '<div id="lightBoxOverlay" class="lb-overlay"></div>' +
      '<div id="lightBox" class="lb">' +
      '<div class="lb-outer-container">' +
      '<div class="lb-container">' +
      '<img class="lb-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==">' +
      '<div class="lb-nav">' +
      '<a class="lb-prev" href="" ></a>' +
      '<a class="lb-next" href="" ></a>' +
      '</div>' +
      '<div class="lb-loader">' +
      '<a class="lb-cancel"></a>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="lb-data-container">' +
      '<div class="lb-data">' +
      '<div class="lb-details">' +
      '<span class="lb-caption"></span>' +
      '<span class="lb-number"></span>' +
      '</div>' +
      '<div class="lb-close-container">' +
      '<a class="lb-close"></a>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>'
    )
  }

  private cache (): void {
    // Cache jQuery objects
    this.lightbox = $('#lightBox')
    this.overlay = $('#lightBoxOverlay')
    this.outerContainer = this.lightbox.find('.lb-outer-container')
    this.container = this.lightbox.find('.lb-container')
    this.image = this.lightbox.find('.lb-image')
    this.nav = this.lightbox.find('.lb-nav')

    // Store sass values for future lookup
    this.containerPadding = {
      top: parseInt(this.container.css('padding-top'), 10),
      right: parseInt(this.container.css('padding-right'), 10),
      bottom: parseInt(this.container.css('padding-bottom'), 10),
      left: parseInt(this.container.css('padding-left'), 10)
    }

    this.imageBorderWidth = {
      top: parseInt(this.image.css('border-top-width'), 10),
      right: parseInt(this.image.css('border-right-width'), 10),
      bottom: parseInt(this.image.css('border-bottom-width'), 10),
      left: parseInt(this.image.css('border-left-width'), 10)
    }
  }

  private build (): void {
    console.log('Start build')
    this.generateHtmlLayout()
    this.cache()

    // Attach event handlers to the newly minted DOM elements
    this.overlay.hide().on('click', () => {
      this.end()
      return false
    })

    this.lightbox.hide().on('click', event => {
      if ($(event.target).attr('id') === 'lightBox') {
        this.end()
      }
      return false
    })

    this.outerContainer.on('click', event => {
      if ($(event.target).attr('id') === 'lightBox') {
        this.end()
      }
      return false
    })

    this.lightbox.find('.lb-prev').on('click', () => {
      if (this.currentImageIndex === 0) {
        this.changeImage(this.album.length - 1)
      } else {
        this.changeImage(this.currentImageIndex - 1)
      }
      return false
    })

    this.lightbox.find('.lb-next').on('click', () => {
      if (this.currentImageIndex === this.album.length - 1) {
        this.changeImage(0)
      } else {
        this.changeImage(this.currentImageIndex + 1)
      }
      return false
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
    this.nav.on('mousedown', event => {
      if (event.which === 3) {
        this.nav.css('pointer-events', 'none')

        this.lightbox.one('contextmenu', () => {
          setTimeout(() => this.nav.css('pointer-events', 'auto'))
        })
      }
    })

    this.lightbox.find('.lb-loader, .lb-close').on('click', () => {
      this.end()
      return false
    })
  }

  private start ($link): void {
    const $window = $(window)

    $window.on('resize', () => this.sizeOverlay())

    $('select, object, embed').css({
      visibility: 'hidden'
    })

    this.sizeOverlay()

    this.album = []
    let imageNumber = 0

    const dataLightboxValue = $link.attr('data-lightbox')
    const $links = $($link.prop('tagName') + '[data-lightbox="' + dataLightboxValue + '"]')

    for (let i = 0; i < $links.length; i = ++i) {
      this.addToAlbum($($links[i]))
      if ($links[i] === $link[0]) {
        imageNumber = i
      }
    }

    // Position Lightbox
    const top = $window.scrollTop() + this.options.positionFromTop
    const left = $window.scrollLeft()
    this.lightbox.css({
      top: top + 'px',
      left: left + 'px'
    }).fadeIn(this.options.fadeDuration)

    // Disable scrolling of the page while open
    if (this.options.disableScrolling) {
      document.documentElement.classList.add('lb-disable-scrolling')
    }

    this.changeImage(imageNumber)
  }

  private changeImage (imageNumber: number): void {
    this.disableKeyboardNav()
    const image = this.lightbox.find('.lb-image')

    this.overlay.fadeIn(this.options.fadeDuration)

    $('.lb-loader').fadeIn('slow')
    this.lightbox.find('.lb-image, .lb-nav, .lb-prev, .lb-next, .lb-data-container, .lb-numbers, .lb-caption').hide()

    this.outerContainer.addClass('animating')

    // When image to show is preloaded, we send the width and height to sizeContainer()
    const preloader = new Image()
    preloader.onload = () => {
      let imageHeight
      let imageWidth
      let maxImageHeight
      let maxImageWidth
      let windowHeight
      let windowWidth

      image.attr({
        alt: this.album[imageNumber].alt,
        src: this.album[imageNumber].link
      })

      image.width(preloader.width)
      image.height(preloader.height)

      if (this.options.fitImagesInViewport) {
        // Fit image inside the viewport.
        // Take into account the border around the image and an additional 10px gutter on each side.

        windowWidth = $(window).width()
        windowHeight = $(window).height()
        maxImageWidth = windowWidth - this.containerPadding.left - this.containerPadding.right - this.imageBorderWidth.left - this.imageBorderWidth.right - 20
        maxImageHeight = windowHeight - this.containerPadding.top - this.containerPadding.bottom - this.imageBorderWidth.top - this.imageBorderWidth.bottom - 120

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
            image.width(imageWidth)
            image.height(imageHeight)
          } else {
            imageHeight = maxImageHeight
            imageWidth = preloader.width / (preloader.height / imageHeight)
            image.width(imageWidth)
            image.height(imageHeight)
          }
        }
      }
      this.sizeContainer(image.width(), image.height())
    }

    preloader.src = this.album[imageNumber].link
    this.currentImageIndex = imageNumber
  }

  private addToAlbum (link): void {
    this.album.push({
      alt: link.attr('data-alt'),
      link: link.attr('href'),
      title: link.attr('data-title') || link.attr('title')
    })
  }

  private sizeOverlay (): void {
    this.overlay
      .width($(document).width())
      .height($(document).height())
  }

  private sizeContainer (imageWidth: number, imageHeight: number) {
    const oldWidth = this.outerContainer.outerWidth()
    const oldHeight = this.outerContainer.outerHeight()
    const newWidth = imageWidth + this.containerPadding.left + this.containerPadding.right + this.imageBorderWidth.left + this.imageBorderWidth.right
    const newHeight = imageHeight + this.containerPadding.top + this.containerPadding.bottom + this.imageBorderWidth.top + this.imageBorderWidth.bottom

    if (oldWidth !== newWidth || oldHeight !== newHeight) {
      this.outerContainer.animate({
        width: newWidth,
        height: newHeight
      }, this.options.resizeDuration, 'swing', () => {
        this.postResize(newWidth, newHeight)
      })
    } else {
      this.postResize(newWidth, newHeight)
    }
  }

  private postResize (newWidth: number, newHeight: number) {
    this.lightbox.find('.lb-data-container').width(newWidth)
    this.lightbox.find('.lb-prev-link').height(newHeight)
    this.lightbox.find('.lb-next-link').height(newHeight)
    this.showImage()
  }

  private showImage (): void {
    this.lightbox.find('.lb-loader').stop(true).hide()
    this.lightbox.find('.lb-image').fadeIn(this.options.imageFadeDuration)

    this.updateNav()
    this.updateDetails()
    this.preloadNeighboringImages()
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

    this.lightbox.find('.lb-nav').show()

    if (this.album.length > 1) {
      if (this.options.wrapAround) {
        if (alwaysShowNav) {
          this.lightbox.find('.lb-prev, .lb-next').css('opacity', '1')
        }
        this.lightbox.find('.lb-prev, .lb-next').show()
      } else {
        if (this.currentImageIndex > 0) {
          this.lightbox.find('.lb-prev').show()
          if (alwaysShowNav) {
            this.lightbox.find('.lb-prev').css('opacity', '1')
          }
        }
        if (this.currentImageIndex < this.album.length - 1) {
          this.lightbox.find('.lb-next').show()
          if (alwaysShowNav) {
            this.lightbox.find('.lb-next').css('opacity', '1')
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
      const $caption = this.lightbox.find('.lb-caption')

      if (this.options.sanitizeTitle) {
        $caption.text(this.album[this.currentImageIndex].title)
      } else {
        $caption.html(this.album[this.currentImageIndex].title)
      }
      $caption.fadeIn('fast').find('a').on('click', function () {
        if ($(this).attr('target') !== undefined) {
          window.open($(this).attr('href'), $(this).attr('target'))
        } else {
          location.href = $(this).attr('href')
        }
      })
    }

    if (this.album.length > 1 && this.options.showImageNumberLabel) {
      const labelText = this.imageCountLabel(this.currentImageIndex + 1, this.album.length)
      this.lightbox.find('.lb-number').text(labelText).fadeIn('fast')
    } else {
      this.lightbox.find('.lb-number').hide()
    }

    this.outerContainer[0].classList.remove('animating')

    this.lightbox.find('.lb-data-container').fadeIn(this.options.resizeDuration, () => this.sizeOverlay())
  }

  private preloadNeighboringImages (): void {
    if (this.album.length > this.currentImageIndex + 1) {
      const preloadNext = new Image()
      preloadNext.src = this.album[this.currentImageIndex + 1].link
    }
    if (this.currentImageIndex > 0) {
      const preloadPrev = new Image()
      preloadPrev.src = this.album[this.currentImageIndex - 1].link
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
    $(window).off('resize', this.sizeOverlay)
    this.lightbox.fadeOut(this.options.fadeDuration)
    this.overlay.fadeOut(this.options.fadeDuration)
    $('select, object, embed').css({
      visibility: 'visible'
    })

    if (this.options.disableScrolling) {
      document.documentElement.classList.remove('lb-disable-scrolling')
    }
  }
}
