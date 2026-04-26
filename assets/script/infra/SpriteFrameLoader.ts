import { SpriteFrame, Texture2D, resources } from 'cc';

type SpriteFrameCallback = (frame: SpriteFrame | null) => void;

export class SpriteFrameLoader {
  private static readonly sharedCache = new Map<string, SpriteFrame | null>();
  private static readonly sharedPending = new Map<string, SpriteFrameCallback[]>();

  public preload(resourceKeys: string[]): Promise<void> {
    const uniqueKeys = Array.from(new Set(resourceKeys));
    if (uniqueKeys.length === 0) {
      return Promise.resolve();
    }

    return Promise.all(uniqueKeys.map((resourceKey) => new Promise<void>((resolve) => {
      this.load(resourceKey, () => {
        resolve();
      });
    }))).then(() => undefined);
  }

  public load(resourceKey: string, callback: SpriteFrameCallback): void {
    if (SpriteFrameLoader.sharedCache.has(resourceKey)) {
      callback(SpriteFrameLoader.sharedCache.get(resourceKey) ?? null);
      return;
    }

    const queue = SpriteFrameLoader.sharedPending.get(resourceKey);
    if (queue) {
      queue.push(callback);
      return;
    }

    SpriteFrameLoader.sharedPending.set(resourceKey, [callback]);
    this.loadSpriteFrame(resourceKey, (frame) => {
      SpriteFrameLoader.sharedCache.set(resourceKey, frame);
      const callbacks = SpriteFrameLoader.sharedPending.get(resourceKey) ?? [];
      SpriteFrameLoader.sharedPending.delete(resourceKey);
      callbacks.forEach((item) => item(frame));
    });
  }

  public get(resourceKey: string): SpriteFrame | null | undefined {
    return SpriteFrameLoader.sharedCache.get(resourceKey);
  }

  private loadSpriteFrame(resourceKey: string, callback: SpriteFrameCallback): void {
    resources.load(`${resourceKey}/spriteFrame`, SpriteFrame, (spriteError, spriteAsset) => {
      if (!spriteError && spriteAsset) {
        callback(spriteAsset);
        return;
      }

      resources.load(`${resourceKey}/texture`, Texture2D, (textureError, textureAsset) => {
        if (textureError || !textureAsset) {
          callback(null);
          return;
        }

        const frame = new SpriteFrame();
        frame.texture = textureAsset;
        callback(frame);
      });
    });
  }
}
