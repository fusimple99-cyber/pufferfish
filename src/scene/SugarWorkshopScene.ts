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

export type WorkshopLightingMode = 'warm_market' | 'sunset_amber' | 'morning_dew';

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

  // Workshop Props - Cozy Traditional Sugar Stall (温馨非遗吹糖人市集小摊)
  private workshopGroup = new THREE.Group();
  private backdropMesh!: THREE.Mesh;
  private syrupPotMesh!: THREE.Mesh;
  private syrupLiquidMesh!: THREE.Mesh;
  private steamParticles!: THREE.Points;
  private bambooPipe!: THREE.Group;
  private craftToolsGroup = new THREE.Group();
  private sugarEmbryo!: THREE.Mesh;
  public chefHatGroup = new THREE.Group();
  public isChefHatVisible = true;

  // Lights - Warm sunlit market daylight
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private sunbeamLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private fireGlowLight!: THREE.PointLight;
  private amberBacklight!: THREE.PointLight;

  // Motion & Interaction
  public scaleController = new ScaleMotionController();
  public rotationVelocity = { x: 0, y: 0 };
  public rotationTarget = { x: 0.08, y: -Math.PI * 0.38 };
  public currentRotation = { x: 0.08, y: -Math.PI * 0.38 };
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
    this.scene.background = new THREE.Color('#faebd7'); // Warm peach-apricot sunlit morning atmosphere

    // PMREM Environment map for realistic amber glass reflection & refraction
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    this.scene.environment = envTexture;
    pmremGenerator.dispose();
    roomEnv.dispose();

    // 3. Camera - Cozy Eye-Level View Facing the Stall (as in Reference Images 1 & 2)
    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    this.camera.position.set(0, 1.48, 4.35);
    this.camera.lookAt(0, 0.92, 0);

    // 4. Setup Lighting
    this.setupLighting();

    // 5. Build Workshop Environment (Stall, Canopy, Marble Slab, Stove, Bowls, Steam, Backdrop)
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
    // 1. Warm Sunbeam Directional Light (金乌朝阳，照亮案台与石板)
    this.sunLight = new THREE.DirectionalLight(0xfff3db, 3.2);
    this.sunLight.position.set(3.5, 4.5, 2.8);
    this.sunLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      this.sunLight.shadow.mapSize.width = 1024;
      this.sunLight.shadow.mapSize.height = 1024;
      this.sunLight.shadow.camera.near = 0.5;
      this.sunLight.shadow.camera.far = 15;
      this.sunLight.shadow.camera.left = -3;
      this.sunLight.shadow.camera.right = 3;
      this.sunLight.shadow.camera.top = 3;
      this.sunLight.shadow.camera.bottom = -3;
      this.sunLight.shadow.bias = -0.0002;
    }
    this.scene.add(this.sunLight);

    // 2. Ambient Light - Bright, open, cozy warm market atmosphere
    this.ambientLight = new THREE.AmbientLight(0xfff1e2, 1.35);
    this.scene.add(this.ambientLight);

    // 3. Golden Rim & Tyndall Backlight (透光琥珀边缘高光)
    this.sunbeamLight = new THREE.DirectionalLight(0xffd18a, 2.4);
    this.sunbeamLight.position.set(-2.2, 3.5, -2.5);
    this.scene.add(this.sunbeamLight);

    // 4. Soft Front Counter Fill
    this.fillLight = new THREE.DirectionalLight(0xffedd8, 1.2);
    this.fillLight.position.set(0, 2.5, 3.5);
    this.scene.add(this.fillLight);

    // 5. Warm Syrup Stove Glow
    this.fireGlowLight = new THREE.PointLight(0xff6e1a, 2.2, 3.5, 1.4);
    this.fireGlowLight.position.set(-1.55, 0.45, 0.15);
    this.scene.add(this.fireGlowLight);

    // 6. Amber Translucent Sugar Core Backlight (透光琥珀内芯柔光)
    this.amberBacklight = new THREE.PointLight(0xff8811, 4.2, 4.5, 1.2);
    this.amberBacklight.position.set(0, 1.05, -0.6);
    this.scene.add(this.amberBacklight);
  }

  public setLightingMode(mode: WorkshopLightingMode) {
    if (mode === 'warm_market') {
      this.renderer.toneMappingExposure = 1.3;
      this.sunLight.color.set('#fff3db');
      this.sunLight.intensity = 3.2;
      this.ambientLight.color.set('#fff1e2');
      this.ambientLight.intensity = 1.35;
      this.sunbeamLight.color.set('#ffd18a');
      this.sunbeamLight.intensity = 2.4;
      this.amberBacklight.color.set('#ff8811');
      this.amberBacklight.intensity = 4.2;
      this.scene.background = new THREE.Color('#faebd7');
    } else if (mode === 'sunset_amber') {
      this.renderer.toneMappingExposure = 1.22;
      this.sunLight.color.set('#ffad54');
      this.sunLight.intensity = 3.5;
      this.ambientLight.color.set('#ffe1cc');
      this.ambientLight.intensity = 1.15;
      this.sunbeamLight.color.set('#ff6e1a');
      this.sunbeamLight.intensity = 3.8;
      this.amberBacklight.color.set('#ff6600');
      this.amberBacklight.intensity = 5.0;
      this.scene.background = new THREE.Color('#f7d0b2');
    } else if (mode === 'morning_dew') {
      this.renderer.toneMappingExposure = 1.35;
      this.sunLight.color.set('#fffcf0');
      this.sunLight.intensity = 3.6;
      this.ambientLight.color.set('#fbf6ee');
      this.ambientLight.intensity = 1.4;
      this.sunbeamLight.color.set('#ffe8ba');
      this.sunbeamLight.intensity = 2.2;
      this.amberBacklight.color.set('#ffaa33');
      this.amberBacklight.intensity = 3.8;
      this.scene.background = new THREE.Color('#fdf5ea');
    }
  }

  /**
   * Builds the cozy Chinese sugar-blowing market stall (温馨非遗吹糖人小摊 - Reference Images 1 & 2)
   */
  private buildWorkshopEnvironment() {
    this.workshopGroup.name = 'Workshop_Environment';

    // 1. Panoramic Warm Morning Bokeh Backdrop (晨光街景远景大背景)
    const backdropGeo = new THREE.PlaneGeometry(16, 9);
    const backdropMat = new THREE.MeshBasicMaterial({
      map: this.generateWarmBackdropTexture(),
      depthWrite: false,
    });
    this.backdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
    this.backdropMesh.position.set(0, 1.65, -3.2);
    this.workshopGroup.add(this.backdropMesh);

    // 2. Honey Oak Market Stall Counter (暖色原木集市操作台)
    const counterWidth = 5.8;
    const counterDepth = 3.2;
    const counterHeight = 0.12;

    const counterGeo = new THREE.BoxGeometry(counterWidth, counterHeight, counterDepth);
    const woodTexture = this.generateHoneyWoodTexture();
    const woodMaterial = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.45,
      metalness: 0.04,
      color: new THREE.Color('#d89b65'),
    });

    const counterMesh = new THREE.Mesh(counterGeo, woodMaterial);
    counterMesh.position.set(0, -counterHeight / 2, 0);
    counterMesh.receiveShadow = true;
    this.workshopGroup.add(counterMesh);

    // Front vertical slatted apron (摊位正面木质立板条)
    const apronGeo = new THREE.BoxGeometry(counterWidth, 1.4, 0.08);
    const apronMesh = new THREE.Mesh(apronGeo, woodMaterial);
    apronMesh.position.set(0, -0.76, counterDepth / 2 - 0.04);
    this.workshopGroup.add(apronMesh);

    // 3. Wooden Support Pillars & Back Railing (摊位支撑木柱与后侧栏杆)
    const pillarGeo = new THREE.CylinderGeometry(0.065, 0.065, 2.3, 16);
    const leftPillar = new THREE.Mesh(pillarGeo, woodMaterial);
    leftPillar.position.set(-2.35, 1.05, -0.6);
    const rightPillar = new THREE.Mesh(pillarGeo, woodMaterial);
    rightPillar.position.set(2.35, 1.05, -0.6);
    this.workshopGroup.add(leftPillar, rightPillar);

    // Horizontal top beam
    const topBeamGeo = new THREE.BoxGeometry(5.2, 0.08, 0.08);
    const topBeam = new THREE.Mesh(topBeamGeo, woodMaterial);
    topBeam.position.set(0, 2.15, -0.6);
    this.workshopGroup.add(topBeam);

    // Back horizontal railing (背景木质围栏)
    const backRailingGeo = new THREE.BoxGeometry(5.2, 0.06, 0.06);
    const backRailing = new THREE.Mesh(backRailingGeo, woodMaterial);
    backRailing.position.set(0, 0.95, -0.95);
    this.workshopGroup.add(backRailing);

    // 4. Scalloped Fabric Canopy Awning (红白相间波浪遮阳雨棚 - 参考图 1 & 2 核心特征)
    this.buildScallopedAwning();

    // 5. Central Polished White Marble / Stone Slab (中央温润汉白玉/打磨石板)
    // Both Reference Image 1 & 2 show this smooth rectangular stone slab where the sugar craft sits!
    const marbleGeo = new THREE.BoxGeometry(1.85, 0.045, 1.3);
    const marbleTex = this.generateMarbleTexture();
    const marbleMat = new THREE.MeshStandardMaterial({
      map: marbleTex,
      roughness: 0.32,
      metalness: 0.02,
      color: new THREE.Color('#dfd4c2'),
    });
    const marbleSlab = new THREE.Mesh(marbleGeo, marbleMat);
    marbleSlab.position.set(0, 0.0225, 0.05);
    marbleSlab.receiveShadow = true;
    this.workshopGroup.add(marbleSlab);

    // 6. Left Tabletop Stove & Pot of Warm Syrup (左侧米白电陶炉台与温糖锅 - 参考图 1 & 2)
    const stoveGroup = new THREE.Group();
    stoveGroup.position.set(-1.55, 0.0, 0.15);

    // Compact cream-white stove body (米白圆润炉座)
    const stoveBaseGeo = new THREE.BoxGeometry(0.72, 0.14, 0.65);
    const stoveBaseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ede5dc'),
      roughness: 0.35,
      metalness: 0.05,
    });
    const stoveBase = new THREE.Mesh(stoveBaseGeo, stoveBaseMat);
    stoveBase.position.y = 0.07;
    stoveBase.receiveShadow = true;
    stoveGroup.add(stoveBase);

    // Heating surface ring
    const burnerRingGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.015, 32);
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x38332e, roughness: 0.35, metalness: 0.6 });
    const burnerRing = new THREE.Mesh(burnerRingGeo, darkMetalMat);
    burnerRing.position.y = 0.145;
    stoveGroup.add(burnerRing);

    // Rotary knob on front face
    const knobGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 20);
    const knob = new THREE.Mesh(knobGeo, darkMetalMat);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0, 0.07, 0.33);
    stoveGroup.add(knob);

    // Cooking Pot (双耳炖锅)
    const potGeo = new THREE.CylinderGeometry(0.36, 0.32, 0.24, 32, 1, true);
    const potMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ded7d0'),
      roughness: 0.3,
      metalness: 0.25,
    });
    this.syrupPotMesh = new THREE.Mesh(potGeo, potMat);
    this.syrupPotMesh.position.y = 0.26;
    this.syrupPotMesh.castShadow = !isSoftwareGl;
    stoveGroup.add(this.syrupPotMesh);

    // Pot Rim
    const potRimGeo = new THREE.TorusGeometry(0.36, 0.02, 16, 40);
    const potRim = new THREE.Mesh(potRimGeo, potMat);
    potRim.rotation.x = Math.PI / 2;
    potRim.position.y = 0.38;
    stoveGroup.add(potRim);

    // Pot Handles
    const handleGeo = new THREE.TorusGeometry(0.065, 0.014, 12, 24, Math.PI);
    const handle1 = new THREE.Mesh(handleGeo, darkMetalMat);
    handle1.position.set(0.37, 0.32, 0);
    handle1.rotation.z = -Math.PI / 2;
    const handle2 = new THREE.Mesh(handleGeo, darkMetalMat);
    handle2.position.set(-0.37, 0.32, 0);
    handle2.rotation.z = Math.PI / 2;
    stoveGroup.add(handle1, handle2);

    // Viscous Amber Maltose Syrup Liquid (锅中浓稠温热蜂蜜金麦芽糖浆)
    const syrupGeo = new THREE.CircleGeometry(0.34, 32);
    const syrupMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#e8661b'),
      roughness: 0.06,
      metalness: 0.0,
      transmission: 0.88,
      ior: 1.54,
      thickness: 0.35,
      attenuationColor: new THREE.Color('#943800'),
      attenuationDistance: 0.3,
      specularIntensity: 1.4,
    });
    this.syrupLiquidMesh = new THREE.Mesh(syrupGeo, syrupMat);
    this.syrupLiquidMesh.rotation.x = -Math.PI / 2;
    this.syrupLiquidMesh.position.y = 0.34;
    stoveGroup.add(this.syrupLiquidMesh);

    // Wooden Stirring Spoon resting in pot (参考图 2 木勺)
    const spoonHandleGeo = new THREE.CylinderGeometry(0.012, 0.01, 0.45, 12);
    const spoonWoodMat = new THREE.MeshStandardMaterial({ color: 0x6e4326, roughness: 0.45 });
    const spoonHandle = new THREE.Mesh(spoonHandleGeo, spoonWoodMat);
    spoonHandle.position.set(0.12, 0.44, 0.08);
    spoonHandle.rotation.set(-0.35, 0.2, 0.4);
    stoveGroup.add(spoonHandle);

    this.workshopGroup.add(stoveGroup);

    // Steam particles rising from the hot syrup pot
    this.buildSteamParticles(stoveGroup.position);

    // 7. Right Side Ceramic Bowls (右侧白瓷调糖双碗 - 参考图 1)
    this.buildCeramicBowls();

    // 8. Traditional Sugar Figurine Display & Folk Art Stand (特色吹糖人展架 - 参考图 2)
    this.buildFolkArtDisplays();

    // 9. Crafting Tools (竹管、金属修整扦、竹签)
    this.buildCraftTools();

    this.scene.add(this.workshopGroup);
  }

  /**
   * Builds the scalloped red-and-cream fabric awning across the top (波浪花边雨棚)
   */
  private buildScallopedAwning() {
    const awningGroup = new THREE.Group();
    awningGroup.name = 'Scalloped_Awning';

    // Top slanted roof
    const roofGeo = new THREE.BoxGeometry(5.8, 0.035, 1.4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f8ebd6'),
      roughness: 0.7,
      metalness: 0.0,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 2.22, -0.15);
    roof.rotation.x = 0.08;
    awningGroup.add(roof);

    // Alternating Terracotta-red and Cream-white hanging scallops (14 个波浪圆弧花边)
    const redMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#b8543f'),
      roughness: 0.65,
      metalness: 0.0,
    });
    const creamMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#fbf4e6'),
      roughness: 0.65,
      metalness: 0.0,
    });

    const scallopCount = 14;
    const startX = -2.6;
    const stepX = 5.2 / scallopCount;

    for (let i = 0; i < scallopCount; i++) {
      const cx = startX + stepX * (i + 0.5);
      const isRed = i % 2 === 0;
      const mat = isRed ? redMat : creamMat;

      // Curved scallop drop (semi-cylinder rounded drop)
      const scallopGeo = new THREE.CylinderGeometry(stepX * 0.5, stepX * 0.5, 0.02, 16, 1, false, Math.PI, Math.PI);
      const scallop = new THREE.Mesh(scallopGeo, mat);
      scallop.rotation.z = Math.PI;
      scallop.rotation.x = Math.PI / 2;
      scallop.position.set(cx, 2.08, 0.45);
      awningGroup.add(scallop);

      // Backing valence flap
      const flapGeo = new THREE.BoxGeometry(stepX, 0.12, 0.02);
      const flap = new THREE.Mesh(flapGeo, mat);
      flap.position.set(cx, 2.14, 0.45);
      awningGroup.add(flap);
    }

    this.workshopGroup.add(awningGroup);
  }

  /**
   * Builds the dual white ceramic bowls on the right (白瓷调糖双碗 - 参考图 1)
   */
  private buildCeramicBowls() {
    const bowlsGroup = new THREE.Group();
    bowlsGroup.name = 'Ceramic_Bowls';

    const bowlMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#faf5ee'),
      roughness: 0.18,
      metalness: 0.04,
    });

    // Bowl 1: Syrup / Vegetable Oil Bowl (盛放温糖油的浅碗)
    const bowl1Geo = new THREE.CylinderGeometry(0.22, 0.14, 0.11, 28);
    const bowl1 = new THREE.Mesh(bowl1Geo, bowlMat);
    bowl1.position.set(1.35, 0.055, 0.25);
    bowl1.castShadow = !isSoftwareGl;
    bowl1.receiveShadow = true;
    bowlsGroup.add(bowl1);

    // Liquid in Bowl 1 (金黄植物调和油/清亮麦芽汁)
    const oilGeo = new THREE.CircleGeometry(0.19, 24);
    const oilMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#f8c75d'),
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0.85,
      ior: 1.48,
    });
    const oil = new THREE.Mesh(oilGeo, oilMat);
    oil.rotation.x = -Math.PI / 2;
    oil.position.set(1.35, 0.095, 0.25);
    bowlsGroup.add(oil);

    // Bowl 2: White Starch / Sugar Powder Bowl (扑粉白瓷碗)
    const bowl2Geo = new THREE.CylinderGeometry(0.22, 0.14, 0.11, 28);
    const bowl2 = new THREE.Mesh(bowl2Geo, bowlMat);
    bowl2.position.set(1.85, 0.055, 0.25);
    bowl2.castShadow = !isSoftwareGl;
    bowl2.receiveShadow = true;
    bowlsGroup.add(bowl2);

    // Powder in Bowl 2 (细腻熟米粉/糖霜)
    const powderGeo = new THREE.CircleGeometry(0.19, 24);
    const powderMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: 0.95,
      metalness: 0.0,
    });
    const powder = new THREE.Mesh(powderGeo, powderMat);
    powder.rotation.x = -Math.PI / 2;
    powder.position.set(1.85, 0.095, 0.25);
    bowlsGroup.add(powder);

    this.workshopGroup.add(bowlsGroup);
  }

  /**
   * Builds the folk art displays: "吹糖人" jar with lollipops and wooden display rack (参考图 2)
   */
  private buildFolkArtDisplays() {
    const folkGroup = new THREE.Group();
    folkGroup.name = 'Folk_Art_Displays';

    // 1. Rustic Wooden Jar labeled "吹糖人" (左后方工具陶罐/木桶)
    const jarGroup = new THREE.Group();
    jarGroup.position.set(-1.85, 0.0, -0.55);

    const jarGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.32, 24);
    const jarMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6a452a'),
      roughness: 0.55,
      metalness: 0.05,
    });
    const jarMesh = new THREE.Mesh(jarGeo, jarMat);
    jarMesh.position.y = 0.16;
    jarMesh.castShadow = !isSoftwareGl;
    jarGroup.add(jarMesh);

    // "吹糖人" Label
    const labelGeo = new THREE.PlaneGeometry(0.14, 0.18);
    const labelMat = new THREE.MeshStandardMaterial({
      map: this.generateJarLabel(),
      roughness: 0.6,
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(0, 0.16, 0.182);
    jarGroup.add(label);

    // Bamboo sticks sticking out of jar
    const stickMat = new THREE.MeshStandardMaterial({ color: 0xd4af68, roughness: 0.45 });
    for (let i = 0; i < 4; i++) {
      const stickGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.55, 8);
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.position.set((i - 1.5) * 0.04, 0.35, (Math.random() - 0.5) * 0.06);
      stick.rotation.set((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.25);
      jarGroup.add(stick);
    }

    // Finished Amber Sugar Bird Lollipop on a stick (小萌鸟糖人)
    const birdGroup = new THREE.Group();
    birdGroup.position.set(-0.06, 0.58, 0);
    const sugarMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffc26a'),
      transmission: 0.92,
      roughness: 0.04,
      ior: 1.52,
      thickness: 0.3,
      attenuationColor: new THREE.Color('#ff7300'),
      attenuationDistance: 1.5,
    });
    const birdBody = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), sugarMat);
    const birdHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), sugarMat);
    birdHead.position.set(0.06, 0.06, 0);
    const birdBeak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 8), sugarMat);
    birdBeak.rotation.z = -Math.PI / 2;
    birdBeak.position.set(0.12, 0.06, 0);
    birdGroup.add(birdBody, birdHead, birdBeak);
    jarGroup.add(birdGroup);

    folkGroup.add(jarGroup);

    // 2. Right Side Tiered Wooden Lollipop Display Stand (右后方糖人展示小木架)
    const rackGroup = new THREE.Group();
    rackGroup.position.set(1.85, 0.0, -0.55);

    const rackWoodMat = new THREE.MeshStandardMaterial({ color: 0x5a3820, roughness: 0.5 });
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.35), rackWoodMat);
    basePlate.position.y = 0.025;
    const stepPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.18), rackWoodMat);
    stepPlate.position.set(0, 0.065, -0.06);
    rackGroup.add(basePlate, stepPlate);

    // Cute Amber Sugar Bear Lollipop (晶莹小萌熊糖人)
    const bearStick = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.6, 8), stickMat);
    bearStick.position.set(-0.12, 0.32, -0.06);
    rackGroup.add(bearStick);

    const bearGroup = new THREE.Group();
    bearGroup.position.set(-0.12, 0.58, -0.06);
    const bearFace = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), sugarMat);
    const ear1 = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), sugarMat);
    ear1.position.set(-0.065, 0.075, 0);
    const ear2 = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), sugarMat);
    ear2.position.set(0.065, 0.075, 0);
    bearGroup.add(bearFace, ear1, ear2);
    rackGroup.add(bearGroup);

    // Goldfish Sugar Lollipop (锦鲤金鱼糖人)
    const fishStick = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.65, 8), stickMat);
    fishStick.position.set(0.12, 0.35, -0.06);
    rackGroup.add(fishStick);

    const fishLolly = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), sugarMat);
    fishLolly.scale.set(1.2, 0.8, 0.6);
    fishLolly.position.set(0.12, 0.65, -0.06);
    const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 12), sugarMat);
    fishTail.rotation.z = Math.PI / 2;
    fishTail.position.set(0.02, 0.65, -0.06);
    rackGroup.add(fishLolly, fishTail);

    folkGroup.add(rackGroup);

    // 3. Background Hanging Linen Banner (背景萌趣非遗挂帘 - 参考图 1 & 2)
    const bannerGeo = new THREE.PlaneGeometry(0.95, 1.25);
    const bannerMat = new THREE.MeshStandardMaterial({
      map: this.generateBannerTexture(),
      roughness: 0.65,
    });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(-1.45, 1.55, -0.85);
    folkGroup.add(banner);

    this.workshopGroup.add(folkGroup);
  }

  /**
   * Generates procedural warm golden morning street bokeh backdrop texture
   */
  private generateWarmBackdropTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 576;
    const ctx = canvas.getContext('2d')!;

    // 1. Warm sky gradient (温暖晨光天幕)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 576);
    skyGrad.addColorStop(0, '#faeee0');
    skyGrad.addColorStop(0.45, '#fce0cb');
    skyGrad.addColorStop(0.75, '#f6cbaf');
    skyGrad.addColorStop(1.0, '#ead2be');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1024, 576);

    // 2. Radiant Morning Sun with Golden Atmosphere
    const sunGrad = ctx.createRadialGradient(720, 160, 20, 720, 160, 480);
    sunGrad.addColorStop(0, 'rgba(255, 255, 245, 0.85)');
    sunGrad.addColorStop(0.25, 'rgba(255, 230, 175, 0.45)');
    sunGrad.addColorStop(0.65, 'rgba(255, 210, 150, 0.15)');
    sunGrad.addColorStop(1.0, 'rgba(255, 200, 140, 0.0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, 1024, 576);

    // 3. Soft Blurred Bokeh Tree Canopies (远景柔焦绿树与古镇屋檐)
    const treeColors = ['rgba(135, 152, 108, 0.28)', 'rgba(155, 172, 122, 0.22)', 'rgba(118, 138, 92, 0.25)'];
    const treeCircles = [
      [240, 220, 110], [310, 190, 95], [380, 230, 85],
      [820, 240, 130], [890, 210, 110], [960, 250, 100],
    ];
    treeCircles.forEach(([x, y, r], idx) => {
      ctx.fillStyle = treeColors[idx % treeColors.length];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Distant warm blurred horizontal eave / street fence
    ctx.fillStyle = 'rgba(215, 175, 145, 0.25)';
    ctx.fillRect(0, 360, 1024, 40);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Generates procedural warm honey oak wood texture for counter table
   */
  private generateHoneyWoodTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Warm golden oak base
    ctx.fillStyle = '#dfa46e';
    ctx.fillRect(0, 0, 1024, 1024);

    // Plank seams
    const plankHeight = 128;
    for (let y = 0; y < 1024; y += plankHeight) {
      ctx.fillStyle = 'rgba(155, 95, 48, 0.35)';
      ctx.fillRect(0, y, 1024, 3);

      // Subtle fine wood grain
      for (let gy = y + 4; gy < y + plankHeight; gy += 6) {
        const alpha = 0.05 + Math.sin(gy * 0.1) * 0.03;
        ctx.strokeStyle = `rgba(140, 82, 38, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        for (let x = 0; x < 1024; x += 32) {
          const dy = Math.sin(x * 0.015 + gy * 0.01) * 3;
          ctx.lineTo(x, gy + dy);
        }
        ctx.stroke();
      }
    }

    // Sunny soft diagonal light wash
    const lightGrad = ctx.createLinearGradient(0, 0, 1024, 1024);
    lightGrad.addColorStop(0, 'rgba(255, 235, 205, 0.15)');
    lightGrad.addColorStop(0.5, 'rgba(255, 215, 170, 0.05)');
    lightGrad.addColorStop(1, 'rgba(180, 110, 60, 0.12)');
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  /**
   * Generates procedural cream white marble texture for central crafting slab
   */
  private generateMarbleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Polished warm cream-tan marble base with defined stone edge
    ctx.fillStyle = '#eadecd';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#cbb8a1';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 500, 500);

    // Delicate warm taupe-golden marble veins
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(180, 155, 130, ${0.18 + i * 0.05})`;
      ctx.beginPath();
      let x = i * 90;
      let y = 0;
      ctx.moveTo(x, y);
      while (y < 512) {
        x += (Math.random() - 0.45) * 24;
        y += 24;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Subtle satin highlight
    const radGrad = ctx.createRadialGradient(256, 256, 50, 256, 256, 320);
    radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    radGrad.addColorStop(1, 'rgba(240, 230, 220, 0.05)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Generates procedural traditional banner texture with cute mascot illustration
   */
  private generateBannerTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 680;
    const ctx = canvas.getContext('2d')!;

    // Warm natural linen fabric
    ctx.fillStyle = '#f8f2e7';
    ctx.fillRect(0, 0, 512, 680);

    // Decorative traditional border
    ctx.strokeStyle = '#c45a42';
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, 476, 644);
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, 460, 628);

    // Mascot Illustration (Cute bear / pufferfish outline like Reference Image 2)
    ctx.strokeStyle = '#9c5a3a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(256, 260, 105, 0, Math.PI * 2); // Head
    ctx.stroke();

    // Bear ears
    ctx.beginPath();
    ctx.arc(175, 175, 40, 0, Math.PI * 2);
    ctx.arc(337, 175, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Eyes & Smile
    ctx.fillStyle = '#7a3c22';
    ctx.beginPath();
    ctx.arc(215, 245, 10, 0, Math.PI * 2);
    ctx.arc(297, 245, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(256, 280, 20, 0.2, Math.PI - 0.2); // Smile
    ctx.stroke();

    // Calligraphy banner text
    ctx.fillStyle = '#b8543f';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('非遗吹糖人', 256, 430);

    ctx.fillStyle = '#8a5c3e';
    ctx.font = '22px serif';
    ctx.fillText('一口温糖 · 一尾河豚', 256, 480);
    ctx.font = '16px sans-serif';
    ctx.fillText('TRADITIONAL SUGAR CRAFT', 256, 520);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Generates aged paper label for the tool jar
   */
  private generateJarLabel(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 320;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ebd6ba';
    ctx.fillRect(0, 0, 256, 320);

    ctx.strokeStyle = '#8a4e2e';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 236, 300);

    ctx.fillStyle = '#4a2512';
    ctx.font = 'bold 38px serif';
    ctx.textAlign = 'center';
    ctx.fillText('吹', 128, 80);
    ctx.fillText('糖', 128, 145);
    ctx.fillText('人', 128, 210);

    // Little stamp icon
    ctx.strokeStyle = '#c4422e';
    ctx.lineWidth = 2;
    ctx.strokeRect(98, 240, 60, 45);
    ctx.fillStyle = '#c4422e';
    ctx.font = 'bold 18px serif';
    ctx.fillText('吉庆', 128, 270);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Steam particles rising from the hot syrup pot in the golden sunlight
   */
  private buildSteamParticles(potPos: THREE.Vector3) {
    const particleCount = 70;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const alphas = new Float32Array(particleCount);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = potPos.x + (Math.random() - 0.5) * 0.35;
      positions[i * 3 + 1] = potPos.y + 0.38 + Math.random() * 0.7;
      positions[i * 3 + 2] = potPos.z + (Math.random() - 0.5) * 0.35;
      alphas[i] = Math.random();
      scales[i] = 0.03 + Math.random() * 0.05;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom steam canvas dot texture
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 64;
    dotCanvas.height = 64;
    const ctx = dotCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 245, 230, 0.75)');
    grad.addColorStop(0.5, 'rgba(255, 235, 210, 0.22)');
    grad.addColorStop(1, 'rgba(255, 235, 210, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const steamTex = new THREE.CanvasTexture(dotCanvas);

    const mat = new THREE.PointsMaterial({
      size: 0.16,
      map: steamTex,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffedd2,
    });

    this.steamParticles = new THREE.Points(geo, mat);
    this.workshopGroup.add(this.steamParticles);
  }

  /**
   * Builds traditional blow tube, shaping metal skewers, and chopsticks
   */
  private buildCraftTools() {
    this.craftToolsGroup.name = 'Artisan_Tools';

    // 1. Bamboo Blow Tube (细长吹糖芦管/竹管)
    this.bambooPipe = new THREE.Group();
    const pipeGeo = new THREE.CylinderGeometry(0.016, 0.012, 1.1, 16);
    const bambooMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d4af68'),
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

    this.bambooPipe.position.set(-0.65, 0.02, 0.55);
    this.bambooPipe.rotation.y = 0.28;
    this.craftToolsGroup.add(this.bambooPipe);

    // 2. Metal Shaping Chopsticks & Skewers (台前金属修整扦与竹签 - 参考图 2)
    const skewerMat = new THREE.MeshStandardMaterial({ color: 0x9c958e, roughness: 0.25, metalness: 0.8 });
    const sk1 = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.7, 8), skewerMat);
    sk1.rotation.z = Math.PI / 2;
    sk1.position.set(-0.25, 0.01, 0.65);
    sk1.rotation.y = 0.08;

    const sk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.68, 8), skewerMat);
    sk2.rotation.z = Math.PI / 2;
    sk2.position.set(-0.2, 0.01, 0.69);
    sk2.rotation.y = 0.04;

    this.craftToolsGroup.add(sk1, sk2);
    this.workshopGroup.add(this.craftToolsGroup);
  }

  /**
   * Builds the cute white chef's hat on the pufferfish (as in Reference Image 1)
   */
  private buildChefHat() {
    this.chefHatGroup = new THREE.Group();
    this.chefHatGroup.name = 'Pufferfish_ChefHat';

    const hatMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#fcfbf7'),
      roughness: 0.55,
      metalness: 0.02,
    });

    // Lower cylindrical band
    const bandGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.12, 24);
    const bandMesh = new THREE.Mesh(bandGeo, hatMat);
    bandMesh.position.y = 0.06;
    bandMesh.castShadow = !isSoftwareGl;
    this.chefHatGroup.add(bandMesh);

    // Puffy hat crown (5 overlapping spheres)
    const puffOffsets = [
      [0, 0.2, 0, 0.18],
      [0.12, 0.18, 0.08, 0.15],
      [-0.12, 0.18, 0.08, 0.15],
      [0.08, 0.18, -0.12, 0.15],
      [-0.08, 0.18, -0.12, 0.15],
    ];

    puffOffsets.forEach(([x, y, z, r]) => {
      const puffGeo = new THREE.SphereGeometry(r, 16, 16);
      const puffMesh = new THREE.Mesh(puffGeo, hatMat);
      puffMesh.position.set(x, y, z);
      puffMesh.castShadow = !isSoftwareGl;
      this.chefHatGroup.add(puffMesh);
    });

    // Place hat tilted comfortably on the pufferfish's forehead
    this.chefHatGroup.position.set(0.18, 0.98, 0.02);
    this.chefHatGroup.rotation.set(0.1, 0, -0.18);
    this.chefHatGroup.scale.setScalar(0.9);
    this.chefHatGroup.visible = this.isChefHatVisible;

    this.pufferfishGroup.add(this.chefHatGroup);
  }

  public toggleChefHat() {
    this.isChefHatVisible = !this.isChefHatVisible;
    this.chefHatGroup.visible = this.isChefHatVisible;
    this.onStateChange?.();
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

      // Attach cute chef hat accessory (from Reference Image 1)
      this.buildChefHat();

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
      color: new THREE.Color('#ffdca3'),
      emissive: new THREE.Color('#381804'),
      roughness: 0.04,
      metalness: 0.0,
      transmission: 0.95,
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

    // Return camera to cozy eye-level stall view (Reference Images 1 & 2)
    this.camera.position.set(0, 1.48, 4.35);
    this.camera.lookAt(0, 0.92, 0);

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
    this.setRotationTarget(-Math.PI * 0.38, 0.08);
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

    this.camera.position.set(0, 1.48, 4.35);
    this.camera.lookAt(0, 0.92, 0);

    if (angle === 'front') {
      // Front faces camera with canonical 3/4 view showing mouth, eyes, fins
      this.pufferfishGroup.rotation.set(0.08, -Math.PI * 0.38, 0);
    } else if (angle === 'side') {
      // Side profile showing round belly and lateral fins
      this.pufferfishGroup.rotation.set(0, 0, 0);
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
    this.camera.lookAt(0, 0.92, 0);
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
