import React, { forwardRef, useEffect, useRef } from 'react';
import './GameContainer.css';

const GameContainer = forwardRef( ( props, ref ) => {

	const isPausedRef = useRef( false );

	const handleEscKeyPress = ( event ) => {

		if ( event.key === 'Escape' || event.keyCode === 27 ) {

			isPausedRef.current ? window.game.resume() : window.game.pause();
			isPausedRef.current = ! isPausedRef.current;

		}

	};

	useEffect( () => {

		// Add event listener for keydown
		window.addEventListener( 'keydown', handleEscKeyPress );

		// Cleanup event listener on component unmount
		return () => {

			window.removeEventListener( 'keydown', handleEscKeyPress );

		};

	}, [] ); // Empty dependency array ensures this runs once on mount and cleanup on unmount

	return (
		<div id="game-container" ref={ref}></div>
	);

} );

export default GameContainer;
