/**
 * 🔊 AudioMgr - 音频管理器
 * 借鉴自 ref_project/dlspace/AudioMgr
 *
 * 功能：
 * - 背景音乐与音效分离管理
 * - 音效防抖（同一音效短时间内不重复播放）
 * - 音量控制
 *
 * 使用方式：
 * ```typescript
 * import { AudioMgr } from '../lbspace';
 *
 * // 播放背景音乐（循环）
 * AudioMgr.background.play(bgmClip);
 *
 * // 停止背景音乐
 * AudioMgr.background.stop();
 *
 * // 播放音效（自动防抖）
 * AudioMgr.inst.playOneShot(sfxClip);
 *
 * // 设置音量
 * AudioMgr.inst.volume = 0.5;
 * AudioMgr.background.volume = 0.8;
 * ```
 */

import { AudioClip, AudioSource, director, Node } from 'cc';

class AudioMgrClass {
    private _audio: AudioSource | null = null;
    private _audioMap: Map<AudioClip, number> = new Map();
    private _initialized = false;

    private _ensureAudioNode(): AudioSource {
        if (this._initialized) {
            return this._audio!;
        }
        this._initialized = true;

        const scene = director.getScene();
        if (!scene) {
            throw new Error('[AudioMgr] No scene found when initializing');
        }

        const audioNode = new Node('AudioMgr');
        scene.addChild(audioNode);
        director.addPersistRootNode(audioNode);

        this._audio = audioNode.addComponent(AudioSource);
        this._audio.playOnAwake = false;
        return this._audio;
    }

    get audio(): AudioSource {
        return this._ensureAudioNode();
    }

    get volume(): number {
        return this._audio?.volume ?? 1;
    }

    set volume(value: number) {
        if (this._audio) {
            this._audio.volume = Math.max(0, Math.min(1, value));
        }
    }

    /**
     * 播放音效（带防抖，短时间内同一音效不会重复播放）
     * @param sound - 音效剪辑
     * @param delay - 防抖间隔（秒），默认 0.2s
     * @returns 是否成功播放
     */
    playOneShot(sound: AudioClip, delay = 0.2): boolean {
        const now = Date.now();
        const lastTime = this._audioMap.get(sound) ?? 0;

        if (now - lastTime >= delay * 1000) {
            this._audioMap.set(sound, now);
            this._ensureAudioNode().playOneShot(sound);
            return true;
        }
        return false;
    }

    /**
     * 播放背景音乐（循环）
     * @param sound - 音乐剪辑
     */
    play(sound: AudioClip): void {
        const audio = this._ensureAudioNode();
        audio.stop();
        audio.clip = sound;
        audio.loop = true;
        audio.play();
    }

    /**
     * 停止播放
     */
    stop(): void {
        this._audio?.stop();
    }

    /**
     * 暂停播放
     */
    pause(): void {
        this._audio?.pause();
    }

    /**
     * 恢复播放
     */
    resume(): void {
        this._audio?.play();
    }
}

export const AudioMgr = new AudioMgrClass();
