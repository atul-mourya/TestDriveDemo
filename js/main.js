'use strict';

import ImportAssets from './AssetManager';
import Physics from './Physics/physics';
import {
	WebGLRenderer,
	TextureLoader,
	Cache,
	Scene,
	Color,
	PerspectiveCamera,
	PlaneGeometry,
	Vector2,
	DirectionalLight,
	PMREMGenerator,
	ACESFilmicToneMapping,
	LinearSRGBColorSpace,
	Vector3,
	Quaternion
} from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { Water } from 'three/examples/jsm/objects/Water2';
import Stats from 'three/examples/jsm/libs/stats.module';
import RendererStats from './vendors/threex/threex.rendererstats';
import FrameManager from './FrameManager';
import PostProcessingManager from './PostProcessingManager';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


var vec3 = new Vector3();
var quat = new Quaternion();
const keysActions = {
	"KeyW": 'acceleration',
	"KeyS": 'braking',
	"KeyA": 'left',
	"KeyD": 'right'
};

class TestDrive {

	constructor( data, onGameReady ) {

		this.data = data;
		this.onGameReady = onGameReady;

		this.setting = {
			//screenshot
			cameraAngle1: { phi: Math.PI / 2, theta: Math.PI / 4 }, // front corner veiw. It is also the default camera view    **rework needed**
			cameraAngle2: { phi: Math.PI / 2, theta: Math.PI / 2 }, // side view. To be used for creating snapshot              **rework needed**
			cameraAngle3: { phi: - Math.PI / 2, theta: - Math.PI / 4 }, // rear corner view. To be used for creating snapshot       **rework needed**

			//initial values
			ground_clearence: 0, // camera height from ground
			nearCamLimit: 0, // from car's outer bounding radius
			farCamLimit: 300, // from car's outer bounding radius
			extendedFarCamLimit: 200, // for mobile portrait mode screens
			autoRotateSpeed: 4, // auto rotate speed parameter
			rotationSensitivity: 0.5,
			enableDamping: false,
			userControlledAimation: true, // set true to enable continuos rendering   **rework needed**

			//tween
			tweenJumpBackDistance: 50, // to be used in effectjs                   **rework needed**

			//render engine
			antialias: false, // antialiasing
			toneMappingExposure: 1,
			enableShadow: false,
			resolution: 0.25,

			postprocessing: false,

			graphicsFPSLimit: 60, // frame per second
			physicsFPSLimit: 60, // frame per second

		};

		this.tracker = {
			analysis: true,
			pan: true,
			exportScene: true
		};

		this.sceneReady = false;

		this.scene = null;
		this.renderer = null;
		this.canvas = null;
		this.camera = null;
		this.physics = null;

		this.cameraMode = 3;
		this.orbitControls = null;

		this.assetManager = null;
		this.postProcessor = null;

		if ( this.tracker.analysis ) this.stats();

	}

	async loadGame( level, map, type ) {

		Cache.enabled = true;

		this.scene = new Scene();
		if ( this.tracker.exportScene == true ) window.scene = this.scene;

		this.renderer = new WebGLRenderer( {
			antialias: this.setting.postprocessing ? false : this.setting.antialias,
			alpha: false,
			logarithmicDepthBuffer: this.setting.postprocessing ? false : true,
			powerPreference: this.setting.postprocessing ? "high-performance" : "default",
			stencil: this.setting.postprocessing ? false : true,
			depth: this.setting.postprocessing ? false : true
		} );

		this.renderer.setPixelRatio( window.devicePixelRatio * this.setting.resolution );
		this.renderer.setClearColor( new Color( 0x000000, 1.0 ) );

		this.canvas = this.renderer.domElement;
		this.data.container.appendChild( this.canvas );

		this.camera = new PerspectiveCamera( 45, this.canvas.width / this.canvas.height, 0.1, 5000 );

		// this.orbitControls = new OrbitControls( this.camera, this.canvas );
		this.orbitControls = new OrbitControls( this.camera, this.renderer.domElement );
		this.orbitControls.listenToKeyEvents( window ); // optional
		this.orbitControls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
		this.orbitControls.dampingFactor = 0.05;
		this.orbitControls.screenSpacePanning = false;
		this.orbitControls.minDistance = 100;
		this.orbitControls.maxDistance = 5000;
		this.orbitControls.zoomToCursor = true;


		const gameData = await this.loadGameData( level, map, type );
		this.loadEnvironment( gameData );

		const passes = [
			// { type: 'smaa', config: {} },
			{ type: 'n8ao', config: {} }
		];

		this.postProcessor = new PostProcessingManager(
			this.scene,
			this.camera,
			this.renderer,
			this.canvas.width,
			this.canvas.height,
			passes
		);
		this.postProcessor.enabled = this.setting.postprocessing;

		this.assetManager = new ImportAssets( this.setting, this.camera, this.scene, gameData );
		this.frameManager = new FrameManager( this.renderer, this.scene, this.camera, {}, {}, this.postProcessor );
		this.frameManager.fpsLimit = this.setting.graphicsFPSLimit;

		this.registerEventListeners();

	}

