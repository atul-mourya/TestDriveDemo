'use strict';

import {
	EventDispatcher,
	TextureLoader,
	RepeatWrapping,
	MeshStandardMaterial,
	SRGBColorSpace,
	Group,
	LoadingManager,
	Raycaster,
	Object3D,
	InstancedMesh,
	OrthographicCamera,
	BufferGeometry,
	Mesh,
	Vector3
} from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import Terrain from './vendors/terrain/Terrain';
import { ScatterMeshes } from "./vendors/terrain/Scatter";
import Gaussian from "./vendors/terrain/gaussian";
import { fromFolliageMap, loadImageAsync, excludePoints } from './vendors/terrain/images';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
// Add the extension functions
BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
Mesh.prototype.raycast = acceleratedRaycast;

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
			heightmap: heightmapImage,
			material: terrainMaterial,
		};

		var level = Terrain( o );

		//potential cause of offset in mesh layers
		Gaussian( level.children[ 0 ].geometry, o, 1, 11 );
		Terrain.Normalize( level.children[ 0 ], o );

		level.name = "TerrainVisible";

		level.children[ 0 ].geometry.computeBoundsTree( { lazyGeneration: false } );

		this.scene.add( level );

		await this.buildTrees( data, level, terrainWidth, terrainDepth );

		return level;

	}

	async buildTrees( data, level, width, depth ) {

		const loader = new GLTFLoader();
		const treeData = await loader.loadAsync( './resources/models/Folliage/tree.glb' );
		const folliagemapImage = await loadImageAsync( data.map.folliageMap );
		const excludemapImage = await loadImageAsync( data.map.trackMap );

		const tree = treeData.scenes[ 0 ].children[ 0 ];
		var geo = level.children[ 0 ].geometry;

		const posAttrib = geo.getAttribute( 'position' );
		const options = {
			xSegments: width,
			ySegments: depth,
			folliagemap: folliagemapImage,
			exclusionmap: excludemapImage,
		};
		const rawPoints = fromFolliageMap( posAttrib.array, options );
		// const points = excludePoints( rawPoints, options );

		const raycaster = new Raycaster();
		const origin = new Vector3();
		const direction = new Vector3( 0, 0, - 1 );
		let toBeIncluded = true;

		const points = rawPoints.filter( point => {

			origin.set( point.x, point.y, point.z );
			raycaster.set( origin, direction );
			raycaster.firstHitOnly = true;
			const intersects = raycaster.intersectObject( level.children[ 0 ], true );
			if ( intersects.length > 0 ) {

				const p = intersects[ 0 ].point;
				point.z = p.z;
				toBeIncluded = true;

			}

			if ( point.z < data.map.seaLevel ) {

				toBeIncluded = false;

			} else {

				toBeIncluded = true;

			}

			return toBeIncluded;

		} );

		console.log( 'Points:', points.length );

		const sizeVariance = 0.1;
		const trees = new Object3D();
		trees.name = "Trees";

		let dummy = tree;

		var instanceMesh = new InstancedMesh( tree.geometry, tree.material, points.length );
		trees.add( instanceMesh );

		points.forEach( ( point, i ) => {

			var mesh = dummy.clone();

			mesh.position.set( point.x, point.y, point.z );
			mesh.rotation.x += 90 / 180 * Math.PI;
			mesh.rotateY( Math.random() * 2 * Math.PI );

			var variance = Math.random() * ( 2 * sizeVariance ) - sizeVariance;
			mesh.scale.x = mesh.scale.z = 1 + variance;
			mesh.scale.y += variance;

			mesh.updateMatrix();

			instanceMesh.setMatrixAt( i, mesh.matrix );

		} );

		level.add( trees );


		// var canvas = document.createElement( 'canvas' );
		// let context = canvas.getContext( '2d' );
		// let cols = width;
		// let rows = depth;
		// canvas.width = cols;
		// canvas.height = rows;
		// context.drawImage( folliagemapImage, 0, 0, canvas.width, canvas.height );
		// var folliagemapImageData = context.getImageData( 0, 0, canvas.width, canvas.height ).data;


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
