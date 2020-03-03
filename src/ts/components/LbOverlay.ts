import Component from './Component'
import Dimension from '../geometry/Dimension'

export default class LbOverlay extends Component<HTMLDivElement> {
  constructor (dimension: Dimension = Dimension.ZERO) {
    super('div', 'lb-overlay', dimension)
  }

  update (): void {
    // TODO: Implement
  }
}