	async onPhysicsReady() {

		this.onGameReady();
		this.sceneReady = true;
		this.frameManager.initAnimateFrame( () => this.render() );
		this.frameManager.startAnimate();
		this.fpsLimit = this.setting.physicsFPSLimit;
		this.onWindowResize();

	}

	async loadGameData( level, map, type ) {

		const lookups = await fetch( location.href + "resources/models/model_lookups.json" );
		const lookupData = await lookups.json();

		const response = await fetch( location.href + lookupData.game_type[ type ].url );
		const levelData = await response.json();

		return { baseCar: lookupData.base_car, levelData: levelData[ level ][ map ] };

	}

	async loadEnvironment( gameData ) {

		const pmremGenerator = new PMREMGenerator( this.renderer );
		pmremGenerator.compileEquirectangularShader();
		var rgbe_loader = new RGBELoader();
		const texture = await rgbe_loader.loadAsync( "./images/cannon_2k.hdr" );
		texture.colorSpace = LinearSRGBColorSpace;
		const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
		this.scene.environment = envMap;
		texture.dispose();
		pmremGenerator.dispose();

		this.scene.background = this.scene.environment;
		this.scene.environmentIntensity = 1;

		this.renderer.toneMapping = ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 0.85;

		const water = new Water( new PlaneGeometry( 16384 + 1024, 16384 + 1024, 16, 16 ), {
			color: new Color( 0xc7cbc6 ),
			scale: 100,
			flowDirection: new Vector2( 0.65, 0.65 ),
			normalMap0: new TextureLoader().load( './images/Water_1_M_Normal.jpg' ),
			normalMap1: new TextureLoader().load( './images/Water_2_M_Normal.jpg' ),
			textureWidth: 256,
			textureHeight: 256
		} );
		water.position.y = gameData.levelData.map.seaLevel;
		water.rotation.x = - 0.5 * Math.PI;
		water.name = 'Water';
		this.scene.add( water );

		const directionalLight = new DirectionalLight( 0xffffff, 1 * Math.PI );
		directionalLight.position.set( 1, 1, 1 ).normalize();
		this.scene.add( directionalLight );

	}

	registerEventListeners() {

		const scope = this;

		this.assetManager.addEventListener( 'ready', () => Ammo().then( Ammo => scope.initPhysics( Ammo ), false ) );

		document.addEventListener( 'keypress', e => scope.onKeyPress( e ), false );
		window.addEventListener( 'resize', () => scope.onWindowResize(), false );
		window.addEventListener( 'focus', () => scope.frameManager.startAnimate(), false );
		window.addEventListener( 'blur', () => scope.frameManager.stopAnimate(), false );
		window.addEventListener( 'keydown', e => scope.keydown( e ), false );
		window.addEventListener( 'keyup', e => scope.keyup( e ), false );

	}

