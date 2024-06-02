import React, { forwardRef, useEffect } from 'react';
import './GameContainer.css';

const GameContainer = forwardRef( ( props, ref ) => {

	// Handler for ESC key press
	const handleEscKeyPress = ( event ) => {

	  if ( event.key === 'Escape' || event.keyCode === 27 ) {

			// Handle the ESC key press
			console.log( 'ESC key pressed' );
			// You can add additional logic here, such as closing a modal, exiting full screen, etc.

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
