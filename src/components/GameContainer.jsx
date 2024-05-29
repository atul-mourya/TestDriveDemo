import React, { forwardRef } from 'react';
import './GameContainer.css';

const GameContainer = forwardRef( ( props, ref ) => (
	<div id="game-container" ref={ref}></div>
) );

export default GameContainer;
