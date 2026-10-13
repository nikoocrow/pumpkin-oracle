import * as THREE from 'three'

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uScale;
  varying float vAlpha;
  #include <fog_pars_vertex>
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uScale / -mvPosition.z;
    vAlpha = aAlpha;
    #include <fog_vertex>
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uSoftness;
  varying float vAlpha;
  #include <fog_pars_fragment>
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.5 - uSoftness, 0.5, d)) * clamp(vAlpha, 0.0, 1.0);
    if (!(a > 0.003)) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

// Sistema de partículas genérico (GPU points) con piscina fija.
export class ParticleSystem {
  constructor({
    max = 200,
    color = 0xffffff,
    intensity = 1,
    blending = THREE.NormalBlending,
    softness = 0.5,
    life = [1.5, 3],
    size = [0.2, 0.5],
    grow = 1.5, // multiplicador de tamaño al final de la vida
    velocity = () => new THREE.Vector3(0, 0.3, 0),
    drag = 0.4,
    buoyancy = 0.15,
    maxAlpha = 0.5,
  }) {
    this.opts = { life, size, grow, velocity, drag, buoyancy, maxAlpha }
    this.max = max
    this.cursor = 0

    this.pos = new Float32Array(max * 3)
    this.vel = new Float32Array(max * 3)
    this.age = new Float32Array(max).fill(Infinity)
    this.life = new Float32Array(max).fill(1)
    this.baseSize = new Float32Array(max)
    this.sizeAttr = new Float32Array(max)
    this.alphaAttr = new Float32Array(max)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage),
    )
    geo.setAttribute(
      'aSize',
      new THREE.BufferAttribute(this.sizeAttr, 1).setUsage(THREE.DynamicDrawUsage),
    )
    geo.setAttribute(
      'aAlpha',
      new THREE.BufferAttribute(this.alphaAttr, 1).setUsage(THREE.DynamicDrawUsage),
    )
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 10)

    const c = new THREE.Color(color).multiplyScalar(intensity)
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { uColor: { value: c }, uScale: { value: 400 }, uSoftness: { value: softness } },
      ]),
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending,
      fog: true,
      toneMapped: true,
    })

    this.points = new THREE.Points(geo, this.material)
    this.points.frustumCulled = false
    this.points.renderOrder = 2
  }

  // Escala de los puntos según el alto del canvas (para que no cambien con la resolución)
  setViewportHeight(px) {
    this.material.uniforms.uScale.value = px * 0.5
  }

  spawn(origin) {
    const i = this.cursor
    this.cursor = (this.cursor + 1) % this.max
    const { life, size, velocity } = this.opts
    const v = velocity()
    this.pos.set([origin.x, origin.y, origin.z], i * 3)
    this.vel.set([v.x, v.y, v.z], i * 3)
    this.age[i] = 0
    this.life[i] = THREE.MathUtils.lerp(life[0], life[1], Math.random())
    this.baseSize[i] = THREE.MathUtils.lerp(size[0], size[1], Math.random())
  }

  update(delta) {
    const { grow, drag, buoyancy, maxAlpha } = this.opts
    const damp = Math.exp(-drag * delta)

    for (let i = 0; i < this.max; i++) {
      if (this.age[i] === Infinity) continue
      this.age[i] += delta
      const t = this.age[i] / this.life[i]
      if (t >= 1) {
        this.age[i] = Infinity
        this.alphaAttr[i] = 0
        continue
      }
      const j = i * 3
      this.vel[j] *= damp
      this.vel[j + 1] = this.vel[j + 1] * damp + buoyancy * delta
      this.vel[j + 2] *= damp
      this.pos[j] += this.vel[j] * delta
      this.pos[j + 1] += this.vel[j + 1] * delta
      this.pos[j + 2] += this.vel[j + 2] * delta

      // Aparece rápido, se desvanece lento
      const fadeIn = Math.min(1, t / 0.15)
      const fadeOut = 1 - t
      this.alphaAttr[i] = maxAlpha * fadeIn * fadeOut * fadeOut
      this.sizeAttr[i] = this.baseSize[i] * (1 + (grow - 1) * t)
    }

    const attrs = this.points.geometry.attributes
    attrs.position.needsUpdate = true
    attrs.aSize.needsUpdate = true
    attrs.aAlpha.needsUpdate = true
  }
}
