"use strict";
$(function(){
const data =
{
	sizeRatios:
	{
		piecePlacementThreshold:	["boardWidth", 0.023],
		playerCardWidth:		["panelWidth", 0.98],
		cubeSupplyMarginTop:	["topPanelHeight", 0.087],
		bottomPanelDivs:		["boardHeight",	0.222],
		cureMarkerMarginTop:	["boardHeight",	0.931],
		cityWidth:				["boardWidth",	0.012],
		autoTreatCircleWidth:	["boardWidth", 0.036],
		cubeWidth:				["boardWidth", 0.0082],
		infGroupAdj:			["boardHeight", 0.025],
		groupInfRateCubeWidth:	["panelWidth", 0.1],
		infCardDiv:				["boardHeight",	0.047],
		diseaseIcon:			["panelWidth",	0.1048],
		discardDiseaseIcon:		["boardWidth",	0.023],
		infCardHeight:			["panelWidth", 0.105],
		infCardFont:			["panelWidth",	0.063],
		infCardNameTop:			["panelWidth", 0.0263],
		infDiscardHeight:		["boardWidth", 0.0192],
		infDiscardFont:			["boardWidth",	0.0136],
		infDiscardNameTop:		["boardWidth", 0.0042],
		outbreaksMarkerLeft:	["boardWidth", 0.028],
		outbreaksMarkerRight:	["boardWidth", 0.067],
		stationSupplyCountFont: ["boardWidth", 0.0208],
		specialEventImgMarginLeft: ["windowWidth", 0.47]
	},
	durations:
	{
		shortInterval: 500,
		mediumInterval: 750,
		longInterval: 1250,
		dealCard: 500,
		revealInfCard: 800,
		discardInfCard: 125,
		cubeAnimation: 600,
		stationPlacement: 750,
		revealPlayerCard: 400,
		discardPlayerCard: 600,
		discardPileExpand: 400,
		discardPileCollapse: 200,
		moveMarker: 700,
		pawnAnimation: 250,
		specialEventBannerReveal: 250,
		cureMarkerAnimation: 700
	}, fastForwarding: false,
	easings:
	{
		dealCard: "easeInQuart",
		revealCard: "easeOutQuint",
		cubePlacement: "easeInSine",
		stationPlacement: "easeInOutQuart",
		pawnAnimation: "easeInOutQuart",
		pinpointCity: "easeOutQuad",
		moveMarker: "easeInOutQuad",
		specialEventBannerReveal: "easeOutQuint",
		cureMarkerAnimation: "easeInOutQuart"
	},
	pinpointTimeout: false,
	players: {},
	cities: {},
	pacificPaths: {
		"sanf-toky": { percentFromTop: 0.328, percentFromLeft: 0 },
		"sanf-mani": { percentFromTop: 0.349, percentFromLeft: 0 },
		"losa-sydn": { percentFromTop: 0.491, percentFromLeft: 0 },
		"toky-sanf": { percentFromTop: 0.331, percentFromLeft: 1 },
		"mani-sanf": { percentFromTop: 0.554, percentFromLeft: 1 },
		"sydn-losa": { percentFromTop: 0.774, percentFromLeft: 1 },
		"top-left": { percentFromTop: 0, percentFromLeft: 0 },
		"top-right": { percentFromTop: 0, percentFromLeft: 1 },
		"bottom-left": { percentFromTop: 1, percentFromLeft: 0 },
		"bottom-right": { percentFromTop: 1, percentFromLeft: 1 }
	},
	researchStationKeys: new Set(),
	eventCards: {},
	playerCardsRemaining: -1,
	HAND_LIMIT: 7,
	playerCardAnimationInterval: 0.4,
	dragPieceZindex: 6,
	stationZindex: 3,
	cures: {
		remaining: 4,
		y: false,
		r: false,
		u: false,
		b: false
	},
	epidemicCount: 0,
	outbreakCount: 0,
	pendingClusters: new Set(),
	infectionPreventionCodes: {
		notPrevented: "0",
		eradicated: "e",
		quarantine: "q",
		medicAutoTreat: "m"
	},
	turn: -1,
	currentStep: -1,
	steps: {},
	events: []
},
eventTypes = {
	driveFerry: {
		name: "Drive/Ferry",
		code: "dr",
		rules: ["Move to a city connected by a white line to the one you are in."],
		instructions: "Select a Destination:",
		pathName: "movementAction",
		propertyNames: ["originKey", "destinationKey"]
	},
	directFlight: {
		name: "Direct Flight",
		code: "df",
		rules: ["Discard a city card to move to the city named on the card."],
		instructions: "Select a Card:",
		dispatchInstructions: `To dispatch a pawn via Direct Flight,
discard the city card that matches the destination city.
The card must come from the Dispatcher&#39;s hand.`,
		pathName: "movementAction",
		propertyNames: ["originKey", "destinationKey"]
	},
	charterFlight: {
		name: "Charter Flight",
		code: "cf",
		rules: ["Discard the city card that <i>matches</i> the city you are in to move to <i>any</i> city."],
		instructions: "To select a destination, drag and drop your pawn onto a city.",
		dispatchInstructions: `To dispatch a pawn via Charter Flight,
discard the city card that matches the pawn&#39;s current location.
The card must come from the Dispatcher&#39;s hand.`,
		pathName: "movementAction",
		propertyNames: ["originKey", "destinationKey"]
	},
	chooseFlightType: {
		name: "Choose Flight Type",
		code: "ft"
	},
	shuttleFlight: {
		name: "Shuttle Flight",
		code: "sf",
		rules: ["Move from a city with a research station to any other city that has a research station."],
		instructions: "Select a Destination:",
		pathName: "movementAction",
		propertyNames: ["originKey", "destinationKey"]
	},
	buildResearchStation: {
		name: "Build Research Station",
		code: "rs",
		rules: [
			"Discard the city card that matches the city you are in to place a research station there.",
			"If the research station supply is empty, take a research station from anywhere on the board."
		],
		instructions: "",
		pathName: "buildResearchStation",
		propertyNames: ["originKey", "destinationKey"]
	},
	shareKnowledge: {
		name: "Share Knowledge",
		code: "sk",
		rules: [
			"You can do this action in two ways:",
			"<i>give</i> the city card that matches the city you are in to another player, or",
			"<i>take</i> the city card that matches the city you are in from another player.",
			"The other player must also be in the city with you."
		],
		pathName: "shareKnowledge",
		propertyNames: ["cardKey", "giverRoleID", "recipientRoleID"]
	},
	treatDisease: {
		name: "Treat Disease",
		code: "td",
		rules: [
			"Remove 1 disease cube from the city you are in, placing it in the cube supply next to the board.",
			"If the disease has been cured, remove all cubes of that color from the city you are in."
		],
		instructions: "Select a Disease Color:",
		pathName: "treatDisease",
		propertyNames: ["cityKey", "diseaseColor", "prevCubeCount", "newCubeCount"]
	},
	autoTreatDisease: {
		name: "Auto-Treat Disease",
		code: "at",
		propertyNames: ["cityKey", "diseaseColor"]
	},
	discoverCure: {
		name: "Discover Cure",
		code: "dc",
		rules: [
			`At any research station, discard 5 city cards of the same color from your hand to cure the disease of that color.`,
			`If no cubes of this color are on the board, the disease becomes eradicated.`
		],
		pathName: "discoverCure",
		propertyNames: ["cardKeys"]
	},
	eradication: {
		name: "eradication",
		code: "er",
		propertyNames: ["diseaseColor"]
	},
	planContingency: {
		name: "Discover Cure",
		code: "pc",
		propertyNames: ["cardKey"]
	},
	dispatchPawn: {
		name: "Dispatch Pawn",
		code: "dp",
		rules: [
			"The Dispatcher may, as an action, either:",
			"<li>move any pawn to any city containing another pawn, or</li>",
			"<li>move another player's pawn as if it were his own.</li>"
		],
		instructions: "To dispatch a pawn, drag and drop it onto a city.",
		pathName: "movementAction",
		propertyNames: ["roleToDispatch", "originKey", "destinationKey", "movementType"]
	},
	rendezvous: {
		name: "Rendezvous",
		code: "rv",
		pathName: "movementAction"
	},
	operationsFlight: {
		name: "Operations Flight",
		code: "of",
		rules: [
			"Once per turn, as an action,",
			"the Operations Expert may move from a research station to any city by discarding any city card."
		],
		instructions: "To select a destination, drag and drop your pawn onto a city.",
		pathName: "movementAction",
		propertyNames: ["originKey", "destinationKey", "cardKey"]
	},
	pass: {
		name: "Pass Actions",
		code: "pa",
		propertyNames: [],
		rules: [`Forfeit your remaining actions and proceed to the "Draw 2 cards" step.`],
		instructions: "Pass on your remaining actions for this turn?",
		pathName: "passActions",
		propertyNames: []
	},
	cardDraw: {
		name: "Card Draw",
		code: "cd",
		pathName: "drawPlayerCards",
		propertyNames: ["cardKeys"]
	},
	epidemicIncrease: {
		name: "Epidemic Increase",
		code: "ec",
		pathName: "epidemicIncrease",
		propertyNames: ["epidemicCount"]
	},
	epidemicInfect: {
		name: "Epidemic Infect",
		code: "ef",
		pathName: "epidemicInfect",
		propertyNames: ["bottomInfCardKey", "prevCubeCount", "preventionCode"]
	},
	epidemicIntensify: {
		name: "Epidemic Intensify",
		code: "et",
		pathName: "epidemicIntensify",
		propertyNames: ["numDiscardsShuffled"]
	},
	discard: {
		name: "Discard",
		code: "ds",
		pathName: "discardPlayerCards",
		propertyNames: ["cardKeys"]
	},
	infectCity: {
		name: "Infect City",
		code: "ic",
		pathName: "infectCity",
		propertyNames: ["cityKey", "preventionCode"],
	},
	initialInfection: {
		name: "Initial Infection",
		code: "ii",
		propertyNames: ["cityKey", "numCubes"]
	},
	startingHand: {
		name: "Starting Hand",
		code: "sh",
		propertyNames: ["cardKeys"]
	},
	outbreak: {
		name: "Outbreak",
		code: "ob",
		propertyNames: ["outbreakCount", "originKey", "diseaseColor"]
	},
	outbreakInfection: {
		name: "Outbreak Infection",
		code: "oi",
		propertyNames: ["originKey", "infectedKey", "diseaseColor", "preventionCode"]
	},
	resilientPopulation: {
		name: "Resilient Population",
		code: "rp",
		cardKey: "resi",
		rules: [
			"Play at any time. Not an action.",
			"Remove any 1 card in the Infection Discard Pile from the game.",
			"You may play this between the Infect and Intensify steps of an epidemic."
		],
		instructions: "Select a card from INFECTION DISCARDS to remove from the game.",
		propertyNames: ["removedCardKey"],
		pathName: "resilientPopulation"
	},
	oneQuietNight: {
		name: "One Quiet Night",
		code: "oq",
		cardKey: "oneq",
		rules: [
			"Play at any time. Not an action.",
			"Skip the next Infect Cities step (do not flip over any Infection cards)."
		],
		pathName: "oneQuietNight"
	},
	skipInfectionStep: { // this is here as a simple way to use the pathName in the requestAction function.
		code: "",
		pathName: "skipInfectionStep"
	},
	forecast: {
		name: "Forecast",
		code: "fd",
		cardKey: "fore",
		rules: [
			"Play at any time. Not an action.",
			"Draw, look at, and rearrange the top 6 cards of the Infection Deck.",
			"Put them back on top."
		],
		propertyNames: ["cardKeys"],
		pathName: "forecastDraw"
	},
	forecastPlacement: {
		name: "Forecast Place",
		code: "fp",
		rules: [
			"Play at any time. Not an action.",
			"Draw, look at, and rearrange the top 6 cards of the Infection Deck.",
			"Put them back on top."
		],
		instructions: "Drag and drop to rearrange the cards.",
		propertyNames: ["cardKeys"],
		pathName: "forecastPlacement"
	},
	airlift: {
		name: "Airlift",
		code: "ar",
		cardKey: "airl",
		rules: ["Play at any time. Not an action.", "Move any 1 pawn to any city."],
		instructions: "To airlift a pawn, drag and drop it onto the destination city.",
		propertyNames: ["roleToAirlift", "originKey", "destinationKey"],
		pathName: "airlift"
	},
	governmentGrant: {
		name: "Government Grant",
		code: "gg",
		cardKey: "gove",
		rules: ["Play at any time. Not an action.", "Add 1 research station to any city."],
		instructions: "Drag and drop a research station from the research station supply onto the city of your choice.",
		propertyNames: ["cityKey", "relocationKey"],
		pathName: "buildResearchStation"
	},
	gameEnd: {
		name: "Game End",
		code: "ge",
		propertyNames: ["reason"]
	}
},
eventCodes = {
	dr: "driveFerry",
	df: "directFlight",
	cf: "charterFlight",
	ft: "chooseFlightType",
	sf: "shuttleFlight",
	rs: "buildResearchStation",
	sk: "shareKnowledge",
	// sa: "shareKnowledgeAccept",
	td: "treatDisease",
	at: "autoTreatDisease",
	dc: "discoverCure",
	er: "eradication",
	pc: "planContingency",
	dp: "dispatchPawn",
	// da: "dispatchAccept",
	of: "operationsFlight",
	pa: "pass",
	cd: "cardDraw",
	ec: "epidemicIncrease",
	ef: "epidemicInfect",
	et: "epidemicIntensify",
	ds: "discard",
	ic: "infectCity",
	ii: "initialInfection",
	sh: "startingHand",
	ob: "outbreak",
	oi: "outbreakInfection",
	rp: "resilientPopulation",
	oq: "oneQuietNight",
	fd: "forecast",
	fp: "forecastPlacement",
	ar: "airlift",
	// aa: "airliftAccept",
	gg: "governmentGrant",
	ge: "gameEnd"
};

function parseEvents(events)
{
	return new Promise(resolve =>
		{
			log("parseEvents()");
			const parsedEvents = [];
		
			// events could be an array of objects or a single object
			if (!Array.isArray(events))
				events = [events];
			
			for (let e of events)
			{
				log(e);
				if (!e) continue;
				
				parsedEvents.push(new Event(e));
			}
			data.events = [...data.events, ...parsedEvents];

			return resolve(parsedEvents);
		});
}

class Event
{
	constructor({ code, id, turnNum, role, details })
	{
		this.code = code;
		this.id = id;
		this.turnNum = turnNum;
		this.role = role;
		
		if (details.length)
		{
			const names = getEventType(code).propertyNames,
				values = details.split(",");
			
			if (names.length === 1 && values.length > 1) // The single property is an array of values
				this[names[0]] = values;
			else
			{
				for (let i = 0; i < names.length; i++)
					this[names[i]] = values[i];
			}
		}

		return this;
	}

	isOfType(eventType)
	{
		return this.code === eventType.code;
	}
}

function getEventType(eventCode)
{
	return eventTypes[eventCodes[eventCode]];
}

class Step
{
	constructor(name, description, procedure)
	{
		this.name = name;
		this.description = description;
		this.procedure = procedure;

		this.procedureIdx = -1;
	}

	indicate = function()
	{
		const $container = $("#indicatorContainer"),
			activePlayer = getActivePlayer();

		if (typeof this.setDescription === "function")
			this.setDescription();

		$container.children("#turnIndicator")
			.html(`----- ${activePlayer.name}'s Turn -----`)
			.next() // role indicator
			.html(activePlayer.role)
			.attr("class", activePlayer.camelCaseRole)
			.next() // step indicator
			.html(this.description);

		unhide($container);

		highlightTurnProcedureStep(this.name);
	}

	resume = function()
	{
		this.indicate();

		if (this.procedureIdx === -1)
			this.procedureIdx++;
		
		this.procedure[this.procedureIdx]();
	}
	
	proceed = function()
	{
		if (++this.procedureIdx === this.procedure.length)
		{
			log("finished ", this.name);
			this.procedureIdx = -1;
			this.next();
		}
		else
		{
			if (this.procedureIdx === 0)
				this.indicate();
			
			this.procedure[this.procedureIdx]();
		}
	}

	next = function()
	{
		log("nextStep: ", data.nextStep);
		setCurrentStep(data.nextStep).proceed();
	}
}

function highlightTurnProcedureStep(stepName)
{
	const releventStepNames = ["action", "draw", "epidemic", "discard", "infect"];
	
	// Only interested in the first word
	stepName = stepName.split(" ")[0];

	// There are 3 different epidemic steps, all of which start with "ep"
	if (stepName.substring(0, 2) === "ep")
		stepName = "epidemic";

	if (!releventStepNames.includes(stepName))
		return;
	
	$("#turnProcedureContainer").children()
		.removeClass("highlighted")
		.filter(`.${stepName}`).addClass("highlighted");
}

// instantiate steps
(function()
{
	const steps = data.steps;

	let stepName = "initial infections";
	steps[stepName] = new Step(stepName, "Infect 9 Cities", [initialInfectionStep]);
	steps[stepName].indicate = function()
	{
		return new Promise(resolve =>
			{
				const $indicatorContainer = $("#indicatorContainer");

				$indicatorContainer
					.children("#roleIndicator")
					.html("INITIAL SETUP")
					.next()
					.html("--- Infect 9 Cities ---");

				unhide($indicatorContainer);
				resolve();
			});
	}
	
	// "action 1" through to "action 4"
	let actionsRemaining = 4;
	for (let i = 1; i <= 4; i++)
	{
		stepName = `action ${i}`;
		steps[stepName] = new Step(stepName, `${actionsRemaining} Action${actionsRemaining > 1 ? "s" : ""} Remaining`,
			[
				enableAvailableActions,
				finishActionStep
			]);
		actionsRemaining--;
	}

	// If the hand limit is violated as a result of the Share Knowledge action,
	// the player with 8 cards will be prompted to discard.
	stepName = "hand limit";
	steps[stepName] = new Step(stepName, "Discard to 7 Cards", [discardStep]);
	steps[stepName].setDescription = function()
	{
		const playerWithTooManyCards = getPlayerWithTooManyCards(),
			numActionsRemaining = getNumActionsRemaining(),
			pluralizer = numActionsRemaining === 1 ? "" : "s";

		if (!playerWithTooManyCards)
		{
			if (eventTypeIsBeingPrompted(eventTypes.forecastPlacement))
				return false;
			
			return console.error("hand limit reached but card counts are inconsistent.");
		}

		this.description = `<span class='disabled'>[${numActionsRemaining} Action${pluralizer} Remaining]</span><br /><br />`;

		if (playerWithTooManyCards.rID !== getActivePlayer().rID)
		{
			this.description += `The ${playerWithTooManyCards.newRoleTag()} must discard to 7 cards.`;
		}
		else
			this.description += "Discard to 7 Cards";
	}

	stepName = "draw";
	steps[stepName] = new Step(stepName, "Draw 2 Cards", [drawStep]);

	stepName = "epIncrease";
	steps[stepName] = new Step(stepName, "Resolve Epidemics", [epidemicIncrease]);

	stepName = "epInfect";
	steps[stepName] = new Step(stepName, "Resolve Epidemics", [epidemicInfect]);
	
	stepName = "epIntensify";
	steps[stepName] = new Step(stepName, "Resolve Epidemics", [epidemicIntensify]);

	stepName = "discard";
	steps[stepName] = new Step(stepName, "Discard to 7 Cards", [discardStep]);
	
	stepName = "infect cities";
	steps[stepName] = new Step(stepName, "Infect 2 Cities", [infectionStep]);
})();

function resumeCurrentStep()
{
	log("resuming step: ", data.currentStep.name);
	data.currentStep.resume();
}

function proceed()
{
	data.currentStep.proceed();
}

function setCurrentStep(stepName)
{
	data.currentStep = data.steps[stepName];
	return data.currentStep;
}

function currentStepIs(stepName)
{
	return data.currentStep.name == stepName;
}

function indicateActionsLeft({ addend, zeroRemaining } = {})
{
	const $stepIndicator = $("#stepIndicator"),
		currentStepDescription = $stepIndicator.html();
	
	// "n Actions Remaining"
	if (currentStepDescription.substring(2, 8) !== "Action")
		return;
	
	const n = zeroRemaining ? "0" : parseInt(currentStepDescription[0]) + addend;

	$stepIndicator.html(`${n} Action${n === 1 ? "" : "s"} Remaining`);
}

function disableActions()
{
	log("disableActions()");
	const $actionsContainer = $("#actionsContainer");

	$actionsContainer.find(".button").addClass("btnDisabled");

	disableEventCards();
	disablePawnEvents();
	bindDiseaseCubeEvents({ on: false });
	disableResearchStationDragging();
}

function enableAvailableActions()
{
	log("enableAvailableActions()");
	const $actionsContainer = $("#actionsContainer"),
		player = getActivePlayer();
	
	$actionsContainer.find(".button").off("click").addClass("btnDisabled");
	$actionsContainer.find(".actionCategory").removeClass("hidden");
	
	enableAvailableActionButtons(player);
	enableAvailableSpecialActionButtons($actionsContainer, player);
	unhide($actionsContainer);
	
	enablePawnEvents();
	bindDiseaseCubeEvents();

	enableEventCards();
}

function enableEventCards({ resilientPopulationOnly } = {})
{
	log("enableEventCards()");
	
	let $eventCards = $("#playerPanelContainer").find(".playerCard.event").off("click");

	if (resilientPopulationOnly)
	{
		$eventCards.addClass("unavailable");
		$eventCards = $eventCards.filter("[data-key='resi']");
	}
	
	$eventCards.removeClass("unavailable")
		.click(function()
		{
			const eventType = getEventCardEventType($(this).data("key"));
			
			indicatePromptingEventCard();
			promptAction({ eventType });
		});
}

function indicatePromptingEventCard()
{
	const numActionsRemaining = getNumActionsRemaining();

	let description = "";
	if (actionStepInProgress() || currentStepIs("hand limit") && numActionsRemaining > 0)
	{
		const numActionsRemaining = getNumActionsRemaining(),
			pluralizer = numActionsRemaining === 1 ? "" : "s";
		
		description += `<span class='disabled'>[${numActionsRemaining} Action${pluralizer} Remaining]</span>`;
	}

	if (!eventTypeIsBeingPrompted(eventTypes.forecastPlacement))
	{
		if (description.length)
			description += "<br /><br />";
		
		description += "Play Event Card?";
	}
	
	$("#stepIndicator").html(description);
}

function getEventCardEventType(cardKey)
{
	const eventCardName = data.eventCards[cardKey];

	if (!eventCardName)
	{
		console.error(`Event Card does not exist: "${cardKey}"`);
		return false;
	}

	return eventTypes[toCamelCase(eventCardName)];
}

function disableEventCards()
{
	log("disableEventCards()");
	$("#playerPanelContainer").find(".playerCard.event")
		.off("click")
		.addClass("unavailable");
}

function actionStepInProgress()
{
	if (typeof data.currentStep.name === "undefined")
		return false;
	
	return data.currentStep.name.substring(0,6) === "action";
}

function disablePawnEvents()
{
	for (let rID in data.players)
		data.players[rID].disablePawn();
}

function enablePawnEvents()
{
	log("enablePawnEvents()");
	const actionStep = actionStepInProgress(),
		activePlayer = getActivePlayer(),
		airlifting = eventTypeIsBeingPrompted(eventTypes.airlift),
		dispatcherIsActive = activePlayer.role === "Dispatcher";

	let player;
	for (let rID in data.players)
	{
		player = data.players[rID];

		if (airlifting
			|| (actionStep && (dispatcherIsActive || rID === activePlayer.rID)))
		{
			log(`enabled ${player.role}'s pawn`);
			player.enablePawn();
		}
		else
		{
			log(`disabled ${player.role}'s pawn`);
			player.disablePawn();
		}
	}
}

function newResearchStationElement(cityKey)
{
	const $rs = $(`<img class='researchStation' data-key='${cityKey}' src='images/pieces/researchStation.png' />`),
		$boardContainer = $("#boardContainer"),
		$window = $(window);

	$rs.appendTo($boardContainer)
		.draggable(
		{
			confinement: $boardContainer,
			disabled: true
		})
		.mousedown(function()
		{
			const $this = $(this);

			if ($this.draggable("option", "disabled"))
				return false;

			$this.stop().css("z-index", data.dragPieceZindex);
			$window.off("mouseup").mouseup(function()
			{
				$window.off("mouseup");
				getGovernmentGrantTargetCity($this);
			});
		});
	
	return $rs;
}

function getAllResearchStations()
{
	return [...data.researchStationKeys]
		.filter(key => isCityKey(key))
		.map(key => getCity(key).getResearchStation());
}

function enableResearchStationDragging()
{
	log("enableResearchStationDragging()");
	
	for (let $rs of getAllResearchStations())
		$rs.draggable("enable");
}

function disableResearchStationDragging()
{
	log("disableResearchStationDragging()");

	for (let $rs of getAllResearchStations())
		$rs.draggable({ disabled: true });
}

function enableAvailableActionButtons(player)
{
	const actions = [
		"DirectFlight",
		"CharterFlight",
		"ShuttleFlight",
		"BuildResearchStation",
		"TreatDisease",
		"ShareKnowledge",
		"DiscoverCure"
	];

	// Some actions are always available
	enableActionButton("btnDriveFerry");
	enableActionButton("btnPass");

	for (let action of actions)
		if (player[`can${action}`]())
			enableActionButton(`btn${action}`);
}

function enableAvailableSpecialActionButtons($actionsContainer, player)
{
	const specialActions = [
			{ role: "Contingency Planner", name: "PlanContingency" },
			{ role: "Dispatcher", name: "DispatchPawn" },
			{ role: "Operations Expert", name: "OperationsFlight" }
		],
		$specialActionCategory = $actionsContainer.find("#specialActionCategory");

	for (let special of specialActions)
	{
		if (player.role !== special.role)
		{
			$specialActionCategory.children(`#btn${special.name}`).addClass("hidden");
			continue;
		}
		
		if (player[`can${special.name}`]())
			enableActionButton(`btn${special.name}`);
	}

	// if no special actions are available, hide the special action button group
	if ($specialActionCategory.children(".button").not(".hidden").length === 0)
		$specialActionCategory.addClass("hidden");
	else
		$specialActionCategory.removeClass("hidden");
}

function enableActionButton(buttonID)
{
	let actionName = buttonID.substring(3);
	
	actionName = actionName[0].toLowerCase() + actionName.substring(1);
	
	$("#" + buttonID)
		.off("click")
		.removeClass("btnDisabled hidden")
		.click(function()
		{
			promptAction({ eventType: eventTypes[actionName] });
		});
}

function enableBtnCancelAction()
{
	log("enableBtnCancelAction()");
	$("#btnCancelAction").off("click").click(function()
	{
		resetActionPrompt({ actionCancelled: true });
	}).css("display", "inline-block");
}

function disableBtnCancelAction()
{
	log("disableBtnCancelAction()");
	$("#btnCancelAction").off("click").css("display", "none");
}

function resetActionPrompt({ actionCancelled, doNotResumeStep } = {})
{
	log("resetActionPrompt()");
	const $actionInterface = $("#actionInterface"),
		$actionPrompt = $actionInterface.parent();
	
	$actionInterface.find(".button, .playerCard").off("click");

	$actionPrompt.addClass("hidden").removeAttr("style");
	$actionInterface.removeAttr("style");

	// If a Direct Flight or Charter Flight action is cancelled,
	// the player's pawn should be put back on their current location.
	if (actionCancelled)
	{
		const activePlayer = getActivePlayer(),
			{ airlift, governmentGrant, resilientPopulation } = eventTypes,
			animatePawns = true;
		
		if (activePlayer.role === "Dispatcher" || eventTypeIsBeingPrompted(airlift))
			clusterAll({ pawns: true });
		else
			activePlayer.getLocation().cluster({ animatePawns });

		if (eventTypeIsBeingPrompted(governmentGrant))
		{
			disableResearchStationDragging();
			clusterAll({ researchStations: true });

			resetGrantStation({ cancelled: true });
		}
		else if (eventTypeIsBeingPrompted(resilientPopulation))
			disableResilientPopulationSelection();
	}

	data.promptingEventType = false;

	if (!actionStepInProgress())
	{
		$actionPrompt.parent().addClass("hidden");
		enablePawnEvents();
	}

	if (!doNotResumeStep)
		resumeCurrentStep();
}

function promptAction(actionProperties)
{
	log(`promptAction(${actionProperties.eventType.code})`);
	const $actionPrompt = $("#actionPrompt"),
		$actionsContainer = $actionPrompt.parent(),
		$actionCategories = $actionsContainer.children(".actionCategory"),
		interfaceIsRequired = populateActionInterface(actionProperties);
	
	$actionCategories.off("click");
		
	if (interfaceIsRequired)
	{
		if (!eventTypeIsBeingPrompted(eventTypes.forecastPlacement)) // Forecast can't be cancelled once the cards are drawn.
			enableBtnCancelAction();
		
		$actionCategories.addClass("hidden");
		unhide($actionPrompt);

		// Event cards can be played during some non-action steps.
		if (!actionStepInProgress())
			$actionsContainer.siblings(".interface").addClass("hidden");
	}

	unhide($actionsContainer);
}

function populateActionInterface(actionProperties)
{
	const { eventType } = actionProperties,
		populatorMethod = actionInterfacePopulator[eventType.name];

	actionInterfacePopulator.clear().appendDescriptiveElements(eventType);

	return populatorMethod(actionProperties);
}

// NOTE: if an actionInterfacePopulator method is called by promptAction(),
// and the method does indeed populate the action interface,
// it must return true to signal that.
const actionInterfacePopulator = {
	$actionInterface: $("#actionInterface"),
	clear()
	{
		actionInterfacePopulator.$actionInterface.children().not("#btnCancelAction").remove();
		return actionInterfacePopulator;
	},
	appendDescriptiveElements(eventType)
	{
		if (eventType.code === eventTypes.chooseFlightType.code)
			return;
		
		let html = `<h2>${ eventType.name.toUpperCase() }</h2><div class='instructions'>`;
		
		for (let paragraph of eventType.rules)
			html += `<p>${paragraph}</p>`;
		
		html += `</div>`;

		html += `<p class='actionPromptSubtitle'>${eventType.instructions || ""}</p>`;

		actionInterfacePopulator.$actionInterface.append(html);
	},
	replaceSubtitle(newSubtitle, { lastParagraph } = {})
	{
		const $subtitle = actionInterfacePopulator.$actionInterface.find("p.actionPromptSubtitle");

		// There are cases where two action instructions are present.
		if (lastParagraph)
			$subtitle.last().html(newSubtitle);
		else
			$subtitle.first().html(newSubtitle);

		return actionInterfacePopulator;
	},
	concealSubtitle()
	{
		const $interface = actionInterfacePopulator.$actionInterface,
			$subtitle = $interface.find("p.actionPromptSubtitle");

		$subtitle.css("color", $interface.css("background-color"));

		return actionInterfacePopulator;
	},
	showSubtitle()
	{
		actionInterfacePopulator.$actionInterface.find("p.actionPromptSubtitle").css("color", "#fff");

		return actionInterfacePopulator;
	},
	appendDivision(eventType)
	{
		const { chooseFlightType, shareKnowledge, dispatchPawn } = eventTypes,
			code = eventType.code;

		let classPrefix;
		if (code === chooseFlightType.code)
			classPrefix = "actionInterface";
		else if (code === shareKnowledge.code || code === dispatchPawn.code)
			classPrefix = "discardPrompt";
		
		actionInterfacePopulator.$actionInterface.append(
			`<div class='${classPrefix}Division'>
				<div class='${classPrefix}DivisionLine'></div>
				<p>OR</p>
			<div>`);
		
		return actionInterfacePopulator;
	},
	appendOptionButtons(buttonType, cityKeys, onClick)
	{
		const $interface = actionInterfacePopulator.$actionInterface;
		let buttonClass, newElementFn;

		if (buttonType === "city")
		{
			buttonClass = "actionPromptOption";
			newElementFn = newCityButton;
		}
		else if (buttonType === "playerCard")
		{
			buttonClass = "playerCard";
			newElementFn = newPlayerCardElement;
		}

		for (let key of cityKeys)
			$interface.append(newElementFn(key));
		
		if (typeof onClick === "function")
			$interface.children(`.${buttonClass}`).click(function() { onClick($(this)) });
	},
	appendDiscardPrompt({ cardKeys, promptMsg, onConfirm })
	{
		log(`appendDiscardPrompt()`);
		log("cardKeys: ", cardKeys);
		const $discardPrompt = $(`<div class='discardSelections'></div>`),
			buttonClass = "btnConfirmAction";
		
		if (promptMsg)
			$discardPrompt.append(`<p>${promptMsg}</p>`);

		for (let key of ensureIsArray(cardKeys))
			$discardPrompt.append(newPlayerCardElement(key));

		$discardPrompt.append(`<div class='button ${buttonClass}'>DISCARD</div>`);

		if (typeof onConfirm === "function")
			$discardPrompt.children(`.${buttonClass}`).click(function()
			{
				$(`.${buttonClass}`).off("click").addClass("btnDisabled");
				onConfirm();
			});

		actionInterfacePopulator.$actionInterface.append($discardPrompt);

		return actionInterfacePopulator;
	},
	[eventTypes.driveFerry.name]()
	{
		const destinationKeys = getActivePlayer().getLocation().connectedCityKeys;

		actionInterfacePopulator.appendOptionButtons("city", destinationKeys,
			function($clicked)
			{
				setDuration("pawnAnimation", 600);
				movementAction(eventTypes.driveFerry, getCity($clicked.data("key")));
			});
		return true;
	},
	[eventTypes.shuttleFlight.name]()
	{
		const { shuttleFlight } = eventTypes,
			destinationKeys = getActivePlayer()[`valid${shuttleFlight.name}DestinationKeys`]();

		actionInterfacePopulator.appendOptionButtons("city", destinationKeys,
			function($clicked)
			{
				setDuration("pawnAnimation", 1000);
				movementAction(shuttleFlight, getCity($clicked.data("key")));
			});
		return true;
	},
	[eventTypes.chooseFlightType.name]({ destinationKey })
	{
		// If the player can reach the destination via Direct Flight,
		// but also via one other flight type, present *two options.
		// *See the comment in getMovementDetails as to why a maximum of two options are presented.
		const { chooseFlightType, operationsFlight, charterFlight, directFlight } = eventTypes;
		
		let firstOption;
		if (getActivePlayer().canOperationsFlight())
			firstOption = operationsFlight;
		else
			firstOption = charterFlight;

		actionInterfacePopulator.appendDescriptiveElements(firstOption)
		actionInterfacePopulator[firstOption.name]({ destinationKey });
		
		actionInterfacePopulator.appendDivision(chooseFlightType).appendDescriptiveElements(directFlight);
		actionInterfacePopulator[directFlight.name]({ destinationKey });

		return true;
	},
	[eventTypes.charterFlight.name]({ destinationKey })
	{
		const charterFlight = eventTypes.charterFlight;
	
		if (!destinationKey) // the user explicitly selected charter flight
		{
			// Remember the Charter Flight actionCode to avoid prompting Direct Flight when the pawn is dropped on a destination.
			data.promptingEventType = charterFlight;
			return true;
		}
		else
			data.promptingEventType = false;
		
		const currentCity = getActivePlayer().getLocation(),
			destination = getCity(destinationKey);
		
		actionInterfacePopulator
			.replaceSubtitle(`Destination: ${destination.name}`)
			.appendDiscardPrompt(
			{
				cardKeys: currentCity.key,
				onConfirm: function()
				{
					setDuration("pawnAnimation", 1000);
					movementAction(charterFlight, destination);
				}
			});
		return true;
	},
	[eventTypes.directFlight.name]({ destinationKey })
	{
		const directFlight = eventTypes.directFlight;
	
		if (destinationKey)
		{
			const destination = getCity(destinationKey);
			// NOTE: If a player drags and drops a pawn on a city
			// which is a valid Direct Flight and Charter Flight destination,
			// both action interfaces will be displayed.
			// Charter Flight is usually the better option,
			// therefore Direct Flight is always shown second, hence { lastParagraph: true }.
			actionInterfacePopulator
				.replaceSubtitle(`Destination: ${destination.name}`, { lastParagraph: true })
				.appendDiscardPrompt(
				{
					cardKeys: destinationKey,
					onConfirm: function()
					{
						setDuration("pawnAnimation", 1000);
						movementAction(directFlight, destination);
					}
				});
			
			return true;
		}
		
		const cardKeys = getActivePlayer()[`valid${directFlight.name}DestinationKeys`]();
			
		actionInterfacePopulator.appendOptionButtons("playerCard", cardKeys, function($clicked)
		{
			promptAction(
				{
					eventType: directFlight,
					destinationKey: $clicked.data("key")
				});
		});
		
		return true;
	},
	[eventTypes.buildResearchStation.name]({ stationRelocationKey })
	{
		const $actionInterface = actionInterfacePopulator.$actionInterface;

		if (getResearchStationSupplyCount() === 0 && !stationRelocationKey)
			return promptResearchStationRelocation();
		
		const player = getActivePlayer(),
			playerIsOperationsExpert = player.role === "Operations Expert",
			currentCity = player.getLocation();
		
		if (playerIsOperationsExpert) // no city card is required
		{
			let newSubtitle;
			if (stationRelocationKey)
			{
				newSubtitle = `${player.newSpecialAbilityTag()}
					<br />Move the research station from ${getCity(stationRelocationKey).name} to ${currentCity.name}?
					<br />(city card not required)`;
			}
			else
			{
				newSubtitle = `${player.newSpecialAbilityTag()}
					<br />Build research station in ${currentCity.name}?
					<br />(city card not required)`;
			}
			actionInterfacePopulator.replaceSubtitle(newSubtitle);
			
			const $btnConfirm = $("<div class='button'>CONFIRM</div>");
			$btnConfirm.click(function() { buildResearchStation(stationRelocationKey) });
			$actionInterface.append($btnConfirm);
		}
		else
		{
			if (stationRelocationKey)
			{
				actionInterfacePopulator.replaceSubtitle(`Discard the matching city card to move the research station 
					from ${getCity(stationRelocationKey).name} to ${currentCity.name}.`);
			}
			
			actionInterfacePopulator.appendDiscardPrompt(
			{
				cardKeys: currentCity.key,
				onConfirm: function()
				{
					buildResearchStation(stationRelocationKey);
				}
			});
		}

		return true;
	},
	[eventTypes.treatDisease.name]()
	{
		const $actionInterface = actionInterfacePopulator.$actionInterface,
			diseaseColorOptions = getActivePlayer().getLocation().getDiseaseColorOptions();
		
		if (diseaseColorOptions.length > 1)
		{
			for (let color of diseaseColorOptions)
				$actionInterface.append(`<div class='diseaseColorOption ${color}' data-color='${color}'></div>`);

			$actionInterface.children(".diseaseColorOption").click(function()
			{
				resetActionPrompt();
				treatDisease(false, $(this).data("color"));
			});

			return true;
		}
		
		// Only one cube color on the currentCity -- action interface not needed.
		treatDisease(false, diseaseColorOptions[0]);
		return false;
	},
	[eventTypes.shareKnowledge.name]({ shareKnowledgeParticipant })
	{
		const $actionInterface = actionInterfacePopulator.$actionInterface,
			player = getActivePlayer();
		
		let participant = shareKnowledgeParticipant;

		if (!participant)
		{
			const validParticipants = getValidShareKnowledgeParticipants(player);
			
			if (validParticipants.length === 1)
				participant = validParticipants[0];
			else
			{
				$actionInterface.append(`<p class='actionPromptSubtitle'>
											Share Knowledge with which player?
										</p>`);
				
				const $shareKnowledgePlayerOptions = $("<div class='playerOptions'></div>");
				
				for (let possibleParticipant of validParticipants)
					$shareKnowledgePlayerOptions.append(possibleParticipant.newRoleTag());

				$shareKnowledgePlayerOptions.children().click(function()
				{
					promptAction(
						{
							eventType: eventTypes.shareKnowledge,
							shareKnowledgeParticipant: data.players[$(this).data("role")]
						});
				});

				$actionInterface.append($shareKnowledgePlayerOptions);
			}
		}
		
		if (participant)
		{
			const researcherRole = "Researcher";
			
			let $giveableContainer = false,
				$takeableContainer = false,
				selectCardString = "";
			
			actionInterfacePopulator.replaceSubtitle(`Share Knowledge with:<br/>${participant.newRoleTag()}`);
			
			if (player.canGiveKnowledge())
			{
				if (player.role === researcherRole)
					selectCardString += player.newSpecialAbilityTag() + "<br />";

				selectCardString += `Select a card to <i>give</i> :`;
				
				$giveableContainer = $(`<div id='giveableCards' class='shareableCards'>
											<p>${selectCardString}</p>
										</div>`);
				
				for (let cardKey of player.getShareableCardKeys())
					$giveableContainer.append(newPlayerCardElement(cardKey));

				$actionInterface.append($giveableContainer);
			}

			if (participant.canGiveKnowledge())
			{
				if ($giveableContainer)
				{
					actionInterfacePopulator.appendDivision(eventTypes.shareKnowledge);
					selectCardString = "";
				}
				
				if (participant.role === researcherRole)
					selectCardString += participant.newSpecialAbilityTag() + "<br />";
				
				selectCardString += `Select a card to <i>take</i> :`;
				
				$takeableContainer = $(`<div id='takeableCards' class='shareableCards'>
											<p>${selectCardString}</p>
										</div>`);
				
				for (let cardKey of participant.getShareableCardKeys())
					$takeableContainer.append(newPlayerCardElement(cardKey));

				$actionInterface.append($takeableContainer);
			}

			const $cardOptions = $(".shareableCards").children(".playerCard");
			$cardOptions.click(function()
			{
				$cardOptions.off("click");
				shareKnowledge(player, participant, $(this).data("key"));
			});
		}
		return true;
	},
	[eventTypes.discoverCure.name]()
	{
		const player = getActivePlayer(),
			useableCardKeys = player.getCardsForDiscoverCure(),
			$cardSelectionPrompt = new DiscardPrompt(
			{
				eventTypeCode: eventTypes.discoverCure.code,
				buttonText: "DISCOVER CURE",
				cardKeys: useableCardKeys,
				numDiscardsRequired: player.role === "Scientist" ? 4 : 5,
				onConfirm: discoverCure
			});
		
		actionInterfacePopulator.$actionInterface.append($cardSelectionPrompt);

		if (player.role === "Scientist")
			actionInterfacePopulator.replaceSubtitle(`${player.newSpecialAbilityTag()}<br />
				You need only 4 cards of the same color to do this action.`);

		return true;
	},
	[eventTypes.pass.name]()
	{
		const $btnConfirm = $("<div id='btnConfirmPass' class='button'>CONFIRM</div>");

		$btnConfirm.click(function()
		{
			resetActionPrompt({ doNotResumeStep: true });
			passActions();
		});

		actionInterfacePopulator.$actionInterface.append($btnConfirm);

		return true;
	},
	[eventTypes.operationsFlight.name]({ destinationKey })
	{
		const operationsFlight = eventTypes.operationsFlight;
	
		if (!destinationKey) // the user explicitly selected operations flight
		{
			// Remember the Operations Flight actionCode to avoid prompting Direct or Charter Flight when the pawn is dropped on a destination.
			data.promptingEventType = operationsFlight;
			return true;
		}
		else
			data.promptingEventType = false;
		
		const player = getActivePlayer(),
			useableCardKeys = player.cardKeys.filter(key => isCityKey(key)),
			destination = getCity(destinationKey);
		
		actionInterfacePopulator.replaceSubtitle(`Destination: ${destination.name}
			<br />Select a card to discard:`);

		actionInterfacePopulator.appendOptionButtons("playerCard", useableCardKeys, function($clicked)
		{
			setDuration("pawnAnimation", 1000);
			movementAction(operationsFlight, destination, { operationsFlightDiscardKey: $clicked.data("key") });
		});

		return true;
	},
	[eventTypes.dispatchPawn.name]({ playerToDispatch, destination, dispatchMethod })
	{
		const { chooseFlightType, directFlight, charterFlight, dispatchPawn } = eventTypes;

		if (destination)
		{
			let newSubtitle = `Dispatch ${playerToDispatch.newRoleTag()} from ${getCity(playerToDispatch.cityKey).name} to ${destination.name}`;
			
			if (dispatchMethod.code === chooseFlightType.code)
			{
				newSubtitle += "...";
				
				actionInterfacePopulator
					.appendDiscardPrompt(
					{
						cardKeys: destination.key,
						promptMsg: `via ${getDispatchInstructionTooltip(directFlight)}?`,
						onConfirm: function()
						{
							movementAction(directFlight, destination, { playerToDispatch });
						}
					})
					.appendDivision(dispatchPawn)
					.appendDiscardPrompt(
					{
						cardKeys: playerToDispatch.cityKey,
						promptMsg: `via ${getDispatchInstructionTooltip(charterFlight)}?`,
						onConfirm: function()
						{
							movementAction(charterFlight, destination, { playerToDispatch });
						}
					});
			}
			else
			{
				newSubtitle += `<br />via ${getDispatchInstructionTooltip(dispatchMethod)}?`;
				
				const discardKey = dispatchMethod.code === directFlight.code ? destination.key : playerToDispatch.cityKey;
				
				actionInterfacePopulator.appendDiscardPrompt(
				{
					cardKeys: discardKey,
					onConfirm: function()
					{
						movementAction(dispatchMethod, destination, { playerToDispatch });
					}
				});
			}

			actionInterfacePopulator.replaceSubtitle(newSubtitle);
		}

		return true;
	},
	[eventTypes.airlift.name]({ playerToAirlift, destination })
	{
		if (!destination)
		{
			clusterAll({ pawns: true });
			data.promptingEventType = eventTypes.airlift;
			enablePawnEvents();
		}
		else
		{
			actionInterfacePopulator.replaceSubtitle(`Airlift ${playerToAirlift.newRoleTag()}<br />
				from ${getCity(playerToAirlift.cityKey).name} to ${destination.name}?`);
			
			actionInterfacePopulator.appendDiscardPrompt(
			{
				cardKeys: eventTypes.airlift.cardKey,
				onConfirm: function()
				{
					resetActionPrompt({ doNotResumeStep: true });
					data.promptingEventType = false;
					airlift(playerToAirlift, destination);
				}
			});
		}

		return true;
	},
	[eventTypes.governmentGrant.name]({ targetCity, relocationKey })
	{
		disablePawnEvents();
		bindDiseaseCubeEvents({ on: false });
		clusterAll(
		{
			pawns: true,
			researchStations: true,
			stationKeyToExclude: relocationKey
		});
		
		data.promptingEventType = eventTypes.governmentGrant;
		
		if (targetCity)
		{
			let newSubtitle;
			if (relocationKey)
				newSubtitle = `Move the Research Station from ${getCity(relocationKey).name} to ${targetCity.name}?`;
			else
				newSubtitle = `Build Research Station in<br />${targetCity.name}?`;
			
			actionInterfacePopulator.replaceSubtitle(newSubtitle)
				.appendDiscardPrompt(
				{
					cardKeys: eventTypes.governmentGrant.cardKey,
					onConfirm: () => governmentGrant(targetCity, relocationKey)
				});

			return true;
		}

		if (getResearchStationSupplyCount() === 0)
			return promptGovernmentGrantStationRelocation();

		// The player is prompted to drag and drop a new station from the supply.
		newGrantStation();
		
		return true;
	},
	[eventTypes.resilientPopulation.name]({ cardKeyToRemove })
	{
		const eventType = eventTypes.resilientPopulation;
		
		data.promptingEventType = eventType;

		if (cardKeyToRemove)
		{
			const newSubtitle = `Remove ${getCity(cardKeyToRemove).name}'s infection card from the game?`;

			actionInterfacePopulator.replaceSubtitle(newSubtitle)
				.appendDiscardPrompt(
				{
					cardKeys: eventType.cardKey,
					onConfirm: () => resilientPopulation(cardKeyToRemove)
				});
		}
		else
			enableResilientPopulationSelection();

		return true;
	},
	[eventTypes.oneQuietNight.name]()
	{
		// While the rules do not explicitly forbid it, the simplest way to handle an attempt to play the One Quiet Night event card
		// during the "infect cities" step is to disallow it. There is no point in allowing it because the card would not
		// take effect until the next turn -- the player can simply wait until the "infect cities" step is over.
		if (currentStepIs("infect cities") && getEventsOfTurn(eventTypes.infectCity).length)
			actionInterfacePopulator.replaceSubtitle(`<span class='r'>This card skips the <i>next</i> Infect Cities step. Please wait until the the current Infect Cities step has completed.</span>`);
		else
		{
			actionInterfacePopulator.appendDiscardPrompt(
			{
				cardKeys: eventTypes.oneQuietNight.cardKey,
				onConfirm: () => oneQuietNight()
			});
		}
		
		
		return true;
	},
	[eventTypes.forecast.name]({ forecastEventToLoad })
	{
		if (forecastEventToLoad)
		{
			forecastDraw(forecastEventToLoad);
			return true;
		}
		
		const eventType = eventTypes.forecast;

		data.promptingEventType = eventType;
		actionInterfacePopulator.appendDiscardPrompt(
		{
			cardKeys: eventType.cardKey,
			onConfirm: () => forecastDraw()
		});
		return true;
	}
}

function forecastInProgress()
{
	const { forecast, forecastPlacement } = eventTypes,
		forecastEventsThisTurn = getEventsOfTurn([forecast, forecastPlacement]),
		numEvents = forecastEventsThisTurn.length;
	
	if (numEvents > 0 && numEvents % 2 !== 0)
	{
		// A forecast must be resolved.
		const forecastEventToLoad = forecastEventsThisTurn[numEvents - 1];
		log("forecastEventToLoad: ", forecastEventToLoad);
		promptAction({ eventType: forecast, forecastEventToLoad });

		return true;
	}

	return false;
}

async function forecastDraw(forecastEventToLoad)
{
	data.promptingEventType = eventTypes.forecastPlacement;

	disableBtnCancelAction();
	disableActions();
	$(".discardSelections").remove();

	indicatePromptingEventCard();

	const forecastEvent = forecastEventToLoad || (await requestAction(eventTypes.forecast)).shift();
	
	// If loading an unresolved forecast, the event card will already be in the discard pile.
	if (!forecastEventToLoad)
		await discardEventCard(forecastEvent);
	
	await animateForecastDraw(forecastEvent.cardKeys);
	
	const $btnDone = $("<div class='button'>DONE</div>");

	// Subtitle remains hidden until the cards are revealed, then it's displayed along with $btnDone
	actionInterfacePopulator
		.showSubtitle()
		.$actionInterface.append($btnDone);

	await buttonClickPromise($btnDone, { afterClick: "hide" });
	forecastPlacement(forecastEvent);
}

function animateForecastDraw(cardKeys)
{
	return new Promise(async resolve =>
	{
		const { $container, $cardContainer } = newForecastContainer();
		
		actionInterfacePopulator
			.replaceSubtitle("Click and drag to rearrange the cards. When done, the cards will be put back on top of the deck in order from bottom to top.")
			.concealSubtitle()
			.$actionInterface.append($container);

		// Cards are dealt one at a time...
		const cards = await dealForecastedCards($cardContainer, cardKeys);
		for (let card of cards)
			revealInfectionCard(card, { forecasting: true });
		// ...but revealed simultaneously after the following duration:
		await sleep(getDuration("mediumInterval"));
	
		enableForecastSorting($cardContainer);
		$container.find(".concealed").removeClass("concealed");

		resolve();
	});
}

function newForecastContainer()
{
	const $container = $(`<div id='forecastContainer'>
							<p class='concealed'>
								Top<sup class='hoverInfo concealed' title='The top card will be put back on the deck last.'>?</sup>
							</p>
							<div id='forecastCards'></div>
							<p class='concealed'>
								Bottom<sup class='hoverInfo concealed' title='The bottom card will be put back on the deck first.'>?</sup>
							</p>
						</div>`),
		$cardContainer = $container.children("#forecastCards");
	
	return { $container, $cardContainer };
}

function dealForecastedCards($cardContainer, cardKeys)
{
	return new Promise(async resolve =>
	{
		const $container = $cardContainer.parent(),
			cards = [];

		for (let i = 0; i < cardKeys.length; i++)
		{
			$cardContainer.append(newInfectionCardTemplate());
			cards.push({ cityKey: cardKeys[i], index: i });
		}
		positionInfectionPanelComponents();

		const containerInitialHeight = $container.height(),
			$veils = $cardContainer.find(".veil").addClass("hidden");

		await animatePromise({
			$elements: $container,
			initialProperties: { height: 0 },
			desiredProperties: { height: containerInitialHeight },
			duration: 400,
			easing: "easeInQuad"
		});

		$veils.removeClass("hidden");
		$container.removeAttr("style");

		await dealFaceDownInfGroup(cards);

		resolve(cards);
	});
}

function enableForecastSorting($cardContainer)
{
	$cardContainer.sortable(
	{
		containment: $cardContainer.parent(),
		axis: "y",
		sort: function(e, ui) { ui.item.find(".infectionCardContents").css("width", "100%") },
		stop: function(e, ui) { ui.item.find(".infectionCardContents").css("width", "19.5%") },
		revert: 200
	});
}

// 
async function forecastPlacement(forecastEvent)
{
	const $cardContainer = $("#forecastCards"),
		cardKeys = [];
	
	$cardContainer.sortable("disable")
		.children(".infectionCard").each(function()
		{
			cardKeys.push($(this).data("key"));
		});
	// Reversing achieves the order in which the cards will be placed back on the deck.
	cardKeys.reverse();

	await Promise.all(
	[
		requestAction(eventTypes.forecastPlacement, { cardKeys, forecastingRole: forecastEvent.role }),
		animateForecastPlacement($cardContainer)
	]);

	actionInterfacePopulator.$actionInterface.slideUp(function() { resetActionPrompt() });
}

async function animateForecastPlacement($cardContainer)
{
	const $cards = $cardContainer.children(".infectionCard");

	$cards.prepend($(`<img	class='forecastCardback'
							src='images/cards/infectionCardback.png'
							alt='Infection Card' />`));
	
	const $cardbacks = $cardContainer.find(".forecastCardback").width(getDimension("diseaseIcon")),
		$elementsToFadeOut = $(".actionPromptSubtitle")
			.add($cardContainer.siblings("p")) // Top/Bottom labels
			.add($cards.children(".infectionCardContents"));
	
	let duration = 500;
	
	await Promise.all(
	[
		animatePromise({
			$elements: $elementsToFadeOut,
			desiredProperties: { opacity: 0 },
			duration
		}),
		animatePromise({
			$elements: $cardbacks,
			desiredProperties: { opacity: 1 },
			duration
		})
	]);

	await sleep(getDuration("shortInterval"));

	const cardbackInitialWidth = $cardbacks.first().width(),
		$deck = $("#imgInfectionDeck"),
		deckWidth = $deck.width(),
		deckOffset = $deck.offset(),
		easing = "easeOutSine";
	
	duration = 300;

	let $card, cardOffset;
	for (let i = $cardbacks.length - 1; i >= 0 ; i--)
	{
		$card = $cardbacks.eq(i);
		cardOffset = $card.offset();

		await animatePromise(
		{
			$elements: $card.appendTo("body"),
			initialProperties: { ...cardOffset, ...{ width: cardbackInitialWidth, zIndex: 10 } },
			desiredProperties: { ...deckOffset, ...{ width: deckWidth } }, 
			duration,
			easing
		});

		$card.remove();
	}
}

async function oneQuietNight()
{
	resetActionPrompt({ doNotResumeStep: true });
	disableActions();

	const events = await requestAction(eventTypes.oneQuietNight);
	
	await discardEventCard(events.shift());

	if (isOneQuietNight())
		indicateOneQuietNightStep();

	resumeCurrentStep();
}

function indicateOneQuietNightStep({ off } = {})
{
	let title = "",
		html = "3. Infect Cities";

	if (!off)
	{
		html += " (One Quiet Night)";
		title = `One Quiet Night: skip the next Infect Cities step.`;
	}
	
	$("#turnProcedureContainer").find(".step.infect")
		.attr("title", title)
		.html(html);
}

async function animateOneQuietNight()
{
	$("#stepIndicator").html("One Quiet Night");
	
	return specialEventAlert(
	{
		title: "One Quiet Night",
		description: "Skipping the Infect Cities step...",
		eventClass: "event"
	});
}

function enableResilientPopulationSelection()
{
	const $infectionDiscards = $("#infectionDiscard").children(".infectionCard");

	if ($infectionDiscards.length)
	{
		$infectionDiscards.off("click")
			.click(function()
			{
				promptAction(
				{
					eventType: eventTypes.resilientPopulation,
					cardKeyToRemove: $(this).data("key")
				});
			});
	}
	else
		actionInterfacePopulator.replaceSubtitle("<span class='r'>The Infection Discard Pile is empty!<br />To play Resilient Population, there must be at least 1 card in the Infection Discard Pile.</span>");
}

function disableResilientPopulationSelection()
{
	$("#infectionDiscard").children(".infectionCard").off("click");
}

async function resilientPopulation(cardKeyToRemove)
{
	resetActionPrompt({ doNotResumeStep: true });
	disableActions();

	const eventType = eventTypes.resilientPopulation,
		events = await requestAction(eventType, { cardKeyToRemove });

	await discardEventCard(events.shift());
	await resilientPopulationAnimation(cardKeyToRemove);

	resizeInfectionDiscardElements();
	resumeCurrentStep();
}

async function resilientPopulationAnimation(cardKeyToRemove)
{
	const $discardPile = $("#infectionDiscard"),
		$removedCardsContainer = $discardPile.children("#removedInfectionCards").removeClass("hidden"),
		$cardToRemove = $discardPile.children(`[data-key='${cardKeyToRemove}']`),
		initialOffset = $cardToRemove.offset();

	await expandInfectionDiscardPile();
	
	$cardToRemove.appendTo("#boardContainer");
	
	await animatePromise(
	{
		$elements: $cardToRemove,
		initialProperties:
		{
			...{ position: "absolute", zIndex: 10 },
			...initialOffset
		},
		desiredProperties: { top: $removedCardsContainer.offset().top + $removedCardsContainer.height() },
		duration: 750,
		easing: "easeInOutQuint"
	});

	$cardToRemove.appendTo($removedCardsContainer)
		.removeAttr("style");

	await sleep(getDuration("longInterval"));
	return collapsenfectionDiscardPile();
}

function tryAirlift(playerToAirlift)
{
	log("tryAirlift()");
	const { airlift } = eventTypes,
		destination = getDestination(airlift, { player: playerToAirlift });

	log("destination: ", destination);
	if (!destination)
	{
		getCity(playerToAirlift.cityKey).cluster({ animatePawns: true });
		return false;
	}

	clusterAll({ pawns: true, playerToExcludePawn: playerToAirlift });

	promptAction({ eventType: airlift, playerToAirlift, destination });
}

async function airlift(playerToAirlift, destination)
{
	disableActions();
	
	const eventType = eventTypes.airlift,
		events = await requestAction(eventType,
		{
			roleToAirlift: playerToAirlift.rID,
			originKey: playerToAirlift.cityKey,
			destinationKey: destination.key
		});
	
	await discardEventCard(events.shift());

	playerToAirlift.updateLocation(destination);

	// If any events are left after shifting the airliftEvent, they are auto-treat disease events.
	log("auto-treat events:");
	log(events);
	if (events.length)
		await animateAutoTreatDiseaseEvents(events);
	
	enablePawnEvents();
	resumeCurrentStep();
}

function newGrantStation()
{
	const $boardContainer = $("#boardContainer");

	let $grantStation = $boardContainer.find(".researchStation.grantStation");
	
	if ($grantStation.length)
		return;
	
	$grantStation = $(`<img class='researchStation grantStation' src='images/pieces/researchStation.png' />`);
	
	$boardContainer.append($grantStation);

	data.researchStationKeys.add("grantStation");
	$grantStation.offset($("#researchStationSupply img").offset());
	
	$grantStation.draggable({ containment: $boardContainer })
		.mousedown(function()
		{
			updateResearchStationSupplyCount();

			$(window).off("mouseup").mouseup(function()
			{
				$(window).off("mouseup");
				getGovernmentGrantTargetCity($grantStation);
			});
		});
}

function resetGrantStation({ $researchStation, cancelled } = {})
{
	log("resetGrantStation()");
	$researchStation = $researchStation || $("#boardContainer > .researchStation.grantStation");

	if (!$researchStation.length)
		return false;

	$researchStation.animate($("#researchStationSupply img").offset(), getDuration("stationPlacement"),
		function()
		{
			data.researchStationKeys.delete("grantStation");
			updateResearchStationSupplyCount();
			$(this).remove();
			
			if (!cancelled)
				promptAction({ eventType: eventTypes.governmentGrant });
			
		});
}

function promptGovernmentGrantStationRelocation()
{
	actionInterfacePopulator.replaceSubtitle(`<span class='r'>Research Station Supply is empty!</span>
		<br />You may relocate any Research Station currently on the board.
		<br />Drag and drop an existing Research Station onto the city of your choice.`);
	
	enableResearchStationDragging();

	return true;
}

function getGovernmentGrantTargetCity($researchStation)
{
	log("getGovernmentGrantTargetCity()");
	const stationOffset = $researchStation.offset(),
		distanceThreshold = getDimension("piecePlacementThreshold"),
		relocating = !$researchStation.hasClass("grantStation"),
		relocationKey = relocating ? $researchStation.data("key") : false;

	// Measure from what looks like the element's center.
	stationOffset.top += $researchStation.height() / 3;
	stationOffset.left += $researchStation.width() / 3;

	let targetCity;
	for (let key in data.cities)
	{
		targetCity = getCity(key);
		if (!targetCity.hasResearchStation
			&& distanceBetweenPoints(stationOffset, targetCity.getOffset()) < distanceThreshold)
		{
			log("target: ", targetCity.name);	
			return promptAction({ eventType: eventTypes.governmentGrant, targetCity, relocationKey });
		}
	}

	log("target not found");

	if (relocating)
	{
		log("relocationKey:", relocationKey);
		getCity(relocationKey).cluster({ animateResearchStation: true });
	}
	else
		resetGrantStation($researchStation);
}

async function governmentGrant(targetCity, relocationKey)
{
	data.promptingEventType = false;
	resetActionPrompt({ doNotResumeStep: true });
	disableActions();
	
	const eventType = eventTypes.governmentGrant,
		events = await requestAction(eventType,
		{
			locationKey: targetCity.key,
			relocationKey: relocationKey || 0
		});
	
	await discardEventCard(events.shift());

	if (relocationKey)
		getCity(relocationKey).relocateResearchStationTo(targetCity);
	else
		targetCity.buildResearchStation({ animate: true, isGovernmentGrant: true });
	
	resumeCurrentStep();
}

function eventTypeIsBeingPrompted(eventType)
{
	return data.promptingEventType && data.promptingEventType.code === eventType.code;
}

function clusterAll({ pawns, playerToExcludePawn, researchStations, stationKeyToExclude } = {})
{
	const rIdToExclude = playerToExcludePawn ? playerToExcludePawn.rID : false;
	
	if (pawns)
		for (let rID in data.players)
			if (rID !== rIdToExclude)
				queueCluster(data.players[rID].cityKey);

	if (researchStations)
	{
		const rsKeys = [...data.researchStationKeys]
			.filter(key => isCityKey(key) && key !== stationKeyToExclude);

		for (let cityKey of rsKeys)
			queueCluster(cityKey);
	}

	executePendingClusters(
	{
		animatePawns: pawns,
		$pawnToExclude: playerToExcludePawn ? playerToExcludePawn.getPawn() : false,
		animateResearchStation: researchStations,
		stationKeyToExclude
	});
}

function discardEventCard(event)
{
	return new Promise(async resolve =>
	{
		const cardKey = getEventType(event.code).cardKey,
			player = data.players[event.role],
			$card = $("#playerPanelContainer").find(`.playerCard[data-key='${cardKey}']`);
		
		$card.removeClass("unavailable");
		log("event card: ", $card.attr("data-key"));
	
		await movePlayerCardsToDiscards({ $card });
		player.removeCardsFromHand(cardKey);
		resolve();
	});
}

function tryDispatchPawn(playerToDispatch)
{
	const dispatchDetails = determineDispatchDetails(playerToDispatch);

	if (!dispatchDetails)
	{
		getCity(playerToDispatch.cityKey).cluster({ animatePawns: true });
		return false;
	}
	
	const { method, destination } = dispatchDetails;
	
	if (movementTypeRequiresDiscard(method))
	{
		// If both Direct Flight and Charter Flight are valid ways to reach the destination, the Dispatcher must choose between them.
		const dispatcherMustChooseMethod = method.code === eventTypes.directFlight.code
											&& getPlayer("Dispatcher").isHoldingCardKey(playerToDispatch.cityKey),
			actionDetails = {
				eventType: eventTypes.dispatchPawn,
				playerToDispatch,
				destination
			};
		
		actionDetails.dispatchMethod = dispatcherMustChooseMethod ? eventTypes.chooseFlightType : method;
		
		promptAction(actionDetails);
	}
	else // The dispatch method can be executed immediately.
		movementAction(method, destination, { playerToDispatch });
}

function determineDispatchDetails(playerToDispatch)
{
	const {
			rendezvous,	
			driveFerry,
			shuttleFlight,
			directFlight,
			charterFlight
		} = eventTypes,
		dispatchMethods = [
			rendezvous,
			driveFerry,
			shuttleFlight,
			directFlight,
			charterFlight
		];

	let destination;
	for (let method of dispatchMethods)
	{
		destination = getDestination(method, { player: playerToDispatch, dispatching: true });

		if (destination)
			return { destination, method };
	}

	return false;
}

function getDispatchInstructionTooltip(eventType)
{
	const { directFlight, charterFlight } = eventTypes,
		validEventTypeCodes = [directFlight.code, charterFlight.code];
	
	if (validEventTypeCodes.includes(eventType.code))
		return `<span class='hoverInfo' title='${eventType.dispatchInstructions}'>${eventType.name}</span>`;
	
	console.error("Failed not fetch dispatch instuctions: invalid event type.");
	return "";
}

class DiscardPrompt
{
	constructor({ eventTypeCode, buttonText, cardKeys, numDiscardsRequired, onConfirm })
	{
		this.eventTypeCode = eventTypeCode;
		this.cardKeys = cardKeys;
		this.numDiscardsRequired = numDiscardsRequired;
		this.onConfirm = onConfirm;

		this.$container = $(`<div class='discardPrompt'>
								<div class='cardsToKeep'>
									<p>Keep:<span></span></p>
								</div>
								<div class='discardSelections'>
									<p>Discard:<span></span></p>
								</div>
								<div class='btnConfirm button btnDisabled'>${buttonText}</div>
							</div>`);
		
		this.$keepersContainer = this.$container.children(".cardsToKeep");
		this.$discardsContainer = this.$container.children(".discardSelections");
		this.$btnConfirm = this.$container.children(".btnConfirm");

		if (cardKeys.length === numDiscardsRequired)
		{
			for (let key of cardKeys)
				this.$discardsContainer.append(newPlayerCardElement(key));

			this.keeperCount = 0;
			this.discardSelectionCount = cardKeys.length;
			
			this.$keepersContainer.addClass("hidden");

			this.bindConfirmClick();
		}
		else
		{
			for (let key of cardKeys)
				this.$keepersContainer.append(newPlayerCardElement(key));

			this.discardSelectionCount = 0;
			this.keeperCount = cardKeys.length;

			const self = this;
			this.getKeeperCardElements().click(function() { self.toggleDiscardSelection($(this)) });
		}

		this.updateCountIndicators();

		log("DiscardPrompt cardKeys: ", this.cardKeys);

		return this.$container;
	}

	requirementsMet()
	{
		return this.discardSelectionCount === this.numDiscardsRequired;
	}

	getKeeperCardElements()
	{
		return this.$keepersContainer.children(".playerCard");
	}

	getDiscardSelectionElements()
	{
		return this.$discardsContainer.children(".playerCard");
	}

	getDiscardSelectionKeys()
	{
		const discardKeys = [];

		this.getDiscardSelectionElements()
			.each(function() { discardKeys.push($(this).data("key")) });

		return discardKeys;
	}
	
	toggleDiscardSelection($card)
	{
		if ($card.parent().is(this.$keepersContainer))
			this.moveToDiscardSelections($card)
		else
			this.moveToKeepers($card);
	
		if (this.requirementsMet())
			this.bindConfirmClick();
		else
			this.$btnConfirm.off("click").addClass("btnDisabled");
	}

	moveToDiscardSelections($card)
	{
		$card.appendTo(this.$discardsContainer);

		this.keeperCount--;
		this.discardSelectionCount++;

		this.updateCountIndicators();
	}

	moveToKeepers($card)
	{
		$card.appendTo(this.$keepersContainer);

		this.discardSelectionCount--;
		this.keeperCount++;

		this.updateCountIndicators();
	}
	
	updateCountIndicators()
	{
		const textColor = this.requirementsMet() ? "green" : "red";
		
		// Show the keeper count for a plain old discard event to emphasize the hand limit.
		if (this.eventTypeCode === eventTypes.discard.code)
		{
			this.$keepersContainer.find("span")
				.html(`${this.keeperCount} / ${data.HAND_LIMIT} `)
				.css("color", textColor);
		}
			
		this.$discardsContainer.find("span")
			.html(`${this.discardSelectionCount} / ${this.numDiscardsRequired}`)
			.css("color", textColor);
	}

	bindConfirmClick()
	{
		const $btn = this.$btnConfirm,
			self = this;
		
		$btn.off("click")
			.click(function()
			{
				self.getDiscardSelectionElements().off("click");
				$btn.off("click").addClass("hidden");

				self.onConfirm(self.getDiscardSelectionKeys());
			})
			.removeClass("btnDisabled");
	}
}

function requestAction(eventType, dataToPost)
{
	if (eventType.code !== eventTypes.pass.code)
		indicateActionsLeft({ addend: -1 });
	else
		indicateActionsLeft({ zeroRemaining: true });
	
	log(`requestAction(${eventType.code})`);
	return new Promise((resolve, reject) =>
	{
		$.post(`serverCode/actionPages/${eventType.pathName}.php`,
		{
			...{
				actionCode: eventType.code,
				currentStep: data.currentStep.name,
				role: getActivePlayer().rID
			},
			...dataToPost
		},
		function(response)
		{
			log(response);
			const {
				events,
				nextStep,
				proceedFromDiscardToStep, // in case playing an event card satisfied the discard requirement.
				turnNum,
				numPlayerCardsRemaining,
				failure
			} = JSON.parse(response);
			
			if (failure)
			{
				indicateActionsLeft({ addend: 1 });
				reject(failure);
			}
			else
			{
				// Only some actions report back with the turn number and the next step.
				if (turnNum)
					data.turnNum = turnNum;
					
				if (nextStep)
					data.nextStep = nextStep;
				else if (proceedFromDiscardToStep)
					bypassDiscardStep(proceedFromDiscardToStep);

				if (numPlayerCardsRemaining)
					data.numPlayerCardsRemaining = numPlayerCardsRemaining;
				
				if (events)
					resolve(parseEvents(events));
				else
					resolve();
			}
		});
	});
}

async function passActions()
{
	disableActions();
	await requestAction(eventTypes.pass);
	proceed();
}

function getValidShareKnowledgeParticipants(player)
{
	// Begin by creating an array of all other players in the same city as the initiating player. 
	const playersInSameCity = player.getLocation().getOccupants()
		.filter(p => p.rID !== player.rID);

	// If the initiating player can give, then all players in the same city are valid participants.
	if (player.canGiveKnowledge())
		return playersInSameCity;
	else // The initiating player in question cannot give -- return only valid givers.
		return playersInSameCity.filter(p => p.canGiveKnowledge());
}

async function shareKnowledge(activePlayer, participant, cardKey)
{
	disableActions();
	resetActionPrompt({ doNotResumeStep: true });
	
	let giver, receiver;
	if (activePlayer.isHoldingCardKey(cardKey))
	{
		giver = activePlayer;
		receiver = participant;
	}
	else
	{
		giver = participant;
		receiver = activePlayer;
	}

	let players = [giver, receiver],
		string;
	for (let p of players)
	{
		string = "";
		for (let key of p.cardKeys)
		{
			string += key + ",";
		}
		log(`${p.role} cardKeys: ${string}`);
	}

	await requestAction(eventTypes.shareKnowledge,
		{
			giver: giver.rID,
			receiver: receiver.rID,
			cardKey: cardKey
		});

	
	await animateShareKnowledge(giver, receiver, cardKey);

	giver.removeCardsFromHand(cardKey);
	receiver.cardKeys.push(cardKey);

	for (let p of players)
	{
		string = "";
		for (let key of p.cardKeys)
		{
			string += key + ",";
		}
		log(`${p.role} cardKeys: ${string}`);
	}

	proceed();
}

function animateShareKnowledge(giver, receiver, cardKey)
{
	return new Promise(resolve =>
	{
		const $card = giver.getPanel().find(`.playerCard[data-key='${cardKey}']`),
			$insertAfterMe = receiver.getPanel().children().last(),
			desiredOffset = $insertAfterMe.offset();
	
		desiredOffset.top += $insertAfterMe.height();
		
		$card.css(
			{
				"position": "absolute",
				"z-index": "5",
				"width": $card.width()
			})
			.animate(desiredOffset,
			getDuration("dealCard"),
			function()
			{
				$card.removeAttr("style").insertAfter($insertAfterMe);
				resolve();
			});
	});
}

function promptResearchStationRelocation()
{
	const $actionInterface = actionInterfacePopulator.$actionInterface;
	// Prompt the player to choose a city from which to relocate a research station.
	actionInterfacePopulator.replaceSubtitle(`<span class='r'>Research Station Supply is empty!</span>
	<br />Select a City from which to relocate a Research Station.`);

	let city;
	for (let key in data.cities)
	{
		city = getCity(key);
		if (city.hasResearchStation)
		{
			$actionInterface.append(`<div class='button btnRelocateStation' data-key='${key}'>
										<img class='researchStation' src='images/pieces/researchStation.png' />
										<p>${city.name}</p>
									</div>`);
		}
	}

	$actionInterface.children(".btnRelocateStation").click(function()
	{
		promptAction(
		{
			eventType: eventTypes.buildResearchStation,
			stationRelocationKey: $(this).data("key")
		});
	});

	return true;
}

async function buildResearchStation(relocationKey)
{
	disableActions();
	
	const player = getActivePlayer(),
		playerIsOperationsExpert = player.role === "Operations Expert",
		city = player.getLocation();

	await requestAction(eventTypes.buildResearchStation,
		{
			locationKey: city.key,
			relocationKey: relocationKey || 0
		});
	
	// Operations Expert special ability:
	// "As an action, build a research station in his current city without discarding a city card"
	if (!playerIsOperationsExpert)
	{
		await movePlayerCardsToDiscards({ $card: player.getCardElementFromHand(city.key) });
		player.removeCardsFromHand(city.key);
	}

	resetActionPrompt();

	if (relocationKey)
		getCity(relocationKey).relocateResearchStationTo(city);
	else
		city.buildResearchStation({ animate: true });
	
	proceed();
}

async function movementAction(eventType, destination, { playerToDispatch, operationsFlightDiscardKey } = {})
{
	log(`movementAction(${eventType ? eventType.name : eventType},
		${destination ? destination.name : destination},
		${playerToDispatch ? playerToDispatch.role : playerToDispatch},
		${operationsFlightDiscardKey})`);
	
	const player = playerToDispatch || getActivePlayer();

	if (data.promptingEventType)
	{
		eventType = data.promptingEventType;
		destination = getDestination(eventType);

		if (destination)
		{
			promptAction({
				eventType: eventType,
				destinationKey: destination.key
			});
			return false;
		}

		eventType = false;
	}
	
	if (!eventType)
	{
		const movementDetails = getMovementDetails();

		if (movementDetails)
		{
			if (movementDetails.waitingForConfirmation)
			{
				log("prompting action with movement details: ", movementDetails);
				promptAction(movementDetails);
				return false;
			}
			
			eventType = movementDetails.eventType;
			destination = movementDetails.destination;
		}
	}
	else
		destination = destination || getDestination(eventType);
	
	if (!destination) // Invalid move
		player.getLocation().cluster({ animatePawns: true });
	else // Move appears to be valid
	{
		resetActionPrompt();
		
		try
		{
			const dataToPost = {
				originKey: player.cityKey,
				destinationKey: destination.key
			};
			
			// The active player's role is used by default.
			// The dispatched role must be used instead for dispatch events.
			if (playerToDispatch)
				dataToPost.role = playerToDispatch.rID;

			// The only uninferable discard key of any movement action:
			if (operationsFlightDiscardKey)
				dataToPost.discardKey = operationsFlightDiscardKey;

			const events = await requestAction(eventType, dataToPost);
			
			await movementActionDiscard(eventType, destination, { playerToDispatch, operationsFlightDiscardKey });

			player.updateLocation(destination);

			if (events.length > 1)
				await animateAutoTreatDiseaseEvents(events);
			
			proceed();
		}
		catch(error)
		{
			console.error(error);
			abortMovementAction(player);
		}
	}
}

function animateAutoTreatDiseaseEvents(events)
{
	return new Promise(async resolve =>
	{
		disableActions();
		const { autoTreatDisease, eradication } = eventTypes,
			autoTreatEvents = events.filter(e => e.code === autoTreatDisease.code
												|| e.code === eradication.code),
			city = getPlayer("Medic").getLocation(),
			interval = getDuration("shortInterval");

		for (let e of autoTreatEvents)
		{
			if (e.isOfType(autoTreatDisease))
			{
				await showMedicAutoTreatCircle({ color: e.diseaseColor });
				await sleep(interval);
				await removeCubes(city,
				{
					color: e.diseaseColor,
					numToRemove: "all",
					animate: true
				});
				await sleep(interval);
				await hideMedicAutoTreatCircle();
			}
			else if (e.isOfType(eradication))
				await eradicationEvent(e.diseaseColor);
		}

		resolve();
	});
}

function movementActionDiscard(eventType, destination, { playerToDispatch, operationsFlightDiscardKey })
{
	return new Promise(async (resolve) =>
	{
		const player = getActivePlayer(),
			{ driveFerry, shuttleFlight, rendezvous, directFlight, charterFlight } = eventTypes,
			eventCode = eventType.code;
		
		if (eventCode === driveFerry.code || eventCode === shuttleFlight.code || eventCode === rendezvous.code)
			return resolve();
		
		let discardKey;
		if (operationsFlightDiscardKey)
			discardKey = operationsFlightDiscardKey;
		else if (eventCode === directFlight.code)
			discardKey = destination.key;
		else if (eventCode === charterFlight.code)
			discardKey = playerToDispatch ? playerToDispatch.cityKey : player.cityKey;

		await movePlayerCardsToDiscards({ $card: player.getCardElementFromHand(discardKey) });
		player.removeCardsFromHand(discardKey);

		resolve();
	});
}

async function treatDisease($cube, diseaseColor)
{
	disableActions();
	
	const player = getActivePlayer(),
		city = player.getLocation();

	diseaseColor = diseaseColor || getCubeColor($cube);

	if ($cube)
		$cube.children().html("");

	const events = await requestAction(eventTypes.treatDisease,
		{
			cityKey: city.key,
			diseaseColor: diseaseColor
		});
		
	let numCubesToRemove,
		eradicated = false;
	for (let event of events)
	{
		if (event.code === eventTypes.treatDisease.code)
			numCubesToRemove = event.prevCubeCount - event.newCubeCount;
		else if (event.code === eventTypes.eradication.code)
			eradicated = true;
	}
	
	await removeCubes(city,
		{
			$clickedCube: $cube,
			color: diseaseColor,
			numToRemove: numCubesToRemove,
			animate: true
		});
	
	if (eradicated)
		await eradicationEvent(diseaseColor);
	
	proceed();
}

function getCubeColor($cube)
{
	const colors = ["y", "r", "u", "b"],
		classes = $cube.attr("class").split(" ");

	for (let c of classes)
		if (colors.includes(c))
			return c;

	return false;
}

async function eradicationEvent(diseaseColor)
{
	$(`#cureMarker${diseaseColor.toUpperCase()}`)
		.prop("src", `images/pieces/cureMarker_${diseaseColor}_eradicated.png`);

	data.cures[diseaseColor] = "eradicated";
	
	await specialEventAlert(
	{
		title: "DISEASE ERADICATED!",
		description: `No new disease cubes of this color will be placed on the board`,
		eventClass: diseaseColor
	});
}

function finishActionStep()
{
	if (currentStepIs("action 4"))
	{
		bindDiseaseCubeEvents({ on: false });
		$("#actionsContainer").slideUp();
	}
	
	proceed();
}

function abortMovementAction(player)
{
	player.getLocation().cluster();

	// TODO: handle different types of failure
	// such as the location or turn being incorrect,
	// or the player not having the required cards.

	// consider resetting the player's pawn and cards
}

function getMovementDetails()
{
	// When a pawn is dragged and dropped,
	// the type of movement (actionCode) and the destination must be deduced.
	const { driveFerry, shuttleFlight, rendezvous, directFlight, operationsFlight, charterFlight } = eventTypes,
		movementTypes = [
			driveFerry, // most common movement type, no card cost, ~6 possible destinations, so try first.
			shuttleFlight, // no card cost, easily ruled out, ~5 possible destinations, so try second.
			rendezvous, // costless option with ~3 possible destinations, but only allowed on the Dispatcher's turn.
			directFlight, // ~7 possible destinations.
			operationsFlight, // only possible for the Operations Expert, but similar to (and strictly better than) charterFlight.
			charterFlight // expensive operation when attempting it is necessary, 47 possible destinations, so try last.
		];

	let destination;
	for (let eventType of movementTypes)
	{
		destination = getDestination(eventType);
		
		if (destination)
		{
			// If the movement type requires a discard, the player must confirm the action before it is executed.
			if (movementTypeRequiresDiscard(eventType))
			{
				// If reaching the destination is possible via Direct Flight,
				// and also possible via charterFlight or operationsFlight,
				// allow the player to choose the flight type.
				const player = getActivePlayer(),
					multipleFlightTypeOptionsExist = (eventType.code === directFlight.code
													&& (player.canCharterFlight() || player.canOperationsFlight()));
				
				if (multipleFlightTypeOptionsExist)
					eventType = eventTypes.chooseFlightType;
				// Note that prompting the player to choose between charterFlight and operationsFlight
				// would be silly, because operationsFlight is a strictly better version of charterFlight.
				// If the player wishes to perform charterFlight over operationsFlight for some reason,
				// they can explicitly click the charterFlight button instead of allowing this function
				// to determine that operationsFlight is an option.
				// Therefore, chooseFlightType applies only when directFlight is possible along with at least
				// one other flight type.
				
				return {
					waitingForConfirmation: true,
					eventType: eventType,
					destinationKey: destination.key
				};
			}
			
			return {
				eventType: eventType,
				destination: destination
			};
		}
	}
	
	return false;
}

function movementTypeRequiresDiscard(eventType)
{
	const { directFlight, charterFlight, operationsFlight } = eventTypes;
	
	return eventType.code === directFlight.code
		|| eventType.code === charterFlight.code
		|| eventType.code === operationsFlight.code;
}

// Checks if the active pawn has been dropped on a valid destination city.
function getDestination(eventType, { player, dispatching } = {})
{
	player = player || getActivePlayer();

	const methodName = `valid${eventType.name}DestinationKeys`;

	if (typeof player[methodName] !== "function")
		return false;
	
	const validDestinationKeys = player[methodName]({ dispatching }),
		pawnOffset = player.getPawnOffset(),
		distanceThreshold = getDimension("piecePlacementThreshold");

	// If the pawn was dropped close enough to a valid destination city, return that city
	let city;
	for (let key of validDestinationKeys)
	{
		city = getCity(key);
		if (distanceBetweenPoints(pawnOffset, city.getOffset()) < distanceThreshold)
			return city;
	}
	
	return false;
}

async function drawStep()
{
	const $container = $("#cardDrawContainer"),
		$btn = $container.find(".button");
	
	getActivePlayer().disablePawn();
	$container.find(".playerCard").remove();
	unhide($container, $btn);

	// Event cards can be played before drawing.
	enableEventCards();
	await buttonClickPromise($btn.html("DRAW 2 CARDS"),
		{
			beforeClick: "fadeIn",
			afterClick: "hide"
		});
	disableEventCards();

	await performDrawStep();

	if (data.nextStep === "epIncrease")
	{
		await specialEventAlert(
		{
			title: "EPIDEMIC!",
			eventClass: "epidemic"
		});
	}

	await buttonClickPromise($btn.html("CONTINUE"),
		{
			beforeClick: "fadeIn",
			afterClick: "hide"
		});
	$btn.stop();

	finishDrawStep();
}

async function performDrawStep()
{
	const $container = $("#cardDrawContainer"), 
		cardHeight = $("#cardDrawContainer .playerCard").css("height"),
		{ 0: events } = await Promise.all(
		[
			requestAction(eventTypes.cardDraw),
			dealFaceDownPlayerCards($container)
		]),
		cardDrawEvent = events[0];

	getActivePlayer().addCardKeysToHand(cardDrawEvent.cardKeys);

	$("img.drawnPlayerCard").remove();
	$container.children().not(".button").remove();
	
	// Without reversing the cardKeys array, the cards will be added to the player's hand in
	// an order that does not match the cardIndices.
	for (let key of cardDrawEvent.cardKeys.reverse())
		revealPlayerCard(key, cardHeight);

	bindPlayerCardEvents();
	return sleep(getDuration("mediumInterval"));
}

async function finishDrawStep()
{
	const $container = $("#cardDrawContainer");
	
	await animateCardsToHand($container.find(".playerCard"));
	$container.addClass("hidden");
	
	proceed();
}

async function dealFaceDownPlayerCards($container)
{
	const NUM_CARDS = 2;
	for (let i = 0; i < NUM_CARDS; i++)
	{
		$container.prepend("<div class='playerCard'></div>");
		await dealFaceDownPlayerCard();
		await sleep(getDuration("dealCard") * 0.5)
	}
	return sleep(getDuration("longInterval"));
}

function dealFaceDownPlayerCard()
{
	return new Promise(resolve =>
	{
		const $deck = $("#imgPlayerDeck"),
			deckOffset = $deck.offset(),
			containerOffset = $("#cardDrawContainer .playerCard").last().offset(),
			$cardback = $("<img class='drawnPlayerCard' src='images/cards/playerCardback.png' alt='Player Card'/>");
		
		$cardback
			.appendTo("body")
			.width($deck.width())
			.offset(
				{
					top: deckOffset.top,
					left: deckOffset.left
				})
			.animate(
				{
					width: data.panelWidth * 0.152,
					top: containerOffset.top,
					left: containerOffset.left
				},
				getDuration("dealCard"),
				data.easings.dealCard,
				resolve());
	});
}

function revealPlayerCard(cardKey, cardHeight)
{
	const duration = getDuration("revealPlayerCard"),
		easing = data.easings.revealCard,
		cardWidth = getDimension("playerCardWidth"),
		widthPercentage = getDimension("playerCardWidth", { getFactor: true, format: "percent" });
	
    newPlayerCardElement(cardKey).prependTo($("#cardDrawContainer"))
		.css(
			{
				"width": 0,
				"line-height": (cardHeight * 3) + "px" // text will slide into view via line-height animation
			})
		.animate({ width: cardWidth + "px" },
			duration, easing,
			function()
			{
				$(this).animate({ "line-height": cardHeight + "px" },
					duration, easing,
					() => $(this).css("width", widthPercentage + "%"));
			});
}

async function animateCardsToHand($cards)
{
	const // The initial offsets need to be calculated before the Promise is made.
		firstCardOffset = $cards.first().offset(),
		lastCardOffset = $cards.last().offset(),
		targetProperties = getDrawnPlayerCardTargetProperties();
	
	// If the second card is not an epidemic, both cards will be moved to the player's hand at once,
	// and the first card should be offset from the second.
	let lastCardTop = targetProperties.top;
	if (!$cards.first().hasClass("epidemic"))
		lastCardTop += targetProperties.height + 2; // + 2 for slight separation
    
    // There will always be 2 cards to handle.
	return Promise.all(
		[
			animateCardToHand($cards.first(), firstCardOffset, targetProperties),
			animateCardToHand($cards.last(), lastCardOffset,
				{
					...targetProperties,
					...{ top: lastCardTop }
				})
		]);
}

function getDrawnPlayerCardTargetProperties()
{
	const $rolePanel = getActivePlayer().getPanel(),
		$guide = $rolePanel.children().last(),
		guideHeight = $guide.height(),
		guideOffset = $guide.offset(),
		$exampleCard = $("#playerPanelContainer").find(".playerCard").first(),
		exampleCardHeight = $exampleCard ? $exampleCard.height() : false;

	let top = guideOffset.top;
	if (exampleCardHeight)
		top += exampleCardHeight;
	else
		top += guideHeight;
	
	return {
		width: $guide.width(),
		height: exampleCardHeight || guideHeight,
		top: top,
		left: guideOffset.left,
		lineHeight: $guide.css("font-size")
	};
}

function animateCardToHand($card, initialOffset, targetProperties)
{
	return new Promise(resolve =>
	{
		if ($card.hasClass("epidemic"))
			return resolve();

		$card.appendTo("#rightPanel")
			.css(
			{
				position: "absolute",
				zIndex: "5",
				top: initialOffset.top,
				width: $card.width()
			})
			.animate(targetProperties,
			getDuration("dealCard"),
			function()
			{
				const $rolePanel = getActivePlayer().getPanel();
				$card.removeAttr("style").insertAfter($rolePanel.children().last());
				resolve();
			});
	});
}

function getDuration(durationName)
{
	if (data.fastForwarding)
		return 25;
	else
		return data.durations[durationName];
}

function setDuration(durationName, ms)
{
	data.durations[durationName] = ms;
}

function resizeAll()
{
	return new Promise(resolve =>
	{
		resizeBoard();
		resizeTopPanelElements();
		resizeBottomPanelElements();
		resizeRightPanelElements();
		repositionMarkers();
		resizeAndRepositionPieces();
		repositionSpecialEventBanner();

		data.windowWidth = data.boardWidth + data.panelWidth;

		resolve();
	});
}
$(window).resize(function(){ waitForFinalEvent(function(){resizeAll(true)}, 500, "resize"); });

function resizeBoard()
{
	data.boardWidth = $("#boardImg").width();
	data.boardHeight = $("#boardImg").height();
	$("#boardContainer").height(data.boardHeight);

	$(".pinpointRect").height(data.boardHeight).width(data.boardWidth);
	data.cityWidth = getDimension("cityWidth");
}

function resizeTopPanelElements()
{
	$("#topPanel > div").css("height", "auto");
	data.topPanelHeight = $("#topPanel").height();
	$("#topPanel > div").height(data.topPanelHeight);
	$(".cubeSupply").css("margin-top", getDimension("cubeSupplyMarginTop") + "px");
	makeElementsSquare(".cubeSupply .diseaseCube");
	data.infectionDeckOffset = $("#imgInfectionDeck").offset();

	resizeInfectionDiscardElements();
}

function resizeInfectionDiscardElements()
{
	const $infDiscard = $("#infectionDiscard"),
		cardHeight = getDimension("infDiscardHeight"),
		panelHeight = $("#topPanel").height();

	positionRemovedInfectionCards("collapse");
		
	$infDiscard.css("height", panelHeight)
		.find(".infectionCard")
		.height(cardHeight)
		.find(".cityName")
		.css(getCityNameStyle());
	
	$infDiscard.children("#infDiscardVeil").offset({ top: $infDiscard.children(".title").first().outerHeight() });
}

function positionRemovedInfectionCards()
{
	const $removedCardsContainer = $("#removedInfectionCards");
	
	if (!$removedCardsContainer.children(".infectionCard").length)
		return false;

	const $discardPile = $removedCardsContainer.parent(),
		$discards = $discardPile.children(".infectionCard"),
		occupiedPanelHeight = $discardPile.children(".title").outerHeight()
			+ (($discards.first().outerHeight() + 2) * $discards.length);
	
	let mTop = 20;
	if (occupiedPanelHeight < data.topPanelHeight)
		mTop = (data.topPanelHeight - occupiedPanelHeight);

	$removedCardsContainer.css("margin-top", mTop + "px");
}

function resizeBottomPanelElements()
{
	const panelOffsetTop = data.boardHeight - data.topPanelHeight;
	$(".bottomPanelDiv")
		.height(data.topPanelHeight)
		.offset({ top: panelOffsetTop });

	$("#researchStationSupply").css("font-size", getDimension("stationSupplyCountFont") + "px");

	$("#playerCards, .playerPile").height(getDimension("bottomPanelDivs"));

	const $cureMarkerContainer = $("#cureMarkerContainer"),
		titleHeight = $cureMarkerContainer.children(".title").height() + 10;
	$cureMarkerContainer
		.height(data.topPanelHeight + titleHeight)
		.offset({ top: panelOffsetTop - titleHeight });
}

function resizeRightPanelElements()
{
	const rightPanel = $("#rightPanel");
	rightPanel.height(data.boardHeight);
	data.panelWidth = rightPanel.width();
	
	if ($("#infectionsContainer, #initialInfectionsContainer").not(".hidden").length)
		positionInfectionPanelComponents();
}

function repositionMarkers()
{
	moveInfectionRateMarker();
	moveOutbreaksMarker(data.outbreakCount);
	positionCureMarkers();
}

function positionCureMarkers()
{
	$(".cureMarker").css("margin-top", getDimension("cureMarkerMarginTop"));
}

function resizeAndRepositionPieces()
{
	calibratePieceDimensions("pawn");
	calibratePieceDimensions("station");
	
	data.cubeWidth = getDimension("cubeWidth");
	$("#boardContainer > .diseaseCube").width(data.cubeWidth).height(data.cubeWidth);
	bindDiseaseCubeEvents({ on: actionStepInProgress() });

	positionAutoTreatCircleComponents();
	
	// a slight delay is required for all pending clusters to resolve properly
	if (data.pendingClusters.size)
		return sleep(50);
	else // cluster all cities containing pawns, disease cubes, or research stations
	{
		let city;
		for (let key in data.cities)
		{
			city = getCity(key);
			if (city.containsPieces())
				city.cluster();
		}
	}
}

function calibratePieceDimensions(pieceName)
{
	let $demoElement;
	if (pieceName === "pawn")
		$demoElement = $("#demoPawn");
	else if (pieceName === "station")
		$demoElement = $("#demoStation");
	else
		return false;
	
	$demoElement.removeClass("hidden");
	data[`${pieceName}Height`] = $demoElement.height();
	data[`${pieceName}Width`] = $demoElement.width();
	$demoElement.addClass("hidden");
}

// It is important to call this function after the specialEventBanner's content has been set
// because its height is an essential part of the repostitioning formula.
function repositionSpecialEventBanner()
{
	const $banner = $("#specialEventBanner"),
		bannerHeight = $banner.height();
	
	$banner.offset({ top: data.boardHeight / 2 - bannerHeight });

	$(".specialEventImg").css(
	{
		top: data.boardHeight / 2 + bannerHeight / 4,
		left: getDimension("specialEventImgMarginLeft")
	});
}

// Facilitates responsiveness where simple css rules fail
// Returns a dimension value calculated using data.sizeRatios
function getDimension(dimension,
	{
		compliment,
		getFactor,
		format
	} = {})
{
	const ratio = data.sizeRatios[dimension],
		base = data[ratio[0]]; // some value that is updated on resize events
	let factor = compliment ? 1 - ratio[1] : ratio[1]; // the ratio to the base value, or optionally the compliment of that ratio
	
	if (format == "percent")
		factor *= 100;
	
	if (getFactor)
		return factor;
	
	return Math.round(base * factor);
}

class Player
{
	constructor({ uID, pID, rID, nextTurnID, name, role, cityKey })
	{
		this.uID = uID;
		this.pID = pID;
		this.rID = rID;
		this.nextTurnID = nextTurnID;
		this.name = name;
		this.role = role;
		this.camelCaseRole = toCamelCase(this.role);

		this.cityKey = cityKey;
		
		this.cardKeys = [];
	}

	newRoleTag()
	{
		return `<span class='roleTag ${this.camelCaseRole}'  data-role='${this.rID}'>${this.role}</span>`;
	}
	
	getSpecialAbilityDescription()
	{
		return getSpecialAbilityDescriptionFromRole(this.role);
	}

	newSpecialAbilityTag()
	{
		return `<p class='${this.camelCaseRole} specialAbilityTag hoverInfo' title='${this.getSpecialAbilityDescription()}'>
					— Special Ability —
				</p>`;
	}
	
	getLocation()
	{
		return getCity(this.cityKey);
	}

	updateLocation(destination)
	{
		const origin = this.getLocation();
		
		this.getPawn().removeClass(this.cityKey).addClass(destination.key);
		destination.setPawnIndices();
		
		this.cityKey = destination.key;

		destination.cluster({ animatePawns: true });
		origin.cluster({ animatePawns: true });
	}
	
	getPanel()
	{
		return $(`#${this.camelCaseRole}`);
	}

	getPawn()
	{
		return $(`#${this.camelCaseRole}Pawn`);
	}

	getPawnOffset()
	{
		const offset = this.getPawn().offset();

		offset.left += data.pawnWidth / 2;
		offset.top += data.pawnHeight;

		return offset;
	}
	
	enablePawn()
	{
		this.getPawn().draggable("enable");
	}

	disablePawn()
	{
		this.getPawn().draggable({ disabled: true });
	}

	isHoldingCardKey(cardKey)
	{
		return this.cardKeys.includes(cardKey);
	}

	isHoldingAnyCityCard()
	{
		return (this.cardKeys.filter( cardKey => isCityKey(cardKey) ).length > 0);
	}

	// Given a cardKey from the player's hand,
	// returns a jQuery object containing the corresponding .playerCard element
	getCardElementFromHand(cardKey)
	{
		return this.getPanel().find(`.playerCard[data-key='${cardKey}']`);
	}

	// Appends either a single cardKey or an array or cardKeys to this Player's cardKeys array.
	// Excludes Epidemic cards because they go straight to the discard pile after being resolved.
	addCardKeysToHand(cardKeys)
	{
		this.cardKeys = [
			...this.cardKeys,
			...ensureIsArray(cardKeys).filter(key => !isEpidemicKey(key))
		];
	}

	// Removes the card element from the player's panel,
	// and removes the cardKey from the player object's cardKeys array.
	// Accepts a single cardKey string, or an array of cardKey strings.
	removeCardsFromHand(cardKeys)
	{
		const panel = this.getPanel();
		
		for (let key of ensureIsArray(cardKeys))
		{
			panel.find(`.playerCard[data-key='${key}']`).remove();
			this.cardKeys.splice(this.cardKeys.indexOf(key), 1);
		}
	}

	canDirectFlight()
	{
		// If the player is holding a city card that does not match their current location,
		// they can perform Direct Flight.
		for (let cardKey of this.cardKeys)
			if (isCityKey(cardKey) && cardKey != this.cityKey)
				return true;
		
		return false;
	}

	canCharterFlight()
	{
		// Charter Flight requires the card that matches the player's current location.
		return this.isHoldingCardKey(this.cityKey);
	}

	canShuttleFlight()
	{
		// Shuttle Flight requires two things:
		// - There must be a research station at the player's current location.
		if (!this.getLocation().hasResearchStation)
			return false;
		// - At least one other city must have a research station.
		for (let key in data.cities)
			if (data.cities[key].hasResearchStation && key != this.cityKey)
				return true;
		
		return false;
	}

	canBuildResearchStation()
	{
		// The player's current location cannot already contain a research station.
		if (this.getLocation().hasResearchStation)
			return false;
		
		// The Operations Expert can build a research station without discarding a city card,
		// but any other role is required to discard the card that matches their current location.
		return this.role === "Operations Expert" || this.isHoldingCardKey(this.cityKey);
	}

	canTreatDisease()
	{
		// Treat Disease requires there to be at least one disease cube of any color on the player's current location.
		const cubeCounts = this.getLocation().cubes;

		for (let cubeColor in cubeCounts)
			if (cubeCounts[cubeColor] > 0)
				return true;
		
		return false;
	}

	canShareKnowledge()
	{
		const playersAtCurrentLocation = this.getLocation().getOccupants();
		
		// Share Knowledge requires:
		// - Another pawn at the current location.
		if (playersAtCurrentLocation.length === 1)
			return false;
		// - A player at the current location must be holding the card that matches said location,
		//	or the Researcher must be in said location and holding any city card.
		for (let player of playersAtCurrentLocation)
			if (player.canGiveKnowledge())
				return true;

		return false;
	}

	canGiveKnowledge()
	{
		// If the player is holding the city card that matches the city they are in,
		// or the player is the Researcher and is holding ANY city card,
		// they can GIVE a city card via Share Knowledge.
		return this.isHoldingCardKey(this.cityKey)
			|| (this.role === "Researcher" && this.isHoldingAnyCityCard());
	}

	// Returns an array of cardKeys that can be given to another player in the same city via Share Knowledge.
	getShareableCardKeys()
	{
		if (this.role === "Researcher")
			return this.cardKeys.filter(cardKey => isCityKey(cardKey));
		else if (this.isHoldingCardKey(this.cityKey))
			return [this.cityKey];

		return [];
	}

	canDiscoverCure()
	{
		// The player's current location must have a research station.
		if (!this.getLocation().hasResearchStation)
			return false;

		// The other requirements are handled here.
		if (this.getCardsForDiscoverCure())
			return true;
		
		return false;
	}

	// If the player has enough cards of one color to discover a cure,
	// and the disease color in question has not already been cured,
	// returns an array of the cardKeys that can be used to discover a cure.
	// Returns false otherwise.
	getCardsForDiscoverCure()
	{
		// Discover A Cure requires:
		// - The player must be holding 5 cards of the same color,
		// or 4 of the same if the player is the Scientist.
		// - The status of said disease color must not be cured or eradicated.

		const cardsByColor = {
			y: [],
			r: [],
			u: [],
			b: []
		},
		NUM_CARDS_REQUIRED = this.role === "Scientist" ? 4 : 5;

		// Sort the player's city cards by color.
		for (let cardKey of this.cardKeys)
			if (isCityKey(cardKey))
				cardsByColor[getDiseaseColor(cardKey)].push(cardKey);
		
		// If there are enough cards of one color to discover a cure, return the array of those cards.
		let cardsOfColor;
		for (let color in cardsByColor)
		{
			cardsOfColor = cardsByColor[color];
			if (cardsOfColor.length >= NUM_CARDS_REQUIRED && !data.cures[color])
				return cardsOfColor;
		}
		
		return false;
	}

	canPlanContingency()
	{
		return this.role == "Contingency Planner" && this.contingencyKey == "";
	}

	canDispatchPawn()
	{
		return this.role == "Dispatcher";
	}

	canOperationsFlight()
	{
		return this.role === "Operations Expert"
			&& this.getLocation().hasResearchStation
			&& !operationsFlightWasUsedThisTurn()
			&& this.isHoldingAnyCityCard();
	}

	[`valid${eventTypes.driveFerry.name}DestinationKeys`]()
	{
		return this.getLocation().connectedCityKeys;
	}
	
	[`valid${eventTypes.shuttleFlight.name}DestinationKeys`]()
	{
		// Both the origin and destination must have a research station.
		if (this.getLocation().hasResearchStation)
			return [...data.researchStationKeys].filter(key => key != this.cityKey);
		else
			return [];
	}

	[`valid${eventTypes.directFlight.name}DestinationKeys`]({ dispatching } = {})
	{
		// Direct Flight options include all city cards from the player's hand,
		// but not the card that matches their current location.
		let cardKeys;
		if (dispatching)
			cardKeys = getPlayer("Dispatcher").cardKeys;
		else
			cardKeys = this.cardKeys;

		return cardKeys.filter(key => isCityKey(key) && key != this.cityKey);
	}

	[`valid${eventTypes.charterFlight.name}DestinationKeys`]({ dispatching } = {})
	{
		const destinationKeys = [],
			discarder = dispatching ? getPlayer("Dispatcher") : this;

		// Charter Flight requires the city card that matches the origin city.
		if (discarder.isHoldingCardKey(this.cityKey))
		{
			// Any city besides the current city is a valid destination.
			for (let key in data.cities)
				if (key !== this.cityKey)
					destinationKeys.push(key);
		}
		
		return destinationKeys;
	}

	[`valid${eventTypes.operationsFlight.name}DestinationKeys`]()
	{
		const destinationKeys = [];

		if (this.role === "Operations Expert" && this.getLocation().hasResearchStation)
		{
			// Any city besides the current city is a valid destination.
			for (let key in data.cities)
				if (key !== this.cityKey)
					destinationKeys.push(key);
		}

		return destinationKeys;
	}

	[`valid${eventTypes.rendezvous.name}DestinationKeys`]()
	{
		// The Dispatcher can move any pawn to a city containing another pawn.
		// This action is herein referred to as "rendezvous".
		const destinationKeys = [];

		// Only allowed on the Dispatcher's turn.
		if (getActivePlayer().role !== "Dispatcher")
			return destinationKeys;

		let player;
		for (let rID in data.players)
		{
			player = data.players[rID];

			if (this.cityKey !== player.cityKey)
				destinationKeys.push(player.cityKey);
		}

		return destinationKeys;
	}

	[`valid${eventTypes.airlift.name}DestinationKeys`]()
	{
		const destinationKeys = [];

		// Any city besides the current city is a valid destination.
		for (let key in data.cities)
			if (key !== this.cityKey)
				destinationKeys.push(key);

		return destinationKeys;
	}
}

function getPlayer(role)
{
	let player;
	for (let rID in data.players)
	{
		player = data.players[rID];
		if (player.role === role)
			return player;
	}

	return false;
}

function getSpecialAbilityDescriptionFromRole(role)
{
	let description = "";

	if (role === "Researcher")
	{
		description = `When doing the Share Knowledge action, the Researcher
may give any city card from her hand to another player
in the same city as her, without this card having to match
her city. The transfer must be from her hand to the other
player’s hand, but it can occur on either player’s turn.`
	}
	else if (role === "Scientist")
	{
		description = `The Scientist needs only 4 (not 5) city cards of 
the same disease color to Discover a Cure for that disease.`;
	}
	else if (role === "Operations Expert")
	{
		description = `The Operations Expert may, as an action, either:
- build a research station in his current city without discarding a city card, or
- once per turn, move from a research station to any city by discarding a city card.`;
	}

	return description;
}

function operationsFlightWasUsedThisTurn()
{
	return !currentStepIs("action 1") && getEventsOfTurn(eventTypes.operationsFlight).length > 0;
}

function nextTurn()
{
	log("nextTurn()");
	data.turn = getActivePlayer().nextTurnID;
	data.turnNum++;

	if (isOneQuietNight())
		indicateOneQuietNightStep();

	const player = getActivePlayer();
	player.getLocation().setPawnIndices().cluster({ animatePawns: true });

	proceed();
}

function instantiatePlayers(playerInfoArray)
{
	if (typeof playerInfoArray == "undefined")
	{
		console.error("Failed to instantiate players.");
		return;
	}

	let player;
	for (let pInfo of playerInfoArray)
	{
		player = new Player(pInfo);
		data.players[player.rID] = player;
		
		appendPlayerPanel(player);
		appendPawnToBoard(player);
		queueCluster(player.cityKey);
	}
	
	setPlayerPanelWidth();
	bindPawnEvents();
}

function appendPawnToBoard(player)
{
	const { camelCaseRole, role, cityKey } = player;

	$("#boardContainer").append(`<img	src='images/pieces/${camelCaseRole}.png'
										alt='${role} pawn'
										class='pawn ${cityKey}'
										id='${camelCaseRole}Pawn'
										data-role='${role}' />`);
}

function appendPlayerPanel(player)
{
	const { camelCaseRole, name, role } = player;

	$("#playerPanelContainer").append(`<div class='playerPanel' id='${camelCaseRole}'>
								<div class='name'>${name}</div>
								<div class='role ${camelCaseRole}'>${role}</div>
							</div>`);
}

function setPlayerPanelWidth()
{
	const $playerPanelContainer = $("#playerPanelContainer"),
		$panels = $playerPanelContainer.children(".playerPanel"),
		numPanels = $panels.length;
		
	$panels.css(
		{
			width: Math.round(90 / numPanels) + "%",
			marginRight: Math.round(9 / numPanels) + "%"
		});
}

function bindPawnEvents()
{
	$(".pawn:not(#demoPawn)")
		.draggable(
		{
			disabled: true, // pawn dragging is enabled and disabled according to the game state.
			containment: $("#boardContainer")
		})
		.mousedown(function()
		{
			const $this = $(this),
				pawnRole = $this.data("role"),
				activeRole = getActivePlayer().role,
				canDispatch = activeRole === "Dispatcher";
			
			let fn = movementAction;
			if (eventTypeIsBeingPrompted(eventTypes.airlift))
				fn = tryAirlift;
			else if (pawnRole !== activeRole && canDispatch)
				fn = tryDispatchPawn;

			$(window).off("mouseup")
				.mouseup(function()
				{
					$(window).off("mouseup");
					
					if (fn === movementAction)
						fn();
					else
						fn(getPlayer(pawnRole));
				});

			// The dragged pawn appear in front of other pawns and disease cubes.
			$this.css("z-index", data.dragPieceZindex);
		});
}

function getActivePlayer()
{
	return data.players[data.turn];
}

function getCity(key)
{
	if (key in data.cities)
		return data.cities[key];
	
	if (!(key in data.pacificPaths))
		console.error(`cityKey does not exist: '${key}'`);
	
	return false;
}

function getPacificPath(key)
{
	if (key in data.pacificPaths)
		return data.pacificPaths[key];
	
	return console.error(`pacificPath does not exist: '${key}'`);
}

function getPacificTraversalPoints({ direction })
{
	if (direction === "east")
	{
		return [
			{ key: "bottom-left", points: ["bl"] },
			{ key: "bottom-right", points: ["br"] }
		];
	}
	
	if (direction === "west")
	{
		return [
			{ key: "bottom-right", points: ["br"] },
			{ key: "bottom-left", points: ["bl"] }
		];
	}
}

function getDiseaseColor(key)
{
	return getCity(key).color;
}

class City
{
	constructor({ key, name, percentFromTop, percentFromLeft, connectedCityKeys, quarantineBoundaries, color })
	{
		this.key = key;
		this.name = capitalizeWords(name);
		this.color = color;
		this.percentFromTop = percentFromTop;
		this.percentFromLeft = percentFromLeft;
		this.connectedCityKeys = connectedCityKeys; // string array
		this.quarantineBoundaries = quarantineBoundaries;
		
		this.hasResearchStation = false;
		
		// disease cubes
		this.cubes = {
			u: 0, // blue
			y: 0, // yellow
			b: 0, // black
			r: 0 // red
		};
	}
	
	isConnectedTo(cityKey)
	{
		return this.connectedCityKeys.includes(cityKey);
	}

	// Returns the left and top offsets values of the city on the board (responsive).
	// Optionally adjusts to center a piece on the city ("cube" or "pawn")
	getOffset(pieceToCenter)
	{
		let x = data.boardWidth * this.percentFromLeft,
			y = data.boardHeight * this.percentFromTop;
		
		if (pieceToCenter)
		{
			if (pieceToCenter == "cube")
			{
				const adj = data.cubeWidth / 2;
				x -= adj;
				y -= adj;
			}
			else if (pieceToCenter == "pawn")
			{
				y -= data.pawnHeight * 0.8;
				x -= data.pawnWidth / 2;
			}
		}
		return { left: x, top: y };
	}

	getDiseaseColorOptions()
	{
		const diseaseColorOptions = [];

		for (let color in this.cubes)
			if (this.cubes[color] > 0)
				diseaseColorOptions.push(color);

		return diseaseColorOptions;
	}

	getOccupants()
	{
		return getFilteredMemberArray(data.players,
			player => player.cityKey === this.key);
	}
	
	// Puts a research station on this city.
	buildResearchStation({ animate, isGovernmentGrant } = {})
	{
		let $img,
			stationInitialOffset = false;
		if (isGovernmentGrant)
		{
			$img = $("#boardContainer > .researchStation.grantStation");
			stationInitialOffset = $img.offset();

			log("stationInitialOffset:", stationInitialOffset);
			$img.replaceWith(newResearchStationElement(this.key))
				.removeAttr("style");
			data.researchStationKeys.delete("grantStation");
		}
		else
			$img = newResearchStationElement(this.key);
		
		this.hasResearchStation = true;
		data.researchStationKeys.add(this.key);
		updateResearchStationSupplyCount();

		if (animate)
		{
			stationInitialOffset = stationInitialOffset || $("#researchStationSupply img").offset();
			this.cluster({ animateResearchStation: true, stationInitialOffset, animatePawns: true });
		}
	}

	getResearchStation()
	{
		return $(`.researchStation[data-key='${this.key}']`);
	}

	relocateResearchStationTo(city)
	{
		const $rs = this.getResearchStation(),
			stationInitialOffset = $rs.offset();

		$rs.removeAttr("data-key")
			.attr("data-key", city.key)
			.removeAttr("style");
		
		this.hasResearchStation = false;
		data.researchStationKeys.delete(this.key);

		city.hasResearchStation = true;
		data.researchStationKeys.add(city.key);

		city.cluster({ animateResearchStation: true, stationInitialOffset, animatePawns: true });
	}
	
	setPawnIndices()
	{
		const activePlayer = getActivePlayer(),
			activePawn = activePlayer.getPawn();
		
		if (activePlayer.cityKey == this.key && $(`.${this.key}.pawn`).length > 2)
		{
			activePawn.data("pawnIndex", "1");
			
			const otherPawns = $(`.${this.key}.pawn`).not(`#${activePawn.attr("id")}`);
			otherPawns.data("pawnIndex", "0");
		}

		return this;
	}

	containsPieces()
	{
		return $(`.pawn.${this.key}`).length
			|| this.getResearchStation().length
			|| $(`.diseaseCube.${this.key}`).length;
	}

	// Positions any pawns and disease cubes on this city into a cluster.
	cluster({ animatePawns, $pawnToExclude, animateResearchStation, stationInitialOffset, stationKeyToExclude } = {})
	{
		const pawns = $(".pawn." + this.key).not($pawnToExclude)
				.sort(function (a, b) { return $(a).data("pawnIndex") - $(b).data("pawnIndex") }),
			pawnCount = pawns.length,
			cityOffset = this.getOffset(),
			coordsArray = [];
		let pawnTop = cityOffset.top - data.pawnHeight,
			pawnLeft = cityOffset.left - data.pawnWidth,
			i;
		
		if (this.hasResearchStation && this.key !== stationKeyToExclude)
		{
			const $researchStation = this.getResearchStation(),
				desiredOffset = {
					top: cityOffset.top - data.stationHeight * 0.85,
					left: cityOffset.left - data.stationWidth * 0.8
				}
			
			if (animateResearchStation)
			{
				if (stationInitialOffset)
					$researchStation.offset(stationInitialOffset);
				
				$researchStation.animate(
				{
					top: desiredOffset.top,
					left: desiredOffset.left,
					width: data.stationWidth
				}, getDuration("stationPlacement"), data.easings.stationPlacement);
			}
			else
				$researchStation.offset(desiredOffset);
			
			// research station appears behind a single row of pawns
			if (pawnCount < 3)
			{
				pawnTop += data.pawnHeight * 0.3;
				pawnLeft += data.pawnWidth * 0.5;
			}
		}
		
		for (i = 0; i < pawnCount; i++)
		{
			if (pawnCount > 2 && i == 2) // second row moves down a touch and the is offset slightly to the right
			{
				pawnTop += data.pawnHeight * 0.3;
				pawnLeft -= data.pawnWidth * 1.5;
			}
			
			coordsArray.push([pawnTop, pawnLeft]);
			pawnLeft += data.pawnWidth; // move over a pawn's width with each iteration
		}

		const pawnAnimationDuration = getDuration("pawnAnimation");
		let $this, currentOffset;
		i = 0;
		pawns.each(function()
		{
			$this = $(this);
			// pawns in the back row appear behind research stations
			$this[0].style.zIndex = (pawnCount > 2 && i < 2) ? 2 : 4;
			
			if (animatePawns)
			{
				currentOffset = $this.offset();
				$this.animate(
				{
					top: "+=" + (coordsArray[i][0] - currentOffset.top),
					left: "+=" + (coordsArray[i][1] - currentOffset.left)
				}, pawnAnimationDuration, data.easings.pawnAnimation);
			}
			else
			{
				$this.offset(
				{
					top: coordsArray[i][0],
					left: coordsArray[i][1]
				});
			}
			
			i++;
		});

		// reset to default
		setDuration("pawnAnimation", 250);
		
		const cubes = $(".diseaseCube." + this.key),
			cubeCount = cubes.length;
		
		let rowCount;	
			if (cubeCount < 3)
				rowCount = 1;
			else if (cubeCount < 9)
				rowCount = 2;
			else
				rowCount = 3;
		
		const cubeSpacing = data.cubeWidth + getBorderWidth("#boardContainer .diseaseCube");
		let currentRow = 0,
			cubesThisRow,
			x, y = (cityOffset.top - (cubeSpacing / 2 * rowCount));
		
		if (pawnCount > 2) // move down to make room for 2 rows of pawns
			y += data.pawnHeight * 0.2;
		else if (this.hasResearchStation) // must move down slighly with 1 row of pawns and a research station
			y += cubeSpacing / 2;
		
		coordsArray.length = 0;
		// for each row...
		for (let r = rowCount; r > 0; r--)
		{				
			// determine the y coordinate (moving down a cube's height for each consecutive row).
			// y coordinate doesn't change on the first iteration.
			if (coordsArray.length)
				y += cubeSpacing;
			
			// determine the number of cubes for this row
			cubesThisRow = Math.floor((cubeCount - coordsArray.length) / (rowCount - currentRow));
			
			// determine the x coordinate of the first cube in this row
			x = cityOffset.left - ((cubeSpacing / 2) * cubesThisRow);
			// for each cube in this row...
			for (let c = cubesThisRow; c > 0; c--)
			{
				// determine the x (moving a cube's width to the right for each consecutive cube).
				// x coordinate doesn't change for the first iteration.
				if (c < cubesThisRow)
					x += cubeSpacing;
				// record the point
				coordsArray.push([x, y]);
			}
			
			currentRow++;
		}
		
		// place the cubes
		i = 0;
		cubes.each(function()
		{
			$(this).offset(
			{
				left: coordsArray[i][0],
				top: coordsArray[i][1]
			});
			
			i++;
		});
	}
}

// instantiate city objects
(function ()
{
	const cityInfo = [
		{
			name: "san francisco",
			color: "u",
			percentFromTop: 0.332,
			percentFromLeft: 0.047,
			connectedCityKeys: ["toky", "mani", "chic", "losa"],
			quarantineBoundaries: [
				...[
					{ key: "sanf-mani", points: ["b"] },
					{ key: "sanf", points: ["bl"] },
					{ key: "losa", points: ["bl", "br"] },
					{ key: "chic", points: ["br", "tr", "tl"] },
					{ key: "sanf", points: ["t"] },
					{ key: "sanf-toky", points: ["t"] }
				],
				...getPacificTraversalPoints({ direction: "east" }),
				...[
					{ key: "toky-sanf", points: ["t"] },
					{ key: "toky", points: ["tl", "bl"] },
					{ key: "toky-sanf", points: ["b"] },
					{ key: "mani-sanf", points: ["t"] },
					{ key: "mani", points: ["tl", "bl", "br"] },
					{ key: "mani-sanf", points: ["b"] }
				],
				...getPacificTraversalPoints({ direction: "west" })	
			] 
		},
		{
			name: "chicago",
			color: "u",
			percentFromTop: 0.293,
			percentFromLeft: 0.143,
			connectedCityKeys: ["atla", "mont", "sanf", "losa", "mexi"],
			quarantineBoundaries: [
				{ key: "chic", points: ["t"] },
				{ key: "sanf", points: ["tl"] },
				{ key: "losa", points: ["bl"] },
				{ key: "mexi", points: ["bl", "br"] },
				{ key: "mont", points: ["br", "tr"] }
			]
		},
		{
			name: "montreal",
			color: "u",
			percentFromTop: 0.288,
			percentFromLeft: 0.217,
			connectedCityKeys: ["chic", "wash", "newy"],
			quarantineBoundaries: [
				{ key: "chic", points: ["tl", "bl"] },
				{ key: "mont", points: ["bl"] },
				{ key: "wash", points: ["bl", "br"] },
				{ key: "newy", points: ["br", "tr"] },
				{ key: "mont", points: ["t"] }
			]
		},
		{
			name: "new york",
			color: "u",
			percentFromTop: 0.299,
			percentFromLeft: 0.275,
			connectedCityKeys: ["mont", "wash", "lond", "madr"],
			quarantineBoundaries: [
				{ key: "mont", points: ["tl", "bl"] },
				{ key: "wash", points: ["bl"] },
				{ key: "madr", points: ["br"] },
				{ key: "lond", points: ["tr"] }
			]
		},
		{
			name: "atlanta",
			color: "u",
			percentFromTop: 0.372,
			percentFromLeft: 0.172,
			connectedCityKeys: ["chic", "wash", "miam"],
			quarantineBoundaries: [
				{ key: "chic", points: ["tr", "tl", "bl"] },
				{ key: "atla", points: ["l"] },
				{ key: "miam", points: ["bl", "br"] },
				{ key: "wash", points: ["br", "tr", "tl"] },
				{ key: "atla", points: ["tr"] }
			]
		},
		{
			name: "washington",
			color: "u",
			percentFromTop: 0.365,
			percentFromLeft: 0.250,
			connectedCityKeys: ["atla", "mont", "newy", "miam"],
			quarantineBoundaries: [
				{ key: "mont", points: ["tl"] },
				{ key: "atla", points: ["tl", "bl"] },
				{ key: "miam", points: ["bl", "br"] },
				{ key: "wash", points: ["r"] },
				{ key: "newy", points: ["br", "tr"] }
			]
		},
		{
			name: "london",
			color: "u",
			percentFromTop: 0.237,
			percentFromLeft: 0.415,
			connectedCityKeys: ["newy", "madr", "esse", "pari"],
			quarantineBoundaries: [
				{ key: "newy", points: ["tl", "bl"] },
				{ key: "madr", points: ["bl", "br"] },
				{ key: "pari", points: ["br"] },
				{ key: "esse", points: ["br", "tr"] },
				{ key: "lond", points: ["t"] }
			]
		},
		{
			name: "essen",
			color: "u",
			percentFromTop: 0.217,
			percentFromLeft: 0.489,
			connectedCityKeys: ["lond", "pari", "mila", "stpe"],
			quarantineBoundaries: [
				{ key: "lond", points: ["tl", "bl"] },
				{ key: "pari", points: ["bl", "br"] },
				{ key: "mila", points: ["br"] },
				{ key: "stpe", points: ["br", "tr"] },
				{ key: "esse", points: ["t"] }
			]
		},
		{
			name: "st petersburg",
			color: "u",
			percentFromTop: 0.197,
			percentFromLeft: 0.573,
			connectedCityKeys: ["esse", "ista", "mosc"],
			quarantineBoundaries: [
				{ key: "esse", points: ["tl", "bl", "br"] },
				{ key: "stpe", points: ["bl"] },
				{ key: "ista", points: ["bl", "br"] },
				{ key: "mosc", points: ["br", "tr"] },
				{ key: "stpe", points: ["tr", "tl"] }
			]
		},
		{
			name: "madrid",
			color: "u",
			percentFromTop: 0.342,
			percentFromLeft: 0.405,
			connectedCityKeys: ["newy", "lond", "pari", "algi", "saop"],
			quarantineBoundaries: [
				{ key: "newy", points: ["tl", "bl"] },
				{ key: "madr", points: ["bl"] },
				{ key: "saop", points: ["tl", "bl", "br"] },
				{ key: "madr", points: ["b"] },
				{ key: "algi", points: ["bl", "br", "tr"] },
				{ key: "pari", points: ["tr"] },
				{ key: "lond", points: ["tr", "tl"] }
			]
		},
		{
			name: "paris",
			color: "u",
			percentFromTop: 0.289,
			percentFromLeft: 0.471,
			connectedCityKeys: ["lond", "madr", "algi", "mila", "esse"],
			quarantineBoundaries: [
				{ key: "lond", points: ["tl"] },
				{ key: "madr", points: ["bl"] },
				{ key: "algi", points: ["bl", "br", "tr"] },
				{ key: "mila", points: ["br", "tr"] },
				{ key: "esse", points: ["tr"] }
			]
		},
		{
			name: "milan",
			color: "u",
			percentFromTop: 0.270,
			percentFromLeft: 0.521,
			connectedCityKeys: ["esse", "pari", "ista"],
			quarantineBoundaries: [
				{ key: "esse", points: ["tr", "tl"] },
				{ key: "pari", points: ["tl", "bl"] },
				{ key: "ista", points: ["bl", "br", "tr"] }
			]
		},
		{
			name: "los angeles",
			color: "y",
			percentFromTop: 0.438,
			percentFromLeft: 0.063,
			connectedCityKeys: ["sydn", "sanf", "mexi", "chic"],
			quarantineBoundaries: 
			[
				...[
					{ key: "losa-sydn", points: ["b"] },
					{ key: "losa", points: ["b"] },
					{ key: "mexi", points: ["bl", "br"] },
					{ key: "chic", points: ["br", "tr", "tl"] },
					{ key: "sanf", points: ["tl", "bl"] },
					{ key: "losa", points: ["l"] },
					{ key: "losa-sydn", points: ["t"] }
				],
				...getPacificTraversalPoints({ direction: "east" }),
				...[
					{ key: "bottom-left", points: ["bl"] },
					{ key: "bottom-right", points: ["br"] },
					{ key: "sydn-losa", points: ["b"] },
					{ key: "sydn", points: ["br", "bl", "tl"] },
					{ key: "sydn-losa", points: ["t"] }
				],
				...getPacificTraversalPoints({ direction: "west" })
			]
		},
		{
			name: "mexico city",
			color: "y",
			percentFromTop: 0.475,
			percentFromLeft: 0.133,
			connectedCityKeys: ["losa", "lima", "bogo", "miam", "chic"],
			quarantineBoundaries: [
				{ key: "losa", points: ["tl", "bl"] },
				{ key: "lima", points: ["bl", "br"] },
				{ key: "bogo", points: ["r"] },
				{ key: "miam", points: ["r", "tr", "tl"] },
				{ key: "mexi", points: ["tr"] },
				{ key: "chic", points: ["tr", "tl"] }
			]
		},
		{
			name: "miami",
			color: "y",
			percentFromTop: 0.458,
			percentFromLeft: 0.219,
			connectedCityKeys: ["atla", "mexi", "bogo", "wash"],
			quarantineBoundaries: [
				{ key: "atla", points: ["tr", "tl"] },
				{ key: "mexi", points: ["tl", "bl"] },
				{ key: "bogo", points: ["bl", "br"] },
				{ key: "wash", points: ["br", "tr"] }
			]
		},
		{
			name: "bogota",
			color: "y",
			percentFromTop: 0.566,
			percentFromLeft: 0.212,
			connectedCityKeys: ["mexi", "lima", "buen", "saop", "miam"],
			quarantineBoundaries: [
				{ key: "mexi", points: ["tl", "bl"] },
				{ key: "lima", points: ["bl"] },
				{ key: "buen", points: ["bl", "br"] },
				{ key: "saop", points: ["br", "tr"] },
				{ key: "miam", points: ["tr", "tl"] }
			]
		},
		{
			name: "lima",
			color: "y",
			percentFromTop: 0.681,
			percentFromLeft: 0.185,
			connectedCityKeys: ["mexi", "bogo", "sant"],
			quarantineBoundaries: [
				{ key: "mexi", points: ["tr", "tl", "bl"] },
				{ key: "sant", points: ["bl", "br"] },
				{ key: "bogo", points: ["br", "tr"] }
			]
		},
		{
			name: "santiago",
			color: "y",
			percentFromTop: 0.799,
			percentFromLeft: 0.195,
			connectedCityKeys: ["lima"],
			quarantineBoundaries: [
				{ key: "lima", points: ["tr", "tl", "bl"] },
				{ key: "sant", points: ["bl", "br", "tr"] }
			]
		},
		{
			name: "buenos aires",
			color: "y",
			percentFromTop: 0.777,
			percentFromLeft: 0.274,
			connectedCityKeys: ["bogo", "saop"],
			quarantineBoundaries: [
				{ key: "bogo", points: ["tr", "tl", "bl"] },
				{ key: "buen", points: ["bl", "br"] },
				{ key: "saop", points: ["br", "tr"] }
			]
		},
		{
			name: "sao paulo",
			color: "y",
			percentFromTop: 0.698,
			percentFromLeft: 0.318,
			connectedCityKeys: ["bogo", "buen", "lago", "madr"],
			quarantineBoundaries: [
				{ key: "bogo", points: ["tr", "tl", "bl"] },
				{ key: "buen", points: ["bl", "br"] },
				{ key: "saop", points: ["br"] },
				{ key: "lago", points: ["br", "tr", "tl"] },
				{ key: "saop", points: ["tr"] },
				{ key: "madr", points: ["br", "tr", "tl"] },
				{ key: "saop", points: ["t"] }
			]
		},
		{
			name: "lagos",
			color: "y",
			percentFromTop: 0.547,
			percentFromLeft: 0.463,
			connectedCityKeys: ["saop", "kins", "khar"],
			quarantineBoundaries: [
				{ key: "lago", points: ["tl"] },
				{ key: "saop", points: ["tl", "bl", "br"] },
				{ key: "lago", points: ["b"] },
				{ key: "kins", points: ["bl", "br"] },
				{ key: "khar", points: ["br", "tr", "tl"] }
			]
		},
		{
			name: "khartoum",
			color: "y",
			percentFromTop: 0.527,
			percentFromLeft: 0.559,
			connectedCityKeys: ["lago", "kins", "joha", "cair"],
			quarantineBoundaries: [
				{ key: "cair", points: ["tr", "tl"] },
				{ key: "lago", points: ["tl", "bl"] },
				{ key: "kins", points: ["bl"] },
				{ key: "joha", points: ["bl", "br"] },
				{ key: "khar", points: ["br", "tr"] }
			]
		},
		{
			name: "kinshasa",
			color: "y",
			percentFromTop: 0.620,
			percentFromLeft: 0.511,
			connectedCityKeys: ["lago", "khar", "joha"],
			quarantineBoundaries: [
				{ key: "lago", points: ["tl", "bl"] },
				{ key: "joha", points: ["bl", "br"] },
				{ key: "khar", points: ["r", "tr"] }
			]
		},
		{
			name: "johannesburg",
			color: "y",
			percentFromTop: 0.728,
			percentFromLeft: 0.553,
			connectedCityKeys: ["kins", "khar"],
			quarantineBoundaries: [
				{ key: "kins", points: ["tl", "bl"] },
				{ key: "joha", points: ["bl", "br"] },
				{ key: "khar", points: ["r", "tr", "tl"] }
			]
		},
		{
			name: "algiers",
			color: "b",
			percentFromTop: 0.402,
			percentFromLeft: 0.487,
			connectedCityKeys: ["madr", "pari", "ista", "cair"],
			quarantineBoundaries: [
				{ key: "pari", points: ["br", "tr", "tl"] },
				{ key: "madr", points: ["tl", "bl"] },
				{ key: "algi", points: ["bl"] },
				{ key: "cair", points: ["bl", "br"] },
				{ key: "ista", points: ["br", "tr", "tl"] },
				{ key: "algi", points: ["tr"] }
			]
		},
		{
			name: "istanbul",
			color: "b",
			percentFromTop: 0.331,
			percentFromLeft: 0.554,
			connectedCityKeys: ["algi", "mila", "stpe", "mosc", "bagh", "cair"],
			quarantineBoundaries: [
				{ key: "mila", points: ["tl"] },
				{ key: "algi", points: ["tl", "bl"] },
				{ key: "cair", points: ["bl", "br"] },
				{ key: "bagh", points: ["br"] },
				{ key: "mosc", points: ["br", "tr"] },
				{ key: "stpe", points: ["tr", "tl"] }
			]
		},
		{
			name: "moscow",
			color: "b",
			percentFromTop: 0.270,
			percentFromLeft: 0.613,
			connectedCityKeys: ["stpe", "ista", "tehr"],
			quarantineBoundaries: [
				{ key: "stpe", points: ["tr", "tl"] },
				{ key: "ista", points: ["tl", "bl", "br"] },
				{ key: "tehr", points: ["br", "tr"] }
			]
		},
		{
			name: "cairo",
			color: "b",
			percentFromTop: 0.423,
			percentFromLeft: 0.544,
			connectedCityKeys: ["algi", "ista", "bagh", "riya", "khar"],
			quarantineBoundaries: [
				{ key: "algi", points: ["tl", "bl"] },
				{ key: "khar", points: ["bl", "br"] },
				{ key: "riya", points: ["br", "tr"] },
				{ key: "bagh", points: ["tr"] },
				{ key: "ista", points: ["tr", "tl"] }
			]
		},
		{
			name: "baghdad",
			color: "b",
			percentFromTop: 0.387,
			percentFromLeft: 0.606,
			connectedCityKeys: ["ista", "cair", "riya", "kara", "tehr"],
			quarantineBoundaries: [
				{ key: "ista", points: ["tl"] },
				{ key: "cair", points: ["tl", "bl"] },
				{ key: "riya", points: ["bl", "br"] },
				{ key: "kara", points: ["br", "tr"] },
				{ key: "tehr", points: ["tr"] }
			]
		},
		{
			name: "tehran",
			color: "b",
			percentFromTop: 0.320,
			percentFromLeft: 0.664,
			connectedCityKeys: ["mosc", "bagh", "kara", "delh"],
			quarantineBoundaries: [
				{ key: "mosc", points: ["tr", "tl"] },
				{ key: "bagh", points: ["bl"] },
				{ key: "kara", points: ["b"] },
				{ key: "delh", points: ["br", "tr"] },
				{ key: "tehr", points: ["tr"] }
			]
		},
		{
			name: "riyadh",
			color: "b",
			percentFromTop: 0.484,
			percentFromLeft: 0.616,
			connectedCityKeys: ["cair", "bagh", "kara"],
			quarantineBoundaries: [
				{ key: "bagh", points: ["tr", "tl"] },
				{ key: "cair", points: ["tl", "bl"] },
				{ key: "riya", points: ["bl", "br"] },
				{ key: "kara", points: ["br", "tr"] }
			]
		},
		{
			name: "karachi",
			color: "b",
			percentFromTop: 0.422,
			percentFromLeft: 0.679,
			connectedCityKeys: ["riya", "bagh", "tehr", "delh", "mumb"],
			quarantineBoundaries: [
				{ key: "tehr", points: ["tr", "tl"] },
				{ key: "bagh", points: ["tl", "bl"] },
				{ key: "riya", points: ["tl", "bl"] },
				{ key: "mumb", points: ["bl", "br"] },
				{ key: "delh", points: ["br", "tr"] }
			]
		},
		{
			name: "delhi",
			color: "b",
			percentFromTop: 0.392,
			percentFromLeft: 0.733,
			connectedCityKeys: ["tehr", "kara", "mumb", "chen", "kolk"],
			quarantineBoundaries: [
				{ key: "tehr", points: ["tr", "tl", "bl"] },
				{ key: "mumb", points: ["bl"] },
				{ key: "chen", points: ["bl", "br", "tr"] },
				{ key: "kolk", points: ["bl", "br", "tr"] }
			]
		},
		{
			name: "kolkata",
			color: "b",
			percentFromTop: 0.418,
			percentFromLeft: 0.786,
			connectedCityKeys: ["delh", "chen", "bang", "hong"],
			quarantineBoundaries: [
				{ key: "delh", points: ["tr", "tl", "bl"] },
				{ key: "chen", points: ["bl", "br"] },
				{ key: "bang", points: ["br"] },
				{ key: "hong", points: ["br", "tr"] },
				{ key: "kolk", points: ["tr"] }
			]
		},
		{
			name: "mumbai",
			color: "b",
			percentFromTop: 0.500,
			percentFromLeft: 0.686,
			connectedCityKeys: ["kara", "delh", "chen"],
			quarantineBoundaries: [
				{ key: "kara", points: ["tl", "bl"] },
				{ key: "mumb", points: ["bl"] },
				{ key: "chen", points: ["bl", "br", "tr"] },
				{ key: "delh", points: ["tr", "tl"] }
			]
		},
		{
			name: "chennai",
			color: "b",
			percentFromTop: 0.557,
			percentFromLeft: 0.744,
			connectedCityKeys: ["mumb", "delh", "kolk", "bang", "jaka"],
			quarantineBoundaries: [
				{ key: "delh", points: ["tr", "tl"] },
				{ key: "mumb", points: ["tl", "bl"] },
				{ key: "jaka", points: ["bl", "br"] },
				{ key: "bang", points: ["tr"] },
				{ key: "kolk", points: ["tr"] }
			]
		},
		{
			name: "beijing",
			color: "r",
			percentFromTop: 0.295,
			percentFromLeft: 0.829,
			connectedCityKeys: ["seou", "shan"],
			quarantineBoundaries: [
				{ key: "beij", points: ["tl"] },
				{ key: "shan", points: ["bl", "br"] },
				{ key: "seou", points: ["br", "tr"] }
			]
		},
		{
			name: "seoul",
			color: "r",
			percentFromTop: 0.289,
			percentFromLeft: 0.896,
			connectedCityKeys: ["beij", "shan", "toky"],
			quarantineBoundaries: [
				{ key: "beij", points: ["tl"] },
				{ key: "shan", points: ["bl", "br"] },
				{ key: "toky", points: ["br", "tr"] },
				{ key: "seou", points: ["tr"] }
			]
		},
		{
			name: "shanghai",
			color: "r",
			percentFromTop: 0.370,
			percentFromLeft: 0.834,
			connectedCityKeys: ["beij", "seou", "toky", "taip", "hong"],
			quarantineBoundaries: [
				{ key: "beij", points: ["tl"] },
				{ key: "shan", points: ["l"] },
				{ key: "hong", points: ["bl", "br"] },
				{ key: "taip", points: ["br", "r"] },
				{ key: "toky", points: ["b", "br", "tr"] },
				{ key: "seou", points: ["tr"] }
			]
		},
		{
			name: "tokyo",
			color: "r",
			percentFromTop: 0.332,
			percentFromLeft: 0.948,
			connectedCityKeys: ["seou", "shan", "osak", "sanf"],
			quarantineBoundaries: [
				...[
					{ key: "top-right", points: ["tr"] },
					{ key: "toky-sanf", points: ["t"] },
					{ key: "toky", points: ["tl"] },
					{ key: "seou", points: ["tr", "tl"] },
					{ key: "shan", points: ["tl", "bl", "br"] },
					{ key: "osak", points: ["bl", "br", "tr"] },
					{ key: "toky", points: ["br"] },
					{ key: "toky-sanf", points: ["b"] }
				],
				...getPacificTraversalPoints({ direction: "west" }),
				...[
					{ key: "sanf-toky", points: ["b"] },
					{ key: "sanf", points: ["br", "tr"] },
					{ key: "sanf-toky", points: ["t"] }
				],
				...getPacificTraversalPoints({ direction: "east" })
			]
		},
		{
			name: "bangkok",
			color: "r",
			percentFromTop: 0.506,
			percentFromLeft: 0.797,
			connectedCityKeys: ["chen", "kolk", "hong", "hoch", "jaka"],
			quarantineBoundaries: [
				{ key: "kolk", points: ["tr", "tl"] },
				{ key: "chen", points: ["tl", "bl"] },
				{ key: "jaka", points: ["bl", "br"] },
				{ key: "hoch", points: ["br"] },
				{ key: "hong", points: ["tr"] }
			]
		},
		{
			name: "hong kong",
			color: "r",
			percentFromTop: 0.460,
			percentFromLeft: 0.840,
			connectedCityKeys: ["shan", "taip", "mani", "hoch", "bang", "kolk"],
			quarantineBoundaries: [
				{ key: "shan", points: ["tr", "tl"] },
				{ key: "kolk", points: ["tl", "bl"] },
				{ key: "bang", points: ["bl"] },
				{ key: "hoch", points: ["bl"] },
				{ key: "mani", points: ["br", "tr"] },
				{ key: "taip", points: ["tr"] }
			]
		},
		{
			name: "taipei",
			color: "r",
			percentFromTop: 0.444,
			percentFromLeft: 0.900,
			connectedCityKeys: ["osak", "mani", "hong", "shan"],
			quarantineBoundaries: [
				{ key: "shan", points: ["tr", "tl"] },
				{ key: "hong", points: ["bl"] },
				{ key: "mani", points: ["bl", "br"] },
				{ key: "osak", points: ["br", "tr"] }
			]
		},
		{
			name: "osaka",
			color: "r",
			percentFromTop: 0.413,
			percentFromLeft: 0.955,
			connectedCityKeys: ["toky", "taip"],
			quarantineBoundaries: [
				{ key: "toky", points: ["tr", "tl"] },
				{ key: "taip", points: ["tl", "bl", "br"] },
				{ key: "osak", points: ["br", "tr"] }
			]
		},
		{
			name: "jakarta",
			color: "r",
			percentFromTop: 0.650,
			percentFromLeft: 0.797,
			connectedCityKeys: ["chen", "bang", "hoch", "sydn"],
			quarantineBoundaries: [
				{ key: "bang", points: ["tr", "tl"] },
				{ key: "chen", points: ["tl", "bl"] },
				{ key: "jaka", points: ["bl"] },
				{ key: "sydn", points: ["bl", "br", "tr"] },
				{ key: "hoch", points: ["tr"] }
			]
		},
		{
			name: "ho chi minh city",
			color: "r",
			percentFromTop: 0.583,
			percentFromLeft: 0.843,
			connectedCityKeys: ["jaka", "bang", "hong", "mani"],
			quarantineBoundaries: [
				{ key: "hong", points: ["tr", "tl"] },
				{ key: "bang", points: ["tl"] },
				{ key: "jaka", points: ["bl", "br"] },
				{ key: "mani", points: ["br", "tr"] }
			]
		},
		{
			name: "manila",
			color: "r",
			percentFromTop: 0.576,
			percentFromLeft: 0.917,
			connectedCityKeys: ["sydn", "hoch", "hong", "taip", "sanf"],
			quarantineBoundaries: [
				...[
					{ key: "mani-sanf", points: ["t"] },
					{ key: "mani", points: ["tr"] },
					{ key: "taip", points: ["tr", "tl"] },
					{ key: "hong", points: ["tl"] },
					{ key: "hoch", points: ["bl"] },
					{ key: "sydn", points: ["bl", "br", "tr"] },
					{ key: "mani", points: ["br"] },
					{ key: "mani-sanf", points: ["b"] }
				],
				...getPacificTraversalPoints({ direction: "west" }),
				...[
					{ key: "sanf-mani", points: ["b"] },
					{ key: "sanf", points: ["br", "tr"] },
					{ key: "sanf-mani", points: ["t"] }
				],
				...getPacificTraversalPoints({ direction: "east" })
			]
		},
		{
			name: "sydney",
			color: "r",
			percentFromTop: 0.794,
			percentFromLeft: 0.958,
			connectedCityKeys: ["jaka", "mani", "losa"],
			quarantineBoundaries: [
				...[
					{ key: "sydn-losa", points: ["t"] },
					{ key: "sydn", points: ["tr"] },
					{ key: "mani", points: ["tr", "tl", "bl"] },
					{ key: "sydn", points: ["tl"] },
					{ key: "jaka", points: ["tr", "tl", "bl"] },
					{ key: "sydn", points: ["bl", "br"] },
					{ key: "sydn-losa", points: ["b"] }
				],
				...getPacificTraversalPoints({ direction: "west" }),
				...[
					{ key: "losa-sydn", points: ["b"] },
					{ key: "losa", points: ["br", "tr", "t"] },
					{ key: "losa-sydn", points: ["t"] }
				],
				...getPacificTraversalPoints({ direction: "east" })
			]
		},
	];
	
	for (let city of cityInfo)
	{
		city.key = city.name.replace(/ /g,'').substring(0,4);
		data.cities[city.key] = new City(city);
	}
})();

// Instantiate event cards
(function ()
{
	const eventCards = [
						["resi", "Resilient Population"],
						["oneq", "One Quiet Night"],
						["fore", "Forecast"],
						["airl", "Airlift"],
						["gove", "Government Grant"]
					];

	for (let card of eventCards)
		data.eventCards[card[0]] = card[1];
})();

function updateResearchStationSupplyCount()
{
	$("#researchStationSupplyCount").html(getResearchStationSupplyCount());
}

function getResearchStationSupplyCount()
{
	const MAX_RESEARCH_STATION_COUNT = 6;
	return MAX_RESEARCH_STATION_COUNT - data.researchStationKeys.size;
}

// given an array of city info, loads any research stations and disease cubes
function loadCityStates(cityInfoArray)
{
	if (typeof cityInfoArray == "undefined")
		return;
	
	const colors = ["y", "r", "u", "b"],
		cubeSupplies = [24, 24, 24, 24];
	
	let cityInfo,
		city,
		color,
		numCubes;

	// for each city in the array...
	for (let i = 0; i < cityInfoArray.length; i++)
	{
		cityInfo = cityInfoArray[i];
		city = getCity(cityInfo.locationKey);
		
		// place the research station if it has one
		if (cityInfo.researchStation == "1")
			city.buildResearchStation();
		
		// place disease cubes on the city if it has any
		for (let c = 0; c < colors.length; c++)
		{
			color = colors[c];
			numCubes = cityInfo[`${color}Cubes`];
			
			for (let n = 0; n < numCubes; n++)
			{
				addCube(color, city.key);
				cubeSupplies[c]--;
			}
		}
		
		queueCluster(city.key);
	}

	// update the cube supply display values
	for (let i = 0; i < colors.length; i++)
		$(`#${colors[i]}Supply`).html(cubeSupplies[i]);
}

// adds a city key to the cluster queue
function queueCluster(cityKey)
{
	data.pendingClusters.add(cityKey);
}

function executePendingClusters(details)
{
	for (let cityKey of data.pendingClusters)
		getCity(cityKey).cluster(details);
	
	data.pendingClusters.clear();
}

// shows a city's location by animating 2 rectangles such that their points overlap on the specified city's position
function pinpointCity(cityKey, pinpointColor)
{
	const city = getCity(cityKey),
		cityOffset = city.getOffset(),
		cWidth = data.cityWidth,
		adj = data.boardWidth * 0.003, // slight adjustment needed for rectB coords
		rects = $(".pinpointRect"),
		rectA = rects.first(),
		rectB = rects.last(),
		duration = 300,
		easing = data.easings.pinpointCity;

	rects.css("border-color", pinpointColor || "red");
	
	if (data.pinpointTimeout !== false) // another pinpoint sequence is in progress
	{
		clearTimeout(data.pinpointTimeout);
		rects.stop().css("opacity", 1);
	}
	else
		rects.removeClass("hidden");
	
	// prevent unwanted behaviour in the case of rapid consecutive calls
	data.pinpointTimeout = true;
	
	// animate rectangles to pinpoint city location
	rectA.animate(
	{
		left: cityOffset.left - cWidth,
		top: cityOffset.top - cWidth
	}, duration, easing);
	
	rectB.animate(
	{
		left: (cityOffset.left + cWidth) - data.boardWidth - adj,
		top: (cityOffset.top + cWidth) - data.boardHeight - adj
	}, duration, easing,
	function()
	{
		// hide rectangles after 1 second
		data.pinpointTimeout = setTimeout(function()
		{
			rects.fadeTo(200, 0.1, function()
			{
				rects.offset(
				{
					left: 0,
					top: 0
				}).addClass("hidden").css("opacity", "1");
				data.pinpointTimeout = false;
			});
		}, 1250);
	});
}

function getPinpointColor(infectionPreventionCode)
{
	const codes = data.infectionPreventionCodes;

	if (infectionPreventionCode == codes.notPrevented)
		return "red";
	
	if (infectionPreventionCode == codes.eradicated)
		return "green";
	
	if (infectionPreventionCode == codes.quarantine)
		return "#006951";
	
	if (infectionPreventionCode == codes.medicAutoTreat)
		return "#f68426";
}

// binds click events of .playerCard elements
function bindPlayerCardEvents()
{
	$(".playerCard:not(.event, .epidemic)")
		.off("click")
		.click(function()
		{
			pinpointCity($(this).data("key"), "green");
		});
}

async function resolveOutbreaks(events)
{
	const { outbreak, outbreakInfection } = eventTypes,
		pendingOutbreaks = events.filter(e => e.code === outbreak.code),
		color = pendingOutbreaks[0].diseaseColor,
		cubeSupplyOffset = $(".cubeSupply .diseaseCube." + color).offset(),
		duration = getDuration("cubePlacement"),
		easing = data.easings.cubePlacement;
	
	let outbreakEvent,
		originCity,
		initialCubeOffset,
		infections,
		$triggerCube,
		resolvingInitalOutbreak = true;
	
	while (pendingOutbreaks.length)
	{
		outbreakEvent = pendingOutbreaks.shift();
		originCity = getCity(outbreakEvent.originKey);
		
		// Include outbreakInfection events resulting from the current outbreak
		// and outbreak events whose origin is connected to the currently outbreaking city.
		// However, if a city has been triggered to outbreak but there are pending outbreakInfection events
		// where the infectedKey is the outbreak originKey, don't include that outbreak event.
		infections = events.filter(e => (e.code == outbreakInfection.code && e.originKey == outbreakEvent.originKey)
										|| (e.code == outbreak.code
											&& originCity.isConnectedTo(e.originKey)
											&& !events.some(f => f.infectedKey == e.originKey)));
		
		if (resolvingInitalOutbreak)
		{
			resolvingInitalOutbreak = false;
			
			const cubeWidth = getAnimatedCubeWidth();
			$triggerCube = $triggerCube || addCube(color, originCity.key, { prepareAnimation: true });
			
			await animatePromise(
				{
					$elements: $triggerCube,
					initialProperties: cubeSupplyOffset,
					desiredProperties: {
						...originCity.getOffset("cube"),
						...{ width: cubeWidth, height: cubeWidth }
					},
					duration: duration,
					easing: easing
				});
		}
		else
			$triggerCube = $(`.diseaseCube.${color}.${originCity.key}`).last();

		await sleep(getDuration("longInterval"));
		await specialEventAlert(
			{
				title: "OUTBREAK!",
				description: `Origin: ${originCity.name}`,
				eventClass: "epidemic"
			});

		await moveOutbreaksMarker(outbreakEvent.outbreakCount, { animate: true });

		initialCubeOffset = $triggerCube.offset();
		$triggerCube.remove();

		let affectedCity, numInfected = 0,
			preventionOccured = false,
			quarantinePrevention = false,
			medicAutoTreatPrevention = false,
			preventionVisualFadeInMs = 250;
		
		for (let inf of infections)
		{			
			affectedCity = getCity(inf.infectedKey || inf.originKey);
			
			if (inf.code == outbreakInfection.code)
			{
				if (inf.preventionCode !== data.infectionPreventionCodes.notPrevented)
				{
					if (inf.preventionCode === data.infectionPreventionCodes.quarantine)
						quarantinePrevention = true;
					
					if (inf.preventionCode === data.infectionPreventionCodes.medicAutoTreat)
						medicAutoTreatPrevention = true;
					
					preventionOccured = true;
					continue;
				}
				else
				{
					queueCluster(affectedCity.key);
					numInfected++;
				}
			}
			
			addCube(color, affectedCity.key)
				.offset(initialCubeOffset)
				.animate(affectedCity.getOffset("cube"), duration, easing);
		}

		if (preventionOccured)
		{
			if (quarantinePrevention)
				showQuarantineArea(preventionVisualFadeInMs);
	
			if (medicAutoTreatPrevention)
				showMedicAutoTreatCircle({ fadeInMs: preventionVisualFadeInMs });
		}
		
		updateCubeSupplyCount(color, -numInfected);
		
		// remove the handled events
		events = events.filter(e => !(infections.includes(e) || Object.is(outbreakEvent, e)));
		
		await sleep(getDuration("cubeAnimation"));
		executePendingClusters();

		if (preventionOccured)
		{
			await sleep(2000);

			if (quarantinePrevention)
				hideQuarantineArea();
			
			if (medicAutoTreatPrevention)
				hideMedicAutoTreatCircle();

			await sleep(500); // instead of awaiting both of the above
		}
	}

	return sleep(getDuration("shortInterval"));
}

function moveOutbreaksMarker(outbreakCount, { animate } = {})
{
	return new Promise(async resolve =>
		{
			const topPercentages = [0.544, 0.5925, 0.634, 0.6798, 0.7235, 0.7685, 0.8118, 0.852, 0.896], // because the increase in distance from the top is nonlinear
				leftDimension = outbreakCount % 2 === 0 ? "outbreaksMarkerLeft" : "outbreaksMarkerRight"; // because the outbreaks track zig-zags
			
			data.outbreakCount = outbreakCount;
		
			if (animate)
				await highlightMarkerTrack("outbreaks");

			await animatePromise(
			{
				$elements: $("#outbreaksMarker"),
				desiredProperties: {
					top: (data.boardHeight * topPercentages[outbreakCount]),
					left: getDimension(leftDimension)
				},
				duration: animate ? getDuration("moveMarker") : 0,
				easing: data.easings.moveMarker
			});

			if (animate)
			{
				await sleep(getDuration("longInterval"));
				await highlightMarkerTrack("outbreaks", { off: true });
			}

			resolve();
		});
}

// Adds a disease cube to a city, and potentially triggers outbreaks.
function addCube(color, cityKey, {prepareAnimation} = {})
{
	const city = getCity(cityKey);
	
	// max 3 cubes per color per city
	if (city.cubes[color] < 3)
		city.cubes[color]++;

	$("#boardContainer").append("<div class='diseaseCube " + color + " " + cityKey + "'></div>");
	const newCube = $(".diseaseCube").last();
	
	let startingWidth = prepareAnimation ? $(".cubeSupply .diseaseCube").first().width() : getDimension("cubeWidth");

	newCube.width(startingWidth).height(startingWidth);
	
	if (city.color == "y" && color == "y")
		newCube.css("border-color", "#000");
	
	city.hasOccupants = true;
	
	return newCube;
}

async function removeCubes(city, { $clickedCube, color, numToRemove, animate } = {})
{
	let $cubesToRemove;

	if (!color)
		color = city.color;
	
	if (!numToRemove)
		numToRemove = 1;
	else if (numToRemove === "all")
		numToRemove = city.cubes[color];

	if (numToRemove == 1 && $clickedCube)
		$cubesToRemove = $clickedCube;
	else
	{
		$cubesToRemove = $(`.diseaseCube.${city.key}.${color}`);
		$cubesToRemove.length = numToRemove;
	}
	
	$cubesToRemove.addClass("removing");

	if (animate)
	{
		const $supplyCube = $(".cubeSupply .diseaseCube." + color),
			desiredProps = $supplyCube.offset(),
			supplyCubeWidth = $supplyCube.width(),
			duration = getDuration("cubeAnimation") * 0.5;
		
		desiredProps.width = supplyCubeWidth;
		desiredProps.height = supplyCubeWidth;

		let $cube;
		while ($cubesToRemove.length)
		{
			$cube = $cubesToRemove.first();

			await animatePromise({
				$elements: $cube,
				desiredProperties: desiredProps,
				duration: duration,
				easing: data.easings.cubePlacement
			});

			$cube.remove();
			updateCubeSupplyCount(color, 1);

			$cubesToRemove = $(`.diseaseCube.removing`);
		}
	}
	else
	{
		$(`.diseaseCube.removing`).remove();
		updateCubeSupplyCount(color, numToRemove);
	}

	city.cluster();
	city.cubes[color] -= numToRemove;
	

	return(sleep(getDuration("shortInterval")));
}

function enforceCubeCount(cityKey, expectedCubeCount, cubeColor)
{
	const city = getCity(cityKey);
	
	cubeColor = cubeColor || city.color;
	
	if (city.cubes[cubeColor] != expectedCubeCount)
	{
		if (city.cubes[cubeColor] > expectedCubeCount)
			removeCubes(city, { numToRemove: city.cubes[cubeColor] - expectedCubeCount });
		else 
		{
			let numAdded = 0;
			while (city.cubes[cubeColor] < expectedCubeCount)
			{
				addCube(cubeColor, cityKey);
				numAdded++;
			}
			updateCubeSupplyCount(cubeColor, -numAdded);
		}

		city.cluster();
	}
}

function updateCubeSupplyCount(cubeColor, addend)
{
	const $supplyCount = $(`#${cubeColor}Supply`),
		updatedCount = parseInt($supplyCount.html()) + addend;
	
	$supplyCount.html(updatedCount);
}

function highlightEpidemicStep($epidemic, epidemicStep)
{
	$epidemic.children(".highlighted").removeClass("highlighted");
	$epidemic.children(`.${epidemicStep}`).addClass("highlighted");
}

function prepareEpidemicStep()
{
	return new Promise(async resolve =>
		{
			const numUnresolved = numEpidemicsToResolve(),
				$container = $("#epidemicContainer"),
				$epidemics = $container.children(".epidemicFull");
			
			const $epidemic = $epidemics.not(".resolved").last().removeClass("pending"),
				returnValues = {
					$epidemic: $epidemic,
					$btn: $container.find(".button").addClass("btnDisabled").removeClass("hidden")
				};
		
			if (numUnresolved === 2)
				$epidemics.first().removeClass("hidden").addClass("pending");

			$container.removeClass("hidden");
			$epidemic.removeClass("hidden")
				.children(".hidden").slideDown(function()
				{
					unhide($(this));
				});

			resolve(returnValues);
		});
}

function specialEventAlert({ title, description, eventClass, visibleMs })
{
	return new Promise(async resolve =>
	{
		const $banner = $("#specialEventBanner");
		
		$banner.removeAttr("class").addClass(eventClass)
		.children("#specialEventTitle").html(title)
		.next().html(description || "");
		
		// Important that this step is done after the banner's contents have been set
		// and the banner is visible.
		repositionSpecialEventBanner();
		
		$banner.offset({ left: -($(window).width()) });

		await animatePromise(
		{
			$elements: $banner,
			initialProperties: { left: -($(window).width()) },
			desiredProperties: { left: 0 },
			duration: getDuration("specialEventBannerReveal"),
			easing: data.easings.specialEventBannerReveal
		});
		
		await sleep(visibleMs || 2500);
		
		await animatePromise(
		{
			$elements: $banner,
			desiredProperties: { opacity: 0 }
		});
		
		$banner.addClass("hidden").removeAttr("style");
		
		resolve();
	});
}

// Returns true only if 2 epidemics were drawn on the same turn, the first has been resolved, and the second is waiting to be resolved.
// On page 7 of the official rules, under EVENT CARDS:
// "When 2 Epidemic cards are drawn together, events can be played after resolving the first epidemic."
function waitingToResolveSecondEpidemicThisTurn()
{
	// The current step must be Epidemic Step 1: Increase, else we are not waiting to resolve an epidemic.
	// Additionally, 1 epidemicIntensify event needs to have been recorded this turn, else 0 epidemics have been resolved this turn.
	return currentStepIs("epIncrease")
		&& getEventsOfTurn(eventTypes.epidemicIntensify).length === 1;
}

async function epidemicIncrease()
{
	const { $epidemic, $btn } = await prepareEpidemicStep();
	
	if (waitingToResolveSecondEpidemicThisTurn())
		enableEventCards();
	else
		disableEventCards();

	highlightEpidemicStep($epidemic, "increase");
	await buttonClickPromise($btn.html("INCREASE").removeClass("btnDisabled"));
	$btn.addClass("btnDisabled");
	disableEventCards();
	
	const { 0: event } = await requestAction(eventTypes.epidemicIncrease);

	await moveInfectionRateMarker({ newEpidemicCount: event.epidemicCount, animate: true });

	proceed();
}

async function epidemicInfect()
{
	disableEventCards();

	const { $epidemic, $btn } = await prepareEpidemicStep(),
		interval = getDuration("longInterval");

	highlightEpidemicStep($epidemic, "infect");
	await buttonClickPromise($btn.html("INFECT").removeClass("btnDisabled"));
	$btn.addClass("btnDisabled");

	const { 0: events } = await Promise.all(
		[
			requestAction(eventTypes.epidemicInfect),
			sleep(interval) // minumum wait time so things don't happen too quickly
		]),
		{ bottomInfCardKey, prevCubeCount, preventionCode } = events.shift(), // epInfect event
		triggeredOutbreakEvents = events, // any remaining events were triggered by the infection.
		$MAX_NUM_CUBES = 3,	
		card = {
			cityKey: bottomInfCardKey,
			numCubes: $MAX_NUM_CUBES - prevCubeCount,
			preventionCode: preventionCode,
			index: 0
		};

	getInfectionContainer().append(newInfectionCardTemplate());
	await dealFaceDownInfCard(card.index);
	await revealInfectionCard(card);

	if (preventionCode == 0)
		await placeDiseaseCubes(card, { noPostDelay: true });
	else
		await infectionPreventionAnimation(card);

	if (triggeredOutbreakEvents.length)
		await resolveOutbreaks(triggeredOutbreakEvents);
		
	await sleep(interval);
	await discardInfectionCard($("#epidemicContainer").find(".infectionCard"), 400);
	await sleep(interval);

	proceed();
}

async function epidemicIntensify()
{
	const {
		$epidemic,
		$btn
	} = await prepareEpidemicStep();
	
	highlightEpidemicStep($epidemic, "intensify");

	// Resilient Population may be played between the infect and intensify steps of an epidemic.
	enableEventCards({ resilientPopulationOnly: true });
	
	await buttonClickPromise($btn.html("INTENSIFY").removeClass("btnDisabled"));
	$btn.addClass("btnDisabled");
	disableEventCards();

	await Promise.all(
		[
			requestAction(eventTypes.epidemicIntensify),
			animateEpidemicIntensify()
		]);

	// When 2 epidemics are drawn on the same turn,
	// event cards may be played after resolving the first.
	let finalBtnText = "CONTINUE";
	if (data.nextStep === "epIncrease")
	{
		enableEventCards();
		finalBtnText = "NEXT EPIDEMIC";
	}
	
	$epidemic.children(".highlighted").removeClass("highlighted");
	await buttonClickPromise($btn.html(finalBtnText).removeClass("btnDisabled"));
	$btn.addClass("btnDisabled");
	disableEventCards();
	await finishIntensifyStep($epidemic, $btn);

	proceed();
}

function finishIntensifyStep($epidemic, $btn)
{
	return new Promise(async resolve =>
	{
		// collapse epidemic card
		await animatePromise(
			{
				$elements: $epidemic.children().not("h2"),
				desiredProperties: { height: 0 },
				easing: "easeInQuad"
			}
		);
		// hide the .epidemicFull and show a new epidemic playercard element to discard
		const $card = newPlayerCardElement("epid");
		$epidemic.addClass("hidden").before($card)
			.children()
			.removeAttr("style");
		await movePlayerCardsToDiscards({ $card });
	
		getInfectionContainer().addClass("hidden");
	
		if (data.nextStep === "epIncrease")
		{
			$btn.addClass("btnDisabled");
			$epidemic.addClass("resolved");
		}
		else
		{
			$btn.addClass("hidden");
			$(".epidemicFull").removeClass("resolved");
		}

		resolve();
	});
}

async function highlightMarkerTrack(trackName, { off } = {})
{
	const $elements = $("." + trackName + "Highlight");

	await animatePromise(
		{
			$elements: $elements.removeClass("hidden"),
			initialProperties: { opacity: (off ? 0.5 : 0) },
			desiredProperties: { opacity: (off ? 0 : 0.5) },
			duration: 600
		}
	);

	if (off)
		$elements.addClass("hidden");

	return sleep(getDuration("shortInterval"));
}

function moveInfectionRateMarker({ newEpidemicCount, animate } = {})
{
	return new Promise(async resolve =>
	{
		const $marker = $("#infectionRateMarker"),
			trackName = "infectionRate",
			spaceLocations = [0.6396, 0.6763, 0.7132, 0.7502, 0.7868, 0.8238, 0.8606],
			epidemicCount = newEpidemicCount || data.epidemicCount;

		if (newEpidemicCount)
			data.epidemicCount = newEpidemicCount;
		
		updateInfectionRate(epidemicCount);
		
		if (animate)
		{
			$marker.offset({ left: (data.boardWidth * spaceLocations[epidemicCount - 1]) });
			await highlightMarkerTrack(trackName);
		}
		
		await animatePromise(
		{
			$elements: $marker,
			desiredProperties: {
				left: (data.boardWidth * spaceLocations[epidemicCount])
			},
			duration: animate ? getDuration("moveMarker") : 0,
			easing: data.easings.moveMarker
		});

		if (animate)
		{
			await sleep(getDuration("longInterval"));
			await highlightMarkerTrack(trackName, { off: true });
		}
		
		resolve();
	});
}

function updateInfectionRate(epidemicCount)
{
	let infRate = 2;

	if (epidemicCount > 4)
		infRate = 4;
	else if (epidemicCount > 2)
		infRate = 3;
	
	data.infectionRate = infRate;

	data.steps["infect cities"].description = `Infection Rate: ${infRate}`;
}

async function animateEpidemicIntensify()
{
	const $container = $("#infectionDiscard"),
		$title = $container.children(".title").first();
	
	bindInfectionDiscardHover({ unbind: true });
	
	await sleep(getDuration("longInterval"));
	await expandInfectionDiscardPile();
	await sleep(getDuration("longInterval"));
	
	const $cards = $container.children(".infectionCard"),
		$veil = $container.children("#infDiscardVeil"),
		$deck = $("#imgInfectionDeck"),
		deckWidth = $deck.width(),
		centerOfContainer = {
			top: ($container.height() - $title.outerHeight()) / 2 - (deckWidth / 2),
			left: $container.width() / 2 - (deckWidth / 2)
		}
	
	$cards.prepend($(`<img	class='infDiscardCardback'
							src='images/cards/infectionCardback.png'
							alt='Infection Card' />`));
	
	const $cardbacks = $(".infDiscardCardback"),
		easing = "easeInOutQuad";
	let duration = 500;

	if ($cardbacks.length > 1)
		$title.html("[ SHUFFLING DISCARDS ]");
	
	await Promise.all(
		[
			animatePromise(
				{
					$elements: $cardbacks,
					desiredProperties: { opacity: 1 },
					duration: duration
				}),
			animatePromise(
				{
					$elements: $cards.children(".infectionCardContents"),
					desiredProperties: { opacity: 0 },
					duration: duration
				}),
			animatePromise(
				{
					$elements: $veil,
					initialProperties: {
						height: $container.height(),
						width: $container.width(),
						left: $container.width()
					},
					desiredProperties: {
						left: getDimension("discardDiseaseIcon")
					},
					duration: duration
				})
		]
	);
	
	$veil.addClass("hidden");
	await animatePromise(
		{
			$elements: $cardbacks,
			desiredProperties: { ...centerOfContainer, ...{ width: deckWidth } },
			duration: duration,
			easing: easing
		});

	if ($cardbacks.length > 1)
	{
		duration = 100;
		for (let i = 0; i < 5; i++)
		{
			await randomizeOffsets($cardbacks,
				{
					minDistance: 10,
					maxDistance: Math.floor(deckWidth * 0.75),
					duration: duration,
					easing: easing
				});
			
			await animatePromise(
				{
					$elements: $cardbacks,
					desiredProperties: centerOfContainer,
					duration: duration,
					easing: easing
				});
		}
	}

	const initialCardPosition = $cardbacks.first().offset(),
		deckPosition = $deck.offset();
	
	duration = $cardbacks.length > 1 ? 150 : 400;

	let $card;
	for (let i = 0; i < $cardbacks.length; i++)
	{
		$card = $cardbacks.eq(i).appendTo("body");
		await animatePromise(
			{
				$elements: $card,
				initialProperties: { ...initialCardPosition, ...{ zIndex: 10 } },
				desiredProperties: deckPosition,
				duration: duration,
				easing: "easeOutQuad"
			});
	}

	$cardbacks.remove();
	$container.children(".infectionCard").remove();

	$title.html("INFECTION DISCARDS");
	collapsenfectionDiscardPile();
	bindInfectionDiscardHover();

	return sleep(getDuration("longInterval"));
}

function randomizeOffsets($elements, { minDistance, maxDistance, duration, easing })
{
	return new Promise(resolve =>
		{
			const numElements = $elements.length;
			
			let positionProperties;
			for (let i = 0; i < numElements; i++)
			{
				positionProperties = {
					top: (randomNumberBetween(1,2) == 1 ? "-=" : "+=") + randomNumberBetween(minDistance, maxDistance),
					left: (randomNumberBetween(1,2) == 1 ? "-=" : "+=") + randomNumberBetween(minDistance, maxDistance),
					zIndex: randomNumberBetween(1, numElements)
				}

				$elements.eq(i).animate(positionProperties, duration, easing,
					function()
					{
						if ($(this).is($elements.last()))
							resolve();
					})
			}
		});
}

function bypassDiscardStep(nextStep)
{
	$("#discardStepContainer").addClass("hidden").children(".discardPrompt").remove();
	setCurrentStep(nextStep);
}

function discardStep()
{
	log("discardStep()");
	const player = getPlayerWithTooManyCards(),
		$discardPrompt = new DiscardPrompt(
			{
				eventTypeCode: eventTypes.discard.code,
				buttonText: "CONFIRM",
				cardKeys: player.cardKeys,
				numDiscardsRequired: player.cardKeys.length - data.HAND_LIMIT,
				onConfirm: confirmDiscards
			});
	
	// Event cards can be played instead of discarding.
	enableEventCards();

	const $container = $("#discardStepContainer").empty();
	$container.siblings(".interface").addClass("hidden");

	$container.append($discardPrompt)
		.slideDown(function() { unhide($container) });
}

// Returns the player who has more cards than the hand limit.
// It's impossible for there to be more than one player with too many cards at one time
// because two players never receive cards simultaneously.
function getPlayerWithTooManyCards()
{
	let player;
	for (let rID in data.players)
	{
		player = data.players[rID];
		
		if (player.cardKeys.length > data.HAND_LIMIT)
			return player;
	}
}

async function confirmDiscards(discardKeys)
{
	const player = getPlayerWithTooManyCards(),
		$discardStepContainer = $("#discardStepContainer");
	
	$discardStepContainer.slideUp(function()
	{
		$discardStepContainer.children(".discardPrompt").remove();
	});

	await Promise.all(
		[
			requestAction(eventTypes.discard,
				{
					discardingRole: player.rID,
					cardKeys: discardKeys
				}),
			movePlayerCardsToDiscards({ player, cardKeys: discardKeys })
		]);

	player.removeCardsFromHand(discardKeys);
	
	proceed();
}

function movePlayerCardsToDiscards({ player, cardKeys, $card } = {})
{
	return new Promise(async (resolve) =>
	{
		let completionInterval = getDuration("discardPlayerCard");
		if (player && Array.isArray(cardKeys))
		{
			for (let cardKey of cardKeys)
				await animateDiscardPlayerCard(player.getCardElementFromHand(cardKey));
			
			completionInterval *= (1 - data.playerCardAnimationInterval);
		}
		else if ($card.length === 1)
			animateDiscardPlayerCard($card);

		await sleep(completionInterval);
		
		resolve();
	});
}

function animateDiscardPlayerCard($card)
{
	const $container = $("#playerDiscard"),
		initialOffset = $card.offset(),
		initialWidth = $card.width(),
		$guide = $container.children(".title").first(),
		guideOffset = $guide.offset();
	
	$card.css(
		{
			width: initialWidth,
			position: "absolute",
			zIndex: 10
		})
		.offset(initialOffset)
		.animate(
			{
				top: guideOffset.top + $guide.height(),
				left: guideOffset.left,
				width: $container.width() * 0.98
			},
			getDuration("discardPlayerCard"),
			function()
			{
				$card.insertAfter($guide)
					.removeAttr("style");
			});
	
	return sleep(getDuration("discardPlayerCard") * data.playerCardAnimationInterval);
}

function isEventCardKey(cardKey)
{
	return data.eventCards.hasOwnProperty(cardKey);
}
function isEpidemicKey(cardKey)
{
	return cardKey.substring(0,3) === "epi";
}
function isCityKey(cardKey)
{
	return data.cities.hasOwnProperty(cardKey);
}

function newInfectionCardTemplate()
{
	const fontSize = getDimension("infCardFont"),
		cityNameTop = getDimension("infCardNameTop");
	
	return $(`<div class='infectionCard'>
				<div class='infectionCardContents'>
					<div class='veil'></div>
					<img class='infectionCardImg' />
					<p class='cityName' style='font-size: ${fontSize}px; top: ${cityNameTop}px'></p>
				</div>
			</div>`);
}

// Returns true when the turnNum has been updated for a new turn
// but the step has not changed from "infect cities" (final step of previous turn).
// This can occur if the user plays an event card before clicking "CONTINUE" at the end of the "infect cities" step.
function infectionStepJustFinished()
{
	if (!currentStepIs("infect cities"))
		return false;

	// If the current step is "infect cities" and no cardDraw event has been recorded this turn,
	// the "infect cities" step is over and a new turn has begun.
	return getEventsOfTurn(eventTypes.cardDraw).length === 0;
}

function isOneQuietNight()
{
	return getEventsOfTurn(eventTypes.oneQuietNight).length > 0;
}

async function skipInfectionStepForOneQuietNight()
{
	await Promise.all(
	[
		requestAction(eventTypes.skipInfectionStep),
		animateOneQuietNight()
	]);

	indicateOneQuietNightStep({ off: true });
	nextTurn();
}

async function infectionStep()
{
	if (infectionStepJustFinished())
		return finishInfectionStep();

	if (isOneQuietNight())
		return skipInfectionStepForOneQuietNight();
	
	log("infectionStep()");
	const $container = $("#infectCitiesContainer"),
		$btnContinue = $container.find(".button").html("INFECT CITY");
	
	let events,
		card,
		infectionCount = 0;
	
	$container.children(".infectionCard").remove();
	// Create infection card template elements
	for (let i = 0; i < data.infectionRate; i++)
		$btnContinue.before(newInfectionCardTemplate());
		
	positionInfectionPanelComponents();

	// If the game is resumed during the infection step,
	// there may already have been one or more infection cards drawn this turn.
	infectionCount += loadInfCardsDrawnThisTurn();

	$container.removeClass("hidden");

	// Prompt and perform infections until the infection rate is reached
	while (infectionCount < data.infectionRate)
	{
		// Event cards cannot be played while resolving infection cards,
		// but they can be played before, between, or after resolving infection cards.
		enableEventCards();
		await buttonClickPromise($btnContinue,
			{
				beforeClick: "fadeIn",
				afterClick: "hide"
			});
		$btnContinue.stop();
		// Infection card is being drawn and resolved.
		disableEventCards();

		events = await requestAction(eventTypes.infectCity);
		
		card = events.shift();
		card.index = infectionCount;
		
		await dealFaceDownInfCard(card.index);
		await revealInfectionCard(card);
		
		// if any events are left after shifting the first, an outbreak occured.
		if (events.length)
			await resolveOutbreaks(events);
		else
		{
			if (card.preventionCode === data.infectionPreventionCodes.notPrevented)
				await placeDiseaseCubes(card);
			else
				await infectionPreventionAnimation(card);
		}

		infectionCount++;
	}

	finishInfectionStep();
}

async function infectionPreventionAnimation({ preventionCode, cityKey })
{
	const { quarantine, medicAutoTreat, eradicated } = data.infectionPreventionCodes;

	if (preventionCode === quarantine)
		return quarantineAnimation(cityKey);
	else if (preventionCode === medicAutoTreat)
		return medicAutoTreatAnimation(cityKey);
	else if (preventionCode === eradicated)
		return diseaseIsEradicatedAnimation(cityKey);
}

async function diseaseIsEradicatedAnimation(cityKey)
{
	const color = getCity(cityKey).color;

	await sleep(getDuration("longInterval"));
	
	return specialEventAlert(
	{
		title: "INFECTION PREVENTED",
		description: `The ${getColorWord(color)} disease is eradicated`,
		eventClass: color
	});
}

function diseaseIsEradicated(diseaseColor)
{
	return data.cures[diseaseColor] === "eradicated";
}

function getColorWord(colorCode)
{
	const colorWords = {
		y: "yellow",
		r: "red",
		u: "blue",
		b: "black"
	};

	if (colorCode in colorWords)
		return colorWords[colorCode];
	
	console.error(`Color code does not exist: '${colorCode}'`);
	return "";
}

function newMedicAutoTreatCircle()
{
	const $circle = $("<div class='autoTreatCircle'></div>").appendTo("#boardContainer");
	
	return $circle;
}

function positionAutoTreatCircleComponents($circle, $cureMarker)
{
	const medic = getPlayer("Medic");

	if (!medic)
		return false;
	
	const circleRadius = getDimension("cityWidth") * 3,
		circleDiameter = circleRadius * 2,
		cityOffset = medic.getLocation().getOffset();
	
	$circle = $circle || $(".autoTreatCircle");
	$cureMarker = $cureMarker || $(".autoTreatCureMarker");
	
	$circle.css(
	{
		width: circleDiameter,
		height: circleDiameter,
		left: cityOffset.left - circleRadius,
		top: cityOffset.top - circleRadius
	});

	$cureMarker.css(
	{
		position: "absolute",
		left: cityOffset.left - $cureMarker.width() / 2,
		top: cityOffset.top - $cureMarker.height() / 2
	});
}

async function medicAutoTreatAnimation()
{
	const city = getPlayer("Medic").getLocation(),
		$cureMarker = newCureMarker(city.color, "cured", { isForMedicAutoTreat: true }),
		$circle = newMedicAutoTreatCircle(),
		duration = 500;
	
	positionAutoTreatCircleComponents($circle, $cureMarker);
	
	animatePromise(
	{
		$elements: $cureMarker,
		desiredProperties: { opacity: 0.8 },
		duration: duration
	});

	await animatePromise(
	{
		$elements: $circle,
		desiredProperties: { opacity: 0.5 },
		duration: duration
	});

	await sleep(getDuration("longInterval"));

	await specialEventAlert(
	{
		title: "INFECTION PREVENTED!",
		description: "The Medic prevents placing disease cubes of <i>cured</i> diseases in his location.",
		eventClass: "medic",
		visibleMs: 5000
	});

	await sleep(getDuration("shortInterval"));

	const $elements = $circle.add($cureMarker)
	await animatePromise(
	{
		$elements: $elements,
		desiredProperties: { opacity: 0 },
		duration: duration
	});

	$elements.remove();

	return sleep(100);
}

function showMedicAutoTreatCircle({ color, fadeInMs } = {})
{
	const city = getPlayer("Medic").getLocation(),
		$circle = newMedicAutoTreatCircle(),
		$cureMarker = newCureMarker(color || city.color, "cured", { isForMedicAutoTreat: true })
	
	positionAutoTreatCircleComponents($circle, $cureMarker);
	
	animatePromise(
	{
		$elements: $cureMarker,
		desiredProperties: { opacity: 0.8 },
		duration: fadeInMs || 500
	});

	return animatePromise(
	{
		$elements: $circle,
		desiredProperties: { opacity: 0.5 },
		duration: fadeInMs || 0
	});
}

function hideMedicAutoTreatCircle()
{
	return new Promise(async resolve =>
	{
		const $elements = $(".autoTreatCircle, .autoTreatCureMarker");

		await animatePromise(
		{
			$elements: $elements,
			desiredProperties: { opacity: 0 },
			duration: 500
		});

		$elements.remove();

		resolve();
	});
}

async function quarantineAnimation(cityKey)
{
	await showQuarantineArea(1000);

	await sleep(getDuration("longInterval"));

	await specialEventAlert(
	{
		title: "INFECTION PREVENTED!",
		description: `${getCity(cityKey).name} is Quarantined!`,
		eventClass: "quarantineSpecialist"
	});

	await sleep(getDuration("mediumInterval"));
	
	return hideQuarantineArea();
}

function showQuarantineArea(duration)
{
	return animatePromise(
	{
		$elements: $("#quarantineArea"),
		initialProperties: {
			width: data.boardWidth,
			height: data.boardHeight,
			opacity: 0,
			clipPath: getQuarantineAreaClipPath()
		},
		desiredProperties: { opacity: 0.4 },
		duration: duration || 500
	});
}

function hideQuarantineArea()
{
	return animatePromise(
	{
		$elements: $("#quarantineArea"),
		desiredProperties: { opacity: 0 },
		duration: 500
	});
}

function getQuarantineAreaClipPath()
{
	const { quarantineBoundaries } = getPlayer("Quarantine Specialist").getLocation(),
		// clip-path points will be adjusted in the specified direction(s) from the boundary cities' centers as follows:
		cityWidthAdj = data.sizeRatios.cityWidth[1] * 120,
		cityHeightAdj = cityWidthAdj * 1.426;

	let centeredX, centeredY,
		x, y,
		clipPath = "polygon(";
	
	for (let { key, points } of quarantineBoundaries)
	{
		let { percentFromTop, percentFromLeft } = getCity(key) || getPacificPath(key);

		centeredX = percentFromLeft * 100;
		centeredY = percentFromTop * 100;

		for (let point of points)
		{
			x = centeredX;
			y = centeredY;

			for (let direction of point)
			{
				if (direction === "t")
					y -= cityHeightAdj;
				else if (direction === "b")
					y += cityHeightAdj;
				else if (direction === "l")
					x -= cityWidthAdj;
				else if (direction === "r")
					x += cityWidthAdj;
			}

			clipPath += `${x}% ${y}%,`;
		}
	}

	clipPath = clipPath.substring(0, clipPath.length - 1);
	clipPath += ")";

	return clipPath;
}

function getInfectCityEventsOfTurn()
{
	// Reversing preserves the draw order.
	return getEventsOfTurn(eventTypes.infectCity).reverse();
}

// Loads the already-drawn infection card elements if the game is resumed during the infection step
// and one or more infection cards were already drawn on the resumed turn.
function loadInfCardsDrawnThisTurn()
{
	const infectionEvents = getInfectCityEventsOfTurn(),
		numCardsDrawnThisTurn = infectionEvents.length;
	
	if (numCardsDrawnThisTurn > 0)
	{
		// Insert the contents of any cards drawn this turn.
		const $infectionContainer = $("#infectCitiesContainer");
		let city;
		for (let i = 0; i < numCardsDrawnThisTurn; i++)
		{
			city = getCity(infectionEvents[i].cityKey);

			$infectionContainer.find(".infectionCard").eq(i)
				.attr("data-key", city.key)
				.find(".infectionCardImg")
				.attr("src", `images/cards/infectionCard_${city.color}${diseaseIsEradicated(city.color) ? "_eradicated" : ""}.png`)
				.siblings(".cityName")
				.html(city.name.toUpperCase())
				.siblings(".veil").remove();
		}
	}

	return numCardsDrawnThisTurn;
}

async function finishInfectionStep()
{
	log("finishInfectionStep()");
	log("nextStep: ", data.nextStep);
	const $container = getInfectionContainer();
	
	if (currentStepIs("infect cities"))
		enableEventCards();
	
	await buttonClickPromise($container.find(".btnContinue").html("CONTINUE"),
	{
		beforeClick: "show",
		afterClick: "hide"
	});
	disableEventCards();

	let $cards = $container.find(".infectionCard");
	while ($cards.length)
	{
		await discardInfectionCard($cards.first());
		$cards = $container.find(".infectionCard");
	}
	
	$container.fadeOut(450);
	$("#indicatorContainer").fadeOut(500, function()
	{
		$("#indicatorContainer").removeAttr("style").addClass("hidden");
		$container.removeAttr("style").addClass("hidden");
		if (currentStepIs("initial infections"))
		{
			unhide($("#turnProcedureContainer"));
			proceed();
		}
		else
			nextTurn();
	});
}

function getInfectionContainer()
{
	let containerID;

	if (eventTypeIsBeingPrompted(eventTypes.forecastPlacement))
		containerID = "forecastCards";
	else if (currentStepIs("initial infections"))
		containerID = "initialInfectionsContainer";
	else if (currentStepIs("infect cities"))
		containerID = "infectCitiesContainer";
	else if (currentStepIs("epIncrease")
		|| currentStepIs("epInfect")
		|| currentStepIs("epIntensify"))
		containerID = "epidemicContainer";
	
	return $("#" + containerID);
}

function getCityNameStyle()
{
	return {
		"top": getDimension("infDiscardNameTop") + "px",
		"font-size": getDimension("infDiscardFont") + "px"
	};
}

function discardInfectionCard($card, duration)
{
	const $discardPile = $("#infectionDiscard"),
		$discardTitle = $discardPile.children(".title").first();

	return new Promise(resolve =>
	{
		$card.css(
				{
					"z-index": 10,
					"position": "absolute",
					"width": $discardPile.width() + "px"
				})
			.children()
			.css("width", "100%");
		
		$card.animate(
				{
					left: $discardPile.offset().left,
					top: $discardTitle.offset().top + $discardTitle.height()
				},
				duration || 125,
				function()
				{
					$card.insertAfter($discardTitle)
						.removeAttr("style")
						.children(".infectionCardContents")
						.removeAttr("style")
						.children(".cityName")
						.css(getCityNameStyle());
						
					$card.height(getDimension("infDiscardHeight"));

					resolve();
				});
	});
}

function positionInfectionPanelComponents()
{
	const $container = getInfectionContainer(),
		$cards = $container.find(".infectionCard"),
		$veils = $container.find(".veil"),
		cardHeight = getDimension("infCardHeight"),
		cardNameTop = getDimension("infCardNameTop"),
		cardFontSize = getDimension("infCardFont");
	
	if (currentStepIs("initial infections"))
	{
		$container.removeClass("hidden");
		
		$(".groupInfRate.hidden").css("margin-left", -data.panelWidth);
		makeElementsSquare(".groupInfRate > div");
		$(".groupInfRate").not(".hidden")
			.each(function()
			{
				$(this).css("margin-left", computeGroupInfRateMargin($(this)));
			});
		
		// determine and evenly distribute the available height for .infGroup elements
		const $infGroups = $(".infGroup"),
			availableHeight = data.boardHeight - $("#indicatorContainer").height() - $("#btnContinue").height();
			
		$infGroups.height(availableHeight / $infGroups.length - getDimension("infGroupAdj"));
	}
	
	$cards.height(cardHeight);
	$cards.find(".cityName")
		.css(
		{
			"font-size": cardFontSize + "px",
			"top": cardNameTop + "px"
		});

	const veilLeft = getDimension("diseaseIcon");
	$veils.height(cardHeight)
		.css("left", veilLeft);
}

async function initialInfectionStep()
{
	prepareInitialInfections();
	await dealInitialInfectionCards();
	finishInfectionStep();
}

function prepareInitialInfections()
{
	const $initialInfContainer = $("#initialInfectionsContainer"),
		$btn = $initialInfContainer.find(".btnContinue"),
		NUM_GROUPS = 3,
		GROUP_SIZE = 3;
	
	let $infGroup = $initialInfContainer.children(".infGroup").first();
	for (let i = 0; i < NUM_GROUPS; i++)
	{
		for (let j = 0; j < GROUP_SIZE; j++)
			$infGroup.append(newInfectionCardTemplate());
		
		$infGroup = $infGroup.next(".infGroup");
	}
	
	$btn.html("SKIP").off("click").click(function()
	{
		data.fastForwarding = true;
		$btn.off("click").html("...");
	}).fadeIn(function() { $btn.removeClass("hidden") });
	
	positionInfectionPanelComponents();
}

function dealInitialInfectionCards()
{
	return new Promise(async (resolve) =>
	{
		// Filter initial infections and assign them indices
		const infections = data.events
						.filter(e => e.code === eventTypes.initialInfection.code)
						.map((e, i) => { return { ...e, index: i } }),
			GROUP_SIZE = 3; // 3 groups of 3 infection cards
		let group;
		
		while (infections.length)
		{
			await showNextGroupInfRate();
			
			group = infections.splice(0, GROUP_SIZE);
			await dealFaceDownInfGroup(group);
			
			for (let card of group)
			{
				await revealInfectionCard(card);
				await placeDiseaseCubes(card);
			}
		}
	
		data.fastForwarding = false;
		executePendingClusters();
		resolve();
	});
}

function computeGroupInfRateMargin($groupInfRate)
{
	return (data.panelWidth - getDimension("groupInfRateCubeWidth") * $groupInfRate.children().length) / 2;
}

function showNextGroupInfRate()
{
	return new Promise((resolve) => {
		const $groupInfRate = $(".groupInfRate.hidden").first();
		
		$groupInfRate.removeClass("hidden");
		makeElementsSquare($groupInfRate.children());

		$groupInfRate.animate(
		{
			marginLeft: computeGroupInfRateMargin($groupInfRate)
		},
		getDuration("longInterval"),
		data.easings.revealCard,
		() => resolve());
	});
}

async function dealFaceDownInfGroup(group)
{
	for (let card of group)
	{
		dealFaceDownInfCard(card.index);
		await sleep(getDuration("dealCard") * 0.65);
	}
	return sleep(getDuration("dealCard") * 0.35);
}

function dealFaceDownInfCard(elementIndex)
{
	return new Promise(resolve =>
	{
		const $container = getInfectionContainer().find(".infectionCard").eq(elementIndex)
			.children(".infectionCardContents").first();
		
		const containerTop = $container.offset().top,
			$cardback = $(`<img class='drawnInfectionCard'
								src='images/cards/infectionCardback.png'
								alt='Infection Card' />`);
		
		$cardback.appendTo("body");

		// align the drawn card with the deck, and animate it to where it will be revealed
		$cardback
			.width($("#imgInfectionDeck").width())
			.offset(
			{
				left: data.infectionDeckOffset.left,
				top: data.infectionDeckOffset.top
			})
			.attr("z-index", "1")
			.animate(
			{
				width: getDimension("diseaseIcon"),
				left: data.boardWidth + 1,
				top: containerTop
			},
			getDuration("dealCard"),
			data.easings.dealCard,
			resolve());
	});
}

async function revealInfectionCard({ cityKey, index, preventionCode }, { forecasting } = {})
{
	await sleep(getDuration("mediumInterval"));

	return new Promise(resolve =>
	{
		const $card = getInfectionContainer().find(".infectionCard").eq(index),
			{name, color} = getCity(cityKey),
			$veil = $card.find(".veil"),
			duration = getDuration("revealInfCard"),
			$cardback = forecasting ? $(".drawnInfectionCard").eq(index) : $(".drawnInfectionCard").first();
		
		// The first $cardback is removed if not forecasting because each one is removed after fading out.
		$cardback.fadeOut(duration, function() { $(this).remove() });
		
		$card.attr("data-key", cityKey)
			.find(".infectionCardImg")
			.attr("src", `images/cards/infectionCard_${color}${diseaseIsEradicated(color) ? "_eradicated" : ""}.png`)
			.siblings(".cityName")
			.html(name.toUpperCase());
		
		$veil.animate({ left: "+=" + getDimension("diseaseIcon", { compliment: true }) },
			duration,
			data.easings.revealCard,
			() =>
			{
				$veil.remove();

				if (!data.fastForwarding && !forecasting)
					pinpointCity(cityKey, getPinpointColor(preventionCode));
				
				resolve();
			});
	});
}

async function placeDiseaseCubes({cityKey, numCubes = 1}, { noPostDelay } = {})
{
	const city = getCity(cityKey),
		cubeSupplyOffset = $(`.cubeSupply .diseaseCube.${city.color}`).offset(),
		shortInterval = getDuration("shortInterval");
	
	await sleep(shortInterval);
	
	for (let i = numCubes; i > 0; i--)
	{
		updateCubeSupplyCount(city.color, -1);
		
		placeDiseaseCube(city, cubeSupplyOffset);
		await sleep(getDuration("cubeAnimation") * 0.45);
	}
	
	// let the last cube animation finish completely before clustering the city
	await sleep(getDuration("cubeAnimation") * 0.6);
	
	if (data.fastForwarding)
		queueCluster(cityKey);
	else
		city.cluster();

	if (noPostDelay)
		return sleep(0);
	
	return sleep(shortInterval);
}

function getAnimatedCubeWidth()
{
	return getDimension("cubeWidth") + (getBorderWidth("#boardContainer .diseaseCube") * 2);
}
function placeDiseaseCube(city, cubeSupplyOffset)
{
	return new Promise((resolve) =>
	{
		// add a disease cube to the board, and determine the eventual cube width
		const $newCube = addCube(city.color, city.key, {prepareAnimation: true}),
			cityOffset = city.getOffset("cube"),
			resultingWidth = getAnimatedCubeWidth();
		// For some reason the amimated width subtracts the border widths (despite the elements using box-sizing: border-box).
		// We cannot simply use getDimension as we do in any other case without issue.
		// Adding the border widths fixes this issue, which exists only here.
		
		// animate the cube from the cube supply to the city
		$newCube.offset(cubeSupplyOffset)
			.animate(
			{
				top: cityOffset.top,
				left: cityOffset.left,
				width: resultingWidth,
				height: resultingWidth
			},
			getDuration("cubeAnimation"),
			resolve());
	});
}

function newCityButton(cityKey)
{
	return $(`<div class='button actionPromptOption' data-key='${cityKey}'>
				${getCity(cityKey).name}
			</div>`);
}

function newPlayerCardElement(cardKey)
{
	let city,
		cardType,
		cardName;
	
	if (isEventCardKey(cardKey))
	{
		cardType = "event";
		cardName = data.eventCards[cardKey];
	}
	else if (isEpidemicKey(cardKey))
	{
		cardType = "epidemic";
		cardName = "EPIDEMIC";
	}
	else
	{
		city = getCity(cardKey);
		cardType = city.color;
		cardName = city.name;
	}

	return $(`<div class='playerCard ${cardType}' data-key='${cardKey}'>${cardName}</div>`);
}

function newCureMarker(diseaseColor, diseaseStatus, { isForReveal, isForMedicAutoTreat } = {})
{
	if (!["y", "r", "u", "b"].includes(diseaseColor))
	{
		console.error(`disease color does not exist: '${diseaseColor}'`);
		return false;
	}

	let fileName = `cureMarker_${diseaseColor}`;

	if (diseaseStatus === "eradicated")
		fileName += `_${diseaseStatus}`;
	
	let idAttr = "", className;
	if (isForReveal)
		className = "specialEventImg";
	else if (isForMedicAutoTreat)
		className = "autoTreatCureMarker";
	else
	{
		idAttr = `id='cureMarker${diseaseColor.toUpperCase()}'`;
		className = "cureMarker";
	}

	const $cureMarker = $(`<img	src='images/pieces/${fileName}.png'
								${idAttr}
								class='${className}' />`);

	if (isForMedicAutoTreat)
		$cureMarker.css({ opacity: 0, zIndex: 5 });

	$cureMarker.appendTo("#boardContainer");

	return $cureMarker;
}

async function discoverCure(cardKeys)
{
	resetActionPrompt({ doNotResumeStep: true });
	disableActions();
	
	const player = getActivePlayer(),
		diseaseColor = getDiseaseColor(cardKeys[0]),
		{ discoverCure, eradication, autoTreatDisease } = eventTypes,
		{ 0: events } = await Promise.all([
			requestAction(discoverCure,
			{
				cityKey: player.cityKey,
				diseaseColor: diseaseColor,
				cardKeys: cardKeys
			}),
			movePlayerCardsToDiscards({ player, cardKeys })
		]),
		autoTreatEvents = events.filter(e => e.isOfType(autoTreatDisease)),
		eradicationEvents = events.filter(e => e.isOfType(eradication));

	player.removeCardsFromHand(cardKeys);

	// If there was an eradication event, there are 2 possible causes:
	// 1. There were 0 cubes of the disease color on the board when the cure was discovered.
	//		(the eradication was triggered solely by the cure being discovered)
	// 2. The only remaining cubes of the disease color on the board were removed by an auto-treat disease event.
	//		(the eradication was triggered by the auto-treat event which was triggered by discovering the cure)
	// Therefore if there are no auto-treat events, the cause is number 1.
	let newDiseaseStatus = "cured";
	if (!autoTreatEvents.length && eradicationEvents.length)
		newDiseaseStatus = "eradicated";
	
	data.cures[diseaseColor] = newDiseaseStatus;
	data.cures.remaining--;
	
	await animateDiscoverCure(diseaseColor, newDiseaseStatus);

	// The auto-treat event (if there is one) would have been the cause of eradication (if eradication occured),
	// so we pass both here.
	if (autoTreatEvents.length)
		await animateAutoTreatDiseaseEvents([ ...autoTreatEvents, ...eradicationEvents ]);

	proceed();
}

async function animateDiscoverCure(diseaseColor, diseaseStatus)
{
	const $cureMarker = newCureMarker(diseaseColor, diseaseStatus, { isForReveal: true });

	$cureMarker.css("opacity", 0.1)
		.animate({ opacity: 1 }, getDuration("specialEventBannerReveal") * 8, "easeOutQuad");

	await specialEventAlert(
	{
		title: "DISCOVERED CURE!",
		description: `Discover ${data.cures.remaining} more to win the game`,
		eventClass: diseaseColor
	});

	if (diseaseStatus === "eradicated")
	{
		await specialEventAlert(
			{
				title: "DISEASE ERADICATED!",
				description: `No new disease cubes of this color will be placed on the board`,
				eventClass: diseaseColor
			});
	}

	await animatePromise(
	{
		$elements: $cureMarker,
		initialProperties: {
			...$cureMarker.offset(),
			...{ width: $cureMarker.width() }
		},
		desiredProperties: getCureMarkerDesiredProperties(diseaseColor),
		duration: getDuration("cureMarkerAnimation"),
		easing: data.easings.cureMarkerAnimation
	});

	$cureMarker.removeClass("specialEventImg").removeAttr("style")
		.addClass("cureMarker")
		.attr("id", `cureMarker${diseaseColor.toUpperCase()}`);
	
	positionCureMarkers();
	
	return sleep(1500);
}

function getCureMarkerDesiredProperties(diseaseColor)
{
	const $exampleMarker = newCureMarker(diseaseColor);

	positionCureMarkers();
		
	const desiredProperties = $exampleMarker.offset();

	desiredProperties.width = $exampleMarker.width();

	$exampleMarker.remove();

	return desiredProperties;
}

function loadPlayerCards(playerCards)
{
	log("loadPlayerCards()");
	const $discardPileTitle = $("#playerDiscard .title").first();
	let player,
		$card;

	for (let card of playerCards)
	{
		$card = newPlayerCardElement(card.key);

		if (card.pileID in data.players)
		{
			player = data.players[card.pileID];
			player.cardKeys.push(card.key);
			player.getPanel().append($card);
		}
		else
			$card.insertAfter($discardPileTitle);
	}
	
	bindPlayerCardEvents();
}

function getEradicationBlockedDiscardKeys()
{
	const { events } = data,
		{ eradication, epidemicIntensify, infectCity } = eventTypes,
		eradicationEvents = events.filter(e => e.code == eradication.code),
		eradicatedColors = {},
		blockedDiscardKeys = [];

	for (let er of eradicationEvents)
		eradicatedColors[er.diseaseColor] = { id: er.id };

	let event, lastEpidemicIdx = 0;
	for (let i = events.length - 1; i >= 0; i--)
	{
		event = events[i];
		if (event.code === epidemicIntensify.code)
		{
			lastEpidemicIdx = i;
			break;
		}
	}
	
	const relevantInfectionEvents = events.slice(lastEpidemicIdx + 1)
		.filter(e => (e.code == infectCity.code)
				&& (getCity(e.cityKey).color in eradicatedColors));

	for (let inf of relevantInfectionEvents)
	{
		if (inf.id > eradicatedColors[getCity(inf.cityKey).color].id)
			blockedDiscardKeys.push(inf.cityKey);
	}
	
	return blockedDiscardKeys;
}

function loadInfectionDiscards(cards)
{
	if (typeof cards == "undefined")
		return false;
	
	const eradicationBlockedDiscardKeys = getEradicationBlockedDiscardKeys(),
		$discardPile = $("#infectionDiscard"),
		$discardPileTitle = $discardPile.children(".title").first(),
		$removedCardsContainer = $discardPile.children("#removedInfectionCards"),
		infectionKeysDrawnThisTurn = getInfectCityEventsOfTurn().map(event => event.cityKey);
	
	let card, city, wasEradicated, $card;
	for (let i = 0; i < cards.length; i++)
	{
		card = cards[i];
		city = getCity(card.key);

		if (infectionKeysDrawnThisTurn.includes(city.key))
			continue;

		// If the disease was eradicated before the card was drawn, include the eradication symbol on the card.
		wasEradicated = card.pile === "discard"
						&& eradicationBlockedDiscardKeys.includes(city.key) ? "_eradicated" : "";
				
		$card = $(`<div class='infectionCard' data-key='${city.key}'>
					<div class='infectionCardContents'>
						<img	class='infectionCardImg'
								src='images/cards/infectionCard_${city.color}${wasEradicated}.png'/>
						<p class='cityName'>${city.name.toUpperCase()}</p>
					</div>
				</div>`);
		
		if (card.pile === "discard")
			$discardPileTitle.after($card);
		else if (card.pile === "removed")
			$removedCardsContainer.append($card);
	}

	if ($removedCardsContainer.children(".infectionCard").length)
		$removedCardsContainer.removeClass("hidden");
}

$("#imgInfectionDeck").click(function()
{
	const city = getCity("atla");
	
	$("#removedInfectionCards").append(`<div class='infectionCard'>
							<div class='infectionCardContents'>
								<img	class='infectionCardImg'
										src='images/cards/infectionCard_${city.color}.png'/>
								<p class='cityName'>${city.name.toUpperCase()}</p>
							</div>
						</div>`);
	
	resizeTopPanelElements();
});

// Returns the number of unresolved epidemics that were drawn this turn.
function numEpidemicsToResolve()
{
	// The one and only cardDraw event of the turn will tell us how many epidemics were drawn.
	// The presence of each epidemicIntensify event indicates that an epidemic was fully resolved.
	const { cardDraw, epidemicIntensify } = eventTypes,
		cardDrawEvent = getEventsOfTurn(cardDraw);

	if (!cardDrawEvent)
		return 0;

	const numEpsDrawnThisTurn = cardDrawEvent[0].cardKeys
			.filter(key => isEpidemicKey(key)).length,
		numEpsResolvedThisTurn =  getEventsOfTurn(epidemicIntensify).length;

	return numEpsDrawnThisTurn - numEpsResolvedThisTurn;
}

function getNumActionsRemaining()
{
	// Passing forfeits the remaining actions for that turn.
	if (getEventsOfTurn(eventTypes.pass).length > 0)
		return 0;
	
	const NUM_ACTIONS_PER_TURN = 4,
		{
			driveFerry,
			directFlight,
			charterFlight,
			shuttleFlight,
			buildResearchStation,
			treatDisease,
			shareKnowledge,
			discoverCure,
			operationsFlight,
			dispatchPawn,
			planContingency
		} = eventTypes,
		actionEventTypes = [
			driveFerry,
			directFlight,
			charterFlight,
			shuttleFlight,
			buildResearchStation,
			treatDisease,
			shareKnowledge,
			discoverCure,
			operationsFlight,
			dispatchPawn,
			planContingency
		];
	
	return NUM_ACTIONS_PER_TURN - getEventsOfTurn(actionEventTypes).length;
}

// Returns the recorded events of the desiredEventTypes from the current turn.
// Accepts an array of desiredEventTypes, or a single event type.
function getEventsOfTurn(desiredEventTypes)
{
	const eventsOfTurn = [];

	desiredEventTypes = ensureIsArray(desiredEventTypes);
	
	for (let i = data.events.length - 1; i >= 0; i--)
	{
		event = data.events[i];
		
		// Skip events queued for next turn.
		if (event.turnNum > data.turnNum)
			continue;

		if (event.turnNum < data.turnNum)
			break;
		
		if (desiredEventTypes)
		{
			for (let type of desiredEventTypes)
				if (event.isOfType(type))
					eventsOfTurn.push(event);
		}
		else
			eventsOfTurn.push(event);
	}

	return eventsOfTurn;
}

function loadGamestate(gamestate)
{
	if (gamestate.gameIsResuming)
		setCurrentStep(gamestate.stepName);
	else // beginning a new game
	{
		setCurrentStep("initial infections"); // TODO: change to "setup"?
		data.nextStep = "action 1";

		// TODO: show setup procedure instead
		$("#turnProcedureContainer").addClass("hidden");

		getCity("atla").buildResearchStation(); // TODO: make this an explicit setup step
	}

	delete gamestate.gameIsResuming;
	delete gamestate.stepName;
	Object.assign(data, gamestate);
}

function loadDiseaseStatuses(diseaseStatuses)
{
	if (!diseaseStatuses)
		return;
	
	let status;
	for (let diseaseColor in diseaseStatuses)
	{
		status = diseaseStatuses[diseaseColor];
		
		if (status !== "rampant")
		{
			data.cures[diseaseColor] = status;
			data.cures.remaining--;

			newCureMarker(diseaseColor, status);
		}
	}

	positionCureMarkers();
}

async function setup()
{
	const {
		0: {
			gamestate,
			cities,
			players,
			infectionDiscards,
			diseaseStatuses
		},
		1: playerCards,
		2: eventHistory
	} = await Promise.all([retrieveGameData(), retrievePlayerCards(), retrieveEventHistory()])
		.catch(function(err)
		{
			console.error(err);
			$("#curtain").children("p").first().html("An error occured: " + err);
		});

	await parseEvents(eventHistory);
	loadGamestate(gamestate);
	loadCityStates(cities);
	instantiatePlayers(players);
	loadDiseaseStatuses(diseaseStatuses);
	loadInfectionDiscards(infectionDiscards);
	loadPlayerCards(playerCards);

	getActivePlayer().getLocation().setPawnIndices();
	await resizeAll();

	// Delay clustering to ensure cluster accuracy.
	await sleep(100);
	executePendingClusters();

	if (isOneQuietNight())
		indicateOneQuietNightStep();

	await removeCurtain();
	
	if (forecastInProgress())
	{
		data.currentStep.indicate();
		indicatePromptingEventCard();
	}
	else	
		proceed();
}

function removeCurtain()
{
	return new Promise((resolve) => {
		sleep(75)
		.then(() => {
			const curtain = $("#curtain");
			curtain.fadeOut(function()
			{
				curtain.remove();
				resolve();
			});
		});
	});
}

function expandInfectionDiscardPile()
{
	return new Promise(resolve =>
		{
			const $container = $("#infectionDiscard"),
				panelHeight = $("#topPanel").height(),
				maxHeight = data.boardHeight;

			$container.stop().css("height", "auto");
			positionRemovedInfectionCards();

			const expandedHeight = $container.height();
		
			if (expandedHeight < panelHeight)
			{
				$container.removeAttr("style")
					.css({
						"height": panelHeight,
						"overflow-y": "hidden"
					});
				resolve();
			}
			else
			{
				if (expandedHeight > maxHeight)
				{
					expandedHeight = maxHeight;
					$container.css("overflow-y", "scroll");
				}
				
				$container.css("height", panelHeight)
					.animate({ height: expandedHeight + 2 },
						getDuration("discardPileExpand"),
						function() { resolve(); });
			}
		});
}
function collapsenfectionDiscardPile()
{
	return new Promise(resolve =>
		{
			positionRemovedInfectionCards();
			
			$("#infectionDiscard")
				.stop()
				.css("overflow-y", "hidden")
				.animate({
					scrollTop: 0,
					height: $("#topPanel").height()
				},
				getDuration("discardPileCollapse"),
				function() { resolve(); });
		});
}

function bindInfectionDiscardHover({ unbind } = {})
{
	const $container = $("#infectionDiscard");

	$container.unbind("mouseenter mouseleave");
	
	if (!unbind)
	{
		$container.hover(function()
		{
			expandInfectionDiscardPile();
		},
		function()
		{
			collapsenfectionDiscardPile();
		});
	}
}
bindInfectionDiscardHover();

$("#playerDiscard").hover(function()
{
	const $this = $(this),
		panelHeight = data.topPanelHeight,
		maxHeight = data.boardHeight - panelHeight;
	
	$this.stop().css("height", "auto");
	let expandedHeight = $this.height();

	if (expandedHeight < panelHeight)
	{
		$this.css("overflow-y", "hidden");
		$this.css("height", panelHeight);
	}
	else
	{
		if (expandedHeight > maxHeight)
		{
			$this.css("overflow-y", "scroll");
			expandedHeight = maxHeight;
		}
		
		$this.css(
			{
				"height": panelHeight
			})
			.animate(
				{
					height: expandedHeight,
					top: data.boardHeight - expandedHeight
				},
				getDuration("discardPileExpand"));
	}
		
},
function()
{
	$(this).stop()
		.css("overflow-y", "hidden")
		.animate(
		{
			scrollTop: 0,
			height: data.topPanelHeight,
			top: data.boardHeight - data.topPanelHeight
		},
		getDuration("discardPileCollapse"));
});

function bindDiseaseCubeEvents({ on } = { on: true })
{
	let $cubes = $("#boardContainer > .diseaseCube");

	$cubes.unbind("click mouseenter mouseleave");

	if (on)
	{
		const player = getActivePlayer();

		$cubes = $cubes.filter(`.${player.cityKey}`);

		$cubes.hover(function()
			{
				let $cubesToMark;

				if (player.role === "Medic")
					$cubesToMark = $cubes;
				else
					$cubesToMark = $(this);
				
				$cubesToMark.html("<p>X</p>")
					.children("p").css(
					{
						"font-size": data.cubeWidth * 1.7,
						"margin-top": -(data.cubeWidth * 0.4)
					});
			},
			function()
			{
				$cubes.html("");
			})
			.click(function()
			{
				bindDiseaseCubeEvents({ on: false });
				if (player.role === "Medic")
					treatDisease($cubes);
				else
					treatDisease($(this));
			});
	}
}

setup();
});