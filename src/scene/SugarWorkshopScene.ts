/**
 * SugarWorkshopScene - Immersive 3D Chinese Traditional Sugar Blowing Workshop
 * 
 * Features:
 * - Scene 01: Traditional Sugar Crafting Workshop (wooden bench, copper syrup pot, rising steam, tools)
 * - Scene 02: "The Birth of a Sugar Pufferfish" creation animation sequence
 * - Scene 03: Interactive Amber Sugar Pufferfish with Long-Press Inflation, Rebound, and 360° Rotation
 * - Absolute preservation of the original 8-mesh pufferfish model from pufferfish.glb
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ScaleMotionController, applyDamping, clampPitch, isDragMovement } from '../utils/motion';
import { sugarAudio } from '../utils/audio';

export type WorkshopLightingMode = 'warm_workshop' | 'candle_glow' | 'morning_amber';

export interface SceneInspectionData {
  meshCount: number;
  meshes: { name: string; vertexCount: number; triangleCount: number }[];
  totalTriangles: number;
  totalVertices: number;
  scale: number;
  rotation: { x: number; y: number; z: number };
  isHeld: boolean;
  creationStage: string;
}

export const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

export class SugarWorkshopScene {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private lastTime = performance.now();
  private totalElapsed = 0;

  // Model & Objects
  public pufferfishGroup: THREE.Group = new THREE.Group();
  public originalMeshes: THREE.Mesh[] = [];
  public bounds = new THREE.Box3();
  public modelCenter = new THREE.Vector3();
  public isModelLoaded = false;

  // Workshop Props
  private workshopGroup = new THREE.Group();
  private syrupPotMesh!: THREE.Mesh;
  private syrupLiquidMesh!: THREE.Mesh;
  private steamParticles!: THREE.Points;
  private bambooPipe!: THREE.Group;
  private craftToolsGroup = new THREE.Group();
  private sugarEmbryo!: THREE.Mesh;

  // Lights
  private keyLight!: THREE.SpotLight;
  private fillLight!: THREE.DirectionalLight;
  private amberBacklight!: THREE.PointLight;
  private candleLight!: THREE.PointLight;
  private ambientLight!: THREE.AmbientLight;
  private fireGlowLight!: THREE.PointLight;

  // Motion & Interaction
  public scaleController = new ScaleMotionController();
  public rotationVelocity = { x: 0, y: 0 };
  public rotationTarget = { x: 0, y: 0 };
  public currentRotation = { x: 0, y: 0 };
  private isPointerDown = false;
  private isDragging = false;
  private pointerDownPos = { x: 0, y: 0 };
  private lastPointerPos = { x: 0, y: 0 };
  private pointerDownTime = 0;
  private isPointerOverFish = false;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Story / Creation Sequence
  public isCreating = false;
  public creationProgress = 1.0; // 0..1
  public creationDuration = 12.0; // seconds for the full birth animation
  private creationStartTime = 0;
  public autostart = false;

  // Callbacks
  public onStateChange?: () => void;
  public onCreationComplete?: () => void;
  public onInspectUpdate?: (data: SceneInspectionData) => void;

  private isDestroyed = false;

  constructor(container: HTMLElement, canvas: HTMLCanvasElement, options: { autostart?: boolean } = {}) {
    this.container = container;
    this.canvas = canvas;
    this.autostart = options.autostart ?? false;
    this.init();
  }

  private init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    if (!isSoftwareGl) {
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    this.canvas.style.cursor = 'grab';

    // 2. Scene & PMREM Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1f140c'); // Deep atmospheric lacquer warm brown

    // PMREM Environment map for realistic amber glass reflection & refraction
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    this.scene.environment = envTexture;
    pmremGenerator.dispose();
    roomEnv.dispose();

    // 3. Camera - Canonical Front 3/4 Studio View
    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    this.camera.position.set(2.85, 1.85, 4.25);
    this.camera.lookAt(0, 0.88, 0);

    // 4. Setup Lighting
    this.setupLighting();

    // 5. Build Workshop Environment (Workbench, Kettle, Tools, Steam)
    this.buildWorkshopEnvironment();

    // 6. Build Creation Sequence Props (Sugar Embryo, Reed Straw)
    this.buildCreationProps();

    // 7. Load Original Pufferfish GLB Model
    this.loadPufferfishModel();

    // 8. Bind Events
    this.bindEvents();

    // 9. Start Render Loop
    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  private setupLighting() {
    // Ambient light - warm soft undertone
    this.ambientLight = new THREE.AmbientLight(0xffeed6, 0.6);
    this.scene.add(this.ambientLight);

    // Key Light - warm honey studio spotlight
    this.keyLight = new THREE.SpotLight(0xffdfa8, 3.8);
    this.keyLight.position.set(2.5, 4.0, 3.2);
    this.keyLight.angle = Math.PI / 4.5;
    this.keyLight.penumbra = 0.6;
    this.keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.bias = -0.0001;
    }
    this.scene.add(this.keyLight);

    // Front Fill Light - soft warm glow
    this.fillLight = new THREE.DirectionalLight(0xffecd4, 1.4);
    this.fillLight.position.set(-2.0, 2.5, 3.0);
    this.scene.add(this.fillLight);

    // Amber Backlight - gives the golden translucent rim & inner radiance
    this.amberBacklight = new THREE.PointLight(0xff7700, 4.2, 10, 1.2);
    this.amberBacklight.position.set(-1.8, 1.6, -1.8);
    this.scene.add(this.amberBacklight);

    // Candle / Charcoal Stove Fire Glow
    this.fireGlowLight = new THREE.PointLight(0xff5500, 2.8, 5, 1.5);
    this.fireGlowLight.position.set(-1.4, 0.4, -0.6);
    this.scene.add(this.fireGlowLight);

    // Top Soft Warm Fill
    this.candleLight = new THREE.PointLight(0xffba59, 2.0, 8, 1.2);
    this.candleLight.position.set(1.2, 2.8, 1.0);
    this.scene.add(this.candleLight);
  }

  public setLightingMode(mode: WorkshopLightingMode) {
    if (mode === 'warm_workshop') {
      this.renderer.toneMappingExposure = 1.15;
      this.keyLight.color.set('#ffdfa8');
      this.keyLight.intensity = 3.8;
      this.amberBacklight.color.set('#ff7700');
      this.amberBacklight.intensity = 4.2;
      this.scene.background = new THREE.Color('#1c130c');
    } else if (mode === 'candle_glow') {
      this.renderer.toneMappingExposure = 1.05;
      this.keyLight.color.set('#ff9e42');
      this.keyLight.intensity = 2.4;
      this.amberBacklight.color.set('#ff4e00');
      this.amberBacklight.intensity = 5.5;
      this.scene.background = new THREE.Color('#120a06');
    } else if (mode === 'morning_amber') {
      this.renderer.toneMappingExposure = 1.28;
      this.keyLight.color.set('#fff1de');
      this.keyLight.intensity = 4.5;
      this.amberBacklight.color.set('#ffa64d');
      this.amberBacklight.intensity = 3.6;
      this.scene.background = new THREE.Color('#241913');
    }
  }

  /**
   * Builds the traditional Chinese sugar-blowing craft table, heated copper kettle, tools, and steam
   */
  private buildWorkshopEnvironment() {
    this.workshopGroup.name = 'Workshop_Environment';

    // 1. Artisan's Wooden Workbench (老榆木厚板工作台)
    const tableWidth = 6.0;
    const tableDepth = 4.2;
    const tableHeight = 0.12;

    const tableGeo = new THREE.BoxGeometry(tableWidth, tableHeight, tableDepth, 32, 2, 32);

    // Procedural dark walnut / rosewood texture with subtle grain and golden varnish
    const woodTexture = this.generateWoodTexture();
    const woodMaterial = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.32,
      metalness: 0.08,
      color: new THREE.Color('#422718'),
    });

    const tableMesh = new THREE.Mesh(tableGeo, woodMaterial);
    tableMesh.position.set(0, -tableHeight / 2, 0);
    tableMesh.receiveShadow = true;
    this.workshopGroup.add(tableMesh);

    // Table apron & legs
    const legGeo = new THREE.CylinderGeometry(0.09, 0.08, 1.8, 16);
    const legPositions = [
      [-2.4, -0.9, -1.6],
      [2.4, -0.9, -1.6],
      [-2.4, -0.9, 1.6],
      [2.4, -0.9, 1.6],
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, woodMaterial);
      leg.position.set(x, y, z);
      this.workshopGroup.add(leg);
    });

    // 2. Heated Brass/Copper Sugar Pot (紫铜保温糖锅) & Earthenware Brazier (陶土炭火炉)
    const stoveGroup = new THREE.Group();
    stoveGroup.position.set(-1.45, 0.0, -0.65);

    // Ceramic / earthenware stove body
    const stoveGeo = new THREE.CylinderGeometry(0.48, 0.42, 0.45, 28);
    const stoveMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2e2119'),
      roughness: 0.85,
      metalness: 0.1,
    });
    const stoveMesh = new THREE.Mesh(stoveGeo, stoveMat);
    stoveMesh.position.y = 0.225;
    stoveMesh.castShadow = true;
    stoveGroup.add(stoveMesh);

    // Charcoal air vent opening
    const ventGeo = new THREE.BoxGeometry(0.2, 0.15, 0.1);
    const ventMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });
    const vent = new THREE.Mesh(ventGeo, ventMat);
    vent.position.set(0, 0.15, 0.42);
    stoveGroup.add(vent);

    // Brass / Copper Pot (紫铜双耳平底温锅)
    const potGeo = new THREE.CylinderGeometry(0.45, 0.38, 0.28, 32, 1, true);
    const copperMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#a85a2c'),
      roughness: 0.28,
      metalness: 0.82,
    });
    this.syrupPotMesh = new THREE.Mesh(potGeo, copperMat);
    this.syrupPotMesh.position.y = 0.45;
    this.syrupPotMesh.castShadow = true;
    stoveGroup.add(this.syrupPotMesh);

    // Pot Rim
    const potRimGeo = new THREE.TorusGeometry(0.45, 0.024, 16, 48);
    const potRim = new THREE.Mesh(potRimGeo, copperMat);
    potRim.rotation.x = Math.PI / 2;
    potRim.position.y = 0.58;
    stoveGroup.add(potRim);

    // Pot Handles
    const handleGeo = new THREE.TorusGeometry(0.08, 0.015, 12, 24, Math.PI);
    const handle1 = new THREE.Mesh(handleGeo, copperMat);
    handle1.position.set(0.46, 0.52, 0);
    handle1.rotation.z = -Math.PI / 2;
    const handle2 = new THREE.Mesh(handleGeo, copperMat);
    handle2.position.set(-0.46, 0.52, 0);
    handle2.rotation.z = Math.PI / 2;
    stoveGroup.add(handle1, handle2);

    // Viscous Amber Maltose Syrup Liquid (锅中浓稠蜂蜜金麦芽糖浆)
    const syrupGeo = new THREE.CircleGeometry(0.43, 32);
    const syrupMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#d9720b'),
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0.85,
      ior: 1.54,
      thickness: 0.4,
      attenuationColor: new THREE.Color('#8f3b00'),
      attenuationDistance: 0.3,
      specularIntensity: 1.2,
    });
    this.syrupLiquidMesh = new THREE.Mesh(syrupGeo, syrupMat);
    this.syrupLiquidMesh.rotation.x = -Math.PI / 2;
    this.syrupLiquidMesh.position.y = 0.53;
    stoveGroup.add(this.syrupLiquidMesh);

    this.workshopGroup.add(stoveGroup);

    // 3. Delicate Steam Particles rising from the hot syrup pot
    this.buildSteamParticles(stoveGroup.position);

    // 4. Traditional Sugar-crafting Tools (摆放工具)
    this.buildCraftTools();

    this.scene.add(this.workshopGroup);
  }

  /**
   * Generates procedural dark polished walnut wood texture
   */
  private generateWoodTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Rich warm walnut background
    ctx.fillStyle = '#3a2013';
    ctx.fillRect(0, 0, 1024, 1024);

    // Wood rings and grain lines
    ctx.lineWidth = 1.5;
    for (let y = 0; y < 1024; y += 4) {
      const alpha = 0.08 + Math.sin(y * 0.04) * 0.05 + Math.random() * 0.04;
      ctx.strokeStyle = y % 16 < 8 ? `rgba(85, 45, 22, ${alpha})` : `rgba(32, 16, 8, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < 1024; x += 32) {
        const offset = Math.sin(x * 0.015 + y * 0.01) * 6 + Math.cos(x * 0.005) * 4;
        ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }

    // Polished varnish highlights
    const grad = ctx.createRadialGradient(512, 512, 100, 512, 512, 600);
    grad.addColorStop(0, 'rgba(255, 175, 90, 0.06)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  /**
   * Steam particles rising from the hot sugar pot
   */
  private buildSteamParticles(potPos: THREE.Vector3) {
    const particleCount = 75;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const alphas = new Float32Array(particleCount);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = potPos.x + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = potPos.y + 0.55 + Math.random() * 0.8;
      positions[i * 3 + 2] = potPos.z + (Math.random() - 0.5) * 0.5;
      alphas[i] = Math.random();
      scales[i] = 0.04 + Math.random() * 0.06;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom steam canvas dot texture
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 64;
    dotCanvas.height = 64;
    const ctx = dotCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 240, 220, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 230, 200, 0.25)');
    grad.addColorStop(1, 'rgba(255, 230, 200, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const steamTex = new THREE.CanvasTexture(dotCanvas);

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      map: steamTex,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffeacc,
    });

    this.steamParticles = new THREE.Points(geo, mat);
    this.workshopGroup.add(this.steamParticles);
  }

  /**
   * Builds traditional blow tube, wooden paddle, shears, and dusting dish
   */
  private buildCraftTools() {
    this.craftToolsGroup.name = 'Artisan_Tools';

    // 1. Bamboo Blow Tube (细长吹糖芦管/竹管)
    this.bambooPipe = new THREE.Group();
    const pipeGeo = new THREE.CylinderGeometry(0.016, 0.012, 1.1, 16);
    const bambooMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c79f58'),
      roughness: 0.45,
      metalness: 0.05,
    });
    const pipeMesh = new THREE.Mesh(pipeGeo, bambooMat);
    pipeMesh.rotation.z = Math.PI / 2;
    this.bambooPipe.add(pipeMesh);

    // Tip attachment collar
    const tipGeo = new THREE.CylinderGeometry(0.018, 0.016, 0.08, 16);
    const brassMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d4af37'),
      roughness: 0.2,
      metalness: 0.85,
    });
    const tipMesh = new THREE.Mesh(tipGeo, brassMat);
    tipMesh.rotation.z = Math.PI / 2;
    tipMesh.position.x = 0.52;
    this.bambooPipe.add(tipMesh);

    this.bambooPipe.position.set(-0.7, 0.02, 0.5);
    this.bambooPipe.rotation.y = 0.35;
    this.craftToolsGroup.add(this.bambooPipe);

    // 2. Wooden Sugar Stirring Spatula (调糖木铲)
    const spatula = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.014, 0.012, 0.6, 12);
    const bladeGeo = new THREE.BoxGeometry(0.07, 0.01, 0.18);
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x472814, roughness: 0.5 });
    const sHandle = new THREE.Mesh(handleGeo, darkWood);
    sHandle.rotation.x = Math.PI / 2;
    const sBlade = new THREE.Mesh(bladeGeo, darkWood);
    sBlade.position.z = 0.35;
    spatula.add(sHandle, sBlade);
    spatula.position.set(-0.9, 0.015, -0.15);
    spatula.rotation.y = -0.5;
    this.craftToolsGroup.add(spatula);

    // 3. Traditional Artisan Brass Shears (雕花小铜剪)
    const shears = new THREE.Group();
    const shearBladeGeo = new THREE.BoxGeometry(0.02, 0.008, 0.24);
    const s1 = new THREE.Mesh(shearBladeGeo, brassMat);
    s1.position.x = -0.012;
    s1.rotation.y = 0.12;
    const s2 = new THREE.Mesh(shearBladeGeo, brassMat);
    s2.position.x = 0.012;
    s2.rotation.y = -0.12;
    shears.add(s1, s2);
    shears.position.set(0.95, 0.01, 0.55);
    shears.rotation.y = -0.8;
    this.craftToolsGroup.add(shears);

    // 4. Porcelain Powder / Cornstarch Dish (白瓷扑粉小碟)
    const dishGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.04, 24);
    const porcelainMat = new THREE.MeshStandardMaterial({
      color: 0xf5f2ec,
      roughness: 0.15,
      metalness: 0.05,
    });
    const dish = new THREE.Mesh(dishGeo, porcelainMat);
    dish.position.set(1.2, 0.02, 0.1);
    this.craftToolsGroup.add(dish);

    // Powder inside dish
    const powderGeo = new THREE.CircleGeometry(0.16, 24);
    const powderMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
    const powder = new THREE.Mesh(powderGeo, powderMat);
    powder.rotation.x = -Math.PI / 2;
    powder.position.set(1.2, 0.038, 0.1);
    this.craftToolsGroup.add(powder);

    this.workshopGroup.add(this.craftToolsGroup);
  }

  /**
   * Props for the birth creation sequence (Scene 02)
   */
  private buildCreationProps() {
    // A soft ductile amber sugar embryo sphere that starts kneading and blowing
    const embryoGeo = new THREE.SphereGeometry(0.18, 32, 24);
    const embryoMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ff9c24'),
      emissive: new THREE.Color('#401500'),
      roughness: 0.18,
      metalness: 0.0,
      transmission: 0.75,
      ior: 1.5,
      thickness: 0.9,
      attenuationColor: new THREE.Color('#cc5200'),
      attenuationDistance: 0.4,
      transparent: true,
      opacity: 0.95,
    });
    this.sugarEmbryo = new THREE.Mesh(embryoGeo, embryoMat);
    this.sugarEmbryo.position.set(0, 0.85, 0);
    this.sugarEmbryo.visible = false;
    this.scene.add(this.sugarEmbryo);
  }

  /**
   * Loads the exact pufferfish.glb original model
   */
  private async loadPufferfishModel() {
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync('/assets/pufferfish/pufferfish.glb');

      this.originalMeshes = [];
      const meshesToAttach: THREE.Mesh[] = [];

      // Temporarily add gltf.scene to compute world matrices
      this.scene.add(gltf.scene);
      gltf.scene.updateMatrixWorld(true);

      gltf.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.name === 'Studio_Ground') {
            mesh.visible = false;
            return;
          }
          this.originalMeshes.push(mesh);
          meshesToAttach.push(mesh);
        }
      });

      // Calculate exact bounding box of the 8 parts
      this.bounds = new THREE.Box3();
      for (const m of this.originalMeshes) {
        this.bounds.union(new THREE.Box3().setFromObject(m, true));
      }
      this.bounds.getCenter(this.modelCenter);

      // Create pivot group centered at model center
      this.pufferfishGroup.name = 'Pufferfish_Root';
      this.pufferfishGroup.position.set(0, 0.88, 0);
      this.scene.add(this.pufferfishGroup);
      this.pufferfishGroup.updateMatrixWorld(true);

      // Apply the Amber Sugar Glass material, preserving eyes and colors
      this.applyAmberSugarMaterial(meshesToAttach);

      // Attach original meshes to pufferfishGroup preserving relative offsets
      for (const m of meshesToAttach) {
        this.pufferfishGroup.attach(m);
      }

      this.scene.remove(gltf.scene);
      this.scene.updateMatrixWorld(true);

      this.isModelLoaded = true;
      if (this.autostart) {
        this.skipCreationSequence();
      } else {
        this.startCreationSequence();
      }
      this.onStateChange?.();
    } catch (err) {
      console.error('Failed to load pufferfish.glb:', err);
    }
  }

  /**
   * Applies the exquisite traditional amber sugar craft material
   */
  private applyAmberSugarMaterial(meshes: THREE.Mesh[]) {
    // 1. Crystal Amber Sugar Shell material (琥珀麦芽糖玻璃 - 纯正蜂蜜金透光质感)
    const amberSugarMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffdfa8'),
      emissive: new THREE.Color('#381804'),
      roughness: 0.04,
      metalness: 0.0,
      transmission: 0.96,
      ior: 1.52,
      thickness: 0.35,
      attenuationColor: new THREE.Color('#ff8400'),
      attenuationDistance: 2.2,
      specularIntensity: 1.6,
      specularColor: new THREE.Color('#fffbf0'),
      clearcoat: 0.9,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2.0,
      transparent: true,
      opacity: 1.0,
      depthWrite: true,
    });

    // 2. High-gloss black sugar bean / sesame eye material (墨晶黑芝麻糖点眼)
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0a0705'),
      roughness: 0.08,
      metalness: 0.2,
      envMapIntensity: 2.0,
    });

    for (const mesh of meshes) {
      mesh.castShadow = !isSoftwareGl;
      mesh.receiveShadow = !isSoftwareGl;

      if (mesh.name.startsWith('Eye')) {
        mesh.material = eyeMaterial;
        mesh.renderOrder = 2; // Render after transparent body to ensure crisp eyes
      } else {
        mesh.material = amberSugarMaterial;
        mesh.renderOrder = 1;
      }
    }
  }

  /**
   * Starts the traditional "Birth of a Sugar Pufferfish" creation story animation (Scene 02)
   */
  public startCreationSequence() {
    this.isCreating = true;
    this.creationStartTime = this.totalElapsed;
    this.creationProgress = 0;
    this.sugarEmbryo.visible = true;
    this.pufferfishGroup.visible = false;
    this.scaleController.reset();

    // Reset camera position to observe the pot and table
    this.camera.position.set(-0.8, 1.4, 2.8);
    this.camera.lookAt(-0.5, 0.5, 0);

    sugarAudio.startWorkshopAmbience();
    sugarAudio.playWoodTap();
  }

  /**
   * Skips or finishes the creation sequence immediately to Scene 03 interaction
   */
  public skipCreationSequence() {
    this.isCreating = false;
    this.creationProgress = 1.0;
    this.sugarEmbryo.visible = false;
    this.pufferfishGroup.visible = true;
    this.pufferfishGroup.scale.setScalar(1.0);
    this.bambooPipe.position.set(-0.7, 0.02, 0.5);
    this.bambooPipe.rotation.set(0, 0.35, 0);

    // Return camera to main interactive view
    this.camera.position.set(2.85, 1.85, 4.25);
    this.camera.lookAt(0, 0.88, 0);

    sugarAudio.stopBreath();
    sugarAudio.playSugarChime(4);
    this.onCreationComplete?.();
    this.onStateChange?.();
  }

  /**
   * Set Pufferfish Long Press inflation state
   */
  public setBlowingHeld(held: boolean) {
    if (!this.isModelLoaded || this.isCreating) return;
    const now = performance.now();
    this.scaleController.setHeld(held, now);

    if (held) {
      sugarAudio.startBreath();
    } else {
      sugarAudio.stopBreath();
      // Chime softly on release
      if (this.scaleController.scale > 1.08) {
        sugarAudio.playSugarChime(2);
      }
    }

    this.onStateChange?.();
  }

  /**
   * Set target rotation angle directly (e.g. for presets Front, Side, Back)
   */
  public setRotationTarget(yaw: number, pitch = 0.1) {
    this.rotationTarget.x = clampPitch(pitch);
    this.rotationTarget.y = yaw;
    this.rotationVelocity = { x: 0, y: 0 };
  }

  /**
   * Reset rotation to default front-three-quarters view
   */
  public resetView() {
    this.setRotationTarget(0, 0);
  }

  /**
   * Check if pointer hits the pufferfish model
   */
  public checkPointerHit(clientX: number, clientY: number): boolean {
    if (!this.isModelLoaded || this.originalMeshes.length === 0) return false;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.originalMeshes, false);
    return intersects.length > 0;
  }

  private bindEvents() {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      this.isPointerDown = true;
      this.isDragging = false;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
      this.pointerDownTime = performance.now();
      this.isPointerOverFish = this.checkPointerHit(e.clientX, e.clientY);
      this.canvas.style.cursor = 'grabbing';

      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e: PointerEvent) => {
      // 关键核心：仅在用户长按住鼠标左键（isPointerDown 为 true）时才响应旋转拖拽！
      // 若鼠标仅是悬停滑过，严禁转动模型，彻底避免晃眼与晕眩感
      if (!this.isPointerDown) {
        return;
      }

      const dx = e.clientX - this.pointerDownPos.x;
      const dy = e.clientY - this.pointerDownPos.y;

      if (!this.isDragging && isDragMovement(dx, dy, 4)) {
        this.isDragging = true;
        // 如果处于吹气膨胀中，拖动旋转时释放吹气
        if (this.scaleController.isHeld) {
          this.setBlowingHeld(false);
        }
      }

      if (this.isDragging) {
        const moveX = e.clientX - this.lastPointerPos.x;
        const moveY = e.clientY - this.lastPointerPos.y;

        // Apply drag delta to rotation velocity
        this.rotationTarget.y += moveX * 0.007;
        this.rotationTarget.x = clampPitch(this.rotationTarget.x + moveY * 0.007);

        this.rotationVelocity.y = moveX * 0.0025;
        this.rotationVelocity.x = moveY * 0.0025;
      }

      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;
      this.canvas.style.cursor = 'grab';

      const duration = performance.now() - this.pointerDownTime;
      const wasClickOnFish = !this.isDragging && this.isPointerOverFish && duration < 350;

      if (wasClickOnFish) {
        // Toggle or short pulse inflation
        this.setBlowingHeld(false);
      } else if (this.scaleController.isHeld) {
        this.setBlowingHeld(false);
      }

      this.isDragging = false;
      try {
        if (this.canvas.hasPointerCapture(e.pointerId)) {
          this.canvas.releasePointerCapture(e.pointerId);
        }
      } catch {}
    };

    const onBlur = () => {
      this.isPointerDown = false;
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
      if (this.scaleController.isHeld) {
        this.setBlowingHeld(false);
      }
    };

    // Keyboard support: Space / Enter to inflate
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && !this.isCreating) {
        e.preventDefault();
        this.setBlowingHeld(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        this.setBlowingHeld(false);
      }
    };

    this.canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  public handleResize() {
    if (!this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  /**
   * Main animation frame loop
   */
  private animate() {
    if (this.isDestroyed) return;

    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    if (isSoftwareGl && delta < 0.033) return; // Frame pacing for software WebGL
    this.lastTime = now;
    const clampedDelta = Math.min(0.066, delta);
    this.totalElapsed += clampedDelta;
    const elapsedTime = this.totalElapsed;

    // 1. Steam particle animation
    if (this.steamParticles) {
      const posAttr = this.steamParticles.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += delta * 0.42; // rise upwards
        arr[i + 0] += Math.sin(elapsedTime * 2.0 + i) * 0.0015; // drift
        if (arr[i + 1] > 1.6) {
          arr[i + 1] = 0.55;
          arr[i + 0] = -1.45 + (Math.random() - 0.5) * 0.4;
          arr[i + 2] = -0.65 + (Math.random() - 0.5) * 0.4;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 2. Liquid syrup gentle ripple
    if (this.syrupLiquidMesh) {
      const sMat = this.syrupLiquidMesh.material as THREE.MeshPhysicalMaterial;
      sMat.roughness = 0.08 + Math.sin(elapsedTime * 1.5) * 0.02;
    }

    // 3. Stove fire flicker
    if (this.fireGlowLight) {
      this.fireGlowLight.intensity = 2.6 + Math.sin(elapsedTime * 6.0) * 0.3 + Math.cos(elapsedTime * 13.0) * 0.15;
    }

    // 4. Creation Sequence (Scene 02) or Interactive Mode (Scene 03)
    if (this.isCreating) {
      this.animateCreationSequence(elapsedTime, delta);
    } else {
      this.animateInteractiveMode(now, delta, elapsedTime);
    }

    // 5. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Handles the story creation progression (Scene 02)
   */
  private animateCreationSequence(elapsedTime: number, delta: number) {
    const elapsed = elapsedTime - this.creationStartTime;
    this.creationProgress = Math.min(1.0, elapsed / this.creationDuration);

    // Stage 1: Draw syrup from kettle on bamboo tube (0.0 .. 0.3)
    if (this.creationProgress < 0.3) {
      const stageT = this.creationProgress / 0.3;
      this.sugarEmbryo.visible = true;
      this.sugarEmbryo.scale.setScalar(0.4 + stageT * 0.4);
      // Lift from kettle (-1.45, 0.55, -0.65) to table center (0, 0.85, 0)
      this.sugarEmbryo.position.lerpVectors(
        new THREE.Vector3(-1.45, 0.65, -0.65),
        new THREE.Vector3(0, 0.85, 0),
        stageT
      );
      this.bambooPipe.position.copy(this.sugarEmbryo.position).add(new THREE.Vector3(0.5, 0.2, 0));
      this.bambooPipe.rotation.z = -0.4 + stageT * 0.2;

      this.camera.position.lerp(new THREE.Vector3(-0.6, 1.4, 2.5), delta * 2.0);
      this.camera.lookAt(this.sugarEmbryo.position);
    }
    // Stage 2: Knead and form soft embryo (0.3 .. 0.6)
    else if (this.creationProgress < 0.6) {
      const stageT = (this.creationProgress - 0.3) / 0.3;
      this.sugarEmbryo.visible = true;
      this.sugarEmbryo.position.set(0, 0.85, 0);

      // Organic ductile deformation
      const squashX = 1.0 + Math.sin(stageT * Math.PI * 4) * 0.2;
      const squashY = 1.0 - Math.sin(stageT * Math.PI * 4) * 0.15;
      this.sugarEmbryo.scale.set(0.7 * squashX, 0.7 * squashY, 0.7 * squashX);

      // Bamboo pipe ready to blow
      this.bambooPipe.position.set(0.65, 0.95, 0.1);
      this.bambooPipe.rotation.set(0, -0.4, -0.2);

      this.camera.position.lerp(new THREE.Vector3(0, 1.5, 3.2), delta * 2.5);
      this.camera.lookAt(0, 0.85, 0);

      sugarAudio.updateBreathIntensity(stageT * 0.5);
    }
    // Stage 3: Blowing breath and inflation transition into pufferfish (0.6 .. 0.95)
    else if (this.creationProgress < 0.95) {
      const stageT = (this.creationProgress - 0.6) / 0.35;
      this.pufferfishGroup.visible = true;
      this.sugarEmbryo.visible = stageT < 0.6;

      // The embryo expands into the exact pufferfish shape
      const embryoScale = 0.7 + stageT * 0.6;
      this.sugarEmbryo.scale.setScalar(embryoScale);

      // Pufferfish scales up from zero to full size with golden breath glow
      const fishScale = Math.min(1.0, stageT * 1.15);
      this.pufferfishGroup.scale.setScalar(fishScale);

      // Modulate breath sound
      sugarAudio.updateBreathIntensity(stageT);

      // Move blow pipe back gently
      this.bambooPipe.position.lerp(new THREE.Vector3(-0.7, 0.02, 0.5), delta * 2.0);
      this.bambooPipe.rotation.y = 0.35;

      this.camera.position.lerp(new THREE.Vector3(0, 1.8, 4.2), delta * 2.0);
      this.camera.lookAt(0, 0.85, 0);
    }
    // Stage 4: Finished creation (0.95 .. 1.0)
    else {
      this.skipCreationSequence();
    }
  }

  /**
   * Handles Scene 03: Interactive 360° rotation and long-press inflation
   */
  private animateInteractiveMode(now: number, delta: number, elapsedTime: number) {
    // 1. Update scale from ScaleMotionController
    const currentScale = this.scaleController.update(now);

    // Add subtle organic breathing pulse when held at max scale
    let scaleWithBreathing = currentScale;
    if (this.scaleController.isHeld && currentScale >= 1.34) {
      scaleWithBreathing += Math.sin(elapsedTime * 5.0) * 0.008;
      sugarAudio.updateBreathIntensity(0.9 + Math.sin(elapsedTime * 5.0) * 0.1);
    }

    this.pufferfishGroup.scale.setScalar(scaleWithBreathing);

    // 2. Adjust lighting & background breathing glow during inflation
    const inflationRatio = Math.max(0, (currentScale - 1.0) / 0.35);
    this.amberBacklight.intensity = 4.2 + inflationRatio * 2.4;
    this.amberBacklight.color.setHex(inflationRatio > 0.5 ? 0xff8800 : 0xff7700);

    // 3. Apply smooth inertia & damping to rotation
    if (!this.isDragging) {
      const damped = applyDamping(this.rotationVelocity, 0.92);
      this.rotationVelocity = damped.velocity;
      this.rotationTarget.y += this.rotationVelocity.y;
      this.rotationTarget.x = clampPitch(this.rotationTarget.x + this.rotationVelocity.x);
    }

    // Smoothly slerp/interpolate rotation towards target
    this.currentRotation.x = THREE.MathUtils.lerp(this.currentRotation.x, this.rotationTarget.x, delta * 12.0);
    this.currentRotation.y = THREE.MathUtils.lerp(this.currentRotation.y, this.rotationTarget.y, delta * 12.0);

    // Apply rotation around Y (yaw) and X (pitch) to pufferfish
    this.pufferfishGroup.rotation.x = this.currentRotation.x;
    this.pufferfishGroup.rotation.y = this.currentRotation.y;

    // 4. Update inspection data
    if (this.onInspectUpdate) {
      const data: SceneInspectionData = {
        meshCount: this.originalMeshes.length,
        meshes: this.originalMeshes.map((m) => {
          const geom = m.geometry;
          return {
            name: m.name,
            vertexCount: geom.attributes.position ? geom.attributes.position.count : 0,
            triangleCount: geom.index ? geom.index.count / 3 : 0,
          };
        }),
        totalTriangles: this.originalMeshes.reduce((acc, m) => acc + (m.geometry.index ? m.geometry.index.count / 3 : 0), 0),
        totalVertices: this.originalMeshes.reduce((acc, m) => acc + (m.geometry.attributes.position ? m.geometry.attributes.position.count : 0), 0),
        scale: Number(currentScale.toFixed(3)),
        rotation: {
          x: Number((this.currentRotation.x * (180 / Math.PI)).toFixed(1)),
          y: Number((this.currentRotation.y * (180 / Math.PI)).toFixed(1)),
          z: 0,
        },
        isHeld: this.scaleController.isHeld,
        creationStage: this.isCreating ? 'Creating (The Birth)' : 'Interactive (Scene 03)',
      };
      this.onInspectUpdate(data);
    }
  }

  /**
   * Captures high-res comparison screenshot at a specific camera angle
   */
  public captureView(angle: 'front' | 'side' | 'back' | 'current'): string {
    const prevPos = this.camera.position.clone();
    const prevRot = { ...this.currentRotation };
    const prevTarget = { ...this.rotationTarget };

    this.camera.position.set(2.85, 1.85, 4.25);
    this.camera.lookAt(0, 0.88, 0);

    if (angle === 'front') {
      // Front faces camera with canonical 3/4 view showing mouth, eyes, fins
      this.pufferfishGroup.rotation.set(0, 0, 0);
    } else if (angle === 'side') {
      // Side profile showing round belly and lateral fins
      this.pufferfishGroup.rotation.set(0, Math.PI / 2, 0);
    } else if (angle === 'back') {
      // Back showing caudal tail fin and dorsal fin
      this.pufferfishGroup.rotation.set(0, Math.PI, 0);
    }
    this.pufferfishGroup.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);

    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.canvas.toDataURL('image/png');

    // Restore
    this.camera.position.copy(prevPos);
    this.camera.lookAt(0, 0.85, 0);
    this.currentRotation = prevRot;
    this.rotationTarget = prevTarget;
    this.pufferfishGroup.rotation.x = this.currentRotation.x;
    this.pufferfishGroup.rotation.y = this.currentRotation.y;

    return dataUrl;
  }

  public destroy() {
    this.isDestroyed = true;
    this.renderer.setAnimationLoop(null);
    sugarAudio.stopBreath();

    // Dispose geometries and materials
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    this.renderer.dispose();
  }
}
