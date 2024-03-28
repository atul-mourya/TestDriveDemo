var UVMapping = 300;
var CubeReflectionMapping = 301;
var CubeRefractionMapping = 302;
var EquirectangularReflectionMapping = 303;
var EquirectangularRefractionMapping = 304;
var SphericalReflectionMapping = 305;
var CubeUVReflectionMapping = 306;
var CubeUVRefractionMapping = 307;
var RepeatWrapping = 1000;
var ClampToEdgeWrapping = 1001;
var MirroredRepeatWrapping = 1002;
var NearestFilter = 1003;
var NearestMipMapNearestFilter = 1004;
var NearestMipMapLinearFilter = 1005;
var LinearFilter = 1006;
var LinearMipMapNearestFilter = 1007;
var LinearMipMapLinearFilter = 1008;

var TEXTURE_MAPPING = {
	UVMapping: UVMapping,
	CubeReflectionMapping: CubeReflectionMapping,
	CubeRefractionMapping: CubeRefractionMapping,
	EquirectangularReflectionMapping: EquirectangularReflectionMapping,
	EquirectangularRefractionMapping: EquirectangularRefractionMapping,
	SphericalReflectionMapping: SphericalReflectionMapping,
	CubeUVReflectionMapping: CubeUVReflectionMapping,
	CubeUVRefractionMapping: CubeUVRefractionMapping
};

var TEXTURE_WRAPPING = {
	RepeatWrapping: RepeatWrapping,
	ClampToEdgeWrapping: ClampToEdgeWrapping,
	MirroredRepeatWrapping: MirroredRepeatWrapping
};

var TEXTURE_FILTER = {
	NearestFilter: NearestFilter,
	NearestMipMapNearestFilter: NearestMipMapNearestFilter,
	NearestMipMapLinearFilter: NearestMipMapLinearFilter,
	LinearFilter: LinearFilter,
	LinearMipMapNearestFilter: LinearMipMapNearestFilter,
	LinearMipMapLinearFilter: LinearMipMapLinearFilter
};

function IzmoLoader( manager ) {

	this.manager = ( manager !== undefined ) ? manager : DefaultLoadingManager;

}

