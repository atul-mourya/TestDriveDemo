import TestDrive from "./main";

const onGameReady = () => {

	document.getElementById( "main-menu" ).style.display = 'none';
	document.getElementById( "loader" ).style.display = 'none';
	document.getElementById( "game-container" ).style.display = 'block';

};

const quickPlayBtn = document.getElementById( 'quick-play' );
quickPlayBtn.addEventListener( 'click', quickPlay );

function quickPlay() {

	document.getElementById( "loader" ).style.display = 'block';
	const container = document.getElementById( "game-container" );
	container.style.display = 'block';
	quickPlayBtn.removeEventListener( 'click', quickPlay );

	const game = new TestDrive( {
		url: "/resources/models/model_lookups.json",
		container,
	}, onGameReady );
	game.loadGame( 'alps', 'lake', 'events' );

	// window.game = game;

}

export default quickPlay;

