import ImportAssets from './AssetManager';
import Physics from './Physics/physics';
import {
	WebGLRenderer,
	TextureLoader,
	Clock,
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

function isElement( obj ) {

	try {

		return obj instanceof HTMLElement;

	} catch ( e ) {

		return ( typeof obj === "object" ) && ( obj.nodeType === 1 ) && ( typeof obj.style === "object" ) && ( typeof obj.ownerDocument === "object" );

	}

}

var TestDrive = function ( data, loadingManager, onGameReady ) {

	var _this = this;
	var container = data.container;

	var _global = {
		data: data,
		loadingManager: loadingManager,
		bodyColoredParts: {},
		standardParts: {},
		environmentParts: {},
		carBody: null,
		sceneReady: false,
		ultraHD: false
	};

	if ( container ) {

		if ( ! isElement( container ) ) {

			this.container = document.getElementById( container );
			if ( this.container == null ) {

				container = document.createElement( 'div' );
				document.body.appendChild( container );
				this.container = container;

			}

		} else {

			this.container = container;

		}

	} else {

		container = document.createElement( 'div' );
		document.body.appendChild( container );
		this.container = container;

	}

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
		fogEffectOnCar: false,
		physicallyCorrectLights: false, // for more realistic lighting at cost of computation
		toneMappingExposure: 1,
		fpsLimit: 50, // frame per second
		enableShadow: false,
		resolution: 0.25,

		postprocessing: false,

		// initial control button status
		nightMode: false, // default night mode switch button status  **rework needed**
		hasNightMode: false, // need to grab this from database          **rework needed**
	};

	var tracker = {
		analysis: true,
		pan: true,
		exportScene: true
	};

	this.loadGame = async function ( level, map, type ) {

		Cache.enabled = true;

		_initScene();
		_initRenderer();
		_initCamera();

		// _initControls();
		_this.gameData = await _loadGameData( level, map, type );
		_initAssetManager( _this.gameData );

		_registerEventListeners();

	};

	function _initScene() {

		_this.scene = new Scene();
		_this.scene.name = "Scene";
		_animateFrame();

		if ( tracker.exportScene == true ) window.scene = _this.scene;

	}

	function _initRenderer() {

		_global.renderer = new WebGLRenderer( {
			antialias: _this.setting.antialias,
			alpha: false,
		} );

		_global.renderer.setPixelRatio( window.devicePixelRatio * _this.setting.resolution );
		_global.renderer.setClearColor( new Color( 0x000000, 1.0 ) );

		_global.canvas = _global.renderer.domElement;
		_global.canvas.style.position = "absolute";
		_global.canvas.style.top = "0px";
		_global.canvas.style.zIndex = 0;
		_global.canvas.height = _this.container.clientHeight;
		_global.canvas.width = _this.container.clientWidth;

		_global.renderer.setSize( _global.canvas.width, _global.canvas.height );

		_this.container.appendChild( _global.canvas );

		if ( tracker.analysis ) _stats();

		_stopAnimate();

	}

	function _initCamera() {

		_this.camera = new PerspectiveCamera( 45, _global.canvas.width / _global.canvas.height, 0.1, 5000 );

	}

	function _initAssetManager( data ) {

		_global.sceneReady = false;

		const assetManager = new ImportAssets( _this.setting, _this.scene, data );
		assetManager.addEventListener( 'ready', async () => {

			Ammo().then( ( Ammo ) => {

				_global.level = assetManager.level;
				_this.physics = new Physics( Ammo, _this.scene, assetManager.carBody, assetManager.wheels, _this.camera, assetManager.heightData, onPhysicsReady );

			} );

		} );

	}

	var onPhysicsReady = async function () {

		await _loadEnvironment();
		onGameReady();
		_this.sceneReady = true;
		_startAnimate();

	};

	async function _loadGameData( level, map, type ) {

		const lookups = await fetch( location.href + "resources/models/model_lookups.json" );
		const lookupData = await lookups.json();

		const response = await fetch( location.href + lookupData.game_type[ type ].url );
		const levelData = await response.json();

		return { baseCar: lookupData.base_car, levelData: levelData[ level ][ map ] };

	}

	async function _loadEnvironment() {

		const pmremGenerator = new PMREMGenerator( _global.renderer );
		pmremGenerator.compileEquirectangularShader();
		var rgbe_loader = new RGBELoader();
		const texture = await rgbe_loader.loadAsync( "./images/cannon_2k.hdr" );
		texture.colorSpace = LinearSRGBColorSpace;
		const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
		_this.scene.environment = envMap;
		texture.dispose();
		pmremGenerator.dispose();

		_this.scene.background = _this.scene.environment;
		_this.scene.environmentIntensity = 1;

		_global.renderer.toneMapping = ACESFilmicToneMapping;
		_global.renderer.toneMappingExposure = 0.85;

		const water = new Water( new PlaneGeometry( 16384 + 1024, 16384 + 1024, 16, 16 ), {
			color: new Color( 0xc7cbc6 ),
			scale: 100,
			flowDirection: new Vector2( 0.65, 0.65 ),
			normalMap0: new TextureLoader().load( './images/Water_1_M_Normal.jpg' ),
			normalMap1: new TextureLoader().load( './images/Water_2_M_Normal.jpg' ),
			textureWidth: 1024,
			textureHeight: 1024
		} );
		water.position.y = _this.gameData.levelData.map.seaLevel;
		water.rotation.x = - 0.5 * Math.PI;
		water.name = 'Water';
		_this.scene.add( water );

		const directionalLight = new DirectionalLight( 0xffffff, 1 * Math.PI );
		directionalLight.position.set( 1, 1, 1 ).normalize(); // set the direction
		_this.scene.add( directionalLight );

	}

	function _render() {

		// _this.scene.updateMatrix();
		// _this.camera.updateProjectionMatrix();
		if ( _this.physics && _this.physics.isReady ) _this.physics.update();
		// if(_this.setting.postprocessing && _global.postProcessor && _global.postProcessor.composer && _global.msaaFilterActive ) {
		//     _global.postProcessor.update();
		// } else {
		_global.renderer.render( _this.scene, _this.camera );
		// }

	}

	function _startAnimate() {

		_global.doAnimate = true;

	}

	function _stopAnimate() {

		_global.doAnimate = false;

	}

	function _animateFrame() {

		// setTimeout( function () {

		requestAnimationFrame( _animateFrame );

		// }, 1000 / _this.setting.fpsLimit );


		if ( _this.sceneReady && _global.doAnimate == true ) {

			// _this.controls.update();
			if ( tracker.analysis ) {

				// _this.rendererStats.update( _global.renderer );
				_this.stats.update();

			}

			_render();

		}

	}

	function _refreshRenderFrame() {

		_startAnimate();
		clearTimeout( _global.canvas.renderFrameTimeoutObj );
		_global.canvas.renderFrameTimeoutObj = setTimeout( function () {

			_stopAnimate();

		}, 1000 );

	}

	function _registerEventListeners() {

		// var targetWindow = [];
		// if(window.self !== window.top){
		//     targetWindow = [window.parent, window];
		// } else {
		//     targetWindow = [window];
		// }

		// targetWindow.forEach(function(element){
		//     _keyPressEvent(element);
		// });
		_keyPressEvent( window );


		// window.focus();
		window.addEventListener( 'resize', _onWindowResize, false );

		// $(window).focus(function() {
		//     _refreshRenderFrame();
		// });
		// $(window).blur(function() {
		//     _stopAnimate();
		// });

	}

	function _keyPressEvent( element ) {

		element.addEventListener( 'keypress', function ( event ) {

			var x = event.key;
			switch ( x ) {

				case "h" || "H":
					! _global.ultraHD ? _global.ultraHD = true : _global.ultraHD = false;
					console.warn( 'UltraHD set to ' + _global.ultraHD + '. Performance may reduce if UltraHD is enabled. Toggle by pressing key H' );
					_this.experimentalHD( _global.ultraHD );
					break;
				case "j" || "J":
					if ( _global.postProcessor ) {

						if ( ! _global.msaaFilterActive ) {

							_this.setting.antialias = false;
							_recreateRendererContext();
							_global.postProcessor.composer.renderer = _global.renderer;
							_refreshRenderFrame();
							_global.msaaFilterActive = true;

						} else {

							_this.setting.antialias = true;
							_recreateRendererContext();
							_global.postProcessor.composer.renderer = _global.renderer;
							_refreshRenderFrame();
							_global.msaaFilterActive = false;

						}

						console.warn( 'MSAA Quality set to ' + _global.msaaFilterActive + '. Performance may reduce if MSAA Quality is enabled. Toggle by pressing key J' );

					} else {

						console.warn( "Post Processing is enabled but no passes assigned. Ignoring this event." );

					}

					break;
				case "c" || "C":
					_this.physics.cameraMode = _this.physics.cameraMode == 3 ? 0 : _this.physics.cameraMode + 1;
					break;
				case "r" || "R":
					_this.physics.needsReset = true;
					break;

			}

		} );

	}

	function _recreateRendererContext() {

		_global.renderer.dispose();
		_global.renderer.forceContextLoss();
		_global.renderer.context = undefined;
		var targetDOM = _global.renderer.domElement;
		targetDOM.parentNode.removeChild( targetDOM );
		_initRenderer();

	}

	function _onWindowResize() {

		_global.canvas.height = _this.container.clientHeight;
		_global.canvas.width = _this.container.clientWidth;
		_global.postProcessor && _global.postProcessor.composer.setSize( _global.canvas.width, _global.canvas.height );
		_global.renderer.setSize( _global.canvas.width, _global.canvas.height );
		_this.camera.aspect = _global.canvas.width / _global.canvas.height;

		// _refreshRenderFrame();

	}

	function _stats() {

		_this.stats = new Stats();
		_this.stats.dom.style.position = 'absolute';
		_this.stats.dom.style.top = '0px';
		_this.stats.dom.style.left = '80px';
		document.body.appendChild( _this.stats.dom );
		_this.rendererStats = new RendererStats();
		_this.rendererStats.domElement.style.position = 'absolute';
		_this.rendererStats.domElement.style.left = '0px';
		_this.rendererStats.domElement.style.top = '0px';
		document.body.appendChild( _this.rendererStats.domElement );

	}

};

export default TestDrive;
