// interesting readings here: https://www.terrain.dk/

import { RepeatWrapping, MeshStandardMaterial, TextureLoader, MathUtils, SRGBColorSpace } from 'three';

/**
 * Convert numbers to GLSL compatible strings (e.g., "1" becomes "1.0").
 * @param {number} n - The number to convert.
 * @returns {string} The number as a GLSL compatible string.
 */
const glslifyNumber = n => Number.isInteger( n ) ? `${n}.0` : `${n}`;

/**
 * TerrainMaterial extends MeshStandardMaterial to support blended textures
 * based on vertex height and custom GLSL expressions.
 */
class TerrainMaterial extends MeshStandardMaterial {

	/**
   * Asynchronously creates and initializes a TerrainMaterial instance with loaded textures.
   * @param {object} data - Data containing paths to texture images and terrain parameters.
   * @returns {Promise<TerrainMaterial>} - A promise that resolves to a fully initialized TerrainMaterial.
   */
	static async create( data ) {

		const material = new TerrainMaterial();
		await material.loadTextures( data );
		return material;

	}

	constructor() {

		super();
		this.blendData = [];
		this.seaLevel = 0;

	}

	/**
   * Loads the textures and sets up blending parameters.
   * @param {object} data - Data containing paths to texture images and terrain parameters.
   */
	async loadTextures( data ) {

		const loader = new TextureLoader();

		// Load the textures asynchronously
		const [
			baseTexture,
			grassTexture,
			rockTexture,
			snowTexture,
			trackTexture
		] = await Promise.all( [
			loader.loadAsync( './images/sand001.jpg' ),
			loader.loadAsync( './images/GrassGreenTexture0002.jpg' ),
			loader.loadAsync( './images/rock001.png' ),
			loader.loadAsync( './images/Snow.jpg' ),
			data.trackMap ? loader.loadAsync( data.trackMap ) : null
		] );

		// Configure each texture
		this.configureTexture( baseTexture, { repeat: [ 200, 200 ] } );
		this.configureTexture( grassTexture, { repeat: [ 200, 200 ] } );
		this.configureTexture( rockTexture, { repeat: [ 20, 20 ] } );
		this.configureTexture( snowTexture );
		if ( trackTexture ) {

			this.configureTexture( trackTexture, { anisotropy: 16 } );

		}

		this.seaLevel = data.seaLevel;

		const grassLevel1 = this.seaLevel;
		const grassLevel2 = this.seaLevel + 5;
		const grassLevel3 = this.seaLevel + 40;
		const grassLevel4 = this.seaLevel + 80;

		const snowLevel1 = this.seaLevel + 60;
		const snowLevel2 = this.seaLevel + 80;

		// Set up blend parameters
		const blendParams = {
			baseTexture,
			grassTexture,
			grassLevel1,
			grassLevel2,
			grassLevel3,
			grassLevel4,
			rockTexture,
			rockSlopeStartAngle: MathUtils.degToRad( 27 ),
			rockSlopeEndAngle: MathUtils.degToRad( 45 ),
			snowTexture,
			snowLevel1,
			snowLevel2,
			trackTexture
		};

		// Populate the blend data and configure the material shader
		this.setupBlendData( blendParams );
		this.onBeforeCompile = ( shader ) => this.customizeShader( shader );

	}

	/**
   * Configures texture properties.
   * @param {THREE.Texture} texture - The texture to configure.
   * @param {object} options - Optional configuration for texture properties.
   */
	configureTexture( texture, options = {} ) {

		texture.wrapS = texture.wrapT = RepeatWrapping;
		texture.colorSpace = SRGBColorSpace;
		if ( options.repeat ) {

			texture.repeat.set( ...options.repeat );

		}

		if ( options.anisotropy ) {

			texture.anisotropy = options.anisotropy;

		}

		texture.needsUpdate = true;

	}

