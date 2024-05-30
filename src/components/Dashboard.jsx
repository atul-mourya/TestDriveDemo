
import React, { useState } from 'react';
import './Dashboard.css';
import OptionsMenu from './OptionsMenu';
import FooterMenu from './FooterMenu';
import SettingsPanel from './SettingsPanel';
import EventPanel from './EventPanel';

const Dashboard = ( { onPlayStart } ) => {

	const [ isSettingsOpen, setSettingsOpen ] = useState( false );
	const [ isEventsOpen, setEventsOpen ] = useState( false );

	const handleQuickPlay = () => onPlayStart( { level: "alps", map: "lake", type: "events" } );
	const handleSettingOpen = () => setSettingsOpen( true );
	const handleSettingClose = () => setSettingsOpen( false );
	const handleEventOpen = () => setEventsOpen( true );
	const handleEventClose = () => setEventsOpen( false );

	return (
		<>
			{isSettingsOpen && <SettingsPanel isOpen={isSettingsOpen} setClose={handleSettingClose}/>}
			{isEventsOpen && <EventPanel isOpen={isEventsOpen} setClose={handleEventClose}/>}
			<OptionsMenu onQuickPlay={handleQuickPlay} onSettingsOpen={handleSettingOpen} onEventsOpen={handleEventOpen}/>
			<FooterMenu />
		</>
	);

};

export default Dashboard;
