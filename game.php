<?php
	require "serverCode/connect.php";
	$game = $mysqli->query("SELECT MAX(gameID) FROM game")->fetch_array()[0];
	
	session_start();
	$_SESSION["game"] = $game;

	$MAX_RESEARCH_STATION_COUNT = 6;
	$MAX_CUBE_SUPPLY_COUNT = 24;
	
	$doc = "<!DOCTYPE html>
			<html lang='en'>
			<head>
				<meta charset='utf-8'>
				<!-- saved from url=(0014)about:internet -->
				<title>Pandemic</title>
				<meta name='viewport' content='width=device-width, initial-scale=1'>
				<link href='https://fonts.googleapis.com/css?family=Exo+2:800|Electrolize|Audiowide|Oswald:400,700|B612+Mono|Ropa+Sans&display=swap' rel='stylesheet'>
				<link rel='stylesheet' type='text/css' href='style.css'>
				<script src='clientCode/jquery-1.11.2.min.js'></script>
				<script src='clientCode/jquery-ui.min.js'></script>
				<script src='clientCode/jquery.easing.1.3.js'></script>
				<script src='clientCode/utilities.js'></script>
				<script src='clientCode/setup.js'></script>
				<script type='module' src='clientCode/logic.js'></script>
			</head>
			<body>
				<div id='curtain'>
					<p>loading game...</p>
					<h2 id='skippingSetupMsg' class='hidden'>Skipping setup...</h2>

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
						<h3 class='cardsDefeat hidden'>(a player was unable to draw 2 cards)</h3>
					</div>
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
						<div id='placeholderStation' class='researchStation mediumGlow hidden'>
							<img src='images/pieces/researchStation.png' />
						</div>
						
						<div id='playerPanelContainer'></div>
						
						<div id='topPanel'>

							<div id='cubeSupplies'>
								<p class='title'>DISEASE CUBE SUPPLY</p>
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
							
							<div id='infectionDeck'>
								<p class='title'>INFECTION DECK</p>
								<img id='imgInfectionDeck' src='images/cards/infectionCardback.png' alt='Infection Deck' />
							</div>

						</div>
						<div id='infectionDiscard'>
							<div id='infDiscardVeil' class='hidden'></div>
							<p class='title'>INFECTION DISCARDS</p>
							<div id='removedInfectionCards' class='hidden'>
								<p class='title'>REMOVED FROM GAME:</p>
							</div>
						</div>

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

						<div id='eventHistoryContainer' class='bottomPanelDiv'>
							<div class='eventHistoryButton btnBack btnDisabled' title='See older events'>&#x2B9C;</div>
							<div id='eventHistory'></div>
							<div class='eventHistoryButton btnForward btnDisabled' title='See newer events'>&#x2B9E;</div>
							<div id='btnUndo' class='eventHistoryButton btnDisabled'>&#x2B8C;</div>
						</div>
						
						<div id='cureMarkerContainer' class='bottomPanelDiv'>
							<p class='title'>
								<span class='lightGreen'>——</span> CURED DISEASES <span class='lightGreen'>——</span>
							</p>
						</div>

						<div id='researchStationSupply' class='bottomPanelDiv'>
							<p class='title'>RESEARCH STATION SUPPLY</p>
							<p id='researchStationSupplyCount'>$MAX_RESEARCH_STATION_COUNT</p>
							<div class='researchStation'>
								<img src='images/pieces/researchStation.png' id='imgResearchStationSupply' alt='Research Station' />
							</div>
						</div>
						<div id='playerDeck' class='bottomPanelDiv'>
							<p class='title'>PLAYER DECK</p>
							<img id='imgPlayerDeck' src='images/cards/playerDeck_6.png' alt='Player Deck'/>
						</div>
						<div id='playerDiscard' class='bottomPanelDiv'>
							<p class='title'>PLAYER DISCARDS</p>
							<div id='removedPlayerCards' class='hidden'>
								<p class='title'>REMOVED FROM GAME:</p>
							</div>
						</div>

					</div>

					<img id='boardImg' src='images/pandemic_board.png' alt='Game Board'>
					
					<div id='rightPanel'>
						<div id='setupProcedureContainer' class='procedureContainer hidden'>
							<p class='title'>SETUP</p>
							<p class='step'>1. Determine roles</p>
							<p class='step'>2. Give cards to each player</p>
							<p class='step'>3. Determine turn order</p>
							<p class='step'>4. Prepare the player deck</p>
							<p class='step'>5. Infect 9 cities</p>
							<p class='step'>6. Place pawns in Atlanta</p>
							<p class='step'>7. Place 1 research station in Atlanta</p>
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

						<div id='turnProcedureContainer' class='procedureContainer hidden'>
							<p class='title'>PLAY</p>
							<p class='step action'>1. Do 4 actions</p>
							<p class='step draw'>2. Draw 2 cards</p>
							<li class='substep epidemic'>Resolve any epidemics</li>
							<li class='substep discard'>Discard to 7 cards</li>
							<p class='step infect'>3. Infect Cities</p>
						</div>
						
						<div id='indicatorContainer' class='hidden'>
							<div id='indicatorVeil' class='hidden'></div>
							<p id='turnIndicator'></p>
							<p id='roleIndicator'></p>
							<p id='stepIndicator'></p>
						</div>

						<div id='actionsContainer' class='interface hidden'>

							<div class='actionCategory'>
								<h2>MOVEMENT ACTIONS</h2>
								<div class='button' id='btnDriveFerry'>
									<div class='actionIcon'>
										<img src='images/eventIcons/driveFerry.png' />
									</div>
									<div class='actionName'>DRIVE / FERRY</div>
								</div>
								<div class='button' id='btnDirectFlight'>
									<div class='actionIcon'>
										<img src='images/eventIcons/directFlight.png' />
									</div>
									<div class='actionName'>DIRECT FLIGHT</div>
								</div>
								<div class='button' id='btnCharterFlight'>
									<div class='actionIcon'>
										<img src='images/eventIcons/charterFlight.png' />
									</div>
									<div class='actionName'>CHARTER FLIGHT</div>
								</div>
								<div class='button' id='btnShuttleFlight'>
									<div class='actionIcon'>
										<img src='images/eventIcons/shuttleFlight.png' />
									</div>
									<div class='actionName'>SHUTTLE FLIGHT</div>
								</div>
							</div>

							<div class='actionCategory'>
								<h2>OTHER ACTIONS</h2>
								<div class='button' id='btnBuildResearchStation'>
									<div class='actionIcon'>
										<img src='images/eventIcons/buildResearchStation.png' />
									</div>
									<div class='actionName'>BUILD RESEARCH STATION</div>
								</div>
								<div class='button' id='btnTreatDisease'>
									<div class='actionIcon'>
										<img src='images/eventIcons/treatDisease.png' />
									</div>
									<div class='actionName'>TREAT DISEASE</div>
								</div>
								<div class='button' id='btnShareKnowledge'>
									<div class='actionIcon'>
										<img src='images/eventIcons/shareKnowledge.png' />
									</div>
									<div class='actionName'>SHARE KNOWLEDGE</div>
								</div>
								<div class='button' id='btnDiscoverACure'>
									<div class='actionIcon'>
										<img src='images/eventIcons/discoverACure.png' />
									</div>
									<div class='actionName'>DISCOVER A CURE</div>
								</div>
								<div class='button' id='btnPass'>PASS</div>
							</div>
							<div id='specialActionCategory' class='actionCategory'>
								<h2>SPECIAL ACTIONS</h2>
								<div class='button operationsExpert' id='btnPlanContingency'>
									<div class='actionIcon'>
										<img src='images/eventIcons/planContingency.png' />
									</div>
									<div class='actionName'>PLAN CONTINGENCY</div>
								</div>
								<div class='button dispatcher' id='btnDispatchPawn'>
									<div class='actionIcon'>
									<img src='images/eventIcons/dispatchPawn.png' />
								</div>
								<div class='actionName'>DISPATCH PAWN</div>
							</div>
								<div class='button operationsExpert' id='btnOperationsFlight'>
									<div class='actionIcon'>
										<img src='images/eventIcons/operationsFlight.png' />
									</div>
									<div class='actionName'>OPERATIONS FLIGHT</div>
								</div>
							</div>

							<div id='actionPrompt' class='hidden'>
								<div id='actionInterface'></div>
								<div class='btnCancelAction'>Cancel</div>
							</div>
						</div>

						<div id='cardDrawContainer' class='interface hidden'>
							<div class='button btnContinue hidden'>CONTINUE</div>
						</div>

						<div id='epidemicContainer' class='interface hidden'>
							<div class='button btnContinue'>CONTINUE</div>

							<div class='epidemicFull hidden'>
								<h2>EPIDEMIC</h2>
								<div class='increase hidden'>
									<h3>1 — INCREASE</h3>
									<p>MOVE THE INFECTION RATE MARKER FORWARD 1 SPACE.</P>
								</div>
								<div class='infect hidden'>
									<h3>2 — INFECT</h3>
									<p>DRAW THE BOTTOM CARD FROM THE INFECTION DECK AND PUT 3 CUBES ON THAT CITY. DISCARD THAT CARD.</p>
								</div>
								<div class='intensify hidden'>
									<h3>3 — INTENSIFY</h3>
									<p>SHUFFLE THE CARDS IN THE INFECTION DISCARD PILE AND PUT THEM ON TOP OF THE INFECTION DECK.</p>
								</div>
							</div>

							<div class='epidemicFull hidden'>
								<h2>EPIDEMIC</h2>
								<div class='increase hidden'>
									<h3>1 — INCREASE</h3>
									<p>MOVE THE INFECTION RATE MARKER FORWARD 1 SPACE.</P>
								</div>
								<div class='infect hidden'>
									<h3>2 — INFECT</h3>
									<p>DRAW THE BOTTOM CARD FROM THE INFECTION DECK AND PUT 3 CUBES ON THAT CITY. DISCARD THAT CARD.</p>
								</div>
								<div class='intensify hidden'>
									<h3>3 — INTENSIFY</h3>
									<p>SHUFFLE THE CARDS IN THE INFECTION DISCARD PILE AND PUT THEM ON TOP OF THE INFECTION DECK.</p>
								</div>
							</div>
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