import { EventDispatcher } from "three";

class FrameManager extends EventDispatcher {

	constructor( renderer, scene, camera, materialManager, hudManager, postProcessor = {} ) {

		super();

		let doAnimate = false;
		let animationFrameRequestId = null;


		this.scene = scene;
		this.camera = camera;
		this.fpsLimit = 60;

		this.startAnimate = () => doAnimate = true;
		this.stopAnimate = () => doAnimate = false;

		this.initAnimateFrame = callback => {

			const _animateFrame = () => {

				setTimeout( () => {

					animationFrameRequestId = requestAnimationFrame( _animateFrame );
					if ( doAnimate ) {

						// hudManager.onRenderStart();
						this.render( callback );
						// hudManager.onRenderEnd();

					}

				}, 1000 / this.fpsLimit );


			};

			_animateFrame();

		};

		this.render = callback => {

			// postProcessor.enabled ? postProcessor.update() : renderer.render( this.scene, this.camera );
			callback && callback();

		};

		this.dispose = () => {

			cancelAnimationFrame( animationFrameRequestId );

		};

		this.getDoAnimate = () =>{

			return doAnimate;

		};

	}

}

export default FrameManager;
