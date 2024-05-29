export default class TerrainPhysics {

	constructor( Ammo, data ) {

		this.Ammo = Ammo;
		this.data = data;
		this.heightField = this.generateHeightField( data );
		this.body = this.generateRigidBody( data, this.heightField );

		this.destroy( data );

	}

	// source sin fuction plane ammojs git
	generateHeightField( data ) {

		var width = data.terrainWidth;
		var depth = data.terrainDepth;
		var height_max = data.terrainMaxHeight;
		var height_min = data.terrainMinHeight;
		var heightData = data.heightData;


		var upAxis = 1; // Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
		var hdt = "PHY_FLOAT"; // hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
		var heightScale = 1; // This parameter is not really used, since we are using PHY_FLOAT height data type and hence it is ignored
		var flipQuadEdges = false; // Set this to your needs (inverts the triangles)
		const ammoHeightData = this.Ammo._malloc( 4 * width * depth ); // Creates height data buffer in Ammo heap

		// Copy the javascript height data array to the Ammo one.
		var p = 0;
		var p2 = 0;
		for ( var j = 0; j < depth; j ++ ) {

			for ( var i = 0; i < width; i ++ ) {

				// write 32-bit float data to memory
				this.Ammo.HEAPF32[ ammoHeightData + p2 >> 2 ] = heightData[ p ];

				p ++;

				// 4 bytes/float
				p2 += 4;

			}

		}

		// Creates the heightfield physics shape
		var heightFieldShape = new this.Ammo.btHeightfieldTerrainShape(

			width,
			depth,

			ammoHeightData,

			heightScale,
			height_min,
			height_max,

			upAxis,
			hdt,
			flipQuadEdges
		);

		// Set horizontal scale
		// var scaleX = terrainWidthExtents / (terrainWidth - 1);
		// var scaleZ = terrainDepthExtents / (terrainDepth - 1);
		heightFieldShape.setLocalScaling( new this.Ammo.btVector3( 1, 1, 1 ) );

		heightFieldShape.setMargin( 0.05 );

		return heightFieldShape;

	}

	generateRigidBody( data, heightField ) {

		const groundMass = 0;
		const height = data.terrainMaxHeight + data.terrainMinHeight;

		const transform = new this.Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin( new this.Ammo.btVector3( 0, height, 0 ) ); // Shifts the terrain, since bullet re-centers it on its bounding box.

		const localInertia = new this.Ammo.btVector3( 0, 0, 0 );
		const motionState = new this.Ammo.btDefaultMotionState( transform );

		const constructionInfo = new this.Ammo.btRigidBodyConstructionInfo( groundMass, motionState, heightField, localInertia );

		const groundBody = new this.Ammo.btRigidBody( constructionInfo );

		return groundBody;

	}

	destroy( data ) {

		// this.Ammo._free( this.heightField );
		// this.Ammo._free( this.body );
		delete data.heightData; // free memory

	}


}
