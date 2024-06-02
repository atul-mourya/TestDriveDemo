import { create } from 'zustand';

const useEventModeStore = create( ( set ) => ( {
	isEventPanelActive: false,
	setEventPanelActive: ( val ) => set( { isEventPanelActive: val } ),
	quickPlayDefaults: {
		level: "alps",
		map: "lake",
		type: "events",
	},
	event: {
		level: "alps",
		map: "lake",
		type: "events",
		setLevel: ( name ) =>
			set( ( state ) => ( {
				level: { ...state.level, level: name },
			} ) ),
		setMap: ( name ) =>
			set( ( state ) => ( {
				map: { ...state.map, map: name },
			} ) ),
		setType: ( name ) =>
			set( ( state ) => ( {
				type: { ...state.type, type: name },
			} ) ),
	},
} ) );

export default useEventModeStore;
