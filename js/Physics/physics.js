import {
	Clock,
} from 'three';
import TerrainPhysics from './TerrainPhysics';
import VehiclePhysics from './VehiclePhysics';

let dt = null;

class Physics {

	constructor( Ammo, chassisMatrix, terrainData ) {

		const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		const dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
		const broadphase = new Ammo.btDbvtBroadphase();
		const solver = new Ammo.btSequentialImpulseConstraintSolver();

		this.physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
		this.physicsWorld.setGravity( new Ammo.btVector3( 0, - 9.75, 0 ) );

		this.clock = new Clock();
		this.fpsLimit = 20;

		this.time = 0;

		this.needsReset = false;

		this.terrainActor = new TerrainPhysics( Ammo, terrainData );
		this.physicsWorld.addRigidBody( this.terrainActor.body );

		this.vehicleActor = new VehiclePhysics( Ammo, this.physicsWorld, chassisMatrix );
		this.physicsWorld.addRigidBody( this.vehicleActor.body );
		this.physicsWorld.addAction( this.vehicleActor.vehicle );

		this.isReady = true;
		// this.startSimilation();

	}

	startSimilation() {

		setInterval( () => {

			this.update();

		}, 1000 / this.fpsLimit );

	}

	reset( chassis ) {

		this.vehicleActor.reset( chassis );

	}

	update( chassis, wheels ) {

		if ( ! this.needsReset ) {

			dt = this.clock.getDelta();
			this.physicsWorld.stepSimulation( dt, 1 );
			this.vehicleActor.update( dt, chassis, wheels );
			this.time += dt;

		} else {

			this.reset( chassis );
			this.needsReset = false;

		}

	}

}

export default Physics;

