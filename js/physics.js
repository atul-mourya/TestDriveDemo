import {
	Quaternion,
	MeshPhongMaterial,
	Clock,
	Vector3,
	Object3D,
	BoxGeometry,
	CylinderGeometry,
	Mesh,
	PlaneGeometry
} from 'three';

var Physics = function ( trackObjs, chassis, wheels, camera, terrainData, onPhysicsReady ) {

	window.wheels = wheels;
	const _this = this;
	Ammo().then( function ( Ammo ) {

		var DISABLE_DEACTIVATION = 4;
		var TRANSFORM_AUX = new Ammo.btTransform();
		var ZERO_QUATERNION = new Quaternion( 0, 0, 0, 1 );

		var materialDynamic = new MeshPhongMaterial( {
			color: 0xfca400
		} );
		var materialStatic = new MeshPhongMaterial( {
			color: 0x999999,
			opacity: 0.1
		} );
		var materialInteractive = new MeshPhongMaterial( {
			color: 0x990000
		} );

		var terrainWidth = terrainData.terrainWidth;
		var terrainDepth = terrainData.terrainDepth;
		var terrainMaxHeight = terrainData.terrainMaxHeight;
		var terrainMinHeight = terrainData.terrainMinHeight;

		var ammoHeightData = null;

		var clock = new Clock();

		// Physics variables
		var collisionConfiguration;
		var dispatcher;
		var broadphase;
		var solver;
		var physicsWorld;

		var syncList = [];
		var time = 0;
		var objectTimePeriod = 3;
		var timeNextSpawn = time + objectTimePeriod;
		var maxNumObjects = 30;

		var _global = {
			testMe: {}
		};

		// Keybord actions
		var actions = {};
		var keysActions = {
			"KeyW": 'acceleration',
			"KeyS": 'braking',
			"KeyA": 'left',
			"KeyD": 'right'
		};

		var speedometer = document.createElement( 'p' );
		speedometer.style.position = 'absolute';
		speedometer.style.bottom = '0px';
		speedometer.style.left = '0px';
		document.body.appendChild( speedometer );

		function initGraphics() {

			window.addEventListener( 'keydown', keydown );
			window.addEventListener( 'keyup', keyup );

		}


		function initPhysics() {

			// Physics configuration
			collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
			dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
			broadphase = new Ammo.btDbvtBroadphase();
			solver = new Ammo.btSequentialImpulseConstraintSolver();
			physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
			physicsWorld.setGravity( new Ammo.btVector3( 0, - 9.75, 0 ) );

		}

		window.camera = camera;
		window.chassis = chassis;

		_this.cameraMode = 3;

		var temp = new Vector3();
		var goal = new Object3D();
		goal.position.set( 0, 400, - 1000 );
		var rotationQuaternion = new Quaternion();

		function updateCamera() {

			switch ( _this.cameraMode ) {

				case 0:
					temp.copy( chassis.position );
					camera.position.lerp( temp, 0.2 );
					camera.lookAt( chassis.position.x, chassis.position.y, chassis.position.z - 20 );
					break;
				case 1:

					camera.quaternion.copy( chassis.quaternion );
					rotationQuaternion.setFromAxisAngle( temp.set( 0, 1, 0 ), Math.PI );
					camera.quaternion.multiply( rotationQuaternion );
					camera.position.copy( chassis.position ).add( temp.set( - 0.7, 2, 1 ) );

					break;
				case 2:
					camera.position.set( chassis.position.x + 20, chassis.position.y + 6, chassis.position.z );
					camera.lookAt( chassis.position );
					break;
				case 3:
					temp.setFromMatrixPosition( goal.matrixWorld );
					camera.position.lerp( temp, 0.05 );
					camera.lookAt( chassis.position );
					break;

			}

		}

		_this.reset = function () {

			var px = chassis.position.x;
			var py = chassis.position.y;
			var pz = chassis.position.z;

			var ry = _global.testMe.bodyPos.getRotation().y();
			var rw = _global.testMe.bodyPos.getRotation().w();

			var transform = new Ammo.btTransform();
			transform.setIdentity();
			transform.setOrigin( new Ammo.btVector3( px, py + 2, pz ) );
			transform.setRotation( new Ammo.btQuaternion( 0, ry, 0, rw ) );

			_global.body.setWorldTransform( transform );

		};

		_this.needsReset = false;

		let i = 0;
		let dt = clock.getDelta();
		_this.update = function () {

			if ( ! _this.needsReset ) {

				dt = clock.getDelta();
				for ( i = 0; i < syncList.length; i ++ ) {

					syncList[ i ]( dt );

				}

				physicsWorld.stepSimulation( dt, 0.5 );
				updateCamera();
				time += dt;

			} else {

				_this.reset();
				_this.needsReset = false;

			}

		};

		function keyup( e ) {

			if ( keysActions[ e.code ] ) {

				actions[ keysActions[ e.code ] ] = false;
				e.preventDefault();
				e.stopPropagation();
				return false;

			}

		}

		function keydown( e ) {

			if ( keysActions[ e.code ] ) {

				actions[ keysActions[ e.code ] ] = true;
				e.preventDefault();
				e.stopPropagation();
				return false;

			}

		}

		function createWheelMesh( wheel, index, pos ) {

			wheel.rotateZ( Math.PI / 2 );
			wheel.name = "Original Wheel_" + index;
			wheel.scale.set( 0.01, 0.01, 0.01 );
			wheel.children.forEach( function ( obj ) {

				obj.position.set( pos.x, - 68.5, pos.z );

			} );
			scene.add( wheel );
			return wheel;

		}

		function createDummyWheelMesh( radius, width, index ) {

			var t = new CylinderGeometry( radius, radius, width, 24, 1 );
			t.rotateZ( Math.PI / 2 );
			var mesh = new Mesh( t, materialInteractive );
			mesh.name = "Fake Wheel_" + index;
			// scene.add(mesh);
			return mesh;

		}

		function createChassisMesh() {

			chassis.scale.set( 0.01, 0.01, 0.01 );
			chassis.name = "Original Chassis";
			scene.add( chassis );
			// attachCamera(chassis);
			return chassis;

		}

		function createVehicle( chassis, wheels ) {

			var chassisWidth = 2.5;
			var chassisHeight = 0.5;
			var chassisLength = 6;
			var massVehicle = 500;

			var wheelAxisPositionBack = - 2.45;
			var wheelRadiusBack = 0.7;
			var wheelWidthBack = 0.3;
			var wheelHalfTrackBack = 1.5;
			var wheelAxisHeightBack = 0.6;

			var wheelAxisFrontPosition = 2.65;
			var wheelHalfTrackFront = 1.5;
			var wheelAxisHeightFront = 0.6;
			var wheelRadiusFront = 0.7;
			var wheelWidthFront = 0.2;

			var friction = 2;
			var suspensionStiffness = 10.0;
			var suspensionDamping = 2.3;
			var suspensionCompression = 4.4;
			var suspensionRestLength = 0.6;
			var rollInfluence = 0.2;

			var steeringIncrement = 0.04;
			var steeringClamp = 0.5;
			var maxEngineForce = 500;
			var maxBreakingForce = 500;

			// Chassis
			var geometry = new Ammo.btBoxShape( new Ammo.btVector3( chassisWidth * 0.5, chassisHeight * 0.5, chassisLength * 0.5 ) );
			var transform = new Ammo.btTransform();
			transform.setIdentity();
			transform.setOrigin( new Ammo.btVector3( chassis.position.x, chassis.position.y + 10, chassis.position.z ) );
			_global.testMe.bodyPos = transform;
			transform.setRotation( new Ammo.btQuaternion( chassis.quaternion.x, chassis.quaternion.y, chassis.quaternion.z, chassis.quaternion.w ) );
			var motionState = new Ammo.btDefaultMotionState( transform );
			var localInertia = new Ammo.btVector3( 0, 0, 0 );
			geometry.calculateLocalInertia( massVehicle, localInertia );
			var body = new Ammo.btRigidBody( new Ammo.btRigidBodyConstructionInfo( massVehicle, motionState, geometry, localInertia ) );
			body.setActivationState( DISABLE_DEACTIVATION );
			physicsWorld.addRigidBody( body );
			var chassisMesh = createChassisMesh();
			// var chassisMesh = createDummyChassisMesh( chassisLength, chassisWidth, chassisHeight );

			_global.body = body;


			// Raycast Vehicle
			var engineForce = 0;
			var vehicleSteering = 0;
			var breakingForce = 0;
			var tuning = new Ammo.btVehicleTuning();
			var rayCaster = new Ammo.btDefaultVehicleRaycaster( physicsWorld );
			var vehicle = new Ammo.btRaycastVehicle( tuning, body, rayCaster );
			vehicle.setCoordinateSystem( 0, 1, 2 );
			physicsWorld.addAction( vehicle );

			var FRONT_LEFT = 0;
			var FRONT_RIGHT = 1;
			var BACK_LEFT = 2;
			var BACK_RIGHT = 3;
			var wheelMeshes = [];
			var wheelMeshes2 = [];
			var wheelDirectionCS0 = new Ammo.btVector3( 0, - 1, 0 );
			var wheelAxleCS = new Ammo.btVector3( - 1, 0, 0 );

			function addWheel( isFront, pos, radius, width, index, wheel ) {

				var wheelInfo = vehicle.addWheel(
					pos,
					wheelDirectionCS0,
					wheelAxleCS,
					suspensionRestLength,
					radius,
					tuning,
					isFront );

				wheelInfo.set_m_suspensionStiffness( suspensionStiffness );
				wheelInfo.set_m_wheelsDampingRelaxation( suspensionDamping );
				wheelInfo.set_m_wheelsDampingCompression( suspensionCompression );
				wheelInfo.set_m_frictionSlip( friction );
				wheelInfo.set_m_rollInfluence( rollInfluence );

				wheelMeshes[ index ] = createDummyWheelMesh( radius, width, index );
				var newPos = wheelMeshes[ index ].position;
				wheelMeshes2[ index ] = createWheelMesh( wheel, index, newPos );

			}

			addWheel( true, new Ammo.btVector3( wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition ), wheelRadiusFront, wheelWidthFront, FRONT_LEFT, wheels[ 0 ] );
			addWheel( true, new Ammo.btVector3( - wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition ), wheelRadiusFront, wheelWidthFront, FRONT_RIGHT, wheels[ 1 ] );
			addWheel( false, new Ammo.btVector3( - wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack ), wheelRadiusBack, wheelWidthBack, BACK_LEFT, wheels[ 3 ] );
			addWheel( false, new Ammo.btVector3( wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack ), wheelRadiusBack, wheelWidthBack, BACK_RIGHT, wheels[ 2 ] );

			let speed = 0;
			var tm, p, q, i;
			var n = vehicle.getNumWheels();

			// Sync keybord actions and physics and graphics
			function sync() {

				speed = vehicle.getCurrentSpeedKmHour();
				speedometer.innerHTML = ( speed < 0 ? '(R) ' : '' ) + Math.abs( speed ).toFixed( 1 ) + ' km/h';

				breakingForce = 0;
				engineForce = 0;

				if ( actions.acceleration ) {

					if ( speed < - 1 )
						breakingForce = maxBreakingForce;
					else engineForce = maxEngineForce;

				}

				if ( actions.braking ) {

					if ( speed > 1 )
						breakingForce = maxBreakingForce;
					else engineForce = - maxEngineForce / 2;

				}

				if ( actions.left ) {

					if ( vehicleSteering < steeringClamp ) vehicleSteering += steeringIncrement;

				} else if ( actions.right ) {

					if ( vehicleSteering > - steeringClamp ) vehicleSteering -= steeringIncrement;

				} else if ( vehicleSteering < - steeringIncrement ) {

					vehicleSteering += steeringIncrement;

				} else if ( vehicleSteering > steeringIncrement ) {

					vehicleSteering -= steeringIncrement;

				} else {

					vehicleSteering = 0;

				}

				vehicle.applyEngineForce( engineForce, BACK_LEFT );
				vehicle.applyEngineForce( engineForce, BACK_RIGHT );

				vehicle.setBrake( breakingForce / 2, FRONT_LEFT );
				vehicle.setBrake( breakingForce / 2, FRONT_RIGHT );
				vehicle.setBrake( breakingForce, BACK_LEFT );
				vehicle.setBrake( breakingForce, BACK_RIGHT );

				vehicle.setSteeringValue( vehicleSteering, FRONT_LEFT );
				vehicle.setSteeringValue( vehicleSteering, FRONT_RIGHT );

				for ( i = 0; i < n; i ++ ) {

					vehicle.updateWheelTransform( i, true );
					tm = vehicle.getWheelTransformWS( i );
					p = tm.getOrigin();
					q = tm.getRotation();

					wheelMeshes2[ i ].position.set( p.x(), p.y(), p.z() );
					wheelMeshes2[ i ].quaternion.set( q.x(), q.y(), q.z(), q.w() );
					// wheelMeshes[i].position.set(p.x(), p.y(), p.z());
					// wheelMeshes[i].quaternion.set(q.x(), q.y(), q.z(), q.w());

				}

				tm = vehicle.getChassisWorldTransform();
				p = tm.getOrigin();
				q = tm.getRotation();

				chassisMesh.position.set( p.x(), p.y() - 0.5, p.z() );
				chassisMesh.quaternion.set( q.x(), q.y(), q.z(), q.w() );

				// chassisMesh.position.set(p.x(), p.y(), p.z());
				// chassisMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());


			}

			chassis.add( goal );

			syncList.push( sync );

		}

		function createObjects() {

			// createPlane(new THREE.Vector3(0, -5, 0), ZERO_QUATERNION, 1000, 0.01, 1000, 0, 2);
			createVehicle( chassis, wheels );
			_this.isReady = true;

		}



		// source sin fuction plane ammojs git
		function createTerrainShape( heightData ) {

			// This parameter is not really used, since we are using PHY_FLOAT height data type and hence it is ignored
			var heightScale = 1;

			// Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
			var upAxis = 1;

			// hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
			var hdt = "PHY_FLOAT";

			// Set this to your needs (inverts the triangles)
			var flipQuadEdges = false;

			// Creates height data buffer in Ammo heap
			ammoHeightData = Ammo._malloc( 4 * terrainWidth * terrainDepth );

			// Copy the javascript height data array to the Ammo one.
			var p = 0;
			var p2 = 0;
			for ( var j = 0; j < terrainDepth; j ++ ) {

				for ( var i = 0; i < terrainWidth; i ++ ) {

					// write 32-bit float data to memory
					Ammo.HEAPF32[ ammoHeightData + p2 >> 2 ] = heightData[ p ];

					p ++;

					// 4 bytes/float
					p2 += 4;

				}

			}

			// Creates the heightfield physics shape
			var heightFieldShape = new Ammo.btHeightfieldTerrainShape(

				terrainWidth,
				terrainDepth,

				ammoHeightData,

				heightScale,
				terrainMinHeight,
				terrainMaxHeight,

				upAxis,
				hdt,
				flipQuadEdges
			);

			// Set horizontal scale
			// var scaleX = terrainWidthExtents / (terrainWidth - 1);
			// var scaleZ = terrainDepthExtents / (terrainDepth - 1);
			heightFieldShape.setLocalScaling( new Ammo.btVector3( 1, 1, 1 ) );

			heightFieldShape.setMargin( 0.05 );

			return heightFieldShape;

		}

		function initTerrain( heightData ) {

			var geometry = new PlaneGeometry( terrainWidth, terrainWidth, terrainWidth - 1, terrainWidth - 1 );
			geometry.rotateX( - Math.PI / 2 );

			for ( var i = 0; i < geometry.attributes.position.count; i ++ ) {

				geometry.attributes.position.setY( i, heightData[ i ] );

			}

			geometry.computeVertexNormals();

			const groundShape = createTerrainShape( heightData );
			var groundTransform = new Ammo.btTransform();
			groundTransform.setIdentity();
			// Shifts the terrain, since bullet re-centers it on its bounding box.
			groundTransform.setOrigin( new Ammo.btVector3( 0, ( terrainMaxHeight + terrainMinHeight ), 0 ) );
			var groundMass = 0;
			var groundLocalInertia = new Ammo.btVector3( 0, 0, 0 );
			var groundMotionState = new Ammo.btDefaultMotionState( groundTransform );
			var groundBody = new Ammo.btRigidBody( new Ammo.btRigidBodyConstructionInfo( groundMass, groundMotionState, groundShape, groundLocalInertia ) );
			physicsWorld.addRigidBody( groundBody );

			onPhysicsReady && onPhysicsReady();

			_this.isReady = true;

		}


		// - Init -
		initGraphics();

		initPhysics();
		initTerrain( terrainData.heightData );

		createObjects();
		// _updatePhysics();

	} );

};

export default Physics;

