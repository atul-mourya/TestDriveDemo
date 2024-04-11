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
let dt = null;

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
		this.fpsLimit = 20;

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
		// this.startSimilation();
		onPhysicsReady && onPhysicsReady();

	}

	startSimilation() {

		setInterval( () => {

			this.update();

		}, 1000 / this.fpsLimit );

	}

	reset() {

		this.vehicleActor.reset( this.chassis );

	}

	update() {

		if ( ! this.needsReset ) {

			dt = this.clock.getDelta();
			this.vehicleActor.update( dt );
			this.physicsWorld.stepSimulation( dt, 1 );
			this.time += dt;

		} else {

			this.reset();
			this.needsReset = false;

		}

	}

}

export default Physics;

