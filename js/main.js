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
} from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { Water } from 'three/examples/jsm/objects/Water2';
import Stats from 'three/examples/jsm/libs/stats.module';
import RendererStats from './vendors/threex/threex.rendererstats';
import FrameManager from './FrameManager';

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
			antialias: true, // antialiasing
			toneMappingExposure: 1,
			fpsLimit: 50, // frame per second
			enableShadow: false,
			resolution: 0.25,

			postprocessing: false,

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

		this.assetManager = null;

		if ( this.tracker.analysis ) this.stats();

	}

	async loadGame( level, map, type ) {

		Cache.enabled = true;

		this.scene = new Scene();
		if ( this.tracker.exportScene == true ) window.scene = this.scene;

		this.renderer = new WebGLRenderer( {
			antialias: this.setting.antialias,
			alpha: false,
		} );

		this.renderer.setPixelRatio( window.devicePixelRatio * this.setting.resolution );
		this.renderer.setClearColor( new Color( 0x000000, 1.0 ) );

		this.canvas = this.renderer.domElement;
		this.data.container.appendChild( this.canvas );

		this.camera = new PerspectiveCamera( 45, this.canvas.width / this.canvas.height, 0.1, 5000 );

		this.onWindowResize();

		const gameData = await this.loadGameData( level, map, type );
		this.loadEnvironment( gameData );

		this.assetManager = new ImportAssets( this.setting, this.scene, gameData );
		this.frameManager = new FrameManager( this.renderer, this.scene, this.camera, {}, {}, {} );

		this.registerEventListeners();

	}

	async onPhysicsReady() {

		this.onGameReady();
		this.sceneReady = true;
		this.frameManager.initAnimateFrame( () => this.render() );
		this.frameManager.startAnimate();

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
			textureWidth: 1024,
			textureHeight: 1024
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

		if ( this.physics && this.physics.isReady ) this.physics.update();


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
				this.physics.cameraMode = this.physics.cameraMode == 3 ? 0 : this.physics.cameraMode + 1;
				break;
			case "r" || "R":
				this.physics.needsReset = true;
				break;

		}

	}

	onWindowResize() {

		this.canvas.height = this.canvas.parentElement.clientHeight;
		this.canvas.width = this.canvas.parentElement.clientWidth;
		this.postProcessor && this.postProcessor.composer.setSize( this.canvas.width, this.canvas.height );
		this.renderer.setSize( this.canvas.width, this.canvas.height );
		this.camera.aspect = this.canvas.width / this.canvas.height;
		this.camera.updateProjectionMatrix();

	}

	stats() {

		this.stats = new Stats();
		this.stats.dom.style.position = 'absolute';
		this.stats.dom.style.top = '0px';
		this.stats.dom.style.left = '80px';
		document.body.appendChild( this.stats.dom );
		this.rendererStats = new RendererStats();
		this.rendererStats.domElement.style.position = 'absolute';
		this.rendererStats.domElement.style.left = '0px';
		this.rendererStats.domElement.style.top = '0px';
		document.body.appendChild( this.rendererStats.domElement );

	}

}

export default TestDrive;
