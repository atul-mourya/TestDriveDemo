import React from 'react';
import './Dashboard.css';
import OptionsMenu from './OptionsMenu';
import FooterMenu from './FooterMenu';
import SettingsPanel from './SettingsPanel';
import EventPanel from './EventPanel';
import useSettingsStore from '../stores/settings';
import useEventModeStore from '../stores/game_events';

const Dashboard = ( { onPlayStart } ) => {

	const { isSettingPanelActive } = useSettingsStore();
	const { isEventPanelActive, quickPlayDefaults } = useEventModeStore();

	const handleQuickPlay = () => onPlayStart( quickPlayDefaults );
	const handleEventPlay = ( data ) => onPlayStart( data );


	return (
		<>
			{isSettingPanelActive && <SettingsPanel/>}
			{isEventPanelActive && <EventPanel onEventLaunch={ handleEventPlay }/>}
			<OptionsMenu onQuickPlay={ handleQuickPlay} />
			<FooterMenu />
		</>
	);

};

export default Dashboard;
