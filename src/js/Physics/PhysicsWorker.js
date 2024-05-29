import Physics from './physics2';
import Ammo from '../../assets/scripts/ammo/ammo';

let physicsInstance;

self.onmessage = event => {

	switch ( event.data.cmd ) {

		case 'init':
			Ammo().then( Ammo => {

				physicsInstance = Physics( Ammo, event.data.terrainData, event.data.position, event.data.quaternion );
				console.log( 'Physics initialized' );
				postMessage( { cmd: 'PhysicsReady' } );

			} );
			break;
		case 'start':
			break;
		case 'update':
			postMessage( { cmd: 'PhysicsUpdated', data: physicsInstance.update( event.data.dt ) } );
			break;
		case 'reset':
			physicsInstance.reset( event.data.chassis );
			break;
		case 'keyUpAction':
			physicsInstance.vehicleActor.actions[ event.data.action ] = false;
			break;
		case 'keyDownAction':
			physicsInstance.vehicleActor.actions[ event.data.action ] = true;
			break;
		default:
			console.error( 'Invalid command received by worker:', event.data.cmd );

	}

};
