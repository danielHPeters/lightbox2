export default class Dimension {
  static ZERO: Dimension = new Dimension(0, 0)
  width: number
  height: number

  constructor (width: number, height: number) {
    this.width = width
    this.height = height
  }
}
