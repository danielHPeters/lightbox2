import Dimension from '../geometry/Dimension'
import Effects from '../util/Effects'

export default abstract class Component<T extends HTMLElement> {
  private initialized: boolean
  protected readonly opacity: number | ''
  protected currentOpacity: number | ''
  protected visible: boolean
  readonly element: T
  dimension: Dimension
  childComponents: Component<HTMLElement>[]
  className: string

  protected constructor (elementType: string, className: string, dimension: Dimension, opacity: number | '' = 0) {
    this.element = document.createElement(elementType) as T
    this.dimension = dimension
    this.childComponents = []
    this.className = className
    this.opacity = opacity
    this.currentOpacity = opacity
    this.initialized = false
    this.visible = false
    this.element.classList.add(className)
  }

  addListener (eventType: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
    this.element.addEventListener(eventType, handler, options)
  }

  /**
   * Make the initial render. By default the element is hidden.
   */
  init (): void {
    if (!this.initialized) {
      const fragment = document.createDocumentFragment()
      this.childComponents.forEach(component => {
        component.init()
        fragment.appendChild(component.element)
      })
      this.element.style.opacity = this.currentOpacity.toString()
      this.element.style.display = this.visible ? '' : 'none'
      this.element.append(fragment)
      this.initialized = true
    }
  }

  show (duration: number = 400, callback: () => void = undefined) {
    Effects.fadeIn(this.element, duration, callback)
  }

  hide (duration: number = 400, callback: () => void = undefined): void {
    Effects.fadeOut(this.element, duration, callback)
  }

  setSize (width: number, height: number) {
    this.element.style.width = width + 'px'
    this.element.style.height = height + 'px'
  }

  setWidth (width: number): void {
    this.element.style.width = width + 'px'
  }

  setHeight (height: number): void {
    this.element.style.height = height + 'px'
  }

  setContent (data: string): void {
    this.element.textContent = data
  }

  abstract update (): void

  render (): void {
    this.show()
  }
}
