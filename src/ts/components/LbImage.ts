import Component from './Component'
import Dimension from '../geometry/Dimension'

export default class LbImage extends Component<HTMLImageElement> {
  constructor (src: string, dimension: Dimension = Dimension.ZERO) {
    super('img', 'lb-image', dimension)
    this.element.src = src
  }

  setSize (width: number, height: number) {
    this.element.width = width
    this.element.height = height
  }

  update (): void {
    // TODO: Implement
  }
}
