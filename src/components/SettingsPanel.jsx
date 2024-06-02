import React from "react";
import { FaVolumeXmark } from "react-icons/fa6";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Tabs, Tab, Card, CardBody, Slider, Switch, Select, SelectItem, useDisclosure } from "@nextui-org/react";
import useSettingsStore from '../stores/settings';

export default function SettingPanel() {

	const { isSettingPanelActive, setSettingPanelActive } = useSettingsStore();

	const { onClose } = useDisclosure();

	const handleClose = () => {

		setSettingPanelActive( false );
		onClose();

	};

	return (
		<Modal backdrop="blur" isOpen={isSettingPanelActive} onClose={handleClose} isDismissable={false}>
			<ModalContent>
				{( onClose ) => (
					<>
						<ModalHeader className="flex flex-col gap-1">Settings</ModalHeader>
						<ModalBody>
							<Tabs aria-label="Options" isVertical={true} classNames={{
								panel: "w-full",
							}}>
								<Tab key="audio" title="Audio">
									<Card>
										<CardBody>
											<Slider size="sm" label="Master Volume" color="success" defaultValue={40} />
											<Slider size="sm" label="Music Volume" color="success" defaultValue={40} />
											<Slider size="sm" label="SFX Volume" color="success" defaultValue={40} />
											<br/>
											<Switch size="sm"><FaVolumeXmark/></Switch>
										</CardBody>
									</Card>
								</Tab>
								<Tab key="video" title="Video">
									<Card>
										<CardBody>
											<Select label="Resolution" labelPlacement="outside" className="max-w-xs mb-1" size="sm">
												{[ '1920x1080', '1280x720', '800x600' ].map( ( size ) => (
													<SelectItem key={size}>
														{size}
													</SelectItem>
												) )}
											</Select>
											<Select label="Graphics Quality" labelPlacement="outside" className="max-w-xs mb-1" size="sm">
												{[ 'Low', 'Medium', 'High' ].map( ( q ) => (
													<SelectItem key={q}>
														{q}
													</SelectItem>
												) )}
											</Select>
											<Switch size="sm" className="mt-1">Fullscreen</Switch>
										</CardBody>
									</Card>
								</Tab>
								<Tab key="controls" isDisabled={true} title="Controls">
									<Card>
										<CardBody>
                                            Coming soon!!
										</CardBody>
									</Card>
								</Tab>
								<Tab key="gameplay" isDisabled={true} title="Gameplay">
									<Card>
										<CardBody>
                                            Coming soon!!
										</CardBody>
									</Card>
								</Tab>
							</Tabs>
						</ModalBody>
						<ModalFooter>
							<Button color="danger" variant="light" onPress={handleClose}>
                                Discard
							</Button>
							<Button color="primary" onPress={handleClose}>
                                Save
							</Button>
						</ModalFooter>
					</>
				)}
			</ModalContent>
		</Modal>
	);

}
