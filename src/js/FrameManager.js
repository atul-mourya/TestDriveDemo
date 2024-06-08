import Stats from 'three/examples/jsm/libs/stats.module';

class FrameManager {

	constructor() {

		let doAnimate = false;
		let animationFrameRequestId = null;

		this.stats = new Stats();
		document.body.appendChild( this.stats.dom );

		this.fpsLimit = 60;

		this.startAnimate = () => doAnimate = true;
		this.stopAnimate = () => doAnimate = false;

		this.initAnimateFrame = ( callback ) => {

			const _animateFrame = () => {

				setTimeout( () => {

					animationFrameRequestId = requestAnimationFrame( _animateFrame );
					if ( doAnimate ) {

						this.stats.begin();
						callback && callback();
						this.stats.end();

					}

				}, 1000 / this.fpsLimit );

			};

			_animateFrame();

		};

		this.dispose = () => {

			cancelAnimationFrame( animationFrameRequestId );
			document.body.removeChild( this.stats.dom );

		};

		this.getDoAnimate = () => doAnimate;

	}

}

export default FrameManager;
