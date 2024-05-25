import PoissonDiskSampling from 'poisson-disk-sampling';

/**
 * Convert an image-based heightmap into vertex-based height data.
 *
 * @param {Float32Array} g
 *   The geometry's z-positions to modify with heightmap data.
 * @param {Object} options
 *   A map of settings that control how the terrain is constructed and
 *   displayed. Valid values are the same as those for the `options` parameter
 *   of {@link Terrain}().
 */
export const fromHeightmap = function ( g, options ) {

	var canvas = document.createElement( 'canvas' ),
		context = canvas.getContext( '2d' ),
		rows = options.ySegments + 1,
		cols = options.xSegments + 1,
		spread = options.maxHeight - options.minHeight;
	canvas.width = cols;
	canvas.height = rows;
	context.drawImage( options.heightmap, 0, 0, canvas.width, canvas.height );
	var data = context.getImageData( 0, 0, canvas.width, canvas.height ).data;
	for ( var row = 0; row < rows; row ++ ) {

		for ( var col = 0; col < cols; col ++ ) {

			var i = row * cols + col,
				idx = i * 4;
			g[ i ] = ( data[ idx ] + data[ idx + 1 ] + data[ idx + 2 ] ) / 765 * spread + options.minHeight;

		}

	}

};

/**
 * Convert a terrain plane into an image-based heightmap.
 *
 * Parameters are the same as for {@link Terrain.fromHeightmap} except
 * that if `options.heightmap` is a canvas element then the image will be
 * painted onto that canvas; otherwise a new canvas will be created.
 *
 * @param {Float32Array} g
 *   The vertex position array for the geometry to paint to a heightmap.
 * @param {Object} options
 *   A map of settings that control how the terrain is constructed and
 *   displayed. Valid values are the same as those for the `options` parameter
 *   of {@link Terrain}().
 *
 * @return {HTMLCanvasElement}
 *   A canvas with the relevant heightmap painted on it.
 */
export const toHeightmap = function ( g, options ) {

	var hasMax = typeof options.maxHeight !== 'undefined',
		hasMin = typeof options.minHeight !== 'undefined',
		max = hasMax ? options.maxHeight : - Infinity,
		min = hasMin ? options.minHeight : Infinity;
	if ( ! hasMax || ! hasMin ) {

		var max2 = max,
			min2 = min;
		for ( var k = 2, l = g.length; k < l; k += 3 ) {

			if ( g[ k ] > max2 ) max2 = g[ k ];
			if ( g[ k ] < min2 ) min2 = g[ k ];

		}

		if ( ! hasMax ) max = max2;
		if ( ! hasMin ) min = min2;

	}

	var canvas = options.heightmap instanceof HTMLCanvasElement ? options.heightmap : document.createElement( 'canvas' ),
		context = canvas.getContext( '2d' ),
		rows = options.ySegments + 1,
		cols = options.xSegments + 1,
		spread = max - min;
	canvas.width = cols;
	canvas.height = rows;
	var d = context.createImageData( canvas.width, canvas.height ),
		data = d.data;
	for ( var row = 0; row < rows; row ++ ) {

		for ( var col = 0; col < cols; col ++ ) {

			var i = row * cols + col,
				idx = i * 4;
			data[ idx ] = data[ idx + 1 ] = data[ idx + 2 ] = Math.round( ( ( g[ i * 3 + 2 ] - min ) / spread ) * 255 );
			data[ idx + 3 ] = 255;

		}

	}

	context.putImageData( d, 0, 0 );
	return canvas;

};

export const fromFolliageMap = ( folliagemap, width, depth ) => {

	var canvas = document.createElement( 'canvas' );
	var context = canvas.getContext( '2d' );

	canvas.width = width;
	canvas.height = depth;
	context.drawImage( folliagemap, 0, 0, canvas.width, canvas.height );

	var data = context.getImageData( 0, 0, canvas.width, canvas.height ).data;

	var pds = new PoissonDiskSampling( {
		shape: [ width, depth ],
		minDistance: 5,
		maxDistance: 55,
		tries: 15,
		distanceFunction: function ( pixel ) {

			// get the index of the red pixel value for the given coordinates (point)
			var pixelRedIndex = ( Math.round( pixel[ 0 ] ) + Math.round( pixel[ 1 ] ) * width ) * 4;

			// Invert the pixel value and map it to 0-1, then apply Math.pow for flavor
			var invertedValue = 1 - data[ pixelRedIndex ] / 255;
			return Math.pow( invertedValue, 3 );

		}
	} );


	var points = pds.fill();
	console.log( 'Blue Noise sample points:', points );

	// var canvas = document.createElement( 'canvas' );
	// var context = canvas.getContext( '2d' );
	// canvas.width = cols;
	// canvas.height = rows;

	// for ( var i = 0; i < points.length - 1; i ++ ) {

	// 	context.fillRect( Math.round( points[ i ][ 0 ] ), Math.round( points[ i ][ 1 ] ), 1, 1 );

	// }

	// document.body.appendChild( canvas );

	return points;

};

export const excludePoints = ( points, maskMap, width, depth ) => {

	var alphaThreshold = 200; // value between 0 and 255

	var canvas = document.createElement( 'canvas' );
	var context = canvas.getContext( '2d' );

	canvas.width = width;
	canvas.height = depth;
	context.drawImage( maskMap, 0, 0, canvas.width, canvas.height );

	var data = context.getImageData( 0, 0, canvas.width, canvas.height ).data;

	points = points.filter( point => {

		// get the index of the alpha pixel value for the given coordinates (point)
		// exclude all points for which the alpha channel value is below the threshold
		var pixelAlphaIndex = ( Math.round( point[ 0 ] ) + Math.round( point[ 1 ] ) * width ) * 4 + 3;
		return data[ pixelAlphaIndex ] < alphaThreshold;

	} );

	return points;

};

export function loadImageAsync( src ) {

	return new Promise( ( resolve, reject ) => {

	  let img = new Image();
	  img.onload = () => resolve( img );
	  img.onerror = reject;
	  img.src = src;

	} );

}

