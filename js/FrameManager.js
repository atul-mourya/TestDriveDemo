import { EventDispatcher } from "three";

class FrameManager extends EventDispatcher {

	constructor( renderer, scene, camera, materialManager, hudManager, postProcessor = {} ) {

		super();

		let doAnimate = false;
		let convergence = 0;
		let animationFrameRequestId = null;

		let MAX_FRAME_CONVERGENCE = Infinity;
		const LAST_FRAME_RENDERED_EVENT = 'renderedLastFrame';

		this.scene = scene;
		this.camera = camera;

		this.startAnimate = () => {

			if ( ! doAnimate ) doAnimate = true; //starting animations will only render non lastRendering sequence

		};

		this.stopAnimate = () => doAnimate = false;
		this.getMaxConvergence = () => MAX_FRAME_CONVERGENCE;
		this.setMaxConvergence = value => MAX_FRAME_CONVERGENCE = value;

		this.initAnimateFrame = callback => {

			const _animateFrame = () => {

				animationFrameRequestId = requestAnimationFrame( _animateFrame );
				if ( convergence < MAX_FRAME_CONVERGENCE || doAnimate ) {

					// hudManager.onRenderStart();
					this.render( callback );
					// hudManager.onRenderEnd();

				} else if ( convergence == MAX_FRAME_CONVERGENCE ) {

					// hudManager.onRenderStart();
					this.renderLastFrame();
					this.dispatchEvent( { type: LAST_FRAME_RENDERED_EVENT } );
					// hudManager.onRenderEnd();

				}

				convergence += 1;

			};

			_animateFrame();

		};

		this.refreshRenderFrame = () => {

			convergence = 0;

		};

		this.renderLastFrame = () => {

			// TODO: instead of manual pass control create dual composer.
			// 1: for always render
			// 2: for last frame rendering

			materialManager.update( scene );
			postProcessor.enabled && postProcessor.updateLastFrame();
			console.log( 'Last frame render complete!' );

		};

		this.render = callback => {

			postProcessor.enabled ? postProcessor.update() : renderer.render( this.scene, this.camera );
			callback && callback();

		};

		this.reRenderScene = () => {

			materialManager.setDirty();
			this.refreshRenderFrame();

		};

		this.dispose = () => {

			cancelAnimationFrame( animationFrameRequestId );

		};

		this.getDoAnimate = () =>{

			return doAnimate;

		};

		this.getConvergance = () =>{

			return convergence;

		};

	}

}

export default FrameManager;
