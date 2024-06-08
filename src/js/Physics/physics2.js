import VehiclePhysics from './VehiclePhysics';
import TerrainPhysics from './TerrainPhysics';

let updateTransform = null;

function Physics( AmmoLib, terrainData, position, quaternion ) {

	const collisionConfiguration = new AmmoLib.btDefaultCollisionConfiguration();
	const dispatcher = new AmmoLib.btCollisionDispatcher( collisionConfiguration );
	const broadphase = new AmmoLib.btDbvtBroadphase();
	const solver = new AmmoLib.btSequentialImpulseConstraintSolver();

	const physicsWorld = new AmmoLib.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
	physicsWorld.setGravity( new AmmoLib.btVector3( 0, - 9.8, 0 ) );

	let needsReset = false;
	const maxSubSteps = 10; // Maximum number of sub-steps

	const terrainActor = new TerrainPhysics( AmmoLib, terrainData );
	physicsWorld.addRigidBody( terrainActor.body );

	const vehicleActor = new VehiclePhysics( AmmoLib, physicsWorld, position, quaternion );
	physicsWorld.addRigidBody( vehicleActor.body );
	physicsWorld.addAction( vehicleActor.vehicle );

	function reset( chassis ) {

		vehicleActor.reset( chassis );

	}

	function update( dt ) {

		if ( ! needsReset ) {

			physicsWorld.stepSimulation( dt, maxSubSteps, dt / 10 );
			updateTransform = vehicleActor.update();

		} else {

			// reset( chassis );
			needsReset = false;

		}

		return updateTransform;

	}

	return {
		physicsWorld: physicsWorld,
		needsReset: needsReset,
		terrainActor: terrainActor,
		vehicleActor: vehicleActor,

		reset: reset,
		update: update,
	};

}

export default Physics;