	/**
   * Sets up blend data for the material based on provided options.
   * @param {object} options - Options for setting up blend data.
   */
	setupBlendData( options ) {

		const {
			baseTexture,
			grassTexture,
			grassLevel1,
			grassLevel2,
			grassLevel3,
			grassLevel4,
			rockTexture,
			rockSlopeStartAngle,
			rockSlopeEndAngle,
			snowTexture,
			snowLevel1,
			snowLevel2,
			trackTexture
		} = options;

		this.blendData = [
			{ texture: baseTexture },
			{
				texture: grassTexture,
				levels: [ grassLevel1, grassLevel2, grassLevel3, grassLevel4 ]
			},
			{
				texture: rockTexture,
				glsl: `slope > ${rockSlopeEndAngle} ? 0.2 : 1.0 - smoothstep(${rockSlopeStartAngle}, ${rockSlopeEndAngle}, slope) + 0.2`
			},
			{
				texture: snowTexture,
				glsl: `1.0 - smoothstep(${glslifyNumber( snowLevel1 )} + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, ${glslifyNumber( snowLevel2 )}, vPosition.z)`
			},
			...( trackTexture ? [ { texture: trackTexture, glsl: '1.0 - texture2D( texture_4, MyvUv ).a' } ] : [] )
		];

	}

	/**
   * Customizes the shader to blend textures based on vertex height and slopes.
   * @param {THREE.Shader} shader - The shader to customize.
   */
	customizeShader( shader ) {

		let declare = '';
		let assign = '';

		const { repeat: t0Repeat, offset: t0Offset } = this.blendData[ 0 ].texture;

		this.blendData.forEach( ( { texture, levels, glsl }, i ) => {

			declare += `uniform sampler2D texture_${i};\n`;

			if ( i !== 0 ) {

				let blendAmount;
				if ( levels !== undefined ) {

					const v = levels.map( glslifyNumber );
					if ( v[ 1 ] - v[ 0 ] < 1 ) v[ 0 ] = glslifyNumber( Number( v[ 0 ] ) - 1 );
					if ( v[ 3 ] - v[ 2 ] < 1 ) v[ 3 ] = glslifyNumber( Number( v[ 3 ] ) + 1 );

					blendAmount = `1.0 - smoothstep(${v[ 0 ]}, ${v[ 1 ]}, vPosition.z) + smoothstep(${v[ 2 ]}, ${v[ 3 ]}, vPosition.z)`;

				} else {

					blendAmount = glsl;

				}

				const repeats = `vec2(${glslifyNumber( texture.repeat.x )}, ${glslifyNumber( texture.repeat.y )})`;
				const offsets = `vec2(${glslifyNumber( texture.offset.x )}, ${glslifyNumber( texture.offset.y )})`;
				const textureColor = `texture2D(texture_${i}, MyvUv * ${repeats} + ${offsets})`;
				const weight = `max(min(${blendAmount}, 1.0), 0.0)`;

				assign += `color = mix(${textureColor}, color, ${weight});\n`;

			}

		} );
		const underwaterEffectShader = `
        // Apply turquoise blending for areas below a certain depth
        // if (vPosition.z < ${glslifyNumber( this.seaLevel )}) {
        //     float ratio = smoothstep(${glslifyNumber( this.seaLevel )}, ${glslifyNumber( this.seaLevel - 3.5 )}, vPosition.z);
        //     color = mix(color, vec4(0.0, 0.5, 0.5, 1.0), ratio);
        // }
        `;

		// Example integration into your shader fragment code
		const fragBlend = `
        float slope = acos(clamp(dot(myNormal, vec3(0.0, 0.0, 1.0)), -1.0, 1.0));
        vec4 color = texture2D(texture_0, MyvUv * vec2(${glslifyNumber( t0Repeat.x )}, ${glslifyNumber( t0Repeat.y )}) + vec2(${glslifyNumber( t0Offset.x )}, ${glslifyNumber( t0Offset.y )})); // base
        ${assign}
        ${underwaterEffectShader}  // Integrate the underwater effect
        diffuseColor = color;
        `;


		const fragPars = `
        ${declare}
        varying vec2 MyvUv;
        varying vec3 vPosition;
        varying vec3 myNormal;
        `;

		shader.vertexShader = shader.vertexShader
			.replace( '#include <common>', 'varying vec2 MyvUv;\nvarying vec3 vPosition;\nvarying vec3 myNormal;\n#include <common>' )
			.replace( '#include <uv_vertex>', 'MyvUv = uv;\nvPosition = position;\nmyNormal = normal;\n#include <uv_vertex>' );

		shader.fragmentShader = shader.fragmentShader
			.replace( '#include <common>', fragPars + '\n#include <common>' )
			.replace( '#include <map_fragment>', fragBlend );

		this.blendData.forEach( ( _, i ) => {

			shader.uniforms[ `texture_${i}` ] = { type: 't', value: this.blendData[ i ].texture };

		} );

	}

}

export default TerrainMaterial;
