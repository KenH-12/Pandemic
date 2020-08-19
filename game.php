<?php
	session_start();

	if (!isset($_SESSION["uID"]) || !isset($_SESSION["game"]))
	{
		header("Location: index.php");
		die();
	}

	$MAX_RESEARCH_STATION_COUNT = 6;
	$MAX_CUBE_SUPPLY_COUNT = 24;

	$chevron = "<span class='buttonChevron rightChevron'>^</span>";
	
	$doc = "<!DOCTYPE html>
			<html lang='en'>
			<head>
				<meta charset='utf-8'>
				<!-- saved from url=(0014)about:internet -->
				<title>Pandemic</title>
				<meta name='viewport' content='width=device-width, initial-scale=1'>
				<link href='https://fonts.googleapis.com/css?family=Exo+2:800|Electrolize|Audiowide|Oswald:400,700|B612+Mono|Ropa+Sans&display=swap' rel='stylesheet'>
				<link type='text/css' href='css/style.css' rel='stylesheet'>
				<link type='text/css' href='css/hamburgers.css' rel='stylesheet'>
				<script src='clientCode/jquery-1.11.2.min.js'></script>
				<script src='clientCode/jquery-ui.min.js'></script>
				<script src='clientCode/jquery.easing.1.3.js'></script>
				<script src='clientCode/utilities/miscUtils.js'></script>
				<script src='clientCode/utilities/stringUtils.js'></script>
				<script src='clientCode/utilities/tooltipUtils.js'></script>
				<script src='clientCode/utilities/geometryUtils.js'></script>
				<script src='clientCode/utilities/animationUtils.js'></script>
				<script type='module' src='clientCode/logic.js'></script>
			</head>
			<body>
				<div id='curtain'>
					<p>loading game...</p>
					<h2 id='skippingSetupMsg' class='hidden'>Skipping setup...</h2>

					<div id='warningsContainer' class='hidden'>
						<h2 class='browserCompatWarning hidden'>WARNING: This application has not been tested on the <span id='browserName'></span>. Some features may not function as intended.</h2>
						<h2 class='browserCompatWarning hidden'>Please use the <a href='https://www.google.com/intl/en_ca/chrome/'>Google Chrome</a> browser for a smoother experience.</h2>
						<div class='button'>OK</div>
					</div>

					<div id='victory' class='hidden'>
						<h1>V I C T O R Y</h1>
						<h2>Your team discovered cures for all 4 diseases!</h2>
					</div>
					<div id='defeat' class='hidden'>
						<h1>D E F E A T</h1>
						<h2 class='outbreakDefeat hidden'>A worldwide panic happened!</h2>
						<h3 class='outbreakDefeat hidden'>(too many outbreaks)</h3>

						<h2 class='cubesDefeat hidden'>The <span></span> disease has spread out of control!</h2>
						<h3 class='cubesDefeat hidden'>(too many <span></span> disease cubes on the board)</h3>
						
						<h2 class='cardsDefeat hidden'>Your team ran out of time!</h2>
						<h3 class='cardsDefeat hidden'>(unable to draw 2 cards)</h3>
					</div>
					<div id='btnMainMenu' class='button hidden'>RETURN TO MAIN MENU</div>
				</div>
				<div id='container'>

					<div id='specialEventBanner' class='hidden'>
						<p id='specialEventTitle'></p>
						<p class='specialEventDetails'></p>
					</div>

					<div id='boardContainer'>
						<div class='pinpointRect hidden'></div>
						<div class='pinpointRect hidden'></div>
						
						<div id='demoCube' class='diseaseCube hidden'></div>
						<img id='demoPawn' src='images/pieces/pawns/medic.png' class='pawn hidden'/>
						<div id='demoStation' class='researchStation hidden'>
							<img src='images/pieces/researchStation.png' />
						</div>

						<img id='placeholderPawn' class='pawn hidden'/>
						<div id='placeholderStation' class='researchStation hidden'>
							<img src='images/pieces/researchStation.png' />
						</div>
						
						<div id='playerPanelContainer'></div>
						
						<div id='topPanel'>

							<div id='cubeSupplies'>
								<p class='title'>DISEASE CUBE SUPPLY <span class='info'>&#9432;</span></p>
								<div class='cubeSupply'>
									<p id='ySupply'>$MAX_CUBE_SUPPLY_COUNT</p>
									<div id='ySupplyCube' class='diseaseCube y'>
										<div class='cubeBackground'></div>
										<div class='cubeTop'></div>
										<div class='cubeLeft'></div>
										<div class='cubeRight'></div>
									</div>
								</div>
								<div class='cubeSupply'>
									<p id='rSupply'>$MAX_CUBE_SUPPLY_COUNT</p>
									<div id='rSupplyCube' class='diseaseCube r'>
										<div class='cubeBackground'></div>
										<div class='cubeTop'></div>
										<div class='cubeLeft'></div>
										<div class='cubeRight'></div>
									</div>
								</div>
								<div class='cubeSupply'>
									<p id='uSupply'>$MAX_CUBE_SUPPLY_COUNT</p>
									<div id='uSupplyCube' class='diseaseCube u'>
										<div class='cubeBackground'></div>
										<div class='cubeTop'></div>
										<div class='cubeLeft'></div>
										<div class='cubeRight'></div>
									</div>
								</div>
								<div class='cubeSupply'>
									<p id='bSupply'>$MAX_CUBE_SUPPLY_COUNT</p>
									<div id='bSupplyCube' class='diseaseCube b'>
										<div class='cubeBackground'></div>
										<div class='cubeTop'></div>
										<div class='cubeLeft'></div>
										<div class='cubeRight'></div>
									</div>
								</div>
							</div>
							
							<div id='infectionDeckContainer'>
								<p class='title'>INFECTION DECK</p>
								<img src='images/cards/infectionCardback.png' alt='Infection Deck' />
							</div>

						</div>
						<div id='infectionDiscardContainer'>
							<div id='infDiscardVeil' class='hidden'></div>
							<p class='title'>INFECTION DISCARDS</p>
							<div id='removedInfectionCards' class='hidden'>
								<p class='title'>REMOVED FROM GAME:</p>
							</div>
						</div>
						<div id='resilientPopulationArrow' class='hidden'><div></div></div>

						<div id='travelPathArrowContainer'>
							<div id='travelPathArrow'></div>
						</div>
						<div id='quarantineArea'></div>
						
						<div class='infectionRateHighlight top hidden'></div>
						<div class='infectionRateHighlight right hidden'></div>
						<div class='infectionRateHighlight bottom hidden'></div>
						<div class='infectionRateHighlight left hidden'></div>
						<div id='infectionRateMarker' class='marker'>
							<img src='images/pieces/infectionRateMarker.png' alt='Infection Rate Marker'/>
						</div>
						
						<div id='outbreaksTrackHighlight' class='hidden'></div>
						<div class='outbreaksHighlight top hidden'></div>
						<div class='outbreaksHighlight right hidden'></div>
						<div class='outbreaksHighlight bottom hidden'></div>
						<div id='outbreaksMarker' class='marker'>
							<img src='images/pieces/outbreaksMarker.png' alt='Outbreaks Marker'/>
						</div>

						<div id='eventHistoryContainer'>
							<div id='undoingIndicator'></div>

							<div class='eventHistoryButton btnBack btnDisabled'>&#x2B9C;</div>
							<div id='eventHistory'></div>
							<div class='eventHistoryButton btnForward btnDisabled'>&#x2B9E;</div>
							<div id='btnUndo' class='eventHistoryButton btnDisabled'>&#x2B8C;</div>
						</div>
						
						<div id='cureMarkerContainer' class='bottomPanelDiv'>
							<p class='title'>
								<span class='infoContainer'>
									<span class='info' id='curedDiseasesInfo'>&#9432;</span>
								</span>
								<span class='lightGreen'>—</span> CURED DISEASES <span class='lightGreen'>—</span>
							</p>
						</div>

						<div id='governmentGrantArrow' class='hidden'><div></div></div>
						<div id='researchStationSupplyContainer' class='bottomPanelDiv'>
							<p class='title'>RESEARCH STATION SUPPLY <span class='info'>&#9432;</span></p>
							<p id='researchStationSupplyCount'>$MAX_RESEARCH_STATION_COUNT</p>
							<div class='researchStation'>
								<img src='images/pieces/researchStation.png' id='imgResearchStationSupply' alt='Research Station' />
							</div>
						</div>
						<div id='playerDeckContainer' class='bottomPanelDiv'>
							<p class='title'>PLAYER DECK <span class='info hidden'>&#9432;</span></p>
							<img id='imgPlayerDeck' src='images/cards/playerDeck_6.png' alt='Player Deck'/>
						</div>
						<div id='playerDiscardContainer' class='bottomPanelDiv'>
							<p class='title'>PLAYER DISCARDS</p>
							<div id='removedPlayerCards' class='hidden'>
								<p class='title'>REMOVED FROM GAME:</p>
							</div>
						</div>

					</div>

					<img id='boardImg' src='images/pandemic_board.png' alt='Game Board'>
					
					<div id='sideMenuTitle'>
						<h2>MENU</h2>
					</div>
					<div id='sideMenu'></div>

					<div id='rightPanel'>
						<div id='setupProcedureContainer' class='procedureContainer hidden'>
							<p class='title'><span>SETUP</p>
							<p class='step'><span>1. Determine roles</span></p>
							<p class='step'><span>2. Give cards to each role</span></p>
							<p class='step'><span>3. Determine turn order</span></p>
							<p class='step'><span>4. Prepare the player deck</span></p>
							<p class='step'><span>5. Infect 9 cities</span></p>
							<p class='step'><span>6. Place pawns in Atlanta</span></p>
							<p class='step'><span>7. Place 1 research station in Atlanta</span></p>
						</div>
						<div id='skipSetupButtons' class='hidden'>
							<div class='btnSkip' id='btnSkipSetupStep'>
								SKIP THIS STEP
							</div><div class='btnSkip' id='btnSkipSetup'>
								SKIP ALL
							</div>
						</div>

						<div id='setupContainer' class='hidden'>
							<div id='roleSetupContainer'></div>

							<div id='preparePlayerDeckContainer' class='hidden'>
								<h4>Difficulty: <span class='difficulty'></span><br />-&gt; <span class='numEpidemics'></span> Epidemics</h4>
							</div>

							<div id='initialInfectionsContainer' class='hidden'>

								<div class='infGroup'>
									<div class='groupInfRate hidden' data-numCubes='3'></div>
								</div>
								<div class='infGroup'>
									<div class='groupInfRate hidden' data-numCubes='2'></div>
								</div>
								<div class='infGroup'>
									<div class='groupInfRate hidden' data-numCubes='1'></div>
								</div>
							</div>
						</div>

						<button class='hamburger hamburger--spin hidden' type='button'>
							<span class='hamburger-box'>
								<span class='hamburger-inner'></span>
							</span>
						</button>

						<div id='turnProcedureContainer' class='procedureContainer hidden'>
							<p class='title'>PLAY<span class='info' id='turnProcedureInfo'>&#9432;</span></p>
							<p class='step action'>
								<span>1. Do 4 actions</span>
								<span class='info playStepInfo hidden' data-eventType='ac'>&#9432;</span>
							</p>
							<p class='step draw'>
								<span>2. Draw 2 cards</span>
								<span class='info playStepInfo hidden' data-eventType='cd'>&#9432;</span>
							</p>
							<li class='substep epidemic'>
								<span>Resolve any epidemics</span>
								<span class='info playStepInfo epidemicInfo hidden'>&#9432;</span>
							</li>
							<li class='substep discard'>
								<span>Discard to 7 cards</span>
								<span class='info playStepInfo hidden' data-eventType='ds'>&#9432;</span>
							</li>
							<p class='step infect'>
								<span>3. Infect Cities</span>
								<span class='info playStepInfo hidden' data-eventType='ic'>&#9432;</span>
							</p>
						</div>
						
						<div id='indicatorContainer' class='hidden'>
							<div id='indicatorVeil' class='hidden'></div>
							<p id='turnIndicator' class='hidden'></p>
							<p id='roleIndicator'></p>
							<p id='stepIndicator'></p>
						</div>

						<div id='actionsContainer' class='interface hidden'>

							<div class='actionCategory'>
								<h2>MOVEMENT ACTIONS</h2>
								<div class='button actionButton' id='btnDriveFerry'>
									<div class='actionIcon'>
										<img src='images/eventIcons/driveFerry.png' />
									</div>
									<div class='actionName'>DRIVE / FERRY</div>
									<div class='actionInfo'>&#9432;</div>
								</div>
								<div class='button actionButton' id='btnDirectFlight'>
									<div class='actionIcon'>
										<img src='images/eventIcons/directFlight.png' />
									</div>
									<div class='actionName'>DIRECT FLIGHT</div>
									<div class='actionInfo'>&#9432;</div>
								</div>
								<div class='button actionButton' id='btnCharterFlight'>
									<div class='actionIcon'>
										<img src='images/eventIcons/charterFlight.png' />
									</div>
									<div class='actionName'>CHARTER FLIGHT</div>
									<div class='actionInfo'>&#9432;</div>
								</div>
								<div class='button actionButton' id='btnShuttleFlight'>
									<div class='actionIcon'>
										<img src='images/eventIcons/shuttleFlight.png' />
									</div>
									<div class='actionName'>SHUTTLE FLIGHT</div>
									<div class='actionInfo'>&#9432;</div>
								</div>
							</div>

							<div class='actionCategory'>
								<h2>OTHER ACTIONS</h2>
								<div class='button actionButton' id='btnBuildResearchStation'>
									<div class='actionIcon'>
										<img src='images/eventIcons/buildResearchStation.png' />
									</div>
									<div class='actionName'>BUILD RESEARCH STATION</div>
									<div class='actionInfo'>&#9432;</div>
								</div>
								<div class='button actionButton' id='btnTreatDisease'>
									<div class='actionIcon'>
										<img src='images/eventIcons/treatDisease.png' />
									</div>
									<div class='actionName'>TREAT DISEASE</div>
									<div class='actionInfo'>&#9432;</div>
								</div>
								<div class='button actionButton' id='btnShareKnowledge'>
									<div class='actionIcon'>
										<img src='images/eventIcons/shareKnowledge.png' />
									</div>
									<div class='actionName'>SHARE KNOWLEDGE</div>
									<div class='actionInfo'>&#9432;</div>
								</div>
								<div class='button actionButton' id='btnDiscoverACure'>
									<div class='actionIcon'>
										<img src='images/eventIcons/discoverACure.png' />
									</div>
									<div class='actionName'>DISCOVER A CURE</div>
									<div class='actionInfo'>&#9432;</div>
								</div>
								<div class='button actionButton' id='btnPass'>
									<div class='actionIcon'>
										<img src='images/eventIcons/pass.png' />
									</div>
									<div class='actionName'>PASS</div>
									<div class='actionInfo'>&#9432;</div>
								</div>
							</div>
							<div id='specialActionCategory' class='actionCategory'>
								<h2>SPECIAL ACTIONS</h2>
								<div class='button actionButton operationsExpert' id='btnPlanContingency'>
									<div class='actionIcon'>
										<img src='images/eventIcons/planContingency.png' />
									</div>
									<div class='actionName'>PLAN CONTINGENCY</div>
									<div class='actionInfo'>&#9432;</div>
								</div>
								<div class='button actionButton dispatcher' id='btnDispatchPawn'>
									<div class='actionIcon'>
									<img src='images/eventIcons/dispatchPawn.png' />
								</div>
								<div class='actionName'>DISPATCH PAWN</div>
								<div class='actionInfo'>&#9432;</div>
							</div>
								<div class='button actionButton operationsExpert' id='btnOperationsFlight'>
									<div class='actionIcon'>
										<img src='images/eventIcons/operationsFlight.png' />
									</div>
									<div class='actionName'>OPERATIONS FLIGHT</div>
									<div class='actionInfo'>&#9432;</div>
								</div>
							</div>

							<div id='actionPrompt' class='hidden'>
								<div id='btnCancelAction' class='button'><span>&#x2B9C;</span><span>CANCEL</span></div>
								<div id='actionInterface'></div>
							</div>
						</div>

						<div id='cardDrawContainer' class='interface hidden'>
							<div class='button btnContinue hidden'>DRAW 2 CARDS</div>
						</div>

						<div id='epidemicContainer' class='interface hidden'>
							<div class='epidemicFull hidden'>
								<h2>EPIDEMIC</h2>
								<div class='increase hidden'>
									<h3><span>1 — INCREASE</span></h3>
									<p>MOVE THE INFECTION RATE MARKER FORWARD 1 SPACE.</P>
								</div>
								<div class='infect hidden'>
									<h3><span>2 — INFECT</span></h3>
									<p>DRAW THE BOTTOM CARD FROM THE INFECTION DECK AND PUT 3 CUBES ON THAT CITY. DISCARD THAT CARD.</p>
								</div>
								<div class='intensify hidden'>
									<h3><span>3 — INTENSIFY</span></h3>
									<p>SHUFFLE THE CARDS IN THE INFECTION DISCARD PILE AND PUT THEM ON TOP OF THE INFECTION DECK.</p>
								</div>
							</div>

							<div class='epidemicFull hidden'>
								<h2>EPIDEMIC</h2>
								<div class='increase hidden'>
									<h3><span>1 — INCREASE</span></h3>
									<p>MOVE THE INFECTION RATE MARKER FORWARD 1 SPACE.</P>
								</div>
								<div class='infect hidden'>
									<h3><span>2 — INFECT</span></h3>
									<p>DRAW THE BOTTOM CARD FROM THE INFECTION DECK AND PUT 3 CUBES ON THAT CITY. DISCARD THAT CARD.</p>
								</div>
								<div class='intensify hidden'>
									<h3><span>3 — INTENSIFY</span></h3>
									<p>SHUFFLE THE CARDS IN THE INFECTION DISCARD PILE AND PUT THEM ON TOP OF THE INFECTION DECK.</p>
								</div>
							</div>

							<div class='button btnContinue hidden'></div>
						</div>

						<div id='discardStepContainer' class='interface hidden'></div>

						<div id='infectCitiesContainer' class='interface hidden'>
							<div class='button btnContinue hidden'>CONTINUE</div>
						</div>
					</div>
				</div>
			</body>
			</html>";

	echo $doc;
?>