'use strict';

const disposeObjMemory = ( obj ) => {

	if ( obj !== null ) {

		for ( var i = 0; i < obj.children.length; i ++ ) {

			this.disposeObjMemory( obj.children[ i ] );

		}

		if ( obj.geometry ) {

			obj.geometry.dispose();
			obj.geometry = undefined;

		}

		if ( obj.material ) {

			if ( obj.material.map ) {

				obj.material.map.dispose();
				obj.material.map = undefined;

			}

			obj.material.dispose();
			obj.material = undefined;

		}

	}

	obj = undefined;

};

export { disposeObjMemory };

