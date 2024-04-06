import {
	Quaternion,
	Clock,
	Vector3,
	Object3D,
} from 'three';
import TerrainPhysics from './TerrainPhysics';
import VehiclePhysics from './VehiclePhysics';

var vec3 = new Vector3();
var quat = new Quaternion();

class Physics {

	constructor( Ammo, scene, chassis, wheels, camera, terrainData, onPhysicsReady ) {

		const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		const dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
		const broadphase = new Ammo.btDbvtBroadphase();
		const solver = new Ammo.btSequentialImpulseConstraintSolver();

		this.physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
		this.physicsWorld.setGravity( new Ammo.btVector3( 0, - 9.75, 0 ) );

		this.clock = new Clock();
		this.camera = camera;
		this.chassis = chassis;
		this.scene = scene;

		this.time = 0;
		this.cameraMode = 3;

		this.chaseCamMount = new Object3D();
		this.chaseCamMount.position.set( 0, 400, - 1000 );
		this.chassis.add( this.chaseCamMount );

		this.needsReset = false;

		this.terrainActor = new TerrainPhysics( Ammo, terrainData );
		this.physicsWorld.addRigidBody( this.terrainActor.body );

		this.vehicleActor = new VehiclePhysics( Ammo, this.physicsWorld, this.scene, chassis, wheels );
		this.physicsWorld.addRigidBody( this.vehicleActor.body );
		this.physicsWorld.addAction( this.vehicleActor.vehicle );

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

		this.vehicleActor.reset( this.chassis );

	}

	update() {

		if ( ! this.needsReset ) {

			let dt = this.clock.getDelta();
			this.vehicleActor.update( dt );
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

