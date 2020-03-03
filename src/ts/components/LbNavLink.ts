import Component from './Component'
import Dimension from '../geometry/Dimension'
import LightBoxState from '../LightBoxState'

export default class LbNavLink extends Component<HTMLAnchorElement> {
  private appState: LightBoxState
  private wrapAround: boolean
  private alwaysShowNav: boolean
  private type: string

  constructor (
    appState: LightBoxState,
    wrapAround: boolean,
    alwaysShowNav: boolean,
    type: 'prev' | 'next',
    dimension: Dimension = Dimension.ZERO
  ) {
    super('div', `lb-${type}`, dimension , '')
    this.appState = appState
    this.wrapAround = wrapAround
    this.alwaysShowNav = alwaysShowNav
    this.type = type
  }

  update (): void {
    // TODO: Implement
  }

  render (): void {
    if (this.appState.album.length > 1) {
      if (this.wrapAround) {
        if (!this.appState.userCanHover || this.alwaysShowNav) {
          this.element.style.opacity = '1'
        }
        this.element.style.display = ''
      } else {
        if (this.type === 'prev') {
          if (this.appState.isNotFirst()) {
            this.element.style.display = ''

            if (!this.appState.userCanHover || this.alwaysShowNav) {
              this.element.style.opacity = '1'
            }
          }
        } else if (this.type === 'next') {
          if (this.appState.isNotLast()) {
            this.element.style.display = ''

            if (!this.appState.userCanHover || this.alwaysShowNav) {
              this.element.style.opacity = '1'
            }
          }
        }
      }
    }
  }
}
