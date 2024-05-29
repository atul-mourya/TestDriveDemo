
import React from 'react';
import './Dashboard.css';
import OptionsMenu from './OptionsMenu';
import FooterMenu from './FooterMenu';

const dashboardStyle = {
	position: 'absolute',
	height: '100%',
	width: '100%',
	top: 0,
	left: 0,
	backgroundColor: 'aquamarine',
};

const Dashboard = ( { onPlayStart } ) => {

	const handleQuickPlay = () => onPlayStart( { level: "alps", map: "lake", type: "events" } );

	return (
		<div style={dashboardStyle}>
			<OptionsMenu onQuickPlay={handleQuickPlay} />
			<FooterMenu />
		</div>
	);

};

export default Dashboard;
