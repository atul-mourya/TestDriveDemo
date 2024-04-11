import { CylinderGeometry, MeshPhongMaterial, Mesh } from 'three';

const materialInteractive = new MeshPhongMaterial( { color: 0x990000 } );

const FRONT_LEFT = 0;
const FRONT_RIGHT = 1;
const BACK_LEFT = 2;
const BACK_RIGHT = 3;
let tm, p, q, i;

export default class VehiclePhysics {

	constructor( Ammo, physicsWorld, scene, chassis, wheels, data ) {

		this.Ammo = Ammo;
		this.data = data;
		this.scene = scene;
		this.actions = {};


		const DISABLE_DEACTIVATION = 4;

		const chassisWidth = 2.5;
		const chassisHeight = 0.5;
		const chassisLength = 6;
		const massVehicle = 500;

		const wheelAxisPositionBack = - 2.45;
		const wheelRadiusBack = 0.7;
		const wheelWidthBack = 0.3;
		const wheelHalfTrackBack = 1.5;
		const wheelAxisHeightBack = 0.6;

		const wheelAxisFrontPosition = 2.65;
		const wheelHalfTrackFront = 1.5;
		const wheelAxisHeightFront = 0.6;
		const wheelRadiusFront = 0.7;
		const wheelWidthFront = 0.2;

		const friction = 2;
		const suspensionStiffness = 10.0;
		const suspensionDamping = 2.3;
		const suspensionCompression = 4.4;
		const suspensionRestLength = 0.6;
		const rollInfluence = 0.2;

		this.steeringIncrement = 0.04;
		this.steeringClamp = 0.5;
		this.maxEngineForce = 1000;
		this.maxBreakingForce = 500;

		// Chassis
		var geometry = new Ammo.btBoxShape( new Ammo.btVector3( chassisWidth * 0.5, chassisHeight * 0.5, chassisLength * 0.5 ) );
		this.transform = new Ammo.btTransform();
		this.transform.setIdentity();
		this.transform.setOrigin( new Ammo.btVector3( chassis.position.x, chassis.position.y + 10, chassis.position.z ) );
		this.transform.setRotation( new Ammo.btQuaternion( chassis.quaternion.x, chassis.quaternion.y, chassis.quaternion.z, chassis.quaternion.w ) );

		var motionState = new Ammo.btDefaultMotionState( this.transform );
		var localInertia = new Ammo.btVector3( 0, 0, 0 );
		geometry.calculateLocalInertia( massVehicle, localInertia );

		this.body = new Ammo.btRigidBody( new Ammo.btRigidBodyConstructionInfo( massVehicle, motionState, geometry, localInertia ) );
		this.body.setActivationState( DISABLE_DEACTIVATION );

		// Raycast Vehicle
		this.engineForce = 0;
		this.vehicleSteering = 0;
		this.breakingForce = 0;

		this.wheelMeshes = [];
		this.wheelMeshes2 = [];

		var wheelDirectionCS0 = new Ammo.btVector3( 0, - 1, 0 );
		var wheelAxleCS = new Ammo.btVector3( - 1, 0, 0 );

		var tuning = new Ammo.btVehicleTuning();
		var rayCaster = new Ammo.btDefaultVehicleRaycaster( physicsWorld );
		this.vehicle = new Ammo.btRaycastVehicle( tuning, this.body, rayCaster );
		this.vehicle.setCoordinateSystem( 0, 1, 2 );

		const scope = this;

		function addWheel( isFront, pos, radius, width, index, wheel ) {

			var wheelInfo = scope.vehicle.addWheel(
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

			scope.wheelMeshes[ index ] = scope.createDummyWheelMesh( radius, width, index );
			var newPos = scope.wheelMeshes[ index ].position;
			scope.wheelMeshes2[ index ] = scope.createWheelMesh( wheel, index, newPos );
			scope.scene.add( scope.wheelMeshes2[ index ] );

		}

		addWheel( true, new Ammo.btVector3( wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition ), wheelRadiusFront, wheelWidthFront, FRONT_LEFT, wheels[ 0 ] );
		addWheel( true, new Ammo.btVector3( - wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition ), wheelRadiusFront, wheelWidthFront, FRONT_RIGHT, wheels[ 1 ] );
		addWheel( false, new Ammo.btVector3( - wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack ), wheelRadiusBack, wheelWidthBack, BACK_LEFT, wheels[ 3 ] );
		addWheel( false, new Ammo.btVector3( wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack ), wheelRadiusBack, wheelWidthBack, BACK_RIGHT, wheels[ 2 ] );

		this.speed = 0; // km/h
		// var tm, p, q, i;
		this.wheelsCount = this.vehicle.getNumWheels();

		this.speedometer = document.createElement( 'p' );
		this.speedometer.style.position = 'absolute';
		this.speedometer.style.bottom = '0px';
		this.speedometer.style.left = '0px';
		document.body.appendChild( this.speedometer );

		

		this.isReady = true;

		


		this.chassisMesh = this.createChassisMesh( chassis );
		this.scene.add( this.chassisMesh );
		// var chassisMesh = createDummyChassisMesh( chassisLength, chassisWidth, chassisHeight );


	}

	createChassisMesh( chassis ) {

		chassis.scale.set( 0.01, 0.01, 0.01 );
		chassis.name = "Original Chassis";
		// attachCamera(chassis);
		return chassis;

	}

	createWheelMesh( wheel, index, pos ) {

		wheel.rotateZ( Math.PI / 2 );
		wheel.name = "Original Wheel_" + index;
		wheel.scale.set( 0.01, 0.01, 0.01 );
		wheel.children.forEach( function ( obj ) {

			obj.position.set( pos.x, - 68.5, pos.z );

		} );

		return wheel;

	}

	createDummyWheelMesh( radius, width, index ) {

		var t = new CylinderGeometry( radius, radius, width, 24, 1 );
		t.rotateZ( Math.PI / 2 );
		var mesh = new Mesh( t, materialInteractive );
		mesh.name = "Fake Wheel_" + index;
		// scene.add(mesh);
		return mesh;

	}

	// Sync keybord actions and physics and graphics
	update() {

		this.speed = this.vehicle.getCurrentSpeedKmHour();
		// this.speedometer.innerText = ( this.speed < 0 ? '(R) ' : '' ) + Math.abs( this.speed ).toFixed( 1 ) + ' km/h';

		this.breakingForce = 0;
		this.engineForce = 0;

		if ( this.actions.acceleration ) {

			if ( this.speed < - 1 )
				this.breakingForce = this.maxBreakingForce;
			else this.engineForce = this.maxEngineForce;

		}

		if ( this.actions.braking ) {

			if ( this.speed > 1 )
				this.breakingForce = this.maxBreakingForce;
			else this.engineForce = - this.maxEngineForce / 2;

		}

		if ( this.actions.left ) {

			if ( this.vehicleSteering < this.steeringClamp ) this.vehicleSteering += this.steeringIncrement;

		} else if ( this.actions.right ) {

			if ( this.vehicleSteering > - this.steeringClamp ) this.vehicleSteering -= this.steeringIncrement;

		} else if ( this.vehicleSteering < - this.steeringIncrement ) {

			this.vehicleSteering += this.steeringIncrement;

		} else if ( this.vehicleSteering > this.steeringIncrement ) {

			this.vehicleSteering -= this.steeringIncrement;

		} else {

			this.vehicleSteering = 0;

		}

		this.vehicle.applyEngineForce( this.engineForce, BACK_LEFT );
		this.vehicle.applyEngineForce( this.engineForce, BACK_RIGHT );

		this.vehicle.setBrake( this.breakingForce / 2, FRONT_LEFT );
		this.vehicle.setBrake( this.breakingForce / 2, FRONT_RIGHT );
		this.vehicle.setBrake( this.breakingForce, BACK_LEFT );
		this.vehicle.setBrake( this.breakingForce, BACK_RIGHT );

		this.vehicle.setSteeringValue( this.vehicleSteering, FRONT_LEFT );
		this.vehicle.setSteeringValue( this.vehicleSteering, FRONT_RIGHT );

		for ( i = 0; i < this.wheelsCount; i ++ ) {

			this.vehicle.updateWheelTransform( i, true );
			tm = this.vehicle.getWheelTransformWS( i );
			p = tm.getOrigin();
			q = tm.getRotation();

			this.wheelMeshes2[ i ].position.set( p.x(), p.y(), p.z() );
			this.wheelMeshes2[ i ].quaternion.set( q.x(), q.y(), q.z(), q.w() );
			// wheelMeshes[i].position.set(p.x(), p.y(), p.z());
			// wheelMeshes[i].quaternion.set(q.x(), q.y(), q.z(), q.w());

		}

		tm = this.vehicle.getChassisWorldTransform();
		p = tm.getOrigin();
		q = tm.getRotation();

		// this.chassisMesh.position.set( p.x(), p.y(), p.z() );
		this.chassisMesh.position.set( p.x(), p.y() - 0.5, p.z() );
		this.chassisMesh.quaternion.set( q.x(), q.y(), q.z(), q.w() );

	}

	reset( chassis ) {

		var ry = this.transform.getRotation().y();
		var rw = this.transform.getRotation().w();

		this.transform.setIdentity();
		this.transform.setOrigin( new this.Ammo.btVector3( chassis.position.x, chassis.position.y + 2, chassis.position.z ) );
		this.transform.setRotation( new this.Ammo.btQuaternion( 0, ry, 0, rw ) );

		this.body.setWorldTransform( this.transform );

	}

}
