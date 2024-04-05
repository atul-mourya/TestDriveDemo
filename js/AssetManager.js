import {
	EventDispatcher,
	TextureLoader,
	RepeatWrapping,
	MeshLambertMaterial,
	MeshStandardMaterial,
	SRGBColorSpace,
	Group
} from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import Terrain from './vendors/terrain/THREE.Terrain';
import Gaussian from "./vendors/terrain/gaussian";

var baseUrl = null;
window.location.origin || ( window.location.origin = window.location.protocol + "//" + window.location.hostname + ( window.location.port ? ":" + window.location.port : "" ) ),
baseUrl = window.location.origin + getContextPath();
function getContextPath() {

	return window.context || "" === window.context ? window.context : window.location.pathname.substring( 0, window.location.pathname.indexOf( "/", 2 ) );

}

class ImportAssets extends EventDispatcher {

	constructor( settings, scene ) {

		super();
		this.carBody = null;

		this.storedMaterial = {};
		this.envMapComponent = [];
		this.wheels = [];
		this.level = null;
		this.reflectionCube = null;

		this.terrainObj = null;
		this.heightData = null;

		this.settings = settings;
		this.scene = scene;

		this.init();

	}

	async init() {

		const data = await fetch( baseUrl + "/resources/models/model_lookups.json" );
		const json = await data.json();

		if ( json.data.base_car ) {

			var loadingManager = new LoadingManager();

			await this._loadBaseParts( json.data.base_car, loadingManager ),
			await this._loadGameData( json.data.game_type, loadingManager ),

			await this._loadLevel();
			this.heightData = await this._createHeightField();

			console.log( 'Environment, car and standard parts loaded' );

			this.carBody.position.x = this.level.alps.lake.car.origin[ 0 ];
			this.carBody.position.y = this.level.alps.lake.car.origin[ 1 ];
			this.carBody.position.z = this.level.alps.lake.car.origin[ 2 ];

			this.carBody.quaternion.x = this.level.alps.lake.car.orientation[ 0 ];
			this.carBody.quaternion.y = this.level.alps.lake.car.orientation[ 1 ];
			this.carBody.quaternion.z = this.level.alps.lake.car.orientation[ 2 ];
			this.carBody.quaternion.w = this.level.alps.lake.car.orientation[ 3 ];


			// _this.camera.lookAt(_global.carBody.position);
			// _this.camera.position.set(-9,8,31);
			// var passes = [
			//     {   type: "msaa",
			//         config:{"sampleLevel":2}
			//     }
			// ];
			// if ( _this.setting.postprocessing && passes.length > 0){
			//     _global.msaaFilterActive = true;
			//     _global.postProcessor = new PostProcessingManager( data, _this.scene, _this.camera, _global.renderer, _this.container.clientWidth, _this.container.clientHeight, passes);
			// }

			this.dispatchEvent( { type: 'ready' } );

		}

	}

	async _loadBaseParts( model, loadManager ) {

		this.storedMaterial = {};
		this.envMapComponent = [];
		this.wheels = [];

		var loader = new GLTFLoader( loadManager );
		const base = await loader.loadAsync( baseUrl + model.url );
		const data = base.scenes[ 0 ].children[ 0 ];

		this.decomposeParts( data, "Car" );

	}

	async _loadGameData( json ) {

		const data = await fetch( baseUrl + json.events.url );
		this.level = await data.json();

	}

