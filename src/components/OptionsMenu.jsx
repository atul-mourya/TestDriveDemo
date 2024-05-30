import React from 'react';
import { Button } from '@nextui-org/react';
import '../styles/OptionsMenu.css';

const OptionsMenu = ( { onQuickPlay, onSettingsOpen, onEventsOpen } ) => (
	<div id="options">
		<Button className="option-btn bg-white" onClick={onQuickPlay}>
			<p>Quick Play</p>
		</Button>
		<Button className="option-btn bg-white" onClick={onEventsOpen}>
			<p>Events</p>
		</Button>
		<Button className="option-btn bg-white">
			<p>Custom Play</p>
		</Button>
		<Button className="option-btn bg-white" onClick={onSettingsOpen}>
			<p>Settings</p>
		</Button>
		<Button className="option-btn bg-white">
			<p>About</p>
		</Button>
	</div>
);

export default OptionsMenu;
