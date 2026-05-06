import { sys, view } from 'cc'
import { EDITOR } from 'cc/env'

export class Utils {
  static getSafeArea(): { top: number; bottom: number } {
    if (EDITOR) {
      return { top: 0, bottom: 0 }
    }
    const safeArea = sys.getSafeAreaRect()
    const screenHeight = view.getVisibleSize().height
    return {
      top: screenHeight - safeArea.y - safeArea.height,
      bottom: safeArea.y,
    }
  }
}
