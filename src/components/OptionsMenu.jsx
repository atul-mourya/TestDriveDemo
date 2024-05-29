import React from 'react';

const OptionsMenu = ( { onQuickPlay } ) => (
	<div id="options">
		<button className="option-btn" id="quick-play" onClick={onQuickPlay}>
			<p>Quick Play</p>
		</button>
		<button className="option-btn" id="events">
			<p>Events</p>
		</button>
		<button className="option-btn" id="custom-play">
			<p>Custom Play</p>
		</button>
		<button className="option-btn" id="settings">
			<p>Settings</p>
		</button>
		<button className="option-btn" id="about">
			<p>About</p>
		</button>
	</div>
);

export default OptionsMenu;
