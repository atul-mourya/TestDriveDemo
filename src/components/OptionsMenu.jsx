import React from 'react';
import { Button } from '@nextui-org/react';
import '../styles/OptionsMenu.css';
import useSettingsStore from '../stores/settings';
import useEventModeStore from '../stores/game_events';

export default function OptionsMenu( { onQuickPlay } ) {

	const { setSettingPanelActive } = useSettingsStore();
	const { setEventPanelActive } = useEventModeStore();

	const handleSettingsOpen = () => setSettingPanelActive( true );
	const handleEventOpen = () => setEventPanelActive( true );

	return (
		<div id="options">
			<Button className="option-btn bg-white" onClick={onQuickPlay}>
				<p>Quick Play</p>
			</Button>
			<Button className="option-btn bg-white" onClick={handleEventOpen}>
				<p>Events</p>
			</Button>
			<Button className="option-btn bg-white">
				<p>Custom Play</p>
			</Button>
			<Button className="option-btn bg-white" onClick={handleSettingsOpen}>
				<p>Settings</p>
			</Button>
			<Button className="option-btn bg-white">
				<p>About</p>
			</Button>
		</div>
	);

}


