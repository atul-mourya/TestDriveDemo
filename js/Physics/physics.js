import {
	Quaternion,
	MeshPhongMaterial,
	Clock,
	Vector3,
	Object3D,
	CylinderGeometry,
	Mesh,
} from 'three';
import TerrainPhysics from './TerrainPhysics';

var vec3 = new Vector3();
var quat = new Quaternion();

class Physics {

	constructor( Ammo, chassis, wheels, camera, terrainData, onPhysicsReady ) {

		var DISABLE_DEACTIVATION = 4;

		var materialInteractive = new MeshPhongMaterial( { color: 0x990000 } );

		const scope = this;

		// Physics configuration
		const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		const dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
		const broadphase = new Ammo.btDbvtBroadphase();
		const solver = new Ammo.btSequentialImpulseConstraintSolver();
		this.physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
		this.physicsWorld.setGravity( new Ammo.btVector3( 0, - 9.75, 0 ) );

		this.clock = new Clock();
		this.camera = camera;
		this.chassis = chassis;
		this.body = null; // Ammo.btRigidBody
		this.syncList = [];
		this.time = 0;
		this.cameraMode = 3;
		this.chaseCamMount = new Object3D();
		this.chaseCamMount.position.set( 0, 400, - 1000 );
		this.needsReset = false;

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
			scope.vehicleTransform = new Ammo.btTransform();
			scope.vehicleTransform.setIdentity();
			scope.vehicleTransform.setOrigin( new Ammo.btVector3( chassis.position.x, chassis.position.y + 10, chassis.position.z ) );
			scope.vehicleTransform.setRotation( new Ammo.btQuaternion( chassis.quaternion.x, chassis.quaternion.y, chassis.quaternion.z, chassis.quaternion.w ) );

			var motionState = new Ammo.btDefaultMotionState( scope.vehicleTransform );
			var localInertia = new Ammo.btVector3( 0, 0, 0 );
			geometry.calculateLocalInertia( massVehicle, localInertia );

			scope.body = new Ammo.btRigidBody( new Ammo.btRigidBodyConstructionInfo( massVehicle, motionState, geometry, localInertia ) );
			scope.body.setActivationState( DISABLE_DEACTIVATION );
			scope.physicsWorld.addRigidBody( scope.body );

			var chassisMesh = createChassisMesh();
			// var chassisMesh = createDummyChassisMesh( chassisLength, chassisWidth, chassisHeight );

			// Raycast Vehicle
			var engineForce = 0;
			var vehicleSteering = 0;
			var breakingForce = 0;
			var tuning = new Ammo.btVehicleTuning();
			var rayCaster = new Ammo.btDefaultVehicleRaycaster( scope.physicsWorld );
			var vehicle = new Ammo.btRaycastVehicle( tuning, scope.body, rayCaster );
			vehicle.setCoordinateSystem( 0, 1, 2 );

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
			function onUpdate() {

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

			chassis.add( scope.chaseCamMount );

			scope.syncList.push( onUpdate );

			return vehicle;


		}

		const terrain = new TerrainPhysics( Ammo, terrainData );
		this.physicsWorld.addRigidBody( terrain.body );

		const vehicle = createVehicle( chassis, wheels );
		this.physicsWorld.addAction( vehicle );

		window.addEventListener( 'keydown', keydown );
		window.addEventListener( 'keyup', keyup );

		this.isReady = true;
		onPhysicsReady && onPhysicsReady();

	}

	updateCamera() {

		switch ( this.cameraMode ) {

			case 0:
				vec3.copy( this.chassis.position );
				this.camera.position.lerp( vec3, 0.2 );
				this.camera.lookAt( this.chassis.position.x, this.chassis.position.y, this.chassis.position.z - 20 );
				break;
			case 1:

				this.camera.quaternion.copy( this.chassis.quaternion );
				quat.setFromAxisAngle( vec3.set( 0, 1, 0 ), Math.PI );
				this.camera.quaternion.multiply( quat );
				this.camera.position.copy( this.chassis.position ).add( vec3.set( - 0.7, 2, 1 ) );

				break;
			case 2:
				this.camera.position.set( this.chassis.position.x + 20, this.chassis.position.y + 6, this.chassis.position.z );
				this.camera.lookAt( this.chassis.position );
				break;
			case 3:
				vec3.setFromMatrixPosition( this.chaseCamMount.matrixWorld );
				this.camera.position.lerp( vec3, 0.05 );
				this.camera.lookAt( this.chassis.position );
				break;

		}

	}

	reset() {

		var ry = this.vehicleTransform.getRotation().y();
		var rw = this.vehicleTransform.getRotation().w();

		this.vehicleTransform.setIdentity();
		this.vehicleTransform.setOrigin( new Ammo.btVector3( this.chassis.position.x, this.chassis.position.y + 2, this.chassis.position.z ) );
		this.vehicleTransform.setRotation( new Ammo.btQuaternion( 0, ry, 0, rw ) );

		this.body.setWorldTransform( this.vehicleTransform );

	}

	update() {

		if ( ! this.needsReset ) {

			let dt = this.clock.getDelta();
			for ( let i = 0; i < this.syncList.length; i ++ ) {

				this.syncList[ i ]( dt );

			}

			this.physicsWorld.stepSimulation( dt, 1 );
			this.updateCamera();
			this.time += dt;

		} else {

			this.reset();
			this.needsReset = false;

		}

	}

}

export default Physics;