	async _loadLevel() {

		const scope = this;
		await new Promise( async ( resolve ) => {

			var heightmapImage = new Image();
			heightmapImage.src = baseUrl + this.level.alps.lake.map.heightMap;

			var sand;
			var loader = new TextureLoader();
			const t1 = await loader.loadAsync( './images/sand001.jpg' );
			const t2 = await loader.loadAsync( './images/GrassGreenTexture0002.jpg' );
			const t3 = await loader.loadAsync( './images/rock001.png' );
			const t4 = await loader.loadAsync( './images/snow1.jpg' );
			const t5 = await loader.loadAsync( baseUrl + '/resources/data/events/alps/lake/road_upscaled.png' );

			t1.wrapS = t1.wrapT = RepeatWrapping;
			t2.wrapS = t2.wrapT = RepeatWrapping;
			t3.wrapS = t3.wrapT = RepeatWrapping;
			// t5.wrapS = t3.wrapT = RepeatWrapping;

			t1.colorSpace = SRGBColorSpace;
			t2.colorSpace = SRGBColorSpace;
			t3.colorSpace = SRGBColorSpace;
			t4.colorSpace = SRGBColorSpace;
			t5.colorSpace = SRGBColorSpace;

			t1.repeat.x = t1.repeat.y = 200;
			t2.repeat.x = t2.repeat.y = 200;
			t3.repeat.x = t3.repeat.y = 20;

			let terrainMaterial = new MeshStandardMaterial( {
				roughness: 1,
				metalness: 0,
				envMapIntensity: 0,
			} );
			const seaLevel = this.level.alps.lake.map.seaLevel;
			terrainMaterial = Terrain.generateBlendedMaterial( [
				{ texture: t1 },
				{ texture: t2, levels: [ seaLevel, seaLevel + 2, 20, 40 ] },
				{ texture: t3, glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2' }, // between 27 and 45 degrees
				{ texture: t4, glsl: '1.0 - smoothstep(35.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 55.0, vPosition.z)' },
				{ texture: t5, glsl: '1.0 - texture2D( texture_4, MyvUv ).a' },

			], terrainMaterial );

			var terrainMaterial2 = new MeshLambertMaterial( {
				color: 0xffffff,
				map: new TextureLoader().load( baseUrl + '/resources/data/events/alps/lake/c.jpg' )
			} );

			var terrainWidth = scope.level.alps.lake.map.size[ 0 ];
			var terrainDepth = scope.level.alps.lake.map.size[ 1 ];
			var terrainMaxHeight = scope.level.alps.lake.map.heightRange[ 0 ];
			var terrainMinHeight = scope.level.alps.lake.map.heightRange[ 1 ];

			var o = {
				xSize: terrainWidth,
				ySize: terrainDepth,
				xSegments: terrainWidth - 1,
				ySegments: terrainDepth - 1,
				maxHeight: terrainMaxHeight,
				minHeight: terrainMinHeight,
				easing: Terrain.Linear,
				heightmap: heightmapImage,
				smoothing: 'Gaussian (1.0, 11)',
				optimization: Terrain.POLYGONREDUCTION,
				frequency: 2.5,
				steps: 1,
				stretch: true,
				turbulent: false,
				useBufferGeometry: false,
				material: terrainMaterial,

				//trees spread
				seaLevel: scope.level.alps.lake.map.seaLevel

			};

			var level = Terrain( o );

			//potential cause of offset in mesh layers
			Gaussian( level.children[ 0 ].geometry, o, 1, 11 );
			Terrain.Normalize( level.children[ 0 ], o );

			level.name = "TerrainVisible";
			scope.scene.add( level );
			scope.terrainObj = level;

			// Get the geometry of the terrain across which you want to scatter meshes
			var geo = level.children[ 0 ].geometry;
			let tree = await this.buildTree();
			// Add randomly distributed foliage
			var trees = Terrain.ScatterMeshes( geo, {
				mesh: tree,
				w: terrainWidth - 1,
				h: terrainDepth - 1,
				spread: 0.001,
				randomness: Math.random,
			} );
			level.add( trees );

			resolve();

		} );

	}

	async buildTree() {

		const loader = new GLTFLoader();
		const data = await loader.loadAsync( './resources/models/Folliage/tree.glb' );

		return data.scenes[ 0 ].children[ 0 ];

	}

	_createHeightField() {

		const scope = this;
		// await new Promise( ( resolve ) => {

		var heightmapImage = new Image();
		heightmapImage.src = baseUrl + scope.level.alps.lake.map.heightMap;

		var terrainWidth = scope.level.alps.lake.map.size[ 0 ];
		var terrainDepth = scope.level.alps.lake.map.size[ 1 ];
		var terrainMaxHeight = scope.level.alps.lake.map.heightRange[ 0 ];
		var terrainMinHeight = scope.level.alps.lake.map.heightRange[ 1 ];

		var params = {
			xSize: terrainWidth,
			ySize: terrainDepth,
			xSegments: terrainWidth - 1,
			ySegments: terrainDepth - 1,
			maxHeight: terrainMaxHeight,
			minHeight: terrainMinHeight,
			easing: Terrain.Linear,
			heightmap: heightmapImage,
			smoothing: 'Gaussian (1.0, 11)',
			optimization: Terrain.POLYGONREDUCTION,
			frequency: 2.5,
			steps: 1,
			stretch: true,
			turbulent: false,
			useBufferGeometry: false,

			//trees spread
			seaLevel: scope.level.alps.lake.map.seaLevel,
			spread: 0.2,
			scattering: 'Linear',

		};

		// terrainSetup(params, scene).then(function (output) {

		// scene.add(output.terrain);
		var heightData = Terrain.toArray1D( scope.terrainObj.children[ 0 ].geometry );
		// disposeObjMemory(output.terrain);

		var data = {
			heightData: heightData,
			terrainWidth: terrainWidth,
			terrainDepth: terrainDepth,
			terrainMaxHeight: terrainMaxHeight,
			terrainMinHeight: terrainMinHeight
		};


		// resolve( data );

		return data;
		// });

		// } );

	}

	decomposeParts( obj, name ) {

		this.carBody = new Group();
		this.carBody.name = name;

		const wheelNames = [ "wheelFR", "wheelFL", "wheelRR", "wheelRL" ];

		var length = obj.children.length;
		for ( var i = 0; i < length; i ++ ) {

			if ( wheelNames.includes( obj.children[ i ].name ) ) {

				this.wheels.push( obj.children[ i ] );

			} else {

				this.carBody.add( obj.children[ i ].clone() );

			}

		}


	}

}



function LoadingManager( onLoad, onProgress, onError ) {

	var scope = this;

	var isLoading = false;
	var itemsLoaded = 0;
	var itemsTotal = 0;
	var urlModifier;

	this.onStart = undefined;
	this.onLoad = onLoad;
	this.onProgress = onProgress;
	this.onError = onError;
	this.itemsStart = function ( numberOfItems ) {

		itemsTotal += numberOfItems;
		isLoading = true;

	};

	this.itemStart = function ( url ) {

		itemsTotal ++;

		if ( isLoading === false ) {

			if ( scope.onStart !== undefined ) {

				scope.onStart( url, itemsLoaded, itemsTotal );

			}

		}

		isLoading = true;

	};

	this.itemEnd = function ( url ) {

		itemsLoaded ++;

		if ( scope.onProgress !== undefined ) {

			scope.onProgress( url, itemsLoaded, itemsTotal );

		}

		if ( itemsLoaded === itemsTotal ) {

			isLoading = false;

			if ( scope.onLoad !== undefined ) {

				scope.onLoad();

			}

		}

	};

	this.itemError = function ( url ) {

		if ( scope.onError !== undefined ) {

			scope.onError( url );

		}

	};

	this.resolveURL = function ( url ) {

		if ( urlModifier ) {

			return urlModifier( url );

		}

		return url;

	};

	this.setURLModifier = function ( transform ) {

		urlModifier = transform;
		return this;

	};

}

export default ImportAssets;
