'use strict';

import {
	EventDispatcher,
	TextureLoader,
	RepeatWrapping,
	MeshStandardMaterial,
	SRGBColorSpace,
	Group,
	LoadingManager
} from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import Terrain from './vendors/terrain/THREE.Terrain';
import { ScatterMeshes } from "./vendors/terrain/Scatter";
import Gaussian from "./vendors/terrain/gaussian";

class ImportAssets extends EventDispatcher {

	constructor( settings, scene, data ) {

		super();
		this.carBody = null;
		this.wheels = [];
		this.heightData = null;

		this.settings = settings;
		this.scene = scene;

		this.init( data );

	}

	async init( data ) {

		var loadingManager = new LoadingManager();

		await this._loadBaseParts( data.baseCar, loadingManager );
		const terrainObj = await this._loadLevel( data.levelData );
		this.heightData = await this._createHeightField( terrainObj.children[ 0 ].geometry, data.levelData );

		console.log( 'Environment, car and standard parts loaded' );

		this.carBody.position.x = data.levelData.car.origin[ 0 ];
		this.carBody.position.y = data.levelData.car.origin[ 1 ];
		this.carBody.position.z = data.levelData.car.origin[ 2 ];

		this.carBody.quaternion.x = data.levelData.car.orientation[ 0 ];
		this.carBody.quaternion.y = data.levelData.car.orientation[ 1 ];
		this.carBody.quaternion.z = data.levelData.car.orientation[ 2 ];
		this.carBody.quaternion.w = data.levelData.car.orientation[ 3 ];


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

	async _loadBaseParts( model, loadManager ) {

		var loader = new GLTFLoader( loadManager );
		const base = await loader.loadAsync( model.url );
		const data = base.scenes[ 0 ].children[ 0 ];

		this.decomposeParts( data, "Car" );

	}

	async _loadLevel( data ) {

		const heightmapImage = new Image();
		heightmapImage.src = data.map.heightMap;

		const loader = new TextureLoader();
		const t1 = await loader.loadAsync( './images/sand001.jpg' );
		const t2 = await loader.loadAsync( './images/GrassGreenTexture0002.jpg' );
		const t3 = await loader.loadAsync( './images/rock001.png' );
		const t4 = await loader.loadAsync( './images/snow1.jpg' );
		const t5 = await loader.loadAsync( './resources/data/events/alps/lake/road_upscaled.png' );

		t1.wrapS = t1.wrapT = RepeatWrapping;
		t2.wrapS = t2.wrapT = RepeatWrapping;
		t3.wrapS = t3.wrapT = RepeatWrapping;

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
		const seaLevel = data.map.seaLevel;
		terrainMaterial = Terrain.generateBlendedMaterial( [
			{ texture: t1 },
			{ texture: t2, levels: [ seaLevel, seaLevel + 2, 20, 40 ] },
			{ texture: t3, glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2' }, // between 27 and 45 degrees
			{ texture: t4, glsl: '1.0 - smoothstep(35.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 55.0, vPosition.z)' },
			{ texture: t5, glsl: '1.0 - texture2D( texture_4, MyvUv ).a' },

		], terrainMaterial );

		// var terrainMaterial2 = new MeshLambertMaterial( {
		// 	color: 0xffffff,
		// 	map: new TextureLoader().load( './resources/data/events/alps/lake/c.jpg' )
		// } );

		var terrainWidth = data.map.size[ 0 ];
		var terrainDepth = data.map.size[ 1 ];
		var terrainMaxHeight = data.map.heightRange[ 0 ];
		var terrainMinHeight = data.map.heightRange[ 1 ];

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

			seaLevel: data.map.seaLevel

		};

		var level = Terrain( o );

		//potential cause of offset in mesh layers
		Gaussian( level.children[ 0 ].geometry, o, 1, 11 );
		Terrain.Normalize( level.children[ 0 ], o );

		level.name = "TerrainVisible";
		this.scene.add( level );

		await this.buildTrees( level, terrainWidth - 1, terrainDepth - 1 );


		return level;

	}

	async buildTrees( level, width, depth ) {

		const loader = new GLTFLoader();
		const data = await loader.loadAsync( './resources/models/Folliage/tree.glb' );

		var geo = level.children[ 0 ].geometry;
		const tree = data.scenes[ 0 ].children[ 0 ];

		// Add randomly distributed foliage
		const params = {
			w: width,
			h: depth,
			mesh: tree,
			randomness: Math.random,
			spread: 0.001,
			smoothSpread: 0,
			sizeVariance: 0.1,
			maxSlope: 0.6283185307179586, // 36deg or 36 / 180 * Math.PI, about the angle of repose of earth
			maxTilt: Infinity,
			maxMeshes: 1000
		};

		var trees = ScatterMeshes( geo, params );
		level.add( trees );

	}

	_createHeightField( geometry, data ) {

		return {
			heightData: Terrain.toArray1D( geometry ),
			terrainWidth: data.map.size[ 0 ],
			terrainDepth: data.map.size[ 1 ],
			terrainMaxHeight: data.map.heightRange[ 0 ],
			terrainMinHeight: data.map.heightRange[ 1 ]
		};

	}

	decomposeParts( obj, name ) {

		this.wheels = [];
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

export default ImportAssets;
