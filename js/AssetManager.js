'use strict';

import {
	EventDispatcher,
	TextureLoader,
	RepeatWrapping,
	MeshStandardMaterial,
	SRGBColorSpace,
	Group,
	LoadingManager,
	Object3D,
	InstancedMesh,
} from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import Terrain from './vendors/terrain/Terrain';
// import { ScatterMeshes } from "./vendors/terrain/Scatter";
import Gaussian from "./vendors/terrain/gaussian";
import { fromFolliageMap, loadImageAsync, excludePoints } from './vendors/terrain/images';


class ImportAssets extends EventDispatcher {

	constructor( settings, camera, scene, data ) {

		super();
		this.carBody = null;
		this.wheels = [];
		this.heightData = null;

		this.settings = settings;
		this.scene = scene;
		this.camera = camera;

		this.init( data );

	}

	async init( data ) {

		var loadingManager = new LoadingManager();

		await this._loadBaseParts( data, loadingManager );
		const terrainObj = await this._loadLevel( data.levelData );
		this.heightData = await this._createHeightField( terrainObj.children[ 0 ].geometry, data.levelData );

		console.log( 'Environment, car and standard parts loaded' );

		this.dispatchEvent( { type: 'ready' } );

	}

	async _loadBaseParts( model, loadManager ) {

		var loader = new GLTFLoader( loadManager );
		const base = await loader.loadAsync( model.baseCar.url );
		const data = base.scenes[ 0 ].children[ 0 ];

		this.wheels = [];
		this.carBody = new Group();
		this.carBody.scale.set( 0.01, 0.01, 0.01 );
		this.carBody.name = "Original Chassis";
		this.carBody.position.fromArray( model.levelData.car.origin );
		this.carBody.quaternion.fromArray( model.levelData.car.orientation );
		this.carBody.updateMatrix();

		this.chaseCamMount = new Object3D();
		this.chaseCamMount.position.set( 0, 400, - 1000 );
		this.carBody.add( this.chaseCamMount );

		const wheelNames = [ "wheelFR", "wheelFL", "wheelRR", "wheelRL" ];

		var length = data.children.length;
		for ( let i = 0; i < length; i ++ ) {

			if ( wheelNames.includes( data.children[ i ].name ) ) {

				data.children[ i ].rotateZ( - Math.PI / 2 );
				data.children[ i ].name = "Original Wheel_" + i;
				data.children[ i ].scale.set( 0.01, 0.01, 0.01 );
				data.children[ i ].children.forEach( obj => obj.position.set( 0, - 68.5, 0 ) );
				this.wheels.push( data.children[ i ] );

			} else {

				this.carBody.add( data.children[ i ].clone() );

			}

		}

		this.scene.add( this.carBody );
		this.wheels.forEach( wheel => this.scene.add( wheel ) );

	}

	async _loadLevel( data ) {

		const heightmapImage = new Image();
		heightmapImage.src = data.map.heightMap;

		const loader = new TextureLoader();
		const t1 = await loader.loadAsync( './images/sand001.jpg' );
		const t2 = await loader.loadAsync( './images/GrassGreenTexture0002.jpg' );
		const t3 = await loader.loadAsync( './images/rock001.png' );
		const t4 = await loader.loadAsync( './images/snow1.jpg' );
		const t5 = await loader.loadAsync( data.map.trackMap );

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

		t5.anisotropy = 16;

		let terrainMaterial = new MeshStandardMaterial( {
			roughness: 1,
			metalness: 0,
			envMapIntensity: 0,
		} );
		const seaLevel = data.map.seaLevel;
		terrainMaterial = Terrain.generateBlendedMaterial( [
			{ texture: t1 },
			{ texture: t2, levels: [ seaLevel, seaLevel + 5, 20, 40 ] },
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
			heightmap: heightmapImage,
			material: terrainMaterial,
		};

		var level = Terrain( o );

		//potential cause of offset in mesh layers
		Gaussian( level.children[ 0 ].geometry, o, 1, 11 );
		Terrain.Normalize( level.children[ 0 ], o );

		level.name = "TerrainVisible";

		this.scene.add( level );

		await this.buildTrees( data, level, terrainWidth, terrainDepth );

		return level;

	}

	async buildTrees( data, level, width, depth ) {

		const loader = new GLTFLoader();
		const treeData = await loader.loadAsync( './resources/models/Folliage/tree.glb' );
		const folliagemapImage = await loadImageAsync( data.map.folliageMap );
		const maskMap = await loadImageAsync( data.map.trackMap );

		const tree = treeData.scenes[ 0 ].children[ 0 ];

		const posAttrib = level.children[ 0 ].geometry.getAttribute( 'position' );

		const blueNoiseSamples = fromFolliageMap( folliagemapImage, width, depth );
		let points = excludePoints( blueNoiseSamples, maskMap, width, depth );

		points = points.filter( ( point, i ) => {

			var x = Math.round( point[ 0 ] );
			var y = Math.round( point[ 1 ] );
			var idx = ( y * width + x ) * 3;

			// override the point generated by the blue noise sample points with the actual terrain coordinates.
			// Assuming the width and depth of the terrain is the same as the folliage map
			point[ 0 ] = posAttrib.array[ idx ];
			point[ 1 ] = posAttrib.array[ idx + 1 ];
			point[ 2 ] = posAttrib.array[ idx + 2 ];

			if ( point[ 2 ] < data.map.seaLevel ) return false;

			return point;

		} );

		console.log( 'tree points:', points.length );

		const sizeVariance = 0.5;
		const trees = new Object3D();
		trees.name = "Trees";

		var instanceMesh = new InstancedMesh( tree.geometry, tree.material, points.length );
		trees.add( instanceMesh );

		points.forEach( ( point, i ) => {

			var mesh = tree.clone();

			mesh.position.set( point[ 0 ], point[ 1 ], point[ 2 ] );
			mesh.rotation.x += 90 / 180 * Math.PI;
			mesh.rotateY( Math.random() * 2 * Math.PI );

			var variance = Math.random() * ( 2 * sizeVariance ) - sizeVariance;
			mesh.scale.x = mesh.scale.z = 1 + variance;
			mesh.scale.y += variance;

			mesh.updateMatrix();

			instanceMesh.setMatrixAt( i, mesh.matrix );

		} );

		level.add( trees );

		// // Add randomly distributed foliage
		// // const scope = this;
		// const params = {
		// 	w: width - 1,
		// 	h: depth - 1,
		// 	mesh: tree,
		// 	randomness: Math.random,
		// 	spread: ( v, k, fn, ai ) => this.sampler( v, k, points ), //(v, k) { return v.z > 0 && !(k % 4); }
		// 	// spread: 0.001,
		// 	smoothSpread: 0,
		// 	sizeVariance: 0.5,
		// 	maxSlope: 0.6283185307179586, // 36deg or 36 / 180 * Math.PI, about the angle of repose of earth
		// 	maxTilt: Infinity,
		// 	// maxMeshes: 1000,
		// 	seaLevel: data.map.seaLevel
		// };

		// var trees = ScatterMeshes( geo, params );
		// level.add( trees );

	}

	_createHeightField( geometry, data ) {

		return {
			heightData: Terrain.toArray1D( geometry.attributes.position.array ),
			terrainWidth: data.map.size[ 0 ],
			terrainDepth: data.map.size[ 1 ],
			terrainMaxHeight: data.map.heightRange[ 0 ],
			terrainMinHeight: data.map.heightRange[ 1 ]
		};

	}

}

export default ImportAssets;
