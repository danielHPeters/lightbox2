import Component from './Component'
import LightBoxState from '../LightBoxState'
import Dimension from '../geometry/Dimension'

export default class LbCaption extends Component<HTMLSpanElement> {
  private sanitize: boolean
  private appState: LightBoxState

  constructor (appState: LightBoxState, sanitize: boolean, dimension: Dimension = Dimension.ZERO) {
    super('span', 'lb-caption', dimension)
    this.appState = appState
    this.sanitize = sanitize
  }

  update (): void {
    const title = this.appState.album[this.appState.currentImageIndex].title
    this.setContent(title ? title : '')
  }

  setContent (data: string): void {
    if (this.sanitize) {
      this.element.textContent = data
    } else {
      this.element.innerHTML = data
    }
  }
}
