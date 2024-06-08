

import {
	EventDispatcher,
	TextureLoader,
	RepeatWrapping,
	MeshStandardMaterial,
	MeshBasicMaterial,
	SRGBColorSpace,
	Group,
	LoadingManager,
	Object3D,
	InstancedMesh,
	MathUtils,
	Matrix4,
	Euler,
	Vector3,
	Quaternion
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

		// interesting readings here: https://www.terrain.dk/

		const heightmapImage = new Image();
		heightmapImage.src = data.map.heightMap;

		const loader = new TextureLoader();
		const t1 = await loader.loadAsync( './images/sand001.jpg' );
		const t2 = await loader.loadAsync( './images/GrassGreenTexture0002.jpg' );
		const t3 = await loader.loadAsync( './images/rock001.png' );
		const t4 = await loader.loadAsync( './images/Snow.jpg' );
		const t5 = data.map.trackMap && await loader.loadAsync( data.map.trackMap );

		t1.wrapS = t1.wrapT = RepeatWrapping;
		t2.wrapS = t2.wrapT = RepeatWrapping;
		t3.wrapS = t3.wrapT = RepeatWrapping;

		t1.colorSpace = SRGBColorSpace;
		t2.colorSpace = SRGBColorSpace;
		t3.colorSpace = SRGBColorSpace;
		t4.colorSpace = SRGBColorSpace;
		t5 && ( t5.colorSpace = SRGBColorSpace );

		t1.repeat.x = t1.repeat.y = 200;
		t2.repeat.x = t2.repeat.y = 200;
		t3.repeat.x = t3.repeat.y = 20;

		t5 && ( t5.anisotropy = 16 );

		let terrainMaterial = new MeshBasicMaterial( {
			roughness: 1,
			metalness: 0,
			envMapIntensity: 0,
		} );
		const seaLevel = data.map.seaLevel;

		const blendParams = {
			baseTexture: t1,
			grassTexture: t2,
			grassBlendStart: seaLevel,
			grassBlendEnd: seaLevel + 5,
			grassTransitionStart: 20,
			grassTransitionEnd: 40,
			rockTexture: t3,
			rockSlopeStartAngle: MathUtils.degToRad( 27 ),
			rockSlopeEndAngle: MathUtils.degToRad( 45 ),
			snowTexture: t4,
			snowBlendStart: 20,
			snowBlendEnd: 40,
			trackTexture: t5,
			trackBlendStart: - 30,
			trackBlendEnd: 30
		};

		const blendData = [
			{ texture: blendParams.baseTexture },
			{
				texture: blendParams.grassTexture,
				levels: [
					blendParams.grassBlendStart,
					blendParams.grassBlendEnd,
					blendParams.grassTransitionStart,
					blendParams.grassTransitionEnd
				]
			},
			{
				texture: blendParams.rockTexture,
				glsl: `slope > ${blendParams.rockSlopeEndAngle} ? 0.2 : 1.0 - smoothstep(${blendParams.rockSlopeStartAngle}, ${blendParams.rockSlopeEndAngle}, slope) + 0.2`
			},
			{
				texture: blendParams.snowTexture,
				glsl: `1.0 - smoothstep(${blendParams.snowBlendStart}.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, ${blendParams.snowBlendEnd}.0, vPosition.z)`
			},
		];

		t5 && blendData.push( { texture: t5, glsl: '1.0 - texture2D( texture_4, MyvUv ).a' } );

		terrainMaterial = Terrain.generateBlendedMaterial( blendData, terrainMaterial );
		// terrainMaterial.wireframe = true;

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
			xSegments: ( terrainWidth / 1 ) - 1,
			ySegments: ( terrainDepth / 1 ) - 1,
			maxHeight: terrainMaxHeight,
			minHeight: terrainMinHeight,
			heightmap: heightmapImage,
			material: terrainMaterial,
		};

		var level = Terrain( o );

		//potential cause of offset in mesh layers
		Gaussian( level.children[ 0 ].geometry, o, data.map.blurFilter.standarDeviation, data.map.blurFilter.kernelSize );
		Terrain.Normalize( level.children[ 0 ], o );

		level.name = "TerrainVisible";

		this.scene.add( level );

		if ( data.map.folliageMap ) {

			await this.buildTrees( data, level, terrainWidth, terrainDepth );

		}

		return level;

	}

	async buildTrees( data, level, width, depth ) {

		const loader = new GLTFLoader();
		const treeData = await loader.loadAsync( './resources/models/Folliage/TreeCollection.glb' );
		const folliagemapImage = await loadImageAsync( data.map.folliageMap );
		const maskMap = await loadImageAsync( data.map.trackMap );

		const treeCollection = treeData.scenes[ 0 ].children[ 0 ];
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

		const pointGroups = this.distributePoints( points, treeCollection.children.length, 100, 400 );

		const minHeight = 0.5; // Minimum scale height
		const maxHeight = 3; // Maximum scale height
		const trees = new Object3D();
		trees.name = "Trees";

		const instanceMeshes = treeCollection.children.map( ( tree, index ) => {

			tree.material.transparent = false;
			const instancedMesh = new InstancedMesh( tree.geometry, tree.material, points.length );
			instancedMesh.name = `Tree${index}`;
			trees.add( instancedMesh );
			return instancedMesh;

		} );

		pointGroups.forEach( ( pointGroup, i ) => {

			const instanceMesh = instanceMeshes[ i ];
			pointGroup.forEach( ( point, j ) => {

				const matrix = new Matrix4();
				const position = new Vector3( point[ 0 ], point[ 1 ], point[ 2 ] );
				const rotation = new Euler( Math.PI / 2, Math.random() * 2 * Math.PI, 0 ); // Rotate around Y-axis
				const randomHeight = Math.random() * ( maxHeight - minHeight ) + minHeight;
				const scale = new Vector3( randomHeight, randomHeight, randomHeight );

				// Apply transformations to the matrix
				matrix.compose( position, new Quaternion().setFromEuler( rotation ), scale );

				// Set the transformation matrix for the instance
				instanceMesh.setMatrixAt( j, matrix );

			} );

			instanceMeshes.forEach( ( mesh ) => mesh.instanceMatrix.needsUpdate = true );

			level.add( trees );

		} );

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

	/**
	 * points array;
		x:  Number of groups
		a: Minimum number of points per group
		b: Maximum number of points per group
	*/
	distributePoints( points, x, a, b ) {

		// Helper function to generate a random integer between min and max (inclusive)
		function getRandomInt( min, max ) {

			return Math.floor( Math.random() * ( max - min + 1 ) ) + min;

		}

		// Helper function to shuffle an array
		function shuffleArray( array ) {

			for ( let i = array.length - 1; i > 0; i -- ) {

				const j = Math.floor( Math.random() * ( i + 1 ) );
				[ array[ i ], array[ j ] ] = [ array[ j ], array[ i ] ]; // Swap elements

			}

		}

		// Shuffle the points array to ensure random distribution
		shuffleArray( points );

		// Initialize the result array to hold x groups
		let groups = Array.from( { length: x }, () => [] );

		// Track the current index in the shuffled points array
		let index = 0;

		// Loop over each group to assign points randomly
		for ( let i = 0; i < x; i ++ ) {

			// Calculate the remaining number of groups
			let remainingGroups = x - i;

			// Determine the maximum number of points that can be assigned to this group
			let maxPointsForGroup = Math.min( b, points.length - index - ( remainingGroups - 1 ) * a );

			// Determine the minimum number of points that can be assigned to this group
			let minPointsForGroup = Math.max( a, points.length - index - ( remainingGroups - 1 ) * b );

			// Randomly determine the number of points to assign to this group
			let groupSize = getRandomInt( minPointsForGroup, maxPointsForGroup );

			// Assign the points to the current group
			groups[ i ] = points.slice( index, index + groupSize );

			// Update the index to the next set of points
			index += groupSize;

		}

		return groups;

	}

}

export default ImportAssets;
