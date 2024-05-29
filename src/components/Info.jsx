import React from 'react';

const style = {
	position: 'absolute',
	zIndex: 1,
	textAlign: 'center',
	width: '100%',
};

const Info = () => (
	<div style={style}>
        Test Drive Game demo, inspired by trigger rally and alteredq<br />
        Press A, S, D, W to move the car<br />
        Press R to reset the car position and C to change the camera view<br />
	</div>
);

export default Info;
