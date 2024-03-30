import ImportAssets from './AssetManager';
import Physics from './physics';
import {
	WebGLRenderer,
	TextureLoader,
	Clock,
	Cache,
	Scene,
	Color,
	Fog,
	PerspectiveCamera,
	PlaneGeometry,
	LinearFilter,
	Mesh,
	SphereGeometry,
	MeshBasicMaterial,
	Vector2,
	DirectionalLight,
	AmbientLight,
	BackSide
} from 'three';
import { Water } from 'three/examples/jsm/objects/Water2';
// import Terrain from './vendors/terrain/THREE.Terrain';
// import { Reflector } from 'three/examples/jsm/objects/Reflector';
// import { Refractor } from 'three/examples/jsm/objects/Refractor';
function isElement( obj ) {

	try {

		return obj instanceof HTMLElement;

	} catch ( e ) {

		return ( typeof obj === "object" ) && ( obj.nodeType === 1 ) && ( typeof obj.style === "object" ) && ( typeof obj.ownerDocument === "object" );

	}

}

var AbstractTestDrive = function ( data, loadingManager, scripts, onGameReady ) {

	var _this = this;
	var container = data.container;

	var _global = {
		data: data,
		loadingManager: loadingManager,
		bodyColoredParts: {},
		standardParts: {},
		baseParts: {},
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
		toneMappingWhitePoint: 1,
		rendererGammaInput: true,
		rendererGammaOutput: true,
		fpsLimit: 30, // frame per second
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

	this.initSceneSetup = async function () {

		await _setup();
		await _init();

	};

	function _setup() {

		var scriptLoader = new ScriptLoader();
		return new Promise( function ( resolve, reject ) {

			scriptLoader.load( data.cdn, scripts ).then( function () {

				console.log( 'scripts are loaded' );
				_global.client = new ClientJS();
				_global.clock = new Clock();
				resolve();

			} ).catch( e => {

				console.log( "Error", e );

			} );

		} );

	}

	function _init() {

		Cache.enabled = true;
		_initScene();
		_initRenderer();
		_initCamera();
		// _initControls();
		// _importAssets();
		_initAssetManager();

		_registerEventListeners();

	}

	function _initScene() {

		_this.scene = new Scene();
		_this.scene.name = "Scene";
		_this.scene.background = new Color( 0xffffff );
		_this.scene.fog = new Fog( 0, 0.1, 0 );
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

	}

	function _initCamera() {

		_this.camera = new PerspectiveCamera( 45, _global.canvas.width / _global.canvas.height, 0.1, 5000 );
		// _this.camera.lookAt(0, _this.setting.ground_clearence, 0);

	}

	function _initAssetManager() {

		const assetManager = new ImportAssets( _this.setting, _this.scene );
		assetManager.addEventListener( 'ready', () => {

			_global.sceneReady = true;

			_global.level = assetManager.level;
			_this.physics = new Physics( assetManager.envMeshes, assetManager.carBody, assetManager.wheels, _this.camera, assetManager.heightData, onPhysicsReady );
			_this.sceneReady = true;
			_refreshRenderFrame();

		} );

	}

	var onPhysicsReady = function () {

		// _loadLevel().then(function () {
		_loadEnvironment();
		onGameReady();
		// });

	};

	function _loadEnvironment() {

		new TextureLoader().load( './images/sky1.jpg', function ( t1 ) {

			t1.minFilter = LinearFilter; // Texture is not a power-of-two size; use smoother interpolation.
			const skyDome = new Mesh(
				new SphereGeometry( 8192, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5 ),
				new MeshBasicMaterial( {
					map: t1,
					side: BackSide,
					fog: false
				} )
			);
			skyDome.position.y = - _global.level.alps.lake.map.seaLevel;
			skyDome.scale.set( 0.5, 0.5, 0.5 );
			skyDome.name = "Sky Dome";
			_this.scene.add( skyDome );

		} );

		// water = new THREE.Mesh(
		//     new THREE.PlaneBufferGeometry(16384 + 1024, 16384 + 1024, 16, 16),
		//     new THREE.MeshBasicMaterial({
		//         color: 0x006ba0,
		//         transparent: true,
		//         opacity: 0.6
		//     })
		// );
		const water = new Water( new PlaneGeometry( 16384 + 1024, 16384 + 1024, 16, 16 ), {
			color: new Color( 0xffffff ),
			scale: 100,
			flowDirection: new Vector2( 0, 0 ),
			normalMap0: new TextureLoader().load( './images/Water_1_M_Normal.jpg' ),
			normalMap1: new TextureLoader().load( './images/Water_2_M_Normal.jpg' ),
			textureWidth: 1024,
			textureHeight: 1024
		} );
		water.position.y = _global.level.alps.lake.map.seaLevel;
		water.rotation.x = - 0.5 * Math.PI;
		water.name = 'Water';
		_this.scene.add( water );

		const skyLight = new DirectionalLight( 0xe8bdb0, 1.5 );
		skyLight.position.set( 2950, 2625, - 160 );
		skyLight.name = "Sun Light";

		_this.scene.add( skyLight );

		var light = new AmbientLight( 0x888888 );
		_this.scene.add( light );

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

		if ( ! _global.doAnimate ) {

			_global.doAnimate = true;

		}

	}

	function _stopAnimate() {

		_global.doAnimate = false;

	}

	function _animateFrame() {

		setTimeout( function () {

			requestAnimationFrame( _animateFrame );

		}, 1000 / _this.setting.fpsLimit );


		if ( _this.sceneReady && ( _global.doAnimate == true || _this.setting.userControlledAimation == true ) ) {

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
		_this.rendererStats = new THREEx.RendererStats();
		_this.rendererStats.domElement.style.position = 'absolute';
		_this.rendererStats.domElement.style.left = '0px';
		_this.rendererStats.domElement.style.top = '0px';
		document.body.appendChild( _this.rendererStats.domElement );

	}

};

const TestDrive = function ( data, loadingManager, onGameReady ) {

	var scripts = [
		[
			// "/js/vendors/threejs/r90/three.js",
			"/js/vendors/ammo/ammo.js",
		],
		[
			// "/js/vendors/terrain/THREE.Terrain.js",
			// "/js/vendors/threejs/r90/js/libs/Reflector.js",
			// "/js/vendors/threejs/r90/js/libs/Refractor.js",
			// "/js/vendors/threejs/r90/js/libs/Water2.js",
		],
		[
			// "/js/vendors/terrain/weightedBoxBlurGaussian.js",
			// "/js/vendors/terrain/gaussian.js",
			// "/js/vendors/terrain/brownian.js",
			// "/js/vendors/terrain/worley.js",
		],
		// [

		// 	"/js/terrain2.js",

		// ],
		[
			// "/js/physics.js",
			"/js/vendors/threex/threex.rendererstats.js",
			"/js/vendors/threejs/r90/js/libs/stats.min.js",
			"/js/vendors/clientjs/client.min.js",

		],
		[
			"/js/PostProcessor.js"
		]
	];
	AbstractTestDrive.call( this, data, loadingManager, scripts, onGameReady );

};

TestDrive.prototype = Object.create( AbstractTestDrive.prototype );
TestDrive.prototype.constructor = TestDrive;


function ScriptLoader() {

	function _add( basepath, urls, loadingManager ) {

		var promises = [];
		if ( urls && urls.length > 0 ) {

			for ( var i in urls ) {

				( function ( url ) {

					var promise = new Promise( function ( resolve, reject ) {

						loadingManager && urls && loadingManager.itemStart( url );
						var script = document.createElement( 'script' );
						script.src = url;

						script.addEventListener( 'load', function () {

							loadingManager && loadingManager.itemEnd( url );
							console.log( "Loaded: " + url );
							resolve( url );

						}, false );

						script.addEventListener( 'error', function () {

							console.log( "Error: " + url );
							loadingManager && loadingManager.itemEnd( url );
							reject( url );

						}, false );

						document.body.appendChild( script );

					} );

					promises.push( promise );

				} )( basepath + urls[ i ] );

			}

		}

		return promises;

	}

	this.load = function ( basepath, urls, loadingManager ) {

		var promise = null;
		basepath = ! basepath ? "" : basepath;
		if ( urls && urls.length > 0 ) {

			for ( var i in urls ) {

				( function ( basepath, item ) {

					if ( promise ) {

						promise = promise.then( function () {

							console.log( 'loaded' );
							return Promise.all( _add( basepath, item, loadingManager ) );

						} );

					} else {

						promise = Promise.all( _add( basepath, item, loadingManager ) );

					}

				} )( basepath, urls[ i ] );

			}

		}

		console.log( promise );
		// loadingManager && urls && loadingManager.itemsStart(urls.length);
		// var promises = _add(urls,loadingManager);
		// console.log(promises);
		return promise;

	};

}

export default TestDrive;
