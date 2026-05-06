import {
  _decorator,
  Color,
  Component,
  Graphics,
  Label,
  Layers,
  Node,
  Sprite,
  SpriteFrame,
  UITransform,
  Vec3,
} from 'cc'

import type { GameSession, SessionEvent, SessionStateSnapshot } from '../game/session/GameSession'
import { SpriteFrameLoader } from '../infra/SpriteFrameLoader'
import { Utils } from '../lbspace/utils/Utils'

const { ccclass } = _decorator

const STATUS_BAR_WIDTH = 750
const PADDING_X = 32
const ICON_SIZE = 28
const LABEL_FONT_SIZE = 20
const GROUP_GAP = 16

@ccclass('StatusBarController')
export class StatusBarController extends Component {
  private session: GameSession | null = null
  private unsubscribe: (() => void) | null = null
  private readonly spriteFrameLoader = new SpriteFrameLoader()

  private background: Graphics | null = null
  private coinLabel: Label | null = null
  private energyLabel: Label | null = null
  private energyGroup: Node | null = null

  private showEnergy = false

  protected onDestroy(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  public bind(session: GameSession): void {
    this.session = session
    this.ensureScaffold()
    this.unsubscribe?.()
    this.unsubscribe = this.session.subscribe((event) => this.handleSessionEvent(event))
    this.render(this.session.getSnapshot())
  }

  public setShowEnergy(show: boolean): void {
    this.showEnergy = show
    if (this.energyGroup) {
      this.energyGroup.active = show
    }
    this.refreshLayout()
  }

  private handleSessionEvent(event: SessionEvent): void {
    this.render(event.snapshot)
  }

  private ensureScaffold(): void {
    if (this.background) {
      return
    }

    const safeAreaTop = Utils.getSafeArea().top
    const barHeight = Math.max(safeAreaTop, 44)

    this.node.layer = Layers.Enum.UI_2D
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform)
    transform.setContentSize(STATUS_BAR_WIDTH, barHeight)

    this.background = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics)
    this.drawBackground(barHeight)

    this.createCoinGroup()
    this.createEnergyGroup()
    this.refreshLayout()
  }

  private drawBackground(height: number): void {
    if (!this.background) return

    this.background.clear()
    this.background.fillColor = new Color(61, 43, 31, 180)
    this.background.roundRect(-STATUS_BAR_WIDTH / 2, -height / 2, STATUS_BAR_WIDTH, height, 0)
    this.background.fill()
  }

  private createCoinGroup(): void {
    const coinGroup = new Node('CoinGroup')
    coinGroup.layer = Layers.Enum.UI_2D
    coinGroup.parent = this.node
    coinGroup.addComponent(UITransform).setContentSize(120, 36)

    const coinIcon = this.createIcon(coinGroup, 'CoinIcon', ICON_SIZE, ICON_SIZE)
    this.applySprite(coinIcon, 'ui/header_coin')

    const coinLabelNode = this.createLabel(coinGroup, 'CoinLabel', LABEL_FONT_SIZE)
    this.coinLabel = coinLabelNode.getComponent(Label)
  }

  private createEnergyGroup(): void {
    const energyGroup = new Node('EnergyGroup')
    energyGroup.layer = Layers.Enum.UI_2D
    energyGroup.parent = this.node
    energyGroup.addComponent(UITransform).setContentSize(100, 36)

    const energyIcon = this.createIcon(energyGroup, 'EnergyIcon', ICON_SIZE, ICON_SIZE)
    this.applySprite(energyIcon, 'ui/header_hp')

    const energyLabelNode = this.createLabel(energyGroup, 'EnergyLabel', LABEL_FONT_SIZE)
    this.energyLabel = energyLabelNode.getComponent(Label)

    this.energyGroup = energyGroup
    this.energyGroup.active = this.showEnergy
  }

  private createIcon(parent: Node, name: string, width: number, height: number): Node {
    const node = parent.getChildByName(name) ?? new Node(name)
    if (!node.parent) {
      node.parent = parent
    }
    node.layer = Layers.Enum.UI_2D
    node.addComponent(UITransform).setContentSize(width, height)
    const sprite = node.addComponent(Sprite)
    sprite.type = Sprite.Type.SIMPLE
    sprite.sizeMode = Sprite.SizeMode.CUSTOM
    return node
  }

  private createLabel(parent: Node, name: string, fontSize: number): Node {
    const node = parent.getChildByName(name) ?? new Node(name)
    if (!node.parent) {
      node.parent = parent
    }
    node.layer = Layers.Enum.UI_2D
    node.addComponent(UITransform).setContentSize(80, 36)
    const label = node.addComponent(Label)
    label.fontSize = fontSize
    label.lineHeight = fontSize + 4
    label.horizontalAlign = Label.HorizontalAlign.LEFT
    label.verticalAlign = Label.VerticalAlign.CENTER
    label.color = Color.WHITE
    return node
  }

  private refreshLayout(): void {
    const safeAreaTop = Utils.getSafeArea().top
    const barHeight = Math.max(safeAreaTop, 44)

    const coinGroup = this.node.getChildByName('CoinGroup')
    if (coinGroup) {
      const coinIcon = coinGroup.getChildByName('CoinIcon')
      const coinLabelNode = coinGroup.getChildByName('CoinLabel')
      if (coinIcon) coinIcon.setPosition(-40, 0, 0)
      if (coinLabelNode) coinLabelNode.setPosition(8, 0, 0)
      coinGroup.setPosition(-STATUS_BAR_WIDTH / 2 + PADDING_X + 60, barHeight / 2 - barHeight / 2, 0)
    }

    if (this.energyGroup && this.showEnergy) {
      const energyIcon = this.energyGroup.getChildByName('EnergyIcon')
      const energyLabelNode = this.energyGroup.getChildByName('EnergyLabel')
      if (energyIcon) energyIcon.setPosition(-40, 0, 0)
      if (energyLabelNode) energyLabelNode.setPosition(8, 0, 0)
      this.energyGroup.setPosition(STATUS_BAR_WIDTH / 2 - PADDING_X - 60, 0, 0)
    }
  }

  private render(snapshot: SessionStateSnapshot): void {
    this.ensureScaffold()

    if (this.coinLabel) {
      this.coinLabel.string = `${snapshot.wallet.coins}`
    }

    if (this.energyLabel) {
      this.energyLabel.string = `${snapshot.stats.remaining}`
    }
  }

  private applySprite(sprite: Node, key: string): void {
    const spriteComponent = sprite.getComponent(Sprite)
    if (!spriteComponent) return

    const cached = this.spriteFrameLoader.get(key)
    if (cached !== undefined) {
      spriteComponent.spriteFrame = cached
      return
    }

    spriteComponent.spriteFrame = null
    this.spriteFrameLoader.load(key, (frame: SpriteFrame | null) => {
      if (!frame) {
        console.warn('[StatusBarView] Failed to load texture', key)
        return
      }
      spriteComponent.spriteFrame = frame
    })
  }
}
