import ImportAssets from './AssetManager';
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
	Quaternion,
	Clock
} from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { Water } from 'three/examples/jsm/objects/Water2';
import Stats from 'stats-gl';
import RendererStats from './vendors/threex/threex.rendererstats';
import FrameManager from './FrameManager';
import PostProcessingManager from './PostProcessingManager';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Worker from './Physics/PhysicsWorker.js?worker';

const _tempVector1 = new Vector3();
const _tempVector2 = new Vector3();
const _tempQuaternion = new Quaternion();
const _tempQuaternion2 = new Quaternion();
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
			//initial values
			enableDamping: false,

			//render engine
			antialias: false, // antialiasing
			toneMappingExposure: 1,
			enableShadow: false,
			resolution: 1,
			postprocessing: true,

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

		this.clock = new Clock();

		if ( this.tracker.analysis ) this.stats();

	}

	async loadGame( level, map, type ) {

		Cache.enabled = true;

		this.scene = new Scene();
		if ( this.tracker.exportScene == true ) window.scene = this.scene;

		this.renderer = new WebGLRenderer( {
			antialias: this.setting.postprocessing ? false : this.setting.antialias,
			alpha: false,
			logarithmicDepthBuffer: false,
			powerPreference: "high-performance",
			stencil: false,
			depth: true,
			precision: "lowp",
		} );

		this.renderer.setPixelRatio( window.devicePixelRatio * this.setting.resolution );
		this.renderer.setClearColor( new Color( 0x000000, 1.0 ) );

		this.canvas = this.renderer.domElement;
		this.data.container.appendChild( this.canvas );

		this.camera = new PerspectiveCamera( 45, this.canvas.width / this.canvas.height, 0.1, 5000 );

		// this.orbitControls = new OrbitControls( this.camera, this.canvas );
		this.orbitControls = new OrbitControls( this.camera, this.renderer.domElement );
		this.orbitControls.listenToKeyEvents( window );
		this.orbitControls.enableDamping = false;
		this.orbitControls.dampingFactor = 0.05;
		this.orbitControls.screenSpacePanning = false;
		this.orbitControls.minDistance = 100;
		this.orbitControls.maxDistance = 5000;
		this.orbitControls.zoomToCursor = true;


		const gameData = await this.loadGameData( level, map, type );
		this.loadEnvironment( gameData );

		const passes = [
			{ type: 'smaa', config: {} },
			{ type: 'dof', config: {} },
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

	async initPhysics() {

		this.physicsWorker = new Worker();
		const body = this.assetManager.carBody;
		const position = { x: body.position.x, y: body.position.y, z: body.position.z };
		const quaternion = { x: body.quaternion.x, y: body.quaternion.y, z: body.quaternion.z, w: body.quaternion.w };
		const terrainData = this.assetManager.heightData;

		this.physicsWorker.postMessage( { cmd: 'init', terrainData: terrainData, position, quaternion } );
		this.physicsWorker.onmessage = event => {

			switch ( event.data.cmd ) {

				case 'PhysicsReady':
					this.onPhysicsReady();
					break;
				case 'PhysicsStarted':
					break;
				// case 'VehicleTransform':
				case 'PhysicsUpdated':
					this.assetManager.carBody.position.set(
						event.data.data.chassis.position.x,
						event.data.data.chassis.position.y,
						event.data.data.chassis.position.z
					);
					this.assetManager.carBody.quaternion.set(
						event.data.data.chassis.quaternion.x,
						event.data.data.chassis.quaternion.y,
						event.data.data.chassis.quaternion.z,
						event.data.data.chassis.quaternion.w
					);
					this.assetManager.wheels.forEach( ( wheel, index ) => {

						wheel.position.set(
							event.data.data.wheels[ index ].position.x,
							event.data.data.wheels[ index ].position.y,
							event.data.data.wheels[ index ].position.z
						);
						wheel.quaternion.set(
							event.data.data.wheels[ index ].quaternion.x,
							event.data.data.wheels[ index ].quaternion.y,
							event.data.data.wheels[ index ].quaternion.z,
							event.data.data.wheels[ index ].quaternion.w
						);

					} );
					this.stats.update();

					break;
				default:

			}

		};

	}

	async onPhysicsReady() {

		this.onGameReady();
		this.sceneReady = true;
		this.frameManager.initAnimateFrame( () => {

			this.updateGraphics();
			this.updatePhysics();

		} );

		this.frameManager.startAnimate();
		this.frameManager.fpsLimit = this.setting.physicsFPSLimit;
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

		// this.assetManager.addEventListener( 'ready', () => Ammo().then( Ammo => scope.initPhysics( Ammo ), false ) );
		this.assetManager.addEventListener( 'ready', () => scope.initPhysics(), false );

		document.addEventListener( 'keypress', e => scope.onKeyPress( e ), false );
		window.addEventListener( 'resize', () => scope.onWindowResize(), false );
		window.addEventListener( 'focus', () => scope.frameManager.startAnimate(), false );
		window.addEventListener( 'blur', () => scope.frameManager.stopAnimate(), false );
		window.addEventListener( 'keydown', e => scope.keydown( e ), false );
		window.addEventListener( 'keyup', e => scope.keyup( e ), false );

	}

	updatePhysics() {

		this.physicsWorker.postMessage( { cmd: 'update', dt: this.clock.getDelta() } );

	}

	updateGraphics() {

		this.postProcessor.enabled ? this.postProcessor.update() : this.renderer.render( this.scene, this.camera );
		this.updateCamera();

	}


	updateCamera() {

		switch ( this.cameraMode ) {

			case 0: // Driver View
				// Set the camera position relative to the car's position and orientation
				_tempVector1.set( 0.5, 2.2, - 1 ); // Adjust for driver's seat position
				_tempVector1.applyQuaternion( this.assetManager.carBody.quaternion );
				_tempVector1.add( this.assetManager.carBody.position );
				this.camera.position.copy( _tempVector1 );

				// Calculate the target quaternion for the camera
				_tempQuaternion2.copy( this.assetManager.carBody.quaternion );
				_tempQuaternion2.multiply( new Quaternion().setFromAxisAngle( new Vector3( 0, 1, 0 ), Math.PI ) );

				// Slerp the camera's current quaternion to the target quaternion
				this.camera.quaternion.slerp( _tempQuaternion2, 0.2 );
				break;

			case 1: // Front Camera View
				_tempVector1.set( 0, 1.5, 4 ); // Position in front of the car
				_tempVector1.applyQuaternion( this.assetManager.carBody.quaternion );
				_tempVector1.add( this.assetManager.carBody.position );
				this.camera.position.copy( _tempVector1 );

				_tempQuaternion.setFromAxisAngle( new Vector3( 0, 1, 0 ), Math.PI );
				this.camera.quaternion.copy( this.assetManager.carBody.quaternion ).multiply( _tempQuaternion );
				break;

			case 2: // Fixed Camera Ahead of Car
				this.camera.position.set( this.assetManager.carBody.position.x + 20, this.assetManager.carBody.position.y + 6, this.assetManager.carBody.position.z );
				this.camera.lookAt( this.assetManager.carBody.position );
				break;

			case 3: // Chase Cam View
				_tempVector1.setFromMatrixPosition( this.assetManager.chaseCamMount.matrixWorld );
				this.camera.position.lerp( _tempVector1, 0.05 );
				this.camera.lookAt( this.assetManager.carBody.position );
				break;

			case 4: // Orbit Controls
				this.orbitControls.update();
				break;

			default:
				console.warn( `Unknown camera mode: ${this.cameraMode}` );
				break;

		}

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

			this.physicsWorker.postMessage( { cmd: 'keyUpAction', action: keysActions[ e.code ] } );
			e.preventDefault();
			e.stopPropagation();
			return false;

		}

	}

	keydown( e ) {

		if ( keysActions[ e.code ] ) {

			this.physicsWorker.postMessage( { cmd: 'keyDownAction', action: keysActions[ e.code ] } );
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

		this.stats = new Stats( {
			precision: 1,
			horizontal: false
		} );
		this.stats.init( this.renderer );
		this.stats.dom.style.position = 'absolute';
		this.stats.dom.style.top = '0px';
		this.stats.dom.style.left = '00px';
		document.body.appendChild( this.stats.dom );

		// this.rendererStats = new RendererStats();
		// this.rendererStats.domElement.style.position = 'absolute';
		// this.rendererStats.domElement.style.left = '0px';
		// this.rendererStats.domElement.style.top = '0px';
		// document.body.appendChild( this.rendererStats.domElement );

	}

}

export default TestDrive;
