import Dimension from '../geometry/Dimension'
import Component from './Component'
import LightBoxState from '../LightBoxState'

export default class LbNumberLabel extends Component<HTMLSpanElement> {
  private appState: LightBoxState
  private label: string

  constructor (appState: LightBoxState, label: string, dimension: Dimension = Dimension.ZERO) {
    super('span', 'lb-number', dimension)
    this.appState = appState
    this.label = label
  }

  update (): void {
    this.setContent(
      this.label
        .replace(/%1/g, (this.appState.currentImageIndex + 1).toString())
        .replace(/%2/g, this.appState.album.length.toString())
    )
  }
}
