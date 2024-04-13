/* jshint expr: true */

import {
	Color,
	HalfFloatType,
} from 'three';

import {
	EffectComposer,
	RenderPass,
	EffectPass,
	SMAAEffect,
	SMAAPreset,
	DepthOfFieldEffect,
} from "postprocessing";
import { N8AOPostPass } from "n8ao";


class PostProcessingManager {

	constructor( scene, camera, renderer, width, height, passes ) {

		passes = passes || [];

		let color = new Color();
		renderer.getClearColor( color );

		this.renderer = renderer;
		this.enabled = true;
		this.clearColor = color.getHex();
		this.clearAlpha = renderer.getClearAlpha();

		this.lastFramePasses = [];

		this.composer = new EffectComposer( renderer, { frameBufferType: HalfFloatType } );

		const renderPass = new RenderPass( scene, camera );
		renderPass.name = 'renderPass';
		this.composer.addPass( renderPass );

		const effects = [];

		passes.forEach( ( { type, config } ) => {

			let pass;

			switch ( type ) {

				case "smaa":
					pass = new SMAAEffect( { preset: SMAAPreset.HIGH } );
					effects.push( pass );
					break;
				case "dof":
					pass = new DepthOfFieldEffect( camera, {
						focusDistance: 0.0,
						focalLength: 0.048,
						bokehScale: 2.0,
						height: 480
					} );
					effects.push( pass );
					break;

				case "n8ao":
					pass = new N8AOPostPass( scene, camera, width, height );
					pass.configuration.halfRes = config.halfRes ?? false;
					pass.configuration.aoRadius = config.aoRadius ?? 100.0;
					pass.configuration.distanceFalloff = config.distanceFalloff ?? 0.2;
					pass.configuration.intensity = config.intensity ?? 10.0;
					pass.configuration.gammaCorrection = config.gammaCorrection ?? false;
					pass.configuration.screenSpaceRadius = config.screenSpaceRadius ?? true;
					pass.configuration.depthAwareUpsampling = config.depthAwareUpsampling ?? true;
					pass.setQualityMode( config.qualityMode ?? "Low" );
					this.composer.addPass( pass );

					break;

			}

			if ( config.isLastFramePass ) {

				pass.enabled = false;
				this.lastFramePasses.push( pass );

			}

			pass.name = type;
			pass.setSize( width, height );

		} );

		const effectsPasses = new EffectPass( camera, ...effects );
		effectsPasses.name = "effectPass";
		this.composer.addPass( effectsPasses );

		this.composer.setSize( width, height );

	}

	dispose() {

		this.composer && this.composer.inputBuffer.dispose();
		this.composer && this.composer.outputBuffer.dispose();
		const passes = this.getPasses();
		passes.forEach( pass => pass.dispose && pass.dispose() );

	};

	update() {

		this.composer.render();

	}

	updateLastFrame() {

		this.lastFramePasses.forEach( pass => {

			pass.enabled = true;

		} );

		this.update();

		this.lastFramePasses.forEach( pass => {

			pass.enabled = false;

		} );

	}

	setCamera( camera ) {

		const exceptions = [ 'smaa' ];
		this.composer.passes.forEach( pass => {

			if ( exceptions.includes( pass.name ) ) return;
			if ( pass.name === 'effectPass' ) {

				pass.effects.forEach( effect => {

					if ( effect.camera ) effect.camera = camera;

				} );

			}

			if ( pass.camera ) pass.camera = camera;


		} );

	}

	setSize( width, height ) {

		this.composer.setSize( width, height );

	}

	getPasses() {

		return this.composer.passes;

	}

	getEffects() {

		return this.getPassByName( 'effectPass' ).effects;

	}

	setSelection( object, effectName ) {

		if ( effectName ) {

			const effectPass = this.getEffectByName( effectName );
			effectPass.effects.selection.add( object );

		} else {

			const effectPasses = this.composer.passes.find( p => p.name === 'effectPass' );
			effectPasses.effects.forEach( effect => effect && effect.selection && effect.selection.add( object ) );

		}

	}

	getEffectByName( name ) {

		const effectPasses = this.composer.passes.find( p => p.name === 'effectPass' );
		return effectPasses.effects.find( p => p.name === name );

	}

	getPassByName( name ) {

		return this.composer.passes.find( p => p.name === name );

	}

	updatePPConfig( name, configData ) {

		const pass = this.getEffectByName( name );

		if ( ! pass ) {

			console.error( `Pass with the name: ${name}not found` );
			return;

		}

		for ( const key in configData ) {

			if ( pass.hasOwnProperty( key ) ) pass[ key ] = configData[ key ];

		}

	}

}

export default PostProcessingManager;
