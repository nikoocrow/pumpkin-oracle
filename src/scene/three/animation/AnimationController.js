import * as THREE from 'three'
import { ANIMATION } from '../config.js'

// Envuelve el AnimationMixer: un estado activo a la vez, con fundido entre clips.
export class AnimationController {
  constructor(root, clips, states) {
    this.mixer = new THREE.AnimationMixer(root)
    this.states = states
    this.actions = {} // { idle: AnimationAction, hablar: ..., reir: ... }
    this.current = null
    this.listeners = new Set()

    for (const [name, def] of Object.entries(states)) {
      const clip = THREE.AnimationClip.findByName(clips, def.clip)
      if (!clip) {
        console.warn(`[AnimationController] El GLB no tiene el clip "${def.clip}"`)
        continue
      }
      const action = this.mixer.clipAction(clip)
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.clampWhenFinished = false
      this.actions[name] = action
    }
  }

  get names() {
    return Object.keys(this.actions)
  }

  play(name, fade = ANIMATION.crossFade) {
    const next = this.actions[name]
    if (!next || name === this.current) return

    const prev = this.current ? this.actions[this.current] : null
    next.reset().setEffectiveWeight(1).play()
    if (prev) prev.crossFadeTo(next, fade, false)
    else next.fadeIn(fade)

    this.current = name
    this.listeners.forEach((fn) => fn(name))
  }

  onChange(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  update(delta) {
    this.mixer.update(delta)
  }
}
