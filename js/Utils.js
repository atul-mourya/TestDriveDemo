const Utils = {
	disposeObjMemory: function ( obj ) {

		if ( obj !== null ) {

			for ( var i = 0; i < obj.children.length; i ++ ) {

				disposeObjMemory( obj.children[ i ] );

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

	},
	LoadingManager: function ( onLoad, onProgress, onError ) {

		var scope = this;

		var isLoading = false;
		var itemsLoaded = 0;
		var itemsTotal = 0;
		var urlModifier;

		this.onStart = undefined;
		this.onLoad = onLoad;
		this.onProgress = onProgress;
		this.onError = onError;
		this.itemsStart = function ( numberOfItems ) {

			itemsTotal += numberOfItems;
			isLoading = true;

		};

		this.itemStart = function ( url ) {

			itemsTotal ++;

			if ( isLoading === false ) {

				if ( scope.onStart !== undefined ) {

					scope.onStart( url, itemsLoaded, itemsTotal );

				}

			}

			isLoading = true;

		};

		this.itemEnd = function ( url ) {

			itemsLoaded ++;

			if ( scope.onProgress !== undefined ) {

				scope.onProgress( url, itemsLoaded, itemsTotal );

			}

			if ( itemsLoaded === itemsTotal ) {

				isLoading = false;

				if ( scope.onLoad !== undefined ) {

					scope.onLoad();

				}

			}

		};

		this.itemError = function ( url ) {

			if ( scope.onError !== undefined ) {

				scope.onError( url );

			}

		};

		this.resolveURL = function ( url ) {

			if ( urlModifier ) {

				return urlModifier( url );

			}

			return url;

		};

		this.setURLModifier = function ( transform ) {

			urlModifier = transform;
			return this;

		};

	}
};

export default Utils;
