import Dimension from '../geometry/Dimension'
import Component from './Component'

export default class LbNav extends Component<HTMLDivElement> {
  constructor (dimension: Dimension = Dimension.ZERO) {
    super('div', 'lb-nav', dimension)
  }

  update (): void {
    // TODO: Implement
  }
}
