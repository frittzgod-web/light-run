// v12 High-tier post-processing: HDR render target (MSAA) -> soft bloom (quarter-res bright pass + separable blur)
// -> ACES filmic tone mapping, per-zone colour grade (lift/gamma/gain, saturation, warmth), vignette, light shafts
// from the sun's screen position, and a faint film grain. Balanced / Battery saver never touch this (direct render).
import { THREE } from './toon.js';

const TRI = new THREE.BufferGeometry();
TRI.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
TRI.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
function pass(fs, uniforms) { const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false }); const q = new THREE.Mesh(TRI, m); q.frustumCulled = false; return q; }

export function createPost(renderer) {
  const isGL2 = renderer.capabilities.isWebGL2;
  const rtOpt = { type: THREE.HalfFloatType, depthBuffer: true, samples: isGL2 ? 4 : 0 };
  const main = new THREE.WebGLRenderTarget(4, 4, rtOpt);
  const small = { type: THREE.HalfFloatType, depthBuffer: false };
  const bA = new THREE.WebGLRenderTarget(4, 4, small), bB = new THREE.WebGLRenderTarget(4, 4, small);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), scene = new THREE.Scene();
  const bright = pass(`uniform sampler2D tex; uniform float thr; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tex, vUv).rgb; float l = max(c.r, max(c.g, c.b)); float k = smoothstep(thr, thr + 0.6, l); gl_FragColor = vec4(c * k, 1.0); }`, { tex: { value: null }, thr: { value: 1.0 } });
  const blur = pass(`uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
    void main(){ vec3 s = texture2D(tex, vUv).rgb * 0.227;
      s += (texture2D(tex, vUv + dir * 1.385).rgb + texture2D(tex, vUv - dir * 1.385).rgb) * 0.316;
      s += (texture2D(tex, vUv + dir * 3.231).rgb + texture2D(tex, vUv - dir * 3.231).rgb) * 0.070;
      gl_FragColor = vec4(s, 1.0); }`, { tex: { value: null }, dir: { value: new THREE.Vector2() } });
  const U = {
    tex: { value: null }, bloom: { value: null }, bloomK: { value: 0.32 }, exposure: { value: 1.0 },
    lift: { value: new THREE.Vector3(0, 0, 0) }, gamma: { value: new THREE.Vector3(1, 1, 1) }, gain: { value: new THREE.Vector3(1, 1, 1) },
    sat: { value: 1.08 }, vig: { value: 0.28 }, sunUV: { value: new THREE.Vector2(0.5, 0.8) }, shaft: { value: 0.0 }, shaftCol: { value: new THREE.Color('#fff1d0') },
    time: { value: 0 }, grain: { value: 0.025 }, con: { value: 0.3 }, haze: { value: 0 },
  };
  const final = pass(`uniform sampler2D tex, bloom; uniform float bloomK, exposure, sat, vig, shaft, time, grain, con, haze;
    uniform vec3 lift, gamma, gain, shaftCol; uniform vec2 sunUV; varying vec2 vUv;
    vec3 aces(vec3 x){ const float a=2.51, b=0.03, c=2.43, d=0.59, e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0); }
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      if (haze > 0.001) { float band = smoothstep(0.42, 0.55, vUv.y) * (1.0 - smoothstep(0.55, 0.7, vUv.y)); uv.x += sin(vUv.y * 260.0 + time * 7.0) * 0.0016 * haze * band; uv.y += cos(vUv.x * 190.0 + time * 5.0) * 0.0008 * haze * band; }   // heat haze shimmering over the hot road near the horizon
      vec3 c = texture2D(tex, uv).rgb + texture2D(bloom, vUv).rgb * bloomK;
      if (shaft > 0.001) {   // god rays: march toward the sun and gather the bright sky
        vec2 d = (sunUV - vUv) / 14.0; vec2 p = vUv; float w = 1.0; vec3 g = vec3(0.0);
        for (int i = 0; i < 14; i++) { p += d; g += texture2D(bloom, p).rgb * w; w *= 0.9; }
        c += g * shaft * shaftCol / 14.0;
      }
      c = aces(c * exposure);
      c = pow(max(c * gain + lift * (1.0 - c), 0.0), 1.0 / gamma);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat);
      vec2 q = vUv - 0.5; c *= 1.0 - vig * dot(q, q) * 2.2;
      c += (h(vUv * 917.0 + time) - 0.5) * grain;
      vec3 o = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); o = mix(o, o * o * (3.0 - 2.0 * o), con);   // display-space S-curve for punchy contrast
      gl_FragColor = vec4(o, 1.0);
    }`, U);
  scene.add(final);
  let W = 0, H = 0;
  function size() {
    const v = renderer.getDrawingBufferSize(new THREE.Vector2()); if (v.x === W && v.y === H) return; W = v.x; H = v.y;
    main.setSize(W, H); bA.setSize(Math.max(1, W >> 2), Math.max(1, H >> 2)); bB.setSize(Math.max(1, W >> 2), Math.max(1, H >> 2));
  }
  const draw = (q, target) => { scene.children[0] = q; renderer.setRenderTarget(target); renderer.render(scene, cam); };
  const api = {
    U, on: false,
    // grade presets: per zone / world, blended smoothly toward the target each frame
    target: { lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], sat: 1.08, bloomK: 0.32, exposure: 1.0, shaft: 0.25, vig: 0.28, con: 0.3, haze: 0 },
    setGrade(g) { Object.assign(api.target, g); },
    render(sc, camera, dt = 0.016, sunWorld) {
      size();
      const t = api.target, k = Math.min(1, dt * 1.5);
      for (const n of ['lift', 'gamma', 'gain']) { const v = U[n].value; v.x += (t[n][0] - v.x) * k; v.y += (t[n][1] - v.y) * k; v.z += (t[n][2] - v.z) * k; }
      for (const n of ['sat', 'bloomK', 'exposure', 'vig', 'con', 'haze']) U[n].value += (t[n] - U[n].value) * k;
      let sh = t.shaft;
      if (sunWorld) { const p = sunWorld.clone().project(camera); U.sunUV.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5); if (p.z > 1 || Math.abs(p.x) > 1.6 || p.y < -0.2) sh = 0; }
      U.shaft.value += (sh - U.shaft.value) * k; U.time.value = (U.time.value + dt) % 100;
      const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
      renderer.setRenderTarget(main); renderer.render(sc, camera);
      scene.children[0] = bright; bright.material.uniforms.tex.value = main.texture; draw(bright, bA);
      blur.material.uniforms.tex.value = bA.texture; blur.material.uniforms.dir.value.set(1 / bA.width, 0); draw(blur, bB);
      blur.material.uniforms.tex.value = bB.texture; blur.material.uniforms.dir.value.set(0, 1 / bA.height); draw(blur, bA);
      blur.material.uniforms.tex.value = bA.texture; blur.material.uniforms.dir.value.set(2 / bA.width, 0); draw(blur, bB);
      blur.material.uniforms.tex.value = bB.texture; blur.material.uniforms.dir.value.set(0, 2 / bA.height); draw(blur, bA);
      U.tex.value = main.texture; U.bloom.value = bA.texture; draw(final, null);
      renderer.toneMapping = tm;
    },
    dispose() { main.dispose(); bA.dispose(); bB.dispose(); },
  };
  return api;
}
// colour grades: warm Lagos day, hazy cattle market, steely storm bridge, golden Ogun evening, Eden lush, Red Sea teal, Leviticus amber
export const GRADES = {
  day: { lift: [0.01, 0.005, 0.0], gamma: [1.0, 1.0, 1.0], gain: [1.04, 1.01, 0.96], sat: 1.22, bloomK: 0.3, exposure: 1.05, shaft: 0.3, vig: 0.26, con: 0.32, haze: 0.5 },
  kara: { lift: [0.02, 0.01, 0.0], gamma: [1.02, 1.0, 0.96], gain: [1.06, 1.0, 0.9], sat: 1.14, bloomK: 0.34, exposure: 1.06, shaft: 0.45, vig: 0.3, con: 0.32, haze: 1.0 },
  bridge: { lift: [0.0, 0.01, 0.02], gamma: [0.98, 1.0, 1.03], gain: [0.96, 1.0, 1.06], sat: 1.16, bloomK: 0.3, exposure: 1.02, shaft: 0.2, vig: 0.3, con: 0.32, haze: 0 },
  storm: { lift: [0.0, 0.01, 0.03], gamma: [0.96, 0.98, 1.04], gain: [0.9, 0.96, 1.08], sat: 0.95, bloomK: 0.45, exposure: 1.1, shaft: 0.0, vig: 0.42, con: 0.32, haze: 0 },
  ogun: { lift: [0.01, 0.01, 0.0], gamma: [1.0, 1.01, 0.99], gain: [1.03, 1.03, 0.97], sat: 1.24, bloomK: 0.3, exposure: 1.04, shaft: 0.3, vig: 0.26, con: 0.32, haze: 0.6 },
  market: { lift: [0.02, 0.01, 0.0], gamma: [1.02, 1.0, 0.97], gain: [1.07, 1.01, 0.92], sat: 1.22, bloomK: 0.32, exposure: 1.05, shaft: 0.35, vig: 0.28, con: 0.32, haze: 0.9 },
  dusk: { lift: [0.02, 0.0, 0.02], gamma: [1.03, 0.99, 0.97], gain: [1.1, 0.98, 0.9], sat: 1.22, bloomK: 0.45, exposure: 1.05, shaft: 0.6, vig: 0.34, con: 0.32, haze: 0.3 },
  genesis: { lift: [0.0, 0.015, 0.0], gamma: [1.0, 1.03, 0.98], gain: [1.02, 1.06, 0.95], sat: 1.30, bloomK: 0.3, exposure: 0.92, shaft: 0.3, vig: 0.28, con: 0.45, haze: 0.3 },
  exodus: { lift: [0.0, 0.01, 0.03], gamma: [0.98, 1.0, 1.04], gain: [0.95, 1.02, 1.08], sat: 1.22, bloomK: 0.3, exposure: 0.92, shaft: 0.3, vig: 0.32, con: 0.45, haze: 0 },
  leviticus: { lift: [0.025, 0.01, 0.0], gamma: [1.03, 1.0, 0.96], gain: [1.1, 1.02, 0.88], sat: 1.18, bloomK: 0.3, exposure: 0.92, shaft: 0.3, vig: 0.3, con: 0.45, haze: 0.8 },
  camp: { lift: [0.02, 0.01, 0.02], gamma: [1.0, 1.0, 1.0], gain: [1.06, 1.0, 0.95], sat: 1.22, bloomK: 0.5, exposure: 1.05, shaft: 0.3, vig: 0.3, con: 0.32, haze: 0 },
};
