import Component from './Component'
import Dimension from '../geometry/Dimension'

export default class LbContainer extends Component<HTMLImageElement> {
  constructor (dimension: Dimension = Dimension.ZERO) {
    super('div', 'lb-container', dimension, '')
    this.visible = true
  }

  update (): void {
    // TODO: Implement
  }
}