	initPhysics( Ammo ) {

		this.physics = new Physics(
			Ammo,
			this.scene,
			this.assetManager.carBody,
			this.assetManager.wheels,
			this.camera,
			this.assetManager.heightData,
			() => this.onPhysicsReady()
		);
		this.assetManager.heightData = null;

	}

	render() {

		if ( this.tracker.analysis ) {

			this.rendererStats.update( this.renderer );
			this.stats.update();

		}

		this.cameraMode === 4 ? this.orbitControls.update() : this.updateCamera();


		this.stats2.begin();
		this.physics.update();
		this.stats2.end();

	}

	updateCamera() {

		switch ( this.cameraMode ) {

			case 0:
				vec3.copy( this.physics.chassis.position );
				this.camera.position.lerp( vec3, 0.2 );
				this.camera.lookAt( this.physics.chassis.position.x, this.physics.chassis.position.y, this.physics.chassis.position.z - 20 );
				break;
			case 1:

				this.camera.quaternion.copy( this.physics.chassis.quaternion );
				quat.setFromAxisAngle( vec3.set( 0, 1, 0 ), Math.PI );
				this.camera.quaternion.multiply( quat );
				this.camera.position.copy( this.physics.chassis.position ).add( vec3.set( - 0.7, 2, 1 ) );

				break;
			case 2:
				this.camera.position.set( this.physics.chassis.position.x + 20, this.physics.chassis.position.y + 6, this.physics.chassis.position.z );
				this.camera.lookAt( this.physics.chassis.position );
				break;
			case 3:
				vec3.setFromMatrixPosition( this.physics.chaseCamMount.matrixWorld );
				this.camera.position.lerp( vec3, 0.05 );
				this.camera.lookAt( this.physics.chassis.position );
				break;
			case 4:
				break;

		}

	}

	recreateRendererContext() {

		_global.renderer.dispose();
		_global.renderer.forceContextLoss();
		_global.renderer.context = undefined;
		var targetDOM = _global.renderer.domElement;
		targetDOM.parentNode.removeChild( targetDOM );
		_initRenderer();

	}

	onKeyPress( event ) {

		switch ( event.key ) {

			case "c" || "C":
				this.cameraMode = this.cameraMode == 4 ? 0 : this.cameraMode + 1;
				this.orbitControls.enabled = this.cameraMode == 4 ? true : false;
				break;
			case "r" || "R":
				this.physics.needsReset = true;
				break;

		}

	}

	keyup( e ) {

		if ( keysActions[ e.code ] ) {

			this.physics.vehicleActor.actions[ keysActions[ e.code ] ] = false;
			e.preventDefault();
			e.stopPropagation();
			return false;

		}

	}

	keydown( e ) {

		if ( keysActions[ e.code ] ) {

			this.physics.vehicleActor.actions[ keysActions[ e.code ] ] = true;
			e.preventDefault();
			e.stopPropagation();
			return false;

		}

	}

	onWindowResize() {

		this.canvas.height = this.canvas.parentElement.clientHeight;
		this.canvas.width = this.canvas.parentElement.clientWidth;
		this.renderer.setSize( this.canvas.width, this.canvas.height );
		// this.postProcessor.setSize( this.canvas.width, this.canvas.height );
		this.camera.aspect = this.canvas.width / this.canvas.height;
		this.camera.updateProjectionMatrix();

	}

	stats() {

		this.stats = new Stats();
		this.stats.dom.style.position = 'absolute';
		this.stats.dom.style.top = '0px';
		this.stats.dom.style.left = '80px';
		document.body.appendChild( this.stats.dom );

		this.stats2 = new Stats();
		this.stats2.dom.style.position = 'absolute';
		this.stats2.dom.style.top = '0px';
		this.stats2.dom.style.left = '160px';
		document.body.appendChild( this.stats2.dom );

		this.rendererStats = new RendererStats();
		this.rendererStats.domElement.style.position = 'absolute';
		this.rendererStats.domElement.style.left = '0px';
		this.rendererStats.domElement.style.top = '0px';
		document.body.appendChild( this.rendererStats.domElement );

	}

}

export default TestDrive;
