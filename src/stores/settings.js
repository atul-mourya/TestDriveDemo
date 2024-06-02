import { create } from 'zustand';

const useSettingsStore = create( ( set ) => ( {
	isSettingPanelActive: false,
	setSettingPanelActive: ( val ) => set( { isSettingPanelActive: val } ),
	audio: {
		masterVolume: 50,
		musicVolume: 50,
		sfxVolume: 50,
		muteAll: false,
		setMasterVolume: ( volume ) =>
			set( ( state ) => ( {
				audio: { ...state.audio, masterVolume: volume },
			} ) ),
		setMusicVolume: ( volume ) =>
			set( ( state ) => ( {
				audio: { ...state.audio, musicVolume: volume },
			} ) ),
		setSfxVolume: ( volume ) =>
			set( ( state ) => ( {
				audio: { ...state.audio, sfxVolume: volume },
			} ) ),
		toggleMuteAll: () =>
			set( ( state ) => ( {
				audio: { ...state.audio, muteAll: ! state.audio.muteAll },
			} ) ),
	},
	video: {
		resolution: '1920x1080',
		fullscreen: false,
		vSync: false,
		graphicsQuality: 'High',
		setResolution: ( res ) =>
			set( ( state ) => ( {
				video: { ...state.video, resolution: res },
			} ) ),
		toggleFullscreen: () =>
			set( ( state ) => ( {
				video: { ...state.video, fullscreen: ! state.video.fullscreen },
			} ) ),
		toggleVSync: () =>
			set( ( state ) => ( {
				video: { ...state.video, vSync: ! state.video.vSync },
			} ) ),
		setGraphicsQuality: ( quality ) =>
			set( ( state ) => ( {
				video: { ...state.video, graphicsQuality: quality },
			} ) ),
	},
} ) );

export default useSettingsStore;