Object.assign( IzmoLoader.prototype, {

	setTexturePath: function ( value ) {

		this.texturePath = value;

	},
	setModelPath: function ( ModelUrl ) {

		this.modelUrl = ModelUrl;

	},

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		if ( this.texturePath === '' ) {

			this.texturePath = url.substring( 0, url.lastIndexOf( '/' ) + 1 );

		}

		var loader = new THREE.FileLoader( scope.manager );
		loader.load( url, function ( text ) {

			var json = null;
			var count = 1;
			var geometry;

			try {

				json = JSON.parse( text );

				var numItems = json.geometries.length + json.images.length;
				scope.manager.itemsStart( numItems );
				for ( var i = 0; i < json.geometries.length; i ++ )( function ( i ) {

					var geometryDataLoader = new THREE.FileLoader();
					geometryDataLoader.load( scope.modelUrl + json.geometries[ i ].data, function ( text ) {

						var fileExt = json.geometries[ i ].data.split( '.' ).pop();
						if ( fileExt == 'json' ) {

							var geo_data = JSON.parse( text );
							scope.manager.itemEnd( scope.modelUrl + json.geometries[ i ].data );
							json.geometries[ i ].data = geo_data;


							if ( count == json.geometries.length ) {

								scope.parse( json, onLoad );

							} else {

								count ++;

							}

						} else {

							scope.manager.itemEnd( "" );

						}

					} );

				}( i ) );

			} catch ( error ) {

				if ( onError !== undefined ) onError( error );

				console.error( 'THREE:IzmoCTMLoader: Can\'t parse ' + url + '.', error.message );

				return;

			}

			var metadata = json.metadata;

			if ( metadata === undefined || metadata.type === undefined || metadata.type.toLowerCase() === 'geometry' ) {

				console.error( 'THREE.IzmoCTMLoader: Can\'t load ' + url + '. Use THREE.JSONLoader instead.' );
				return;

			}

		}, onProgress, onError );

	},

	setCrossOrigin: function ( value ) {

		this.crossOrigin = value;

	},

	parse: function ( json, onLoad ) {

		var geometries = this.parseGeometries( json.geometries );

		var images = this.parseImages( json.images, function () {

			if ( onLoad !== undefined ) onLoad( object );

		} );

		var textures = this.parseTextures( json.textures, images );
		var materials = this.parseMaterials( json.materials, textures );
		var object = this.parseObject( json.object, geometries, materials );

		// if ( json.animations ) {

		//     object.animations = this.parseAnimations( json.animations );

		// }

		if ( json.images === undefined || json.images.length === 0 ) {

			if ( onLoad !== undefined ) onLoad( object );

		}

		return object;

	},

	parseGeometries: function ( json ) {

    	var geometries = {};

		if ( json !== undefined ) {

			var geometryLoader = new THREE.JSONLoader();
			var bufferGeometryLoader = new THREE.BufferGeometryLoader();

			for ( var i = 0, l = json.length; i < l; i ++ ) {

				var geometry;
				var data = json[ i ];

				switch ( data.type ) {

					case 'PlaneGeometry':
					case 'PlaneBufferGeometry':

						geometry = new Geometries[ data.type ](
							data.width,
							data.height,
							data.widthSegments,
							data.heightSegments
						);

						break;

					case 'BoxGeometry':
					case 'BoxBufferGeometry':
					case 'CubeGeometry': // backwards compatible

						geometry = new Geometries[ data.type ](
							data.width,
							data.height,
							data.depth,
							data.widthSegments,
							data.heightSegments,
							data.depthSegments
						);

						break;

					case 'CircleGeometry':
					case 'CircleBufferGeometry':

						geometry = new Geometries[ data.type ](
							data.radius,
							data.segments,
							data.thetaStart,
							data.thetaLength
						);

						break;

					case 'CylinderGeometry':
					case 'CylinderBufferGeometry':

						geometry = new Geometries[ data.type ](
							data.radiusTop,
							data.radiusBottom,
							data.height,
							data.radialSegments,
							data.heightSegments,
							data.openEnded,
							data.thetaStart,
							data.thetaLength
						);

						break;

					case 'ConeGeometry':
					case 'ConeBufferGeometry':

						geometry = new Geometries[ data.type ](
							data.radius,
							data.height,
							data.radialSegments,
							data.heightSegments,
							data.openEnded,
							data.thetaStart,
							data.thetaLength
						);

						break;

					case 'SphereGeometry':
					case 'SphereBufferGeometry':

						geometry = new Geometries[ data.type ](
							data.radius,
							data.widthSegments,
							data.heightSegments,
							data.phiStart,
							data.phiLength,
							data.thetaStart,
							data.thetaLength
						);

						break;

					case 'DodecahedronGeometry':
					case 'IcosahedronGeometry':
					case 'OctahedronGeometry':
					case 'TetrahedronGeometry':

						geometry = new Geometries[ data.type ](
							data.radius,
							data.detail
						);

						break;

					case 'RingGeometry':
					case 'RingBufferGeometry':

						geometry = new Geometries[ data.type ](
							data.innerRadius,
							data.outerRadius,
							data.thetaSegments,
							data.phiSegments,
							data.thetaStart,
							data.thetaLength
						);

						break;

					case 'TorusGeometry':
					case 'TorusBufferGeometry':

						geometry = new Geometries[ data.type ](
							data.radius,
							data.tube,
							data.radialSegments,
							data.tubularSegments,
							data.arc
						);

						break;

					case 'TorusKnotGeometry':
					case 'TorusKnotBufferGeometry':

						geometry = new Geometries[ data.type ](
							data.radius,
							data.tube,
							data.tubularSegments,
							data.radialSegments,
							data.p,
							data.q
						);

						break;

					case 'LatheGeometry':
					case 'LatheBufferGeometry':

						geometry = new Geometries[ data.type ](
							data.points,
							data.segments,
							data.phiStart,
							data.phiLength
						);

						break;

					case 'BufferGeometry':

						geometry = bufferGeometryLoader.parse( data );
						// geometry = modifer.modify( geometry, geometry.attributes.position.count * 0.5 | 0 );
						// geometry = new THREE.BufferGeometry().fromGeometry( geometry );
						break;

					case 'Geometry':

						geometry = geometryLoader.parse( data, this.texturePath ).geometry;

						break;

					default:

						console.warn( 'THREE.IzmoCTMLoader: Unsupported geometry type "' + data.type + '"' );

						continue;

				}

				geometry.uuid = data.uuid;

				if ( data.name !== undefined ) geometry.name = data.name;

				geometries[ data.uuid ] = geometry;

			}

		}

		return geometries;

	},


	parseImages: function ( json, onLoad ) {

		var scope = this;
		var images = {};

		function loadImage( url ) {

			// scope.manager.itemStart( url );

			return loader.load( url, function () {

				scope.manager.itemEnd( url );



			}, undefined, function () {

				scope.manager.itemEnd( url );
				scope.manager.itemError( url );

			} );

		}

		if ( json !== undefined && json.length > 0 ) {

			var manager = new THREE.LoadingManager( onLoad );

			var loader = new THREE.ImageLoader( manager );
			loader.setCrossOrigin( this.crossOrigin );

			for ( var i = 0, l = json.length; i < l; i ++ ) {

				var image = json[ i ];
				var path = /^(\/\/)|([a-z]+:(\/\/)?)/i.test( image.url ) ? image.url : scope.texturePath + image.url;

				images[ image.uuid ] = loadImage( path );

			}

		}

		return images;

	},

	parseTextures: function ( json, images ) {

		function parseConstant( value, type ) {

			if ( typeof ( value ) === 'number' ) return value;

			console.warn( 'THREE.IzmoCTMLoader.parseTexture: Constant should be in numeric form.', value );

			return type[ value ];

		}

		var textures = {};

		if ( json !== undefined ) {

			for ( var i = 0, l = json.length; i < l; i ++ ) {

				var data = json[ i ];

				if ( data.image === undefined ) {

					console.warn( 'THREE.IzmoCTMLoader: No "image" specified for', data.uuid );

				}

				if ( images[ data.image ] === undefined ) {

					console.warn( 'THREE.IzmoCTMLoader: Undefined image', data.image );

				}

				var texture = new THREE.Texture( images[ data.image ] );
				texture.needsUpdate = true;

				texture.uuid = data.uuid;

				if ( data.name !== undefined ) texture.name = data.name;

				if ( data.mapping !== undefined ) texture.mapping = parseConstant( data.mapping, TEXTURE_MAPPING );

				if ( data.offset !== undefined ) texture.offset.fromArray( data.offset );
				if ( data.repeat !== undefined ) texture.repeat.fromArray( data.repeat );
				if ( data.wrap !== undefined ) {

					texture.wrapS = parseConstant( data.wrap[ 0 ], TEXTURE_WRAPPING );
					texture.wrapT = parseConstant( data.wrap[ 1 ], TEXTURE_WRAPPING );

				}

				if ( data.minFilter !== undefined ) texture.minFilter = parseConstant( data.minFilter, TEXTURE_FILTER );
				if ( data.magFilter !== undefined ) texture.magFilter = parseConstant( data.magFilter, TEXTURE_FILTER );
				if ( data.anisotropy !== undefined ) texture.anisotropy = data.anisotropy;

				if ( data.flipY !== undefined ) texture.flipY = data.flipY;

				textures[ data.uuid ] = texture;

			}

		}

		return textures;

	},

	parseMaterials: function ( json, textures ) {

		var materials = {};
		var envMapList = [];
		if ( json !== undefined ) {

			var loader = new THREE.MaterialLoader();
			loader.setTextures( textures );

			for ( var i = 0, l = json.length; i < l; i ++ ) {

				var data = json[ i ];

				if ( data.type === 'MultiMaterial' ) {

					// Deprecated

					var array = [];

					for ( var j = 0; j < data.materials.length; j ++ ) {

						array.push( loader.parse( data.materials[ j ] ) );

					}

					materials[ data.uuid ] = array;

				} else {



					materials[ data.uuid ] = loader.parse( data );
					// if(data.envMap != null || data.envMap !== undefined ){
					//     data.envMap = this.parseReflectionMap(materials, data.uuid, cubemap);
					// }

				}

			}

		}

		return materials;

	},

	parseUVs: function ( material, geometry ) {

		var data = material;

		if ( ( data.aoMap != null || data.aoMap !== undefined ) && geometry.attributes.uv != undefined ) {

			var uvs = geometry.attributes.uv.array;
			geometry.addAttribute( 'uv2', new THREE.BufferAttribute( uvs, 2 ) );

		}

		return geometry;

	},

	parseAnimations: function ( json ) {

		var animations = [];

		for ( var i = 0; i < json.length; i ++ ) {

			var clip = AnimationClip.parse( json[ i ] );

			animations.push( clip );

		}

		return animations;

	},

	parseObject: function () {

		var matrix = new THREE.Matrix4();

		return function parseObject( data, geometries, materials ) {

			var object;

			function getGeometry( name ) {

				if ( geometries[ name ] === undefined ) {

					console.warn( 'THREE.IzmoCTMLoader: Undefined geometry', name );

				}

				return geometries[ name ];

			}

			function getMaterial( name ) {

				if ( name === undefined ) return undefined;

				if ( Array.isArray( name ) ) {

					var array = [];

					for ( var i = 0, l = name.length; i < l; i ++ ) {

						var uuid = name[ i ];

						if ( materials[ uuid ] === undefined ) {

							console.warn( 'THREE.IzmoCTMLoader: Undefined material', uuid );

						}

						array.push( materials[ uuid ] );

					}

					return array;

				}

				if ( materials[ name ] === undefined ) {

					console.warn( 'THREE.IzmoCTMLoader: Undefined material', name );

				}

				return materials[ name ];

			}

			switch ( data.type ) {

				case 'Scene':

					object = new THREE.Scene();

					if ( data.background !== undefined ) {

						if ( Number.isInteger( data.background ) ) {

							object.background = new THREE.Color( data.background );

						}

					}

					if ( data.fog !== undefined ) {

						if ( data.fog.type === 'Fog' ) {

							object.fog = new THREE.Fog( data.fog.color, data.fog.near, data.fog.far );

						} else if ( data.fog.type === 'FogExp2' ) {

							object.fog = new THREE.FogExp2( data.fog.color, data.fog.density );

						}

					}

					break;

				case 'PerspectiveCamera':

					object = new THREE.PerspectiveCamera( data.fov, data.aspect, data.near, data.far );

					if ( data.focus !== undefined ) object.focus = data.focus;
					if ( data.zoom !== undefined ) object.zoom = data.zoom;
					if ( data.filmGauge !== undefined ) object.filmGauge = data.filmGauge;
					if ( data.filmOffset !== undefined ) object.filmOffset = data.filmOffset;
					if ( data.view !== undefined ) object.view = Object.assign( {}, data.view );

					break;

				case 'OrthographicCamera':

					object = new THREE.OrthographicCamera( data.left, data.right, data.top, data.bottom, data.near, data.far );

					break;

				case 'AmbientLight':

					object = new THREE.AmbientLight( data.color, data.intensity );

					break;

				case 'DirectionalLight':

					object = new THREE.DirectionalLight( data.color, data.intensity );

					break;

				case 'PointLight':

					object = new THREE.PointLight( data.color, data.intensity, data.distance, data.decay );

					break;

				case 'RectAreaLight':

					object = new THREE.RectAreaLight( data.color, data.intensity, data.width, data.height );

					break;

				case 'SpotLight':
					var spotLightObj = new THREE.SpotLight( data.color, data.intensity, data.distance, data.angle, data.penumbra, data.decay );
					spotLightObj.target.position.set( data.target.position.x, data.target.position.y, data.target.position.z );
					// var SpotLightTarget = new THREE.Vector3( data.target.position.x, data.target.position.y, data.target.position.z );

					object = spotLightObj;

					break;

				case 'HemisphereLight':

					object = new THREE.HemisphereLight( data.color, data.groundColor, data.intensity );

					break;

				case 'SkinnedMesh':

					console.warn( 'THREE.IzmoCTMLoader.parseObject() does not support SkinnedMesh yet.' );

				case 'Mesh':

					// data.geometry = this.parseUVs(data.material, data.geometry);

					var material = getMaterial( data.material );
					var geometry = getGeometry( data.geometry );
					geometry = this.parseUVs( material, geometry );

					object = new THREE.Mesh( geometry, material );

					break;

				case 'LOD':

					object = new THREE.LOD();

					break;

				case 'Line':

					object = new THREE.Line( getGeometry( data.geometry ), getMaterial( data.material ), data.mode );

					break;

				case 'LineLoop':

					object = new THREE.LineLoop( getGeometry( data.geometry ), getMaterial( data.material ) );

					break;

				case 'LineSegments':

					object = new THREE.LineSegments( getGeometry( data.geometry ), getMaterial( data.material ) );

					break;

				case 'PointCloud':
				case 'Points':

					object = new THREE.Points( getGeometry( data.geometry ), getMaterial( data.material ) );

					break;

				case 'Sprite':

					object = new THREE.Sprite( getMaterial( data.material ) );

					break;

				case 'Group':

					object = new THREE.Group();
					if ( data.background !== undefined ) object.background = new THREE.Color( data.background );
					if ( data.fog !== undefined ) object.fog = data.fog;

					break;

				default:

					object = new THREE.Object3D();

			}

			object.uuid = data.uuid;

			if ( data.name !== undefined ) object.name = data.name;
			if ( data.matrix !== undefined ) {

				matrix.fromArray( data.matrix );
				matrix.decompose( object.position, object.quaternion, object.scale );

			} else {

				if ( data.position !== undefined ) object.position.fromArray( data.position );
				if ( data.rotation !== undefined ) object.rotation.fromArray( data.rotation );
				if ( data.quaternion !== undefined ) object.quaternion.fromArray( data.quaternion );
				if ( data.scale !== undefined ) object.scale.fromArray( data.scale );

			}

			if ( data.castShadow !== undefined ) object.castShadow = data.castShadow;
			if ( data.receiveShadow !== undefined ) object.receiveShadow = data.receiveShadow;

			if ( data.shadow ) {

				if ( data.shadow.bias !== undefined ) object.shadow.bias = data.shadow.bias;
				if ( data.shadow.radius !== undefined ) object.shadow.radius = data.shadow.radius;
				if ( data.shadow.mapSize !== undefined ) object.shadow.mapSize.fromArray( data.shadow.mapSize );
				if ( data.shadow.camera !== undefined ) object.shadow.camera = this.parseObject( data.shadow.camera );

			}

			if ( data.visible !== undefined ) object.visible = data.visible;
			if ( data.userData !== undefined ) object.userData = data.userData;

			if ( data.children !== undefined ) {

				for ( var child in data.children ) {

					object.add( this.parseObject( data.children[ child ], geometries, materials ) );

				}

			}

			if ( data.type === 'LOD' ) {

				var levels = data.levels;

				for ( var l = 0; l < levels.length; l ++ ) {

					var level = levels[ l ];
					var child = object.getObjectByProperty( 'uuid', level.object );

					if ( child !== undefined ) {

						object.addLevel( child, level.distance );

					}

				}

			}

			return object;

		};

	}()

} );
