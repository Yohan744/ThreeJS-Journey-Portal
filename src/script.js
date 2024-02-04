import GUI from 'lil-gui'
import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js'
import fireflyVertexShader from './shaders/fireflies/vertex.glsl'
import fireflyFragmentShader from './shaders/fireflies/fragment.glsl'
import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'

window.addEventListener("load", () => {

    window.addEventListener("keydown", (event) => {
        if (event.code === "KeyF") {
            document.documentElement.requestFullscreen()
        }
    })

})

/**
 * Base
 */
// Debug
const debugObject = {}
const gui = new GUI({
    width: 250,
})

gui.close()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()

// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * MATERIALS
 */

const bakedTexture = textureLoader.load('baked.jpg')
bakedTexture.flipY = false
bakedTexture.colorSpace = THREE.SRGBColorSpace

// baked
const bakedMaterial = new THREE.MeshBasicMaterial({
    map: bakedTexture,
    side: THREE.DoubleSide
})

// Pole light material
const poleLightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffe5
})

debugObject.portalColorStart = '#000000'
debugObject.portalColorEnd = '#ffffff'

gui.addColor(debugObject, 'portalColorStart').onChange(() => {
    portalLightMaterial.uniforms.uColorStart.value.set(debugObject.portalColorStart)
})

gui.addColor(debugObject, 'portalColorEnd').onChange(() => {
    portalLightMaterial.uniforms.uColorEnd.value.set(debugObject.portalColorEnd)
})

const portalLightMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: {value: 0},
        uColorStart: {value: new THREE.Color(debugObject.portalColorStart)},
        uColorEnd: {value: new THREE.Color(debugObject.portalColorEnd)}
    },
    vertexShader: portalVertexShader,
    fragmentShader: portalFragmentShader,
    side: THREE.DoubleSide,
})

/**
 * MODEL
 */

gltfLoader.load(
    'portal.glb',
    (gltf) => {

        const bakedMesh = gltf.scene.children.find((child) => child.name === 'baked')
        const portalLightMesh = gltf.scene.children.find((child) => child.name === 'portalLight')
        const poleLightAMesh = gltf.scene.children.find((child) => child.name === 'poleLightA')
        const poleLightBMesh = gltf.scene.children.find((child) => child.name === 'poleLightB')

        bakedMesh.material = bakedMaterial
        poleLightAMesh.material = poleLightMaterial
        poleLightBMesh.material = poleLightMaterial
        portalLightMesh.material = portalLightMaterial


        scene.add(gltf.scene)
    })

/**
 * FIREFLIES
 */

// geometry
const fireflyGeometry = new THREE.BufferGeometry()
const firefliesCount = 35
const positionArray = new Float32Array(firefliesCount * 3)
const scaleArray = new Float32Array(firefliesCount)

for (let i = 0; i < firefliesCount; i++) {
    positionArray[i * 3] = (Math.random() - 0.5) * 4.25
    positionArray[i * 3 + 1] = Math.random() * 1.5
    positionArray[i * 3 + 2] = (Math.random() - 0.5) * 4.25
    scaleArray[i] = Math.random()

}

fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))
fireflyGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray, 1))

// material

const fireflyMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: {value: 0},
        uPixelRatio: {value: Math.min(window.devicePixelRatio, 2)},
        uSize: {value: 100},
    },
    vertexShader: fireflyVertexShader,
    fragmentShader: fireflyFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})

gui.add(fireflyMaterial.uniforms.uSize, 'value').min(0).max(500).step(1).name('fireflySize')

// points
const fireflyPoints = new THREE.Points(fireflyGeometry, fireflyMaterial)
scene.add(fireflyPoints)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    fireflyMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)

})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 4
camera.position.y = 2
camera.position.z = 4
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.maxPolarAngle = Math.PI * 0.38;
controls.maxZoom = 5
controls.minZoom = 2
controls.enablePan = false
controls.enableDamping = true


/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

debugObject.clearColor = '#1a140f'
renderer.setClearColor(debugObject.clearColor)
gui.addColor(debugObject, 'clearColor').onChange(() => {
    renderer.setClearColor(debugObject.clearColor)
})

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // Update fireflies
    fireflyMaterial.uniforms.uTime.value = elapsedTime
    portalLightMaterial.uniforms.uTime.value = elapsedTime

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()