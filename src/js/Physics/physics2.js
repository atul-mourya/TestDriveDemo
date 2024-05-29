import VehiclePhysics from './VehiclePhysics';
import TerrainPhysics from './TerrainPhysics';

let updateTransform = null;

function Physics( AmmoLib, terrainData, position, quaternion ) {

	const collisionConfiguration = new AmmoLib.btDefaultCollisionConfiguration();
	const dispatcher = new AmmoLib.btCollisionDispatcher( collisionConfiguration );
	const broadphase = new AmmoLib.btDbvtBroadphase();
	const solver = new AmmoLib.btSequentialImpulseConstraintSolver();

	const physicsWorld = new AmmoLib.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
	physicsWorld.setGravity( new AmmoLib.btVector3( 0, - 9.75, 0 ) );

	const fpsLimit = 60;

	let time = 0;

	let needsReset = false;

	const terrainActor = new TerrainPhysics( AmmoLib, terrainData );
	physicsWorld.addRigidBody( terrainActor.body );

	const vehicleActor = new VehiclePhysics( AmmoLib, physicsWorld, position, quaternion );
	physicsWorld.addRigidBody( vehicleActor.body );
	physicsWorld.addAction( vehicleActor.vehicle );

	let isReady = true;
	// startSimilation();


	function startSimulation( dt ) {

		update( dt );


	}

	function reset( chassis ) {

		vehicleActor.reset( chassis );

	}

	function update( dt ) {

		if ( ! needsReset ) {

			updateTransform = vehicleActor.update( dt );
			physicsWorld.stepSimulation( dt, 1 );
			time += dt;

		} else {

			// reset( chassis );
			needsReset = false;

		}

		return updateTransform;

	}

	return {
		physicsWorld: physicsWorld,
		fpsLimit: fpsLimit,
		time: time,
		needsReset: needsReset,
		terrainActor: terrainActor,
		vehicleActor: vehicleActor,
		isReady: isReady,

		startSimulation: startSimulation,
		reset: reset,
		update: update,
	};

}

export default Physics;

