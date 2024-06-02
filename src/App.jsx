import React, { useState, useRef, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import GameContainer from './components/GameContainer';
import Loader from './components/Loader'; // Ensure you have a Loader component
import Info from './components/Info';
import TestDrive from './js/main';

const App = () => {

	const [ isDashboardActive, setDashboardActive ] = useState( true );
	const [ isGameActive, setGameActive ] = useState( false );
	const [ isLoaderVisible, setLoaderVisible ] = useState( false );
	const [ gameContext, setGameContext ] = useState( {} );

	const gameContainerRef = useRef( null );
	const gameInstanceRef = useRef( null );

	const onGameReady = useCallback( () => {

		setLoaderVisible( false ); // Disable loader when the game is ready

	}, [] );

	const handleStart = useCallback( ( data ) => {

		setGameContext( data );
		setDashboardActive( false );
		setGameActive( true );
		setLoaderVisible( true ); // Enable loader when the game starts loading

	}, [] );

	useEffect( () => {

		if ( isGameActive && gameContainerRef.current ) {

			const container = gameContainerRef.current;
			const game = new TestDrive(
				{
					url: "/resources/models/model_lookups.json",
					container,
				},
				onGameReady
			);
			gameInstanceRef.current = game;
			game.loadGame( gameContext.level, gameContext.map, gameContext.type );

		}

	}, [ isGameActive, gameContext, onGameReady ] );

	return (
		<div>
			{isDashboardActive && <Dashboard onPlayStart={handleStart}/>}
			{isLoaderVisible && <Loader />}
			{isGameActive && <>
				<Info />
				<GameContainer ref={gameContainerRef} />
			</>}
		</div>
	);

};

export default App;
