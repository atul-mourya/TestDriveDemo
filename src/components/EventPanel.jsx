import React, { useEffect, useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Tabs, Tab, Card, CardBody, Image, useDisclosure } from "@nextui-org/react";
import useEventModeStore from '../stores/game_events';

import GameEvent from '../../public/resources/data/events/events.json';
const renderMapCard = ( key, currentData ) => {

	return (
		<Card
			isBlurred
			className="border-none bg-background/60 dark:bg-default-100/50 max-w-[610px]"
			shadow="sm"
		>
			<CardBody>
				<div className="grid grid-cols-6 md:grid-cols-12 gap-6 md:gap-4 items-center justify-center">
					<div className="relative col-span-6 md:col-span-4">
						<Image
							alt="Map cover"
							className="object-cover"
							height={200}
							shadow="md"
							src={currentData.map.preview}
							width="100%"
						/>
					</div>
					<div className="flex flex-col col-span-6 md:col-span-8">
						<div className="flex justify-between items-start">
							<div className="flex flex-col gap-0">
								<h3 className="font-semibold text-foreground/90">{key.toUpperCase()}</h3>
								<p className="text-small text-foreground/80">Size: {currentData.map.size[ 0 ] / 2} m <sup>2</sup></p>
								<h1 className="text-large font-medium mt-2">Frontend Radio</h1>
							</div>
						</div>
					</div>
		  		</div>
			</CardBody>
	  </Card>
	);

};

const renderLevelTabs = ( data, path = [], selectedTabs = {}, setSelectedTabs ) => {

	return Object.keys( data ).map( key => {

		const currentPath = [ ...path, key ];
		const currentData = data[ key ];

		const handleTabChange = ( index ) => {

			const newSelectedTabs = { level: currentPath[ 0 ], map: index };
			setSelectedTabs( newSelectedTabs );

		};

	  if ( path.length === 1 ) { // 2nd level (0-based index)

			// Render Card at 3rd depth level
			return (
				<Tab key={key} title={key}>
					{renderMapCard( key, currentData )}
				</Tab>
			);

		} else {

			// Render Tabs up to the 2nd level
			return (
		  		<Tab key={key} title={key}>
					<Tabs
						aria-label={key}
						isVertical={true}
						classNames={{ panel: "w-full" }}
						selectedIndex={selectedTabs[ currentPath.join( '/' ) ] || 0}
						onSelectionChange={handleTabChange}
					>
						{renderLevelTabs( currentData, currentPath, selectedTabs, setSelectedTabs )}
					</Tabs>
				</Tab>
			);

		}

	} );

};

export default function EventPanel( { onEventLaunch } ) {

	const { isEventPanelActive, setEventPanelActive } = useEventModeStore();
	const { onClose } = useDisclosure();
	const [ selectedTabs, setSelectedTabs ] = useState( {} );

	const handleClose = () => {

		setEventPanelActive( false );
		onClose();

	};

	const handleGameLaunch = () => {

		onEventLaunch( { ...selectedTabs, type: "events" } );

	};

	useEffect( () => console.log( selectedTabs ), [ selectedTabs ] );

	return (
		<Modal backdrop="blur" isOpen={isEventPanelActive} onClose={handleClose} isDismissable={false}>
			<ModalContent>
				{( onClose ) => (
					<>
						<ModalHeader className="flex flex-col gap-1">Events</ModalHeader>
						<ModalBody>
							<Tabs aria-label="Options" isVertical={true} classNames={{ panel: "w-full" }}>
								{renderLevelTabs( GameEvent, [], selectedTabs, setSelectedTabs )}
							</Tabs>
						</ModalBody>
						<ModalFooter>
							<Button color="danger" variant="light" onPress={handleClose}>
								Cancel
							</Button>
							<Button color="primary" onPress={ handleGameLaunch }>
								Launch Game
							</Button>
						</ModalFooter>
					</>
				)}
			</ModalContent>
	  	</Modal>
	);

}
