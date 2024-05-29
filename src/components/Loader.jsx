import React from 'react';
const loaderStyle = {
	position: 'absolute',
	top: 0,
	left: 0,
	height: '100%',
	width: '100%',
	backgroundColor: 'rgb(255, 255, 255)',
	zIndex: 2,
};
const loaderImgStyle = {
	position: 'absolute',
	height: '120px',
	width: '120px',
	left: 'calc( 50% - 60px )',
	top: 'calc( 50% - 60px )',
};

const Loader = () => (
	<div style={loaderStyle}>
		<img style={loaderImgStyle} src="images/loader.gif" alt="Loading..." />
	</div>
);

export default Loader;
