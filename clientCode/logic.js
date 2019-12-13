"use strict";
$(function(){
const data =
{
	sizeRatios:
	{
		piecePlacementThreshold:["boardWidth", 0.023],
		playerCardWidth:		["panelWidth", 0.98],
		cubeSupplyMarginTop:	["topPanelHeight", 0.087],
		bottomPanelDivs:		["boardHeight",	0.222],
		cureMarkerMarginTop:	["boardHeight",	0.931],
		cityWidth:				["boardWidth",	0.012],
		autoTreatCircleWidth:	["boardWidth", 0.036],
		cubeWidth:				["boardWidth", 0.016],
		infGroupAdj:			["boardHeight", 0.025],
		groupInfRateCubeWidth:	["panelWidth", 0.117],
		infCardDiv:				["boardHeight",	0.047],
		diseaseIcon:			["panelWidth",	0.1048],
		discardDiseaseIcon:		["boardWidth",	0.023],
		infCardHeight:			["panelWidth", 0.105],
		infCardFont:			["panelWidth",	0.063],
		infCardNameTop:			["panelWidth", 0.0205],
		infDiscardHeight:		["boardWidth", 0.0192],
		infDiscardFont:			["boardWidth",	0.0136],
		infDiscardNameTop:		["boardWidth", 0.0038],
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
		cubePlacement: 600,
		stationPlacement: 750,
		revealPlayerCard: 400,
		discardPlayerCard: 600,
		discardPileExpand: 400,
		discardPileCollapse: 200,
		moveMarker: 700,
		pawnAnimation: 250,
		pinpointCity: 300,
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
	HAND_LIMIT: 7,
	STARTING_HAND_CARD_HEIGHT: 24,
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
	diseaseCubeSupplies: {
		y: 24,
		r: 24,
		u: 24,
		b: 24
	},
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
		iconFileName: "driveFerry",
		hasIcon: true,
		code: "dr",
		rules: ["Move to a city connected by a white line to the one you are in."],
		instructions: "Select a Destination:",
		actionPathName: "movementAction",
		propertyNames: ["originKey", "destinationKey"]
	},
	directFlight: {
		name: "Direct Flight",
		hasIcon: true,
		code: "df",
		rules: ["Discard a city card to move to the city named on the card."],
		instructions: "Select a Card:",
		dispatchInstructions: `To dispatch a pawn via Direct Flight,
discard the city card that matches the destination city.
The card must come from the Dispatcher&#39;s hand.`,
		actionPathName: "movementAction",
		propertyNames: ["originKey", "destinationKey"]
	},
	charterFlight: {
		name: "Charter Flight",
		hasIcon: true,
		code: "cf",
		rules: ["Discard the city card that <i>matches</i> the city you are in to move to <i>any</i> city."],
		instructions: "To select a destination, drag and drop your pawn onto a city.",
		dispatchInstructions: `To dispatch a pawn via Charter Flight,
discard the city card that matches the pawn&#39;s current location.
The card must come from the Dispatcher&#39;s hand.`,
		actionPathName: "movementAction",
		propertyNames: ["originKey", "destinationKey"]
	},
	chooseFlightType: {
		name: "Choose Flight Type",
		code: "ft"
	},
	shuttleFlight: {
		name: "Shuttle Flight",
		hasIcon: true,
		code: "sf",
		rules: ["Move from a city with a research station to any other city that has a research station."],
		instructions: "Select a Destination:",
		actionPathName: "movementAction",
		propertyNames: ["originKey", "destinationKey"]
	},
	buildResearchStation: {
		name: "Build Research Station",
		hasIcon: true,
		code: "rs",
		rules: [
			"Discard the city card that matches the city you are in to place a research station there.",
			"If the research station supply is empty, take a research station from anywhere on the board."
		],
		instructions: "",
		actionPathName: "buildResearchStation",
		propertyNames: ["originKey", "destinationKey"],
		relatedRoleName: "Operations Expert",
		relatedRoleRule: "The Operations Expert can do this action without discarding."
	},
	shareKnowledge: {
		name: "Share Knowledge",
		hasIcon: true,
		code: "sk",
		rules: [
			"You can do this action in two ways:",
			"<i>give</i> the city card that matches the city you are in to another player, or",
			"<i>take</i> the city card that matches the city you are in from another player.",
			"The other player must also be in the city with you."
		],
		actionPathName: "shareKnowledge",
		propertyNames: ["cardKey", "giverRoleID", "recipientRoleID"],
		relatedRoleName: "Researcher",
		relatedRoleRule: "The Researcher may <i>give</i> a City card without needing to be in the city that matches the card."
	},
	treatDisease: {
		name: "Treat Disease",
		hasIcon: true,
		code: "td",
		rules: [
			"Remove 1 disease cube from the city you are in, placing it in the cube supply next to the board.",
			"If the disease has been cured, remove all cubes of that color from the city you are in."
		],
		instructions: "Select a Disease Color:",
		actionPathName: "treatDisease",
		propertyNames: ["cityKey", "diseaseColor", "prevCubeCount", "newCubeCount"],
		relatedRoleName: "Medic",
		relatedRoleRule: "The Medic removes all cubes of one color when doing this action."
	},
	autoTreatDisease: {
		name: "Auto-Treat Disease",
		code: "at",
		propertyNames: ["cityKey", "diseaseColor"]
	},
	discoverACure: {
		name: "Discover A Cure",
		hasIcon: true,
		code: "dc",
		rules: [
			`At any research station, discard 5 city cards of the same color from your hand to cure the disease of that color.`,
			`If no cubes of this color are on the board, the disease becomes eradicated.`
		],
		actionPathName: "discoverCure",
		propertyNames: ["cardKeys"],
		relatedRoleName: "Scientist",
		relatedRoleRule: "The Scientist needs only 4 cards of the same color to do this action."
	},
	eradication: {
		name: "eradication",
		code: "er",
		propertyNames: ["diseaseColor"]
	},
	planContingency: {
		name: "Plan Contingency",
		hasIcon: true,
		code: "pc",
		capableRoleName: "Contingency Planner",
		propertyNames: ["cardKey"],
		rules: [
			"The Contingency Planner may, as an action, take <i>any</i> Event card from the Player Discard Pile and <i>store</i> it.",
			"Only 1 Event card can be stored at a time. It does not count against his hand limit.",
			"When the stored Event card is played, <i>remove it</i> from the game."
		],
		instructions: "Select an Event card to store:",
		actionPathName: "planContingency"
	},
	dispatchPawn: {
		name: "Dispatch Pawn",
		hasIcon: true,
		code: "dp",
		capableRoleName: "Dispatcher",
		rules: [
			"The Dispatcher may, as an action, either:",
			"<li>move any pawn to any city containing another pawn, or</li>",
			"<li>move another player's pawn as if it were his own.</li>"
		],
		instructions: "To dispatch a pawn, drag and drop it onto a city.",
		actionPathName: "movementAction",
		propertyNames: ["roleToDispatch", "originKey", "destinationKey", "movementType"]
	},
	rendezvous: {
		name: "Rendezvous",
		code: "rv",
		actionPathName: "movementAction"
	},
	operationsFlight: {
		name: "Operations Flight",
		hasIcon: true,
		code: "of",
		capableRoleName: "Operations Expert",
		rules: ["Once per turn, as an action, the Operations Expert may move from a research station to any city by discarding any city card."],
		instructions: "To select a destination, drag and drop your pawn onto a city.",
		actionPathName: "movementAction",
		propertyNames: ["originKey", "destinationKey", "cardKey"]
	},
	pass: {
		name: "Pass Actions",
		code: "pa",
		propertyNames: [],
		rules: [`Forfeit your remaining actions and proceed to the "Draw 2 cards" step.`],
		instructions: "Pass on your remaining actions for this turn?",
		actionPathName: "passActions",
		propertyNames: []
	},
	cardDraw: {
		name: "Card Draw",
		code: "cd",
		actionPathName: "drawPlayerCards",
		propertyNames: ["cardKeys"]
	},
	epidemicIncrease: {
		name: "Epidemic Increase",
		code: "ec",
		actionPathName: "epidemicIncrease",
		propertyNames: ["epidemicCount"]
	},
	epidemicInfect: {
		name: "Epidemic Infect",
		code: "ef",
		actionPathName: "epidemicInfect",
		propertyNames: ["bottomInfCardKey", "prevCubeCount", "preventionCode"]
	},
	epidemicIntensify: {
		name: "Epidemic Intensify",
		code: "et",
		actionPathName: "epidemicIntensify",
		propertyNames: ["numDiscardsShuffled"]
	},
	discard: {
		name: "Discard",
		code: "ds",
		actionPathName: "discardPlayerCards",
		propertyNames: ["cardKeys"]
	},
	infectCity: {
		name: "Infect City",
		code: "ic",
		actionPathName: "infectCity",
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
		hasIcon: true,
		code: "rp",
		cardKey: "resi",
		rules: [
			"Play at any time. Not an action.",
			"Remove any 1 card in the Infection Discard Pile from the game.",
			"You may play this between the Infect and Intensify steps of an epidemic."
		],
		instructions: "Select a card from INFECTION DISCARDS to remove from the game.",
		propertyNames: ["removedCardKey"],
		actionPathName: "resilientPopulation"
	},
	oneQuietNight: {
		name: "One Quiet Night",
		hasIcon: true,
		code: "oq",
		cardKey: "oneq",
		rules: [
			"Play at any time. Not an action.",
			"Skip the next Infect Cities step (do not flip over any Infection cards)."
		],
		actionPathName: "oneQuietNight"
	},
	skipInfectionStep: { // this is here as a simple way to use the actionPathName in the requestAction function.
		code: "",
		actionPathName: "skipInfectionStep"
	},
	forecast: {
		name: "Forecast",
		hasIcon: true,
		code: "fd",
		cardKey: "fore",
		rules: [
			"Play at any time. Not an action.",
			"Draw, look at, and rearrange the top 6 cards of the Infection Deck.",
			"Put them back on top."
		],
		propertyNames: ["cardKeys"],
		actionPathName: "forecastDraw"
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
		actionPathName: "forecastPlacement"
	},
	airlift: {
		name: "Airlift",
		hasIcon: true,
		code: "ar",
		cardKey: "airl",
		rules: ["Play at any time. Not an action.", "Move any 1 pawn to any city."],
		instructions: "To airlift a pawn, drag and drop it onto the destination city.",
		propertyNames: ["roleToAirlift", "originKey", "destinationKey"],
		actionPathName: "airlift"
	},
	governmentGrant: {
		name: "Government Grant",
		hasIcon: true,
		code: "gg",
		cardKey: "gove",
		rules: ["Play at any time. Not an action.", "Add 1 research station to any city."],
		instructions: "Drag and drop a research station from the research station supply onto the city of your choice.",
		propertyNames: ["cityKey", "relocationKey"],
		actionPathName: "buildResearchStation"
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
	dc: "discoverACure",
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
			appendEventHistoryIcons(parsedEvents);
			
			return resolve(parsedEvents);
		});
}

function appendEventHistoryIcons(newEvents)
{
	const $eventHistory = $("#eventHistory");
	
	data.events = [...data.events, ...newEvents];

	let eventType;
	for (let event of newEvents)
	{
		eventType = getEventType(event.code);
		
		if (!eventType.hasIcon)
			continue;
		
		$eventHistory.append(getEventIcon(eventType));
	}

	setEventHistoryScrollPosition($eventHistory);
}

function setEventHistoryScrollPosition($eventHistory)
{
	const overflow = getHorizontalOverflow($eventHistory);
	
	if (overflow <= 0)
		return false;
	
	$eventHistory.animate({ scrollLeft: overflow });
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

	indicate()
	{
		const $container = $("#indicatorContainer"),
			activePlayer = getActivePlayer();

		if (typeof this.setDescription === "function")
			this.setDescription();

		$container.children("#turnIndicator")
			.html(`${activePlayer.name}'s Turn`)
			.next() // role indicator
			.html(activePlayer.role)
			.attr("class", activePlayer.camelCaseRole)
			.click(function() { activePlayer.pinpointLocation() })
			.next() // step indicator
			.html(this.description);

		bindRoleCardHoverEvents();
		unhide($container);

		highlightTurnProcedureStep(this.name);
	}

	resume()
	{
		this.indicate();

		if (this.procedureIdx === -1)
			this.procedureIdx++;
		
		this.procedure[this.procedureIdx]();
	}
	
	proceed()
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

	next()
	{
		log("nextStep: ", data.nextStep);
		setCurrentStep(data.nextStep).proceed();
	}
}

// instantiate steps
(function()
{
	const steps = data.steps;

	let stepName = "setup";
	steps[stepName] = new Step(stepName, "Setup", [() => {}]);
	steps[stepName].indicate = function() { $("#indicatorContainer").addClass("hidden") }

	let actionsRemaining = 4;
	// "action 1" through to "action 4"
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
	
	$("#turnProcedureContainer").removeClass("hidden")
		.children()
		.removeClass("highlighted")
		.filter(`.${stepName}`).addClass("highlighted");
}

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
	return data.currentStep.name === stepName;
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

	$actionsContainer.find(".button")
		.off("click")
		.addClass("btnDisabled wait");

	disableEventCards();
	disablePawnEvents();
	unbindDiseaseCubeEvents();
	disableResearchStationDragging();
}

function enableAvailableActions()
{
	log("enableAvailableActions()");
	const $actionsContainer = $("#actionsContainer"),
		player = getActivePlayer();
	
	$actionsContainer.find(".button")
		.off("click mouseleave")
		.addClass("btnDisabled")
		.removeClass("wait");
	
	$actionsContainer.find(".actionCategory").removeClass("hidden");
	
	useRoleColorForRelatedActionButtons(player.role);

	unhide($actionsContainer);
	enableAvailableActionButtons(player);
	enableAvailableSpecialActionButtons($actionsContainer, player);
	
	enablePawnEvents();
	bindDiseaseCubeEvents();

	enableEventCards();
}

function useRoleColorForRelatedActionButtons(role)
{
	const {
			buildResearchStation,
			treatDisease,
			shareKnowledge,
			discoverACure
		} = eventTypes,
		actionsWithRelatedRoles = [
			buildResearchStation,
			treatDisease,
			shareKnowledge,
			discoverACure
		];
	
	let $actionButton;
	for (let action of actionsWithRelatedRoles)
	{
		$actionButton = $(`#btn${toPascalCase(action.name)}`);

		if (role === action.relatedRoleName)
			$actionButton.addClass(toCamelCase(role));
		else
			$actionButton.removeClass(toCamelCase(action.relatedRoleName));
	}
}

function enableEventCards({ resilientPopulationOnly } = {})
{
	log("enableEventCards()");
	
	let $eventCards = $("#playerPanelContainer").find(".playerCard.eventCard").off("click");

	if (resilientPopulationOnly)
	{
		$eventCards.addClass("unavailable");
		$eventCards = $eventCards.filter(`[data-key='${eventTypes.resilientPopulation.cardKey}']`);
	}
	
	$eventCards.removeClass("unavailable")
		.click(function(event)
		{
			event.stopPropagation();
			
			const eventType = getEventCardEventType($(this).data("key"));
			
			if (eventTypeIsBeingPrompted(eventType))
				return false;
			
			resetActionPrompt({ actionCancelled: data.promptingEventType });
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
	$("#playerPanelContainer").find(".playerCard.eventCard")
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

	let player,
		pawnsAreEnabled = false;
	for (let rID in data.players)
	{
		player = data.players[rID];

		if (airlifting
			|| (actionStep && (dispatcherIsActive || rID === activePlayer.rID)))
		{
			log(`enabled ${player.role}'s pawn`);
			player.enablePawn();
			pawnsAreEnabled = true;
		}
		else
		{
			log(`disabled ${player.role}'s pawn`);
			player.disablePawn();
		}
	}

	if (pawnsAreEnabled)
		setTravelPathArrowColor({ airlifting });
}

function newResearchStationElement(cityKey)
{
	const $rs = $(`<div class='researchStation' data-key='${cityKey}'>
					<img src='images/pieces/researchStation.png' alt='Research Station' />
				</div>`),
		$boardContainer = $("#boardContainer"),
		$window = $(window);

	$rs.appendTo($boardContainer)
		.draggable(
		{
			confinement: $boardContainer,
			disabled: true,
			drag: function()
			{
				setTravelPathArrowColor({ relocatingResearchStation: true });
				showTravelPathArrow({ $researchStation: $(this) });
			}
		})
		.mousedown(function()
		{
			const $this = $(this);

			if ($this.draggable("option", "disabled"))
				return false;

			turnOffResearchStationHighlights();
			$this.stop().css("z-index", data.dragPieceZindex);
			showPlaceholderStation($this);

			$window.off("mouseup").mouseup(function()
			{
				$window.off("mouseup");
				getGovernmentGrantTargetCity($this);
				hidePlaceholderStation($this);
				$this.css("z-index", 3);
			});
		});
	
	return $rs;
}

function showPlaceholderStation($originalStation)
{
	$("#placeholderStation")
		.removeAttr("style")
		.offset($originalStation.offset())
		.removeClass("hidden");
	
	$originalStation.css("opacity", 0.7);
}
function hidePlaceholderStation($originalStation)
{
	$originalStation.css("opacity", 1);
	$("#placeholderStation").addClass("hidden");
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
		$rs.draggable("enable").addClass("relocatable");
}

function disableResearchStationDragging()
{
	log("disableResearchStationDragging()");

	for (let $rs of getAllResearchStations())
		$rs.draggable({ disabled: true }).removeClass("relocatable");
}

function enableAvailableActionButtons(player)
{
	const {
			directFlight,
			charterFlight,
			shuttleFlight,
			buildResearchStation,
			treatDisease,
			shareKnowledge,
			discoverACure
		} = eventTypes,
		actions = [
			directFlight,
			charterFlight,
			shuttleFlight,
			buildResearchStation,
			treatDisease,
			shareKnowledge,
			discoverACure
		];

	// Some actions are always available
	enableActionButton("btnDriveFerry");
	enableActionButton("btnPass");

	let actionName;
	for (let action of actions)
	{
		actionName = toPascalCase(action.name);

		if (player[`can${actionName}`]())
			enableActionButton(`btn${actionName}`);
		else
			bindDisabledActionButtonEvents(`btn${actionName}`);
	}
}

function enableAvailableSpecialActionButtons($actionsContainer, player)
{
	const specialActions = [
			eventTypes.planContingency,
			eventTypes.dispatchPawn,
			eventTypes.operationsFlight
		],
		$specialActionCategory = $actionsContainer.find("#specialActionCategory");

	let actionName;
	for (let special of specialActions)
	{
		actionName = toPascalCase(special.name);

		if (player.role !== special.capableRoleName)
		{
			$specialActionCategory.children(`#btn${actionName}`).addClass("hidden");
			continue;
		}
		
		if (player[`can${actionName}`]())
			enableActionButton(`btn${actionName}`);
		else
			bindDisabledActionButtonEvents(`btn${actionName}`);
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

function bindDisabledActionButtonEvents(actionButtonID)
{
	const $btn = $(`#${actionButtonID}`),
		eventType = eventTypes[toCamelCase(actionButtonID.substring(3))],
		initialHeight = $btn.height();
	
	$btn.off("click")
		.click(function()
		{
			$btn.off("click")
				.click(function()
				{
					$btn.off("click mouseleave");
					hideActionRules($btn, initialHeight, eventType);
				});
			
			showActionRules($btn, eventType);
		})
		.removeClass("hidden");
}

async function showActionRules($actionButton, eventType)
{
	const initialHeight = $actionButton.height(),
		actionRules = [...eventType.rules];
	
	if (eventType.relatedRoleName === getActivePlayer().role)
		actionRules.unshift(`<span class='specialAbilityRule'>${eventType.relatedRoleRule}</span>`);

	$actionButton.stop().removeAttr("style")
		.html(`${$actionButton.html()}<br />
			<span class='actionNotPossible'>( this action is currently not possible )</span>
			<span class='disabledActionRules'>
				<p>${actionRules.join("</p><p>")}</p>
			</span>`);

	const eventualHeight = $actionButton.height();

	await animatePromise(
	{
		$elements: $actionButton,
		initialProperties: { height: initialHeight },
		desiredProperties: { height: eventualHeight },
		duration: 500,
		easing: "easeOutQuad"
	});
	

	$actionButton.off("mouseleave")
		.mouseleave(function()
		{
			$actionButton.off("mouseleave");

			hideActionRules($actionButton, initialHeight, eventType);
		})
		.removeAttr("style");
}

async function hideActionRules($actionButton, initialHeight, eventType)
{
	const expandedHeight = $actionButton.stop().height();

	await animatePromise(
	{
		$elements: $actionButton,
		initialProperties: { height: expandedHeight },
		desiredProperties: { height: initialHeight },
		duration: 200
	});

	$actionButton.html(getActionButtonContents(eventType)).removeAttr("style");
	bindDisabledActionButtonEvents($actionButton.attr("id"));
}

function getActionButtonContents(eventType)
{
	const { name } = eventType;

	if (!eventType.hasIcon)
		return name.toUpperCase();

	return `<div class='actionIcon'>
				${getEventIcon(eventType)}
			</div>
			<div class='actionName'>${name.toUpperCase()}</div>`;
}

function getEventIcon(eventType)
{
	if (!eventType.hasIcon)
		return "";
	
	return `<img src='images/actionIcons/${eventType.iconFileName || toCamelCase(eventType.name)}.png' />`;
}

function enableBtnCancelAction()
{
	log("enableBtnCancelAction()");
	$("#btnCancelAction").off("click").click(function()
	{
		resetActionPrompt({ actionCancelled: true });
		resumeCurrentStep();
	}).css("display", "inline-block");
}

function disableBtnCancelAction()
{
	log("disableBtnCancelAction()");
	$("#btnCancelAction").off("click").css("display", "none");
}

function resetActionPrompt({ actionCancelled } = {})
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
			turnOffResearchStationHighlights();
			resetGrantStation({ cancelled: true });
		}
		else if (eventTypeIsBeingPrompted(resilientPopulation))
			resetInfectionDiscardClicksAndTooltips();
		
		hideTravelPathArrow();
	}

	data.promptingEventType = false;
	data.promptedTravelPathProperties = false;

	if (!actionStepInProgress())
	{
		$actionPrompt.parent().addClass("hidden");
		enablePawnEvents();
	}
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
		if (actionProperties.destination)
			showTravelPathArrow(actionProperties);
		
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
		
		const $actionTitleContainer = $(`<div class='actionTitle'></div>`),
			$rules = $("<div class='rules'></div>");

		let actionTitleContents = `<h2>${ eventType.name.toUpperCase() }</h2>`;
		// Simply prepending the icon will not work,
		// because the opening h2 tag has to be on the same line as the img tag
		// to avoid unwanted spacing when the document is rendered.
		if (eventType.hasIcon)
			actionTitleContents = `<img class='actionIcon' src='images/actionIcons/${toCamelCase(eventType.name).replace("/", "")}.png' alt='${eventType.name} icon'/>`
				+ actionTitleContents;
		
		$actionTitleContainer.append(actionTitleContents);
		
		for (let paragraph of eventType.rules)
			$rules.append(`<p>${paragraph}</p>`);
		
		actionInterfacePopulator.$actionInterface
			.append($actionTitleContainer)
			.append($rules)
			.append(`<p class='instructions'>${eventType.instructions || ""}</p>`);
	},
	appendSpecialAbilityRule(eventType)
	{
		actionInterfacePopulator.$actionInterface.find(".rules")
			.append(`<p class='specialAbilityRule'>${getSpecialAbilityRule(eventType)}</p>`);
		
		bindRoleCardHoverEvents();
	},
	replaceInstructions(newSubtitle, { lastParagraph } = {})
	{
		const $subtitle = actionInterfacePopulator.$actionInterface.find("p.instructions");

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
			$subtitle = $interface.find("p.instructions");

		$subtitle.css("color", $interface.css("background-color"));

		return actionInterfacePopulator;
	},
	showSubtitle()
	{
		actionInterfacePopulator.$actionInterface.find("p.instructions").css("color", "#fff");

		return actionInterfacePopulator;
	},
	appendDivision()
	{
		actionInterfacePopulator.$actionInterface.append(
			`<div class='actionInterfaceDivision'>
				<div class='actionInterfaceDivisionLine'></div>
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
			$interface.append(newElementFn(key, { noTooltip: true }));
		
		if (typeof onClick === "function")
			$interface.children(`.${buttonClass}`).click(function() { onClick($(this)) });
		
		return actionInterfacePopulator;
	},
	appendDiscardPrompt({ cardKeys, promptMsg, onConfirm })
	{
		const $discardPrompt = $(`<div class='discardSelections'></div>`),
			buttonClass = "btnConfirmAction",
			isContingencyCard = typeof cardKeys === "string" && isContingencyCardKey(cardKeys);

		let buttonText = false;
		
		if (isContingencyCard)
		{
			promptMsg = `${getPlayer("Contingency Planner").newSpecialAbilityTag()}<br />`;
			buttonText = "PLAY AND REMOVE";
		}

		if (promptMsg)
			$discardPrompt.append(`<p>${promptMsg}</p>`);

		for (let key of ensureIsArray(cardKeys))
			$discardPrompt.append(newPlayerCardElement(key));
		
		$discardPrompt.children(".playerCard")
			.click(function() { pinpointCityFromCard($(this)) });

		$discardPrompt.append(`<div class='button ${buttonClass}'>${buttonText || "DISCARD"}</div>`);

		if (typeof onConfirm === "function")
			$discardPrompt.children(`.${buttonClass}`).click(function()
			{
				$(`.${buttonClass}`).off("click").addClass("btnDisabled");
				onConfirm();
			});

		actionInterfacePopulator.$actionInterface.append($discardPrompt);

		if (isContingencyCard)
			bindRoleCardHoverEvents();

		return actionInterfacePopulator;
	},
	[eventTypes.driveFerry.name]()
	{
		const destinationKeys = getActivePlayer().getLocation().connectedCityKeys;

		actionInterfacePopulator.appendOptionButtons("city", destinationKeys,
			function($clicked)
			{
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
				movementAction(shuttleFlight, getCity($clicked.data("key")));
			});
		return true;
	},
	[eventTypes.chooseFlightType.name]({ destination })
	{
		// If the player can reach the destination via Direct Flight,
		// but also via one other flight type, present *two options.
		// *See the comment in getMovementDetails as to why a maximum of two options are presented.
		const { operationsFlight, charterFlight, directFlight } = eventTypes;
		
		let firstOption;
		if (getActivePlayer().canOperationsFlight())
			firstOption = operationsFlight;
		else
			firstOption = charterFlight;

		actionInterfacePopulator.appendDescriptiveElements(firstOption)
		actionInterfacePopulator[firstOption.name]({ destination });
		
		actionInterfacePopulator.appendDivision().appendDescriptiveElements(directFlight);
		actionInterfacePopulator[directFlight.name]({ destination });

		return true;
	},
	[eventTypes.charterFlight.name]({ destination })
	{
		const charterFlight = eventTypes.charterFlight;
	
		if (!destination) // the user explicitly selected charter flight
		{
			// Remember the Charter Flight actionCode to avoid prompting Direct Flight when the pawn is dropped on a destination.
			data.promptingEventType = charterFlight;
			return true;
		}
		else
			data.promptingEventType = false;
		
		const currentCity = getActivePlayer().getLocation();
		
		actionInterfacePopulator
			.replaceInstructions(`Destination: ${destination.name}`)
			.appendDiscardPrompt(
			{
				cardKeys: currentCity.key,
				onConfirm: function() { movementAction(charterFlight, destination) }
			});
		return true;
	},
	[eventTypes.directFlight.name]({ destination })
	{
		const directFlight = eventTypes.directFlight;
	
		if (destination)
		{
			// NOTE: If a player drags and drops a pawn on a city
			// which is a valid Direct Flight and Charter Flight destination,
			// both action interfaces will be displayed.
			// Charter Flight is usually the better option,
			// therefore Direct Flight is always shown second, hence { lastParagraph: true }.
			actionInterfacePopulator
				.replaceInstructions(`Destination: ${destination.name}`, { lastParagraph: true })
				.appendDiscardPrompt(
				{
					cardKeys: destination.key,
					onConfirm: function() { movementAction(directFlight, destination) }
				});
			return true;
		}
		
		const cardKeys = getActivePlayer()[`valid${directFlight.name}DestinationKeys`]();
			
		actionInterfacePopulator.appendOptionButtons("playerCard", cardKeys, function($clicked)
			{
				const destination = getCity($clicked.data("key"));
				data.promptedTravelPathProperties = { destination };
				promptAction(
					{
						eventType: directFlight,
						destination
					});
			})
			.$actionInterface.find(".playerCard")
				.hover(function() { showTravelPathArrow({ destination: getCity($(this).attr("data-key")) }) },
				function() { hideTravelPathArrow() });
		
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
		
		let newSubtitle;
		if (stationRelocationKey)
			newSubtitle = `Move the research station from ${getCity(stationRelocationKey).name} to ${currentCity.name}?`;
		else
			newSubtitle = `Build research station in ${currentCity.name}?`;
		actionInterfacePopulator.replaceInstructions(newSubtitle);

		if (playerIsOperationsExpert) // no city card is required
		{
			actionInterfacePopulator.appendSpecialAbilityRule(eventTypes.buildResearchStation);
			
			const $btnConfirm = $("<div class='button'>CONFIRM</div>");
			$btnConfirm.click(function() { buildResearchStation(stationRelocationKey) });
			$actionInterface.append($btnConfirm);
		}
		else
		{
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
			player = getActivePlayer(),
			city = player.getLocation(),
			diseaseColorOptions = city.getDiseaseColorOptions();
		
		if (diseaseColorOptions.length > 1)
		{
			if (player.role === "Medic")
				actionInterfacePopulator.appendSpecialAbilityRule(eventTypes.treatDisease);
			
			for (let color of diseaseColorOptions)
				$actionInterface.append(newDiseaseCubeElement(color));

			const $cubes = $(`.${city.key}.diseaseCube`);
			$actionInterface.children(".diseaseCube")
				.hover(function()
				{
					const $cubesOfColor = $cubes.filter(`.${getColorClass($(this))}`);
					markTreatableDiseaseCubes($cubesOfColor.last());
				},
				function() { unmarkTreatableDiseaseCubes($cubes) })
				.click(function()
				{
					resetActionPrompt();
					treatDisease(false, getColorClass($(this)));
				});

			delayExecution(resizeTreatDiseaseOptions, 1);
			return true;
		}
		
		// Only one cube color on the currentCity -- action interface not needed.
		treatDisease(false, diseaseColorOptions[0]);
		return false;
	},
	[eventTypes.shareKnowledge.name]({ shareKnowledgeParticipant })
	{
		const $actionInterface = actionInterfacePopulator.$actionInterface,
			player = getActivePlayer(),
			researcherRole = "Researcher";
		
		let participant = shareKnowledgeParticipant,
			showResearcherSpecialAbilityRule = player.role === researcherRole;

		if (!participant)
		{
			const validParticipants = getValidShareKnowledgeParticipants(player);

			if (validParticipants.length === 1)
				participant = validParticipants[0];
			else
			{
				actionInterfacePopulator.replaceInstructions("Share Knowledge with which player?");
				
				const $shareKnowledgePlayerOptions = $("<div class='playerOptions'></div>");
				
				for (let possibleParticipant of validParticipants)
				{
					$shareKnowledgePlayerOptions.append(possibleParticipant.newRoleTag());

					if (possibleParticipant.role === researcherRole)
						showResearcherSpecialAbilityRule = true;
				}

				$shareKnowledgePlayerOptions.children().click(function()
				{
					$(".roleCard").remove();
					promptAction(
						{
							eventType: eventTypes.shareKnowledge,
							shareKnowledgeParticipant: data.players[$(this).data("role")]
						});
				});

				$actionInterface.append($shareKnowledgePlayerOptions);
				bindRoleCardHoverEvents();
			}
		}
		
		if (participant)
		{
			let $giveableContainer = false,
				$takeableContainer = false;
			
			if (participant.role === researcherRole)
				showResearcherSpecialAbilityRule = true;
			
			actionInterfacePopulator.replaceInstructions(`Share Knowledge with:<br/>${participant.newRoleTag()}`);
			
			if (player.canGiveKnowledge())
			{
				$giveableContainer = $(`<div id='giveableCards' class='shareableCards'>
											<p>Select a card to <i>give</i> :</p>
										</div>`);
				
				for (let cardKey of player.getShareableCardKeys())
					$giveableContainer.append(newPlayerCardElement(cardKey, { noTooltip: true }));

				$actionInterface.append($giveableContainer);
			}

			if (participant.canGiveKnowledge())
			{
				if ($giveableContainer)
					actionInterfacePopulator.appendDivision();
				
				$takeableContainer = $(`<div id='takeableCards' class='shareableCards'>
											<p>Select a card to <i>take</i> :</p>
										</div>`);
				
				for (let cardKey of participant.getShareableCardKeys())
					$takeableContainer.append(newPlayerCardElement(cardKey, { noTooltip: true }));

				$actionInterface.append($takeableContainer);
			}

			const $cardOptions = $(".shareableCards").children(".playerCard");
			$cardOptions.click(function()
			{
				$cardOptions.off("click");
				shareKnowledge(player, participant, $(this).data("key"));
			});

			bindRoleCardHoverEvents();
		}

		if (showResearcherSpecialAbilityRule)
			actionInterfacePopulator.appendSpecialAbilityRule(eventTypes.shareKnowledge);

		return true;
	},
	[eventTypes.discoverACure.name]()
	{
		const player = getActivePlayer(),
			eventType = eventTypes.discoverACure,
			useableCardKeys = player.getCardsForDiscoverACure(),
			$cardSelectionPrompt = new DiscardPrompt(
			{
				eventTypeCode: eventType.code,
				buttonText: "DISCOVER CURE",
				cardKeys: useableCardKeys,
				numDiscardsRequired: player.role === "Scientist" ? 4 : 5,
				onConfirm: discoverACure
			});
		
		actionInterfacePopulator.$actionInterface.append($cardSelectionPrompt);

		if (player.role === "Scientist")
			actionInterfacePopulator.appendSpecialAbilityRule(eventType);

		return true;
	},
	[eventTypes.pass.name]()
	{
		const $btnConfirm = $("<div id='btnConfirmPass' class='button'>CONFIRM</div>");

		$btnConfirm.click(function()
		{
			resetActionPrompt();
			passActions();
		});

		actionInterfacePopulator.$actionInterface.append($btnConfirm);

		return true;
	},
	[eventTypes.operationsFlight.name]({ destination })
	{
		const operationsFlight = eventTypes.operationsFlight;
	
		if (!destination) // the user explicitly selected operations flight
		{
			// Remember the Operations Flight actionCode to avoid prompting Direct or Charter Flight when the pawn is dropped on a destination.
			data.promptingEventType = operationsFlight;
			return true;
		}
		else
			data.promptingEventType = false;
		
		const player = getActivePlayer(),
			useableCardKeys = player.cardKeys.filter(key => isCityKey(key));
		
		actionInterfacePopulator.replaceInstructions(`Destination: ${destination.name}
			<br />Select a card to discard:`);

		actionInterfacePopulator.appendOptionButtons("playerCard", useableCardKeys, function($clicked)
		{
			movementAction(operationsFlight, destination, { operationsFlightDiscardKey: $clicked.data("key") });
		});

		return true;
	},
	[eventTypes.dispatchPawn.name]({ playerToDispatch, destination, dispatchMethod })
	{
		const { chooseFlightType, directFlight, charterFlight } = eventTypes;

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
					.appendDivision()
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

			actionInterfacePopulator.replaceInstructions(newSubtitle);
			bindRoleCardHoverEvents();
		}

		return true;
	},
	[eventTypes.planContingency.name]()
	{
		const cardKeys = getContingencyOptionCardKeys();

		data.promptingEventType = eventTypes.planContingency;

		actionInterfacePopulator.appendOptionButtons("playerCard", cardKeys, function($clicked)
		{
			planContingency($clicked.data("key"));
		});
		
		return true;
	},
	[eventTypes.airlift.name]({ playerToAirlift, destination })
	{	
		if (!destination)
		{
			clusterAll({ pawns: true });
			data.promptingEventType = eventTypes.airlift;
			data.promptedTravelPathProperties = false;
			hideTravelPathArrow();

			enablePawnEvents();
		}
		else
		{
			actionInterfacePopulator.replaceInstructions(`Airlift ${playerToAirlift.newRoleTag()}<br />
				from ${getCity(playerToAirlift.cityKey).name} to ${destination.name}?`);
			
			actionInterfacePopulator.appendDiscardPrompt(
			{
				cardKeys: eventTypes.airlift.cardKey,
				onConfirm: function()
				{
					resetActionPrompt();
					data.promptingEventType = false;
					airlift(playerToAirlift, destination);
				},
				
			});

			bindRoleCardHoverEvents();
		}

		return true;
	},
	[eventTypes.governmentGrant.name]({ targetCity, relocationKey })
	{
		disablePawnEvents();
		unbindDiseaseCubeEvents();
		
		data.promptingEventType = eventTypes.governmentGrant;
		
		if (targetCity)
		{
			let newSubtitle;
			if (relocationKey)
				newSubtitle = `Move the Research Station from ${getCity(relocationKey).name} to ${targetCity.name}?`;
			else
				newSubtitle = `Build Research Station in<br />${targetCity.name}?`;
			
			actionInterfacePopulator.replaceInstructions(newSubtitle)
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

			actionInterfacePopulator.replaceInstructions(newSubtitle)
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
			actionInterfacePopulator.replaceInstructions(`<span class='r'>This card skips the <i>next</i> Infect Cities step. Please wait until the the current Infect Cities step has completed.</span>`);
		else if (isOneQuietNight())
			actionInterfacePopulator.replaceInstructions(`<span class='r'>One Quiet Night has already been played this turn! It cannot be played twice in the same turn.</span>`)
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

function getContingencyOptionCardKeys()
{
	const cardKeys = [];
	$("#playerDiscard").children(".playerCard.eventCard").each(function()
	{
		cardKeys.push($(this).data("key"));
	});

	return cardKeys;
}

async function planContingency(cardKey)
{
	disableActions();
	resetActionPrompt();
	
	const $eventCard = $("#playerDiscard").find(`.playerCard[data-key='${cardKey}']`),
		isContingencyCard = true,
		targetProperties = getDrawnPlayerCardTargetProperties({ isContingencyCard });

	await Promise.all([
		requestAction(eventTypes.planContingency, { cardKey }),
		animateCardToHand($eventCard, targetProperties, { isContingencyCard })
	]);

	getActivePlayer().contingencyKey = cardKey;
	$eventCard.addClass("contingency");

	proceed();
}

function isContingencyCardKey(cardKey)
{
	const $contingencyCard = getContingencyCardElement();

	return $contingencyCard.length && $contingencyCard.attr("data-key") === cardKey;
}

function getContingencyCardElement()
{
	return $("#contingencyPlanner").children(".role").children(`.playerCard.eventCard.contingency`);
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
		await discardOrRemoveEventCard(forecastEvent);
	
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
			.replaceInstructions("Click and drag to rearrange the cards. When done, the cards will be put back on top of the deck in order from bottom to top.")
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
							<p><span class='hoverInfo concealed' title='The top card will be put back on the deck last (and drawn from the deck first).'>Top</span></p>
							<div id='forecastCards'></div>
							<p><span class='hoverInfo concealed' title='The bottom card will be put back on the deck first (and drawn from the deck sixth).'>Bottom</span></p>
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
		sort: function(e, ui) { ui.item.addClass("sorting").find(".infectionCardContents").css("width", "100%") },
		stop: function(e, ui) { ui.item.removeClass("sorting").find(".infectionCardContents").css("width", "19.5%") },
		revert: 200
	});
}

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

	actionInterfacePopulator.$actionInterface.slideUp(function()
	{
		resetActionPrompt();
		resumeCurrentStep();
	});
}

async function animateForecastPlacement($cardContainer)
{
	const $cards = $cardContainer.children(".infectionCard");

	$cards.prepend($(`<img	class='forecastCardback'
							src='images/cards/infectionCardback.png'
							alt='Infection Card' />`));
	
	const $cardbacks = $cardContainer.find(".forecastCardback").width(getDimension("diseaseIcon")),
		$elementsToFadeOut = $(".instructions")
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
	resetActionPrompt();
	disableActions();

	const events = await requestAction(eventTypes.oneQuietNight);
	
	await discardOrRemoveEventCard(events.shift());

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
		eventClass: "eventCard"
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
			})
			.css({ cursor: "pointer" })
			.attr("title", `Infection card
Select for removal?`);
	}
	else
		actionInterfacePopulator.replaceInstructions("<span class='r'>The Infection Discard Pile is empty!<br />To play Resilient Population, there must be at least 1 card in the Infection Discard Pile.</span>");
}

async function resilientPopulation(cardKeyToRemove)
{
	resetInfectionDiscardClicksAndTooltips();
	resetActionPrompt();
	disableActions();
	unbindInfectionDiscardHover();

	const eventType = eventTypes.resilientPopulation,
		events = await requestAction(eventType, { cardKeyToRemove });

	await discardOrRemoveEventCard(events.shift());
	await resilientPopulationAnimation(cardKeyToRemove);

	resizeInfectionDiscardElements();
	bindInfectionDiscardHover();
	resumeCurrentStep();
}

function resetInfectionDiscardClicksAndTooltips()
{
	let $this, city;
	$("#infectionDiscard").children(".infectionCard")
		.off("click")
		.click(function() { pinpointCityFromCard($(this)) })
		.each(function()
		{
			$this = $(this);
			city = getCity($this.attr("data-key"));

			setInfectionCardTitleAttribute($this, diseaseIsEradicated(city.color), city);
		})
		.css({ cursor: "help" });
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

async function tryAirlift(playerToAirlift)
{
	const { airlift } = eventTypes,
		destination = getDestination(airlift, { player: playerToAirlift });

	if (!destination)
		return invalidMovement(playerToAirlift.getLocation());

	const airliftDetails = { eventType: airlift, playerToAirlift, destination };
	data.promptedTravelPathProperties = airliftDetails;
	promptAction(airliftDetails);

	await playerToAirlift.getLocation().cluster();
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
	
	await discardOrRemoveEventCard(events.shift());

	setDuration("pawnAnimation", 1000);
	await playerToAirlift.updateLocation(destination);

	// If any events are left after shifting the airliftEvent, they are auto-treat disease events.
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
	
	$grantStation = $(`<img class='researchStation grantStation glowing' src='images/pieces/researchStation.png' />`);
	
	$boardContainer.append($grantStation);

	data.researchStationKeys.add("grantStation");
	$grantStation.offset($("#researchStationSupply img").offset());
	
	$grantStation.draggable({ containment: $boardContainer })
		.mousedown(function()
		{
			updateResearchStationSupplyCount();
			turnOffResearchStationSupplyHighlight();

			$(window).off("mouseup").mouseup(function()
			{
				$(window).off("mouseup");
				getGovernmentGrantTargetCity($grantStation);
			});
		});
	
	highlightResearchStationSupply($grantStation);
}

function resetGrantStation({ $researchStation, cancelled } = {})
{
	log("resetGrantStation()");
	$researchStation = $researchStation || $("#boardContainer > .researchStation.grantStation");

	if (!$researchStation.length)
		return false;
	
	if (cancelled)
		turnOffResearchStationSupplyHighlight();

	$researchStation
		.draggable({ disabled: true })
		.animate($("#researchStationSupply img").offset(), getDuration("stationPlacement"),
		function()
		{
			data.researchStationKeys.delete("grantStation");
			updateResearchStationSupplyCount();
			$(this).remove();
			
			if (!cancelled)
				promptAction({ eventType: eventTypes.governmentGrant });
		});
}

async function highlightResearchStationSupply($grantStation)
{
	const $stationContainer = $("#researchStationSupply").children(".researchStation");

	while ($grantStation.hasClass("glowing"))
	{
		if ($stationContainer.hasClass("bigGlow"))
			$stationContainer.removeClass("bigGlow").addClass("smallGlow");
		else
			$stationContainer.removeClass("smallGlow").addClass("bigGlow");
		
		await sleep(500);
	}
	
	$stationContainer.removeClass("bigGlow smallGlow");
}
function turnOffResearchStationSupplyHighlight()
{
	$("#researchStationSupply").children(".researchStation").removeClass("bigGlow smallGlow");
	$(".grantStation").removeClass("glowing");
}

function promptGovernmentGrantStationRelocation()
{
	actionInterfacePopulator.replaceInstructions(`<span class='r'>Research Station Supply is empty!</span>
		<br />You may relocate any Research Station currently on the board.
		<br />Drag and drop an existing Research Station onto the city of your choice.`);
	
	highlightAllResearchStations();
	hideTravelPathArrow();
	enableResearchStationDragging();

	return true;
}

async function highlightAllResearchStations()
{
	const $researchStations = $("#boardContainer").children(".researchStation").not("#placeholderStation");

	if ($researchStations.first().hasClass("glowing"))
		return false;

	$researchStations.addClass("glowing");
	
	while (eventTypeIsBeingPrompted(eventTypes.governmentGrant))
	{
		if ($researchStations.first().hasClass("mediumGlow"))
			$researchStations.removeClass("mediumGlow").addClass("smallGlow");
		else
			$researchStations.removeClass("smallGlow").addClass("mediumGlow");
		
		await sleep(500);
	}
}
function turnOffResearchStationHighlights()
{
	$("#boardContainer").children(".researchStation")
		.not("#placeholderStation")
		.removeClass("mediumGlow smallGlow glowing");
	data.promptingEventType = false;
}

function getGovernmentGrantTargetCity($researchStation)
{
	log("getGovernmentGrantTargetCity()");
	const stationOffset = $researchStation.offset(),
		distanceThreshold = getDimension("piecePlacementThreshold"),
		relocating = !$researchStation.hasClass("grantStation"),
		relocationKey = relocating ? $researchStation.attr("data-key") : false,
		eventType = eventTypes.governmentGrant;

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
			if (relocating)
			{
				const origin = getCity(relocationKey);

				$researchStation.addClass("mediumGlow");
				
				origin.clusterResearchStation();
				showTravelPathArrow({ origin, destination: targetCity });
			}
			return promptAction({ eventType, targetCity, relocationKey });
		}
	}

	log("target not found");

	if (relocating)
	{
		log("relocationKey:", relocationKey);
		getCity(relocationKey).clusterResearchStation();
		data.promptingEventType = eventType;
		highlightAllResearchStations();
		hideTravelPathArrow();
	}
	else
		resetGrantStation($researchStation);
}

async function governmentGrant(targetCity, relocationKey)
{
	data.promptingEventType = false;
	resetActionPrompt();
	disableActions();
	
	const eventType = eventTypes.governmentGrant,
		events = await requestAction(eventType,
		{
			locationKey: targetCity.key,
			relocationKey: relocationKey || 0
		});
	
	await discardOrRemoveEventCard(events.shift());

	if (relocationKey)
	{
		await getCity(relocationKey).relocateResearchStationTo(targetCity);
		turnOffResearchStationHighlights();
		hideTravelPathArrow();
	}
	else
		await targetCity.buildResearchStation({ animate: true, isGovernmentGrant: true });
	
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
		$pawnToExclude: playerToExcludePawn ? playerToExcludePawn.$pawn : false,
		animateResearchStation: researchStations,
		stationKeyToExclude
	});
}

function discardOrRemoveEventCard(event)
{
	return new Promise(async resolve =>
	{
		const cardKey = getEventType(event.code).cardKey,
			$card = $("#playerPanelContainer").find(`.playerCard[data-key='${cardKey}']`),
			player = data.players[event.role];
		
		$card.removeClass("unavailable");

		if (isContingencyCardKey(cardKey))
		{
			await animateContingencyCardRemoval();
			player.contingencyKey = false;
		}
		else
		{
			await movePlayerCardsToDiscards({ player, $card });
			player.removeCardsFromHand(cardKey);
		}

		resolve();
	});
}

function animateContingencyCardRemoval()
{
	return new Promise(async resolve =>
	{
		const $card = getContingencyCardElement().removeClass("contingency").addClass("removed");

		await expandPlayerDiscardPile({ showRemovedCardsContainer: true });
		await animateDiscardPlayerCard($card, { removingContingencyCard: true });
		await sleep(getDuration("longInterval"));
		await collapsePlayerDiscardPile();

		resolve();
	});
}

async function tryDispatchPawn(playerToDispatch)
{
	const dispatchDetails = determineDispatchDetails(playerToDispatch);

	if (!dispatchDetails)
		return invalidMovement(playerToDispatch.getLocation());
	
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
		
		data.promptedTravelPathProperties = actionDetails;
		promptAction(actionDetails);

		await playerToDispatch.getLocation().cluster();
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
		log("new DiscardPrompt...");
		log("cardKeys: ", cardKeys);
		this.eventTypeCode = eventTypeCode;
		this.cardKeys = cardKeys;
		this.numDiscardsRequired = numDiscardsRequired;
		this.onConfirm = onConfirm;

		this.$container = $(`<div class='discardPrompt'>
								<div class='cardsToKeep'>
									<p class='instructions'>Click a card to move it from "Keep" to "Discard" or vice versa.</p>
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
				this.$discardsContainer.append(newPlayerCardElement(key, { noTooltip: true }));

			this.keeperCount = 0;
			this.discardSelectionCount = cardKeys.length;
			
			this.$keepersContainer.addClass("hidden");

			this.bindConfirmClick();
		}
		else
		{
			for (let key of cardKeys)
				this.$keepersContainer.append(newPlayerCardElement(key, { noTooltip: true }));

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
		$.post(`serverCode/actionPages/${eventType.actionPathName}.php`,
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
				gameEndCause,
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

				if (gameEndCause)
					data.gameEndCause = gameEndCause;
				
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
	resetActionPrompt();
	
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

	await Promise.all([
		giver.expandPanelIfCollapsed(),
		receiver.expandPanelIfCollapsed()
	]);
	await animateShareKnowledge(giver, receiver, cardKey);

	giver.removeCardsFromHand(cardKey);
	receiver.addCardKeysToHand(cardKey);

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
		const $card = giver.$panel.find(`.playerCard[data-key='${cardKey}']`),
			initialProperties = $card.offset(),
			$insertAfterMe = receiver.$panel.children(".role, .playerCard").last(),
			desiredOffset = $insertAfterMe.offset();

		initialProperties.width = $card.width();
		desiredOffset.top += $insertAfterMe.height();
		
		$card.appendTo("body")
			.css(
			{
				...initialProperties,
				...{
					"position": "absolute",
					"z-index": "5"
				}
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
	actionInterfacePopulator.replaceInstructions(`<span class='r'>Research Station Supply is empty!</span>
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

	$actionInterface.children(".btnRelocateStation")
		.hover(function()
		{
			const city = getCity($(this).data("key"));

			city.getResearchStation().addClass("mediumGlow");
			setTravelPathArrowColor({ relocatingResearchStation: true });
			showTravelPathArrow({
				origin: city,
				destination: getActivePlayer().getLocation()
			});
		},
		function()
		{
			$("#boardContainer").children(".researchStation").not("#placeholderStation").removeClass("mediumGlow");
			hideTravelPathArrow();
			setTravelPathArrowColor();
		})
		.click(function()
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
		await movePlayerCardsToDiscards({ player, $card: player.getCardElementFromHand(city.key) });
		player.removeCardsFromHand(city.key);
	}

	resetActionPrompt();

	if (relocationKey)
	{
		$("#boardContainer").children(".researchStation").not("#placeholderStation").removeClass("mediumGlow");
		await getCity(relocationKey).relocateResearchStationTo(city);
		hideTravelPathArrow();
	}
	else
		await city.buildResearchStation({ animate: true });
	
	proceed();
}

async function movementAction(eventType, destination, { playerToDispatch, operationsFlightDiscardKey } = {})
{
	log(`movementAction(${eventType ? eventType.name : eventType},
		${destination ? destination.name : destination},
		${playerToDispatch ? playerToDispatch.role : playerToDispatch},
		${operationsFlightDiscardKey})`);
	
	const player = playerToDispatch || getActivePlayer(),
		originCity = player.getLocation();

	let movementDetails;
	if (data.promptingEventType)
	{
		eventType = data.promptingEventType;
		destination = getDestination(eventType);

		if (destination)
		{
			movementDetails = {
				eventType: eventType,
				destination: destination
			};

			data.promptedTravelPathProperties = movementDetails;
			promptAction(movementDetails);

			originCity.cluster();
			return false;
		}

		eventType = false;
	}
	
	if (!eventType)
	{
		movementDetails = getMovementDetails();

		if (movementDetails)
		{
			if (movementDetails.waitingForConfirmation)
			{
				data.promptedTravelPathProperties = movementDetails;
				promptAction(movementDetails);
				originCity.cluster();
				return false;
			}
			
			eventType = movementDetails.eventType;
			destination = movementDetails.destination;
		}
	}
	else
		destination = destination || getDestination(eventType);
	
	if (!destination)
		return invalidMovement(originCity);
	
	// Move appears to be valid
	
	resetActionPrompt();
	disableActions();

	if (!movementTypeRequiresDiscard(eventType))
	{
		originCity.cluster();
		showTravelPathArrow({ player, destination });
	}
	
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

		setDuration("pawnAnimation", eventType.code === eventTypes.driveFerry.code ? 500 : 1000);
		await player.updateLocation(destination);

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

async function invalidMovement(originCity)
{
	await Promise.all([
		animateInvalidTravelPath(),
		originCity.cluster()
	]);
	enablePawnEvents();

	return false;
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

				await removeCubesFromBoard(city,
				{
					color: e.diseaseColor,
					numToRemove: "all"
				});
				city.decrementCubeCount(e.diseaseColor, city.cubes[e.diseaseColor]);

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

		await movePlayerCardsToDiscards({ player, $card: player.getCardElementFromHand(discardKey) });
		player.removeCardsFromHand(discardKey);

		resolve();
	});
}

async function treatDisease($cube, diseaseColor)
{
	disableActions();
	
	const city = getActivePlayer().getLocation();

	diseaseColor = diseaseColor || getColorClass($cube);

	const events = await requestAction(eventTypes.treatDisease,
		{
			cityKey: city.key,
			diseaseColor
		});
		
	let numToRemove,
		eradicated = false;
	for (let event of events)
	{
		if (event.code === eventTypes.treatDisease.code)
			numToRemove = event.prevCubeCount - event.newCubeCount;
		else if (event.code === eventTypes.eradication.code)
			eradicated = true;
	}
	
	await removeCubesFromBoard(city,
	{
		$clickedCube: $cube,
		color: diseaseColor,
		numToRemove
	});
	city.decrementCubeCount(diseaseColor, numToRemove);
	
	if (eradicated)
		await eradicationEvent(diseaseColor);
	
	proceed();
}

function getColorClass($element)
{
	const colors = ["y", "r", "u", "b"],
		classes = $element.attr("class").split(" ");

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
		unbindDiseaseCubeEvents();
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
					destination: destination
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

	if (data.numPlayerCardsRemaining == 0) // the players lose.
	{
		data.gameEndCause = "cards";
		return outOfPlayerCardsDefeatAnimation($container);
	}

	unhide($container, $btn);

	// Event cards can be played before drawing.
	enableEventCards();
	await buttonClickPromise($btn.html("DRAW 2 CARDS"),
		{
			beforeClick: "fadeIn",
			afterClick: "hide"
		});
	disableEventCards();

	const cardKeys = await performDrawStep()
		.catch((reason) => log(reason));
	if (!cardKeys) return false;

	if (data.nextStep === "epIncrease")
	{
		await specialEventAlert(
		{
			title: "EPIDEMIC!",
			eventClass: "epidemic",
			visibleMs: 1250
		});
	}

	await buttonClickPromise($btn.html("CONTINUE"),
		{
			beforeClick: "fadeIn",
			afterClick: "hide"
		});
	$btn.stop();

	finishDrawStep(cardKeys);
}

async function performDrawStep()
{
	return new Promise(async (resolve, reject) =>
	{
		const $container = $("#cardDrawContainer"),
			numCardsToDeal = data.numPlayerCardsRemaining >= 2 ? 2 : data.numPlayerCardsRemaining,
			{ 0: events } = await Promise.all(
			[
				requestAction(eventTypes.cardDraw),
				dealFaceDownPlayerCards($container, numCardsToDeal)
			]),
			cardDrawEvent = events[0];

		$("img.drawnPlayerCard").remove();
		$container.children().not(".button").remove();
		
		// It's possible that 0 cards are left in the deck.
		if (cardDrawEvent.cardKeys)
		{
			// Without reversing the cardKeys array, the cards will be added to the player's hand in
			// an order that does not match the cardIndex order.
			for (let key of ensureIsArray(cardDrawEvent.cardKeys).reverse())
				revealPlayerCard(key, $container);
		}
		
		if (data.gameEndCause) // not enough player cards remain in the deck -- the players lose.
		{
			await sleep(getDuration("longInterval"));
			reject("Out of player cards -- the players lose.");
			return outOfPlayerCardsDefeatAnimation($container);
		}

		bindPlayerCardEvents();
		
		await sleep(getDuration("mediumInterval"));
		resolve(cardDrawEvent.cardKeys);
	});
}

async function finishDrawStep(cardKeys)
{
	const $container = $("#cardDrawContainer");
	
	await animateCardsToHand($container.find(".playerCard"));
	$container.addClass("hidden");

	getActivePlayer().addCardKeysToHand(cardKeys);
	
	proceed();
}

async function dealFaceDownPlayerCards($container, numCardsToDeal)
{
	const deckOffset = $("#imgPlayerDeck").offset();
	let numCardsInDeck = data.numPlayerCardsRemaining - 1;

	for (let i = 0; i < numCardsToDeal; i++)
	{
		if (!currentStepIs("setup"))
		{
			setPlayerDeckImgSize({ numCardsInDeck });
			numCardsInDeck--;
		}

		await dealFaceDownPlayerCard($container, deckOffset);
		await sleep(getDuration("dealCard") * 0.5);
	}
	return sleep(getDuration("longInterval"));
}

function dealFaceDownPlayerCard($container, deckOffset, { finalCardbackWidth, zIndex } = {})
{
	return new Promise(resolve =>
	{
		const $deck = $("#imgPlayerDeck"),
			$playerCard = $("<div class='playerCard'></div>").appendTo($container),
			containerOffset = $playerCard.offset(),
			$cardback = newFacedownPlayerCard().addClass("drawnPlayerCard");
		
		if (zIndex)
			$cardback.css({ zIndex });

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
					width: finalCardbackWidth || $container.width() * 0.152,
					top: containerOffset.top,
					left: containerOffset.left
				},
				getDuration("dealCard"),
				data.easings.dealCard,
				resolve());
	});
}

function newFacedownPlayerCard()
{
	return $("<img src='images/cards/playerCardback.png' alt='Player Card'/>");
}

async function revealPlayerCard(cardKey, $container)
{
	const $card = newPlayerCardElement(cardKey),
		duration = getDuration("revealPlayerCard"),
		easing = data.easings.revealCard;

	if ($container.hasClass("roleContainer"))
		$card.appendTo($container);
	else
		$card.prependTo($container);

	const cardWidth = $card.width();

	await animatePromise({
		$elements: $card,
		initialProperties: { width: 0 },
		desiredProperties: { width: cardWidth },
		duration,
		easing
	});

	$card.removeAttr("style");
}

async function animateCardsToHand($cards)
{
	await getActivePlayer().expandPanelIfCollapsed();

	const targetProperties = getDrawnPlayerCardTargetProperties();
	
	// If the second card is not an epidemic, both cards will be moved to the player's hand at once,
	// and the first card should be offset from the second.
	let lastCardTop = targetProperties.top;
	if (!$cards.first().hasClass("epidemic"))
		lastCardTop += targetProperties.height + 2; // + 2 for slight separation
	
	// There will always be 2 cards to handle.
	animateCardToHand($cards.last(),
	{
		...targetProperties,
		...{ top: lastCardTop }
	});
	
	// If there are 0 epidemics, the cards are animated to the hand simultaneously.
	// If $cards.first() is an epidemic, await the same duration to finish the draw animation before expanding the epidemic.
	if ($cards.first().hasClass("epidemic"))
		await sleep(getDuration("dealCard"));
	// Returning the second Promise (instead of Promise.all) avoids an issue where the cards
	// can swap positions after being inserted into the hand.
	return animateCardToHand($cards.first(), targetProperties);
}

function getDrawnPlayerCardTargetProperties({ isContingencyCard } = {})
{
	const $rolePanel = getActivePlayer().$panel,
		$guide = $rolePanel.children().last(),
		guideHeight = $guide.height(),
		guideOffset = isContingencyCard ? $rolePanel.children(".role").offset() : $guide.offset(),
		$exampleCard = $("#playerPanelContainer").find(".playerCard").first(),
		exampleCardHeight = $exampleCard ? $exampleCard.height() : false,
		top = exampleCardHeight ? guideOffset.top + exampleCardHeight : guideOffset.top + guideHeight;
	
	const targetProperties = {
		width: $guide.width(),
		height: exampleCardHeight || guideHeight,
		top: top,
		left: guideOffset.left
	};

	log("targetProperties: ", targetProperties);
	return targetProperties;
}

function animateCardToHand($card, targetProperties, { isContingencyCard } = {})
{
	// Some initial values should be calculated before the Promise is made.
	const initialOffset = $card.offset(),
		initialWidth = $card.width();

	return new Promise(resolve =>
	{
		if ($card.hasClass("epidemic"))
			return resolve();

		const $rolePanel = getActivePlayer().$panel;
		
		let $insertAfterElement;
		if (isContingencyCard) // Contingency cards are placed within the .role div
			$insertAfterElement = $rolePanel.children(".role").children().first();
		else
			$insertAfterElement = $rolePanel.children(".role, .playerCard").last();
		
		$card.appendTo("#rightPanel") // The animation is smoother if the $card is first appended to #rightPanel.
			.css(
			{
				...{
					position: "absolute",
					zIndex: "5",
					width: initialWidth
				},
				...initialOffset
			})
			.animate(targetProperties,
			getDuration("dealCard"),
			function()
			{
				$card.removeAttr("style").insertAfter($insertAfterElement);
				resolve();
			});
	});
}

function getDuration(durationNameOrMs)
{
	if (data.skipping)
		return 0;
	
	if (isNaN(durationNameOrMs))
		return data.durations[durationNameOrMs];
	
	return durationNameOrMs;
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
		positionPawnArrows();
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

	resetPinpointRectangles();
	data.cityWidth = getDimension("cityWidth");
}

function resetPinpointRectangles()
{
	const $pinpointers = $(".pinpointRect");

	$pinpointers.stop()
		.removeAttr("style")
		.height(data.boardHeight)
		.width(data.boardWidth)
		.addClass("hidden");
}

function resizeTopPanelElements()
{
	$("#topPanel > div").css("height", "auto");
	data.topPanelHeight = $("#topPanel").height();
	$("#topPanel > div").height(data.topPanelHeight);
	resizeCubeSupplies();
	data.infectionDeckOffset = $("#imgInfectionDeck").offset();

	resizeInfectionDiscardElements();
}

function resizeCubeSupplies()
{
	$(".cubeSupply").css("margin-top", getDimension("cubeSupplyMarginTop") + "px");
	makeElementsSquare(".cubeSupply .diseaseCube");
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
		.css(getInfectionCardTextStyle());
	
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
	
	$("#eventHistory")
		.height(data.topPanelHeight * 0.42)
		.offset({ top: panelOffsetTop + data.topPanelHeight*0.58 });
}

function resizeRightPanelElements()
{
	const rightPanel = $("#rightPanel");
	rightPanel.height(data.boardHeight);
	data.panelWidth = rightPanel.width();
	
	if ($("#infectionsContainer, #initialInfectionsContainer").not(".hidden").length)
		positionInfectionPanelComponents();
	
	resizeTreatDiseaseOptions();
}

function resizeTreatDiseaseOptions()
{
	makeElementsSquare("#actionInterface .diseaseCube");
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
	return new Promise(async resolve =>
	{
		calibratePieceDimensions("pawn");
		calibratePieceDimensions("station");
		
		data.cubeWidth = getDimension("cubeWidth");
		$("#boardContainer > .diseaseCube").width(data.cubeWidth).height(data.cubeWidth);
	
		actionStepInProgress() ? bindDiseaseCubeEvents() : unbindDiseaseCubeEvents();
	
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
		resolve();
	});
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

function positionPawnArrows()
{
	let player;
	for (let rID in data.players)
	{
		player = data.players[rID];

		if (player.hasOwnProperty("$pawnArrow") && !player.$pawnArrow.hasClass("hidden"))
			player.animatePawnArrow();
	}
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

function bindRoleCardHoverEvents()
{
	$(".playerPanel").children(".role")
		.add("#roleIndicator")
		.add(".roleTag")
		.add(".specialAbilityTag")
		.off("mouseenter mouseleave")
		.hover(function()
		{
			const $this = $(this);
				
			let player,
				$hoveredElement = false;
			
			if ($this.hasClass("role"))
				player = getPlayer($this.parent().attr("id"));
			else 
			{
				$hoveredElement = $this;

				if ($this.hasClass("roleTag") || $this.hasClass("specialAbilityTag"))
					player = data.players[$this.attr("data-role")];
				else
					player = getActivePlayer();
			}
			
			if (player)
				player.showRoleCard($hoveredElement);
		},
		function()
		{
			$(".roleCard").remove();
		});
}

class Player
{
	constructor({ uID, pID, rID, nextTurnID, name, role, roleCardText, cityKey })
	{
		this.uID = uID;
		this.pID = pID;
		this.rID = rID;
		this.nextTurnID = nextTurnID;
		this.name = name;
		this.role = role;
		this.camelCaseRole = toCamelCase(this.role);
		this.roleCardBullets = roleCardText.split("&");

		this.cityKey = cityKey;
		
		this.cardKeys = [];
	}

	async showRoleCard($hoveredElement)
	{
		const $panel = this.$panel,
			hoveredElementOffset = $hoveredElement.length ? $hoveredElement.offset() : false,
			roleCardOffset = hoveredElementOffset || $panel.offset(),
			CARD_MARGIN = 5,
			$roleCard = $(`<div class='roleCard ${this.camelCaseRole}'>
							<h3>${this.role}</h3>
							<img	class='rolePortrait'
									src='images/cards/roles/${this.camelCaseRole}.jpg'
									alt='${this.role} Role Card' />
							<ul></ul>
						</div>`),
			$specialAbilities = $roleCard.children("ul");
		
		for (let bullet of this.roleCardBullets)
			$specialAbilities.append(`<li><span>${bullet}</span></li>`);

		$roleCard.appendTo("#boardContainer");
		
		if (hoveredElementOffset)
		{
			// Without a slight delay, the calculated $roleCard height is inaccurate.
			// So we hide the card so that it doesn't appear in the wrong place for a split second,
			// wait 10ms, show the card, then calculate the actual height.
			$roleCard.addClass("hidden");
			await sleep(10);
			$roleCard.removeClass("hidden");
			const roleCardHeight = $roleCard.height();
			
			if (hoveredElementOffset.top + roleCardHeight > data.boardHeight)
				roleCardOffset.top = data.boardHeight - roleCardHeight - CARD_MARGIN;
			
			roleCardOffset.left = data.boardWidth - ($roleCard.width() + CARD_MARGIN);
		}
		else
		{
			roleCardOffset.top += CARD_MARGIN;
			roleCardOffset.left += $panel.width() + CARD_MARGIN;
		}
		
		$roleCard.offset(roleCardOffset);
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
		return `<p	class='${this.camelCaseRole} specialAbilityTag'
					data-role='${this.rID}'>
					— Special Ability —
				</p>`;
	}
	
	getLocation()
	{
		return getCity(this.cityKey);
	}

	updateLocation(destination)
	{
		return new Promise(async resolve =>
		{
			const origin = this.getLocation();
			
			this.$pawn.removeClass(this.cityKey).addClass(destination.key);
			destination.setPawnIndices();
			
			this.cityKey = destination.key;
	
			$("#travelPathArrowContainer").css("z-index", 4);
			await Promise.all(
			[
				destination.cluster({ animatePawns: true }),
				origin.cluster({ animatePawns: true })
			]);
			hideTravelPathArrow();

			resolve();
		});
	}

	pinpointLocation()
	{
		pinpointCity(this.cityKey, { pinpointClass: `${this.camelCaseRole}Border` });
	}

	expandPanelIfCollapsed()
	{
		return new Promise(async resolve =>
		{
			if (this.$panel.hasClass("collapsed"))
				await togglePlayerPanel(this.$panel.find(".btnCollapseExpand"));
		
			resolve();
		});
	}

	getPawnOffset()
	{
		const offset = this.$pawn.offset();

		offset.left += data.pawnWidth / 2;
		offset.top += data.pawnHeight;

		return offset;
	}
	
	enablePawn()
	{
		this.$pawn
			.css("cursor", "pointer")
			.draggable("enable");
		
		this.animatePawnArrow();
	}

	async animatePawnArrow()
	{
		const $arrow = this.$pawnArrow,
			initialOffset = this.getPawnOffset();
	
		let arrowClass = "",
			dropShadowBlurRadiusFactor = .003,
			initialOffsetTopAdj = data.pawnHeight * 2;
		if (eventTypeIsBeingPrompted(eventTypes.airlift))
			arrowClass = "airlift";
		else if (getActivePlayer().role !== this.role)
		{
			arrowClass = "dispatch";
			dropShadowBlurRadiusFactor = 0.002;
			initialOffsetTopAdj -= data.pawnHeight / 3;
		}

		$arrow.stop()
			.removeClass("airlift dispatch hidden")
			.addClass(arrowClass)
			.css("filter", `drop-shadow(0px 0px ${data.boardWidth*dropShadowBlurRadiusFactor}px #fff)`);
		
		makeElementsSquare($arrow);	

		initialOffset.top -= initialOffsetTopAdj;
		initialOffset.left -= $arrow.width() / 2;
		$arrow.offset(initialOffset);

		const desiredProperties = {
				left: initialOffset.left,
				top: initialOffset.top - $arrow.height() / 3
			},
			duration = 400,
			easing = "easeInOutSine";

		while (!$arrow.hasClass("hidden"))
		{
			await animatePromise({
				$elements: $arrow,
				desiredProperties,
				duration,
				easing
			});

			await animatePromise({
				$elements: $arrow,
				desiredProperties: initialOffset,
				duration,
				easing
			});
		}
	}

	disablePawn()
	{
		this.$pawn
			.css("cursor", "default")
			.draggable({ disabled: true });
		
		this.$pawnArrow.stop().addClass("hidden");
	}

	isHoldingCardKey(cardKey)
	{
		return this.cardKeys.includes(cardKey);
	}

	isHoldingAnyCityCard()
	{
		return (this.cardKeys.filter( cardKey => isCityKey(cardKey) ).length > 0);
	}

	appendCardToHand($card)
	{
		$card.insertBefore(this.$panel.children(".btnCollapseExpand"));
	}

	// Given a cardKey from the player's hand,
	// returns a jQuery object containing the corresponding .playerCard element
	getCardElementFromHand(cardKey)
	{
		return this.$panel.find(`.playerCard[data-key='${cardKey}']`);
	}

	// Appends either a single cardKey or an array or cardKeys to this Player's cardKeys array.
	// Excludes Epidemic cards because they go straight to the discard pile after being resolved.
	addCardKeysToHand(cardKeys)
	{
		log("addCardKeysToHand()");
		log("cardKeys: ", cardKeys);
		this.logCardKeys();

		this.cardKeys = [
			...this.cardKeys,
			...ensureIsArray(cardKeys).filter(key => !isEpidemicKey(key))
		];

		this.updateCollapsedPanelCardCount();

		this.logCardKeys();
	}

	// Removes the card element from the player's panel,
	// and removes the cardKey from the player object's cardKeys array.
	// Accepts a single cardKey string, or an array of cardKey strings.
	removeCardsFromHand(cardKeys)
	{
		log(`removeCardsFromHand()`);
		this.logCardKeys();
		
		for (let key of ensureIsArray(cardKeys))
		{
			log("removing card: ", key);
			this.$panel.find(`.playerCard[data-key='${key}']`).remove();
			this.cardKeys.splice(this.cardKeys.indexOf(key), 1);
		}

		this.updateCollapsedPanelCardCount();

		this.logCardKeys();
	}

	updateCollapsedPanelCardCount()
	{
		this.$panel.find(".numCardsInHand")
			.html(`— ${this.cardKeys.length} card${this.cardKeys.length === 1 ? "" : "s"} in hand —`);
	}

	logCardKeys()
	{
		let keys = "";
		for (let key of this.cardKeys)
			keys += key + ",";

		log(this.role + " cardKeys: " + keys);
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

	canDiscoverACure()
	{
		// The player's current location must have a research station.
		if (!this.getLocation().hasResearchStation)
			return false;

		// The other requirements are handled here.
		if (this.getCardsForDiscoverACure())
			return true;
		
		return false;
	}

	// If the player has enough cards of one color to discover a cure,
	// and the disease color in question has not already been cured,
	// returns an array of the cardKeys that can be used to discover a cure.
	// Returns false otherwise.
	getCardsForDiscoverACure()
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
		return this.role == "Contingency Planner"
			&& !this.contingencyKey
			&& getContingencyOptionCardKeys().length > 0;
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

// Given the name of a role, returns the corresponding Player object.
// Also accepts the camelcase form of the role name.
function getPlayer(roleName)
{
	let player;
	for (let rID in data.players)
	{
		player = data.players[rID];
		if (player.role === roleName || player.camelCaseRole === roleName)
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
	else if (role === "Contingency Planner")
	{
		description = `When the ${role} plays the Event card on his role card,
remove this Event card from the game (instead of discarding it).`;
	}

	return description;
}

function getSpecialAbilityRule(eventType)
{
	const { relatedRoleName, relatedRoleRule } = eventType;

	return relatedRoleRule.replace(relatedRoleName, getPlayer(relatedRoleName).newRoleTag());
}

function operationsFlightWasUsedThisTurn()
{
	return !currentStepIs("action 1") && getEventsOfTurn(eventTypes.operationsFlight).length > 0;
}

async function nextTurn()
{
	log("nextTurn()");
	data.turn = getActivePlayer().nextTurnID;
	data.turnNum++;

	if (isOneQuietNight())
		indicateOneQuietNightStep();

	await getActivePlayer().getLocation().setPawnIndices().cluster({ animatePawns: true });

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
	}

	for (let rID of getTurnOrder())
	{
		player = data.players[rID];
		appendPlayerPanel(player);

		if (data.gameIsResuming)
		{
			appendPawnToBoard(player);
			queueCluster(player.cityKey);
		}
	}

	if (data.gameIsResuming)
	{
		bindPawnEvents();
		unhide($(".playerPanel"));
	}
}

function getTurnOrder()
{
	return getDecidingTurnOrderCardPopulations().map(card => card.role);
}

function appendPawnToBoard(player)
{
	const { camelCaseRole, role, cityKey } = player;

	player.$pawn = $(`<img	src='images/pieces/pawns/${camelCaseRole}.png'
							alt='${role} pawn'
							class='pawn ${cityKey}${currentStepIs("setup") ? " hidden" : ""}'
							id='${camelCaseRole}Pawn'
							data-role='${role}' />`);
	
	player.$pawnArrow = $(`<div class='pawnArrow ${camelCaseRole} hidden'><div></div></div>`);

	$("#boardContainer")
		.append(player.$pawn)
		.append(player.$pawnArrow);
}

function appendPlayerPanel(player)
{
	const { camelCaseRole, name, role } = player,
		numPlayers = Object.keys(data.players).length,
		$panel = $(`<div class='playerPanel playerPanel${numPlayers} hidden' id='${camelCaseRole}'>
						<div class='name'>${name}</div>
						<div class='role ${camelCaseRole}' title='Click to locate pawn'>
							<p>${role}</p>
						</div>
						<div class='btnCollapseExpand collapse' title='collapse'>
							<p class='numCardsInHand hidden'>— 0 cards in hand —</p>
							<div>&#187;</div>
						</div>
					</div>`);
	
	$panel.appendTo("#playerPanelContainer")
		.children(".role")
		.click(function()
			{
				player.pinpointLocation();
			})
		.siblings(".btnCollapseExpand").click(function() { togglePlayerPanel($(this)) });
	
	player.$panel = $panel;
}

function togglePlayerPanel($btnCollapseExpand)
{
	return new Promise(async resolve =>
	{
		const initialButtonHeight = $btnCollapseExpand.stop().height(),
			collapse = "collapse",
			expand = "expand",
			upChevron = "&#187;",
			downChevron = "&#171;",
			$cards = $btnCollapseExpand.siblings(".playerCard").stop(),
			duration = 200;

		let resultingButtonHeight;
		if ($btnCollapseExpand.hasClass(collapse))
		{
			$btnCollapseExpand.removeClass(collapse)
				.addClass(expand)
				.attr("title", expand)
				.children().first().removeClass("hidden")
				.next().html(downChevron)
				.closest(".playerPanel").addClass("collapsed");
			
			resultingButtonHeight = $btnCollapseExpand.height();

			$cards.slideUp(duration);
			
			await animatePromise(
			{
				$elements: $btnCollapseExpand,
				initialProperties: { height: initialButtonHeight },
				desiredProperties: { height: resultingButtonHeight },
				duration
			});

			$btnCollapseExpand.removeAttr("style");
			resolve();
		}
		else
		{
			$btnCollapseExpand.removeClass(expand)
				.addClass(collapse)
				.attr("title", collapse)
				.children().first().addClass("hidden")
				.next().html(upChevron)
				.closest(".playerPanel").removeClass("collapsed");
			
			
			resultingButtonHeight = $btnCollapseExpand.height();

			$cards.slideDown(duration, function() { $(this).removeAttr("style") });
			
			await animatePromise(
			{
				$elements: $btnCollapseExpand,
				initialProperties: { height: initialButtonHeight },
				desiredProperties: { height: resultingButtonHeight },
				duration
			});

			$btnCollapseExpand.removeAttr("style");
			resolve();
		}
	});
}

function hideTravelPathArrow()
{
	$("#travelPathArrow").stop().addClass("hidden").removeAttr("style");
}

function showTravelPathArrow(actionProperties)
{
	hideTravelPathArrow();
	
	if (!actionProperties)
	{
		if (!data.promptedTravelPathProperties)
			return false;
		
		actionProperties = data.promptedTravelPathProperties;
	}
	
	let stemWidth = getDimension("cityWidth") * 1.2;
	const { originOffset, destinationOffset } = getTravelPathVector(actionProperties),
		baseOffset = getPointAtDistanceAlongLine(originOffset, destinationOffset, stemWidth),
		tipOffset = getPointAtDistanceAlongLine(destinationOffset, originOffset, stemWidth),
		arrowLength = distanceBetweenPoints(baseOffset, tipOffset),
		containerWidth = data.boardWidth,
		containerHeight = data.boardHeight;
	
	// Avoid weird clip-paths that could occur when the arrow is very short.
	if (arrowLength < stemWidth * 4)
		stemWidth = arrowLength / 4;
	
	const clipPath = getArrowClipPath({
			stemWidth,
			baseOffset,
			tipOffset,
			containerWidth,
			containerHeight
		});

	$("#travelPathArrow").css(
		{
			width: containerWidth,
			height: containerHeight,
			clipPath
		})
		.removeClass("hidden");
}

function setTravelPathArrowColor({ airlifting, relocatingResearchStation } = {})
{
	let cssClass;
	if (airlifting)
		cssClass = "airlift";
	else if (relocatingResearchStation)
		cssClass = "researchStationBackground";
	else
		cssClass = getActivePlayer().camelCaseRole;
	
	const $arrow = $("#travelPathArrow");
	
	$arrow.attr("class", `${cssClass}${$arrow.hasClass("hidden") ? " hidden" : ""}`);
}

function getTravelPathVector(actionProperties)
{
	const {
		origin,
		$pawn,
		$researchStation,
		playerToAirlift,
		playerToDispatch,
		destination
	} = actionProperties;
	
	let originOffset,
		destinationOffset,
		player;
	
	if (origin || typeof $researchStation != "undefined") // Research station relocation
	{
		if (typeof $researchStation == "undefined")
		{
			originOffset = origin.getOffset();
			destinationOffset = destination.getOffset();
		}
		else
		{
			originOffset = getCity($researchStation.attr("data-key")).getOffset();
			destinationOffset = $researchStation.offset();
			destinationOffset.left += $researchStation.width() * 0.5;
			destinationOffset.top += $researchStation.height() * 0.5;
		}
	}
	else if (typeof $pawn == "undefined") // Determine player and destination directly from the actionProperties.
	{
		player = actionProperties.player || playerToAirlift || playerToDispatch || getActivePlayer();
		destinationOffset = destination.getOffset();
	}
	else // The pawn itself is the temporary destination.
	{
		player = getPlayer($pawn.data("role"));
		destinationOffset = $pawn.offset();
		destinationOffset.left += data.pawnWidth * 0.5;
		destinationOffset.top += data.pawnHeight * 0.8;
	}

	return {
		originOffset: originOffset || player.getLocation().getOffset(),
		destinationOffset
	};
}

function animateInvalidTravelPath()
{
	return new Promise(async resolve =>
	{
		const $arrow = $("#travelPathArrow"),
			cssClasses = $arrow.attr("class");

		await animatePromise({
			$elements: $arrow.removeClass("hidden airlift"),
			initialProperties: { background: "darkred", opacity: .8 },
			desiredProperties: { opacity: 0 },
			duration: 500,
			easing: "easeInQuint"
		});

		$arrow.attr("class", cssClasses).addClass("hidden").removeAttr("style");
		
		if (data.promptedTravelPathProperties)
			showTravelPathArrow();

		resolve();
	});
}

function bindPawnEvents()
{
	$(".pawn:not(#demoPawn, #placeholderPawn)")
		.draggable(
		{
			disabled: true, // pawn dragging is enabled and disabled according to the game state.
			containment: $("#boardContainer"),
			drag: function() { showTravelPathArrow({ $pawn: $(this) }) }
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
			else if (!actionStepInProgress() || eventTypeIsBeingPrompted(eventTypes.governmentGrant)) // all pawns are disabled
				return false;
			else if (pawnRole !== activeRole && canDispatch)
				fn = tryDispatchPawn;
			else if (pawnRole !== activeRole) // the clicked pawn is disabled
				return false;

			showPlaceholderPawn($this);

			$(window).off("mouseup")
				.mouseup(function()
				{
					$(window).off("mouseup");

					const playerWhosePawnWasDropped = getPlayer(pawnRole);

					if (fn === movementAction)
						fn();
					else
						fn(playerWhosePawnWasDropped);
					
					hidePlaceholderPawn($this);
				});

			// The dragged pawn appear in front of other pawns and disease cubes.
			$this.css("z-index", data.dragPieceZindex);
		});
}

function showPlaceholderPawn($originalPawn)
{
	$("#placeholderPawn")
		.removeAttr("style")
		.attr("src", $originalPawn.attr("src"))
		.offset($originalPawn.offset())
		.removeClass("hidden");
	
	$originalPawn.css("opacity", 0.7);
}
function hidePlaceholderPawn($originalPawn)
{
	$originalPawn.css("opacity", 1);
	$("#placeholderPawn").addClass("hidden");
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

	incrementCubeCount(color = this.color)
	{
		const MAX_CUBES_OF_COLOR_PER_CITY = 3;

		if (this.cubes[color] < MAX_CUBES_OF_COLOR_PER_CITY)
		{
			this.cubes[color]++;
			data.diseaseCubeSupplies[color]--;
		}
	}

	decrementCubeCount(color, numCubesRemoved)
	{
		this.cubes[color] -= numCubesRemoved;
		data.diseaseCubeSupplies[color] += numCubesRemoved;
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
		let $rs,
			stationInitialOffset = false;
		if (isGovernmentGrant)
		{
			$rs = $("#boardContainer > .researchStation.grantStation");
			stationInitialOffset = $rs.offset();

			log("stationInitialOffset:", stationInitialOffset);
			$rs.replaceWith(newResearchStationElement(this.key))
				.removeAttr("style");
			data.researchStationKeys.delete("grantStation");
		}
		else
			$rs = newResearchStationElement(this.key);
		
		this.hasResearchStation = true;
		data.researchStationKeys.add(this.key);
		updateResearchStationSupplyCount();

		if (animate)
		{
			stationInitialOffset = stationInitialOffset || $("#researchStationSupply .researchStation").offset();
			return this.cluster(
				{
					stationInitialOffset,
					animateResearchStation: true,
					animatePawns: true,
					animateCubes: true
				});
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

		return city.cluster({ animateResearchStation: true, stationInitialOffset, animatePawns: true });
	}
	
	setPawnIndices()
	{
		const activePlayer = getActivePlayer(),
			activePawn = activePlayer.$pawn;
		
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
	// Returns a Promise with after the most relevant animation duration.
	cluster(
		{
			animatePawns,
			$pawnToExclude,
			animateCubes,
			animateResearchStation,
			stationInitialOffset,
			stationKeyToExclude
		} = {})
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
			this.clusterResearchStation({ animateResearchStation, stationInitialOffset });

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
		let $this, newOffset;
		i = 0;
		pawns.each(function()
		{
			$this = $(this);
			// pawns in the back row appear behind research stations
			$this[0].style.zIndex = (pawnCount > 2 && i < 2) ? 2 : 4;
			
			newOffset = {
				top: coordsArray[i][0],
				left: coordsArray[i][1]
			};
			
			if (animatePawns)
				$this.animate(newOffset, pawnAnimationDuration, data.easings.pawnAnimation);
			else
				$this.offset(newOffset);
			
			i++;
		});

		// reset to default
		setDuration("pawnAnimation", 250);

		this.clusterDiseaseCubes({ animate: (animateCubes || animatePawns) });

		// Return a Promise with the most relevant duration.
		let ms = 0;
		if (animateResearchStation) // Station animation takes the longest.
			ms = getDuration("stationPlacement");
		else if (animateCubes) // Cube animation takes longer than pawn animation.
			ms = getDuration("cubePlacement");
		else if (animatePawns)
			ms = pawnAnimationDuration;

		return sleep(ms);
	}

	clusterResearchStation({ animateResearchStation, stationInitialOffset } = {})
	{
		log(`clustering ${this.name}'s station`);
		const $researchStation = this.getResearchStation(),
			desiredOffset = this.getOffset(),
			duration = getDuration("stationPlacement");
		
		desiredOffset.top -= data.stationHeight * 0.85;
		desiredOffset.left -= data.stationWidth * 0.8;
		
		if (animateResearchStation)
		{
			if (stationInitialOffset)
				$researchStation.offset(stationInitialOffset);
			
			$researchStation.animate(
			{
				top: desiredOffset.top,
				left: desiredOffset.left,
				width: data.stationWidth
			}, duration, data.easings.stationPlacement);
		}
		else
			$researchStation.offset(desiredOffset);
		
		return sleep(duration);
	}

	clusterDiseaseCubes({ animate } = {})
	{
		const $cubes = $(`.diseaseCube.${this.key}`),
			colors = new Set(),
			coordinates = {},
			cityOffset = this.getOffset("cube"),
			cubeWidth = getDimension("cubeWidth"),
			numPawnsInCity = this.getOccupants().length,
			duration = animate ? getDuration("cubePlacement") : 0;
		
		if (!$cubes.length)
			return;
		
		$cubes.each(function(){ colors.add(getColorClass($(this))) });

		let topAdjustment;
		if (numPawnsInCity > 2
			|| (this.hasResearchStation && ($cubes.length > 1 || numPawnsInCity > 0)))
			topAdjustment = cubeWidth * 1.25;
		else
			topAdjustment = cubeWidth / 2;

		// Get y values to create a column for each color.
		let top;
		for (let color of [...colors])
		{
			top = cityOffset.top + topAdjustment;
			coordinates[color] = [];
			
			for (let i = 0; i < $cubes.filter(`.${color}`).length; i++)
			{
				top -= cubeWidth * 0.5
				coordinates[color].push({ top });
			}
		}

		// Sort colors by column size ascending.
		const colorOrder = [],
			MIN_COL_HEIGHT = 1,
			MAX_CUBES_OF_COLOR_ON_CITY = 3, // 4th cube causes an outbreak.
			MAX_INFECTIONS_PER_OUTBREAK = 6, // Hong Kong / Istanbul both have 6 neighbouring cities.
			MAX_COL_HEIGHT = MAX_CUBES_OF_COLOR_ON_CITY + MAX_INFECTIONS_PER_OUTBREAK;

		for (let i = MIN_COL_HEIGHT; i <= MAX_COL_HEIGHT; i++)
			for (let color in coordinates)
				if (coordinates[color].length === i)
					colorOrder.push(color);

		// Get x values to separate each column.
		let left = cityOffset.left;
		if (colors.size > 1)
			left -= (colors.size - 1) * (cubeWidth / 2);
		
		for (let color of colorOrder)
		{
			for (let coord of coordinates[color])
			{
				coord.left = left;
				coord.width = cubeWidth;
				coord.height = cubeWidth;
			}
			
			left += cubeWidth;
		}

		let $cubesOfColor;
		for (let color in coordinates)
		{
			$cubesOfColor = $cubes.filter(`.${color}`);

			for (let i = 0; i < $cubesOfColor.length; i++)
			{
				if (animate)
					$cubesOfColor.eq(i).animate(coordinates[color][i], getDuration(duration), data.easings.cubePlacement);
				else
					$cubesOfColor.eq(i).offset(coordinates[color][i]);
			}
		}
		return sleep(getDuration(duration));
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
				appendNewCubeToBoard(color, city.key);
				city.incrementCubeCount(color);
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

function pinpointCityFromCard($card)
{
	if ($card.hasClass("sorting"))
		return false;
	
	const city = getCity($card.data("key"));
	pinpointCity(city.key, { pinpointClass: `${city.color}Border` });
}

// shows a city's location by animating 2 rectangles such that their points overlap on the specified city's position
async function pinpointCity(cityKey, { pinpointColor, pinpointClass } = {})
{
	if (data.skipping)
		return;
	
	const city = getCity(cityKey),
		cityOffset = city.getOffset(),
		cWidth = data.cityWidth,
		adj = data.boardWidth * 0.003, // slight adjustment needed for $rectB coords
		$rects = $(".pinpointRect").stop(),
		$rectA = $rects.first(),
		$rectB = $rects.last(),
		duration = getDuration("pinpointCity"),
		easing = data.easings.pinpointCity;

	$rects.attr("class", "pinpointRect hidden");
	resetPinpointRectangles();

	if (pinpointClass)
		$rects.addClass(pinpointClass);
	else if (pinpointColor)
		$rects.css("border-color", pinpointColor);
	else
		$rects.css("border-color", "#fff");
	
	$rects.removeClass("hidden");
	
	await Promise.all(
	[
		animatePromise(
		{
			$elements: $rectA,
			desiredProperties: {
				left: cityOffset.left - cWidth,
				top: cityOffset.top - cWidth
			}, duration, easing
		}),
		animatePromise(
		{
			$elements: $rectB,
			desiredProperties: {
				left: (cityOffset.left + cWidth) - data.boardWidth - adj,
				top: (cityOffset.top + cWidth) - data.boardHeight - adj
			}, duration, easing
		})
	]);

	await sleep(750);

	await animatePromise(
	{
		$elements: $rects,
		desiredProperties: { opacity: 0 },
		duration: 1250
	});
}

// binds click events of .playerCard elements
function bindPlayerCardEvents()
{
	$(".playerCard:not(.eventCard, .epidemic)")
		.off("click")
		.click(function()
		{
			pinpointCityFromCard($(this));
		});
}

async function resolveOutbreaks(events)
{
	const { outbreak, outbreakInfection } = eventTypes,
		pendingOutbreaks = events.filter(e => e.code === outbreak.code),
		color = pendingOutbreaks[0].diseaseColor;
	
	let outbreakEvent,
		originCity,
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
		infections = events.filter(e => (e.code === outbreakInfection.code && e.originKey === outbreakEvent.originKey)
										|| (e.code === outbreak.code
											&& originCity.isConnectedTo(e.originKey)
											&& !events.some(f => f.infectedKey == e.originKey)));
		
		if (resolvingInitalOutbreak)
		{
			resolvingInitalOutbreak = false;
			
			$triggerCube = $triggerCube || appendNewCubeToBoard(color, originCity.key, { prepareAnimation: true });
			
			updateCubeSupplyCount(color, { addend: -1 });
			supplyCubeBounceEffect(color);
			await originCity.clusterDiseaseCubes({ animate: true });
		}
		else
			$triggerCube = $(`.diseaseCube.${color}.${originCity.key}`).last();

		await outbreakTriggerCubeFlash($triggerCube);

		await specialEventAlert(
			{
				title: "OUTBREAK!",
				description: `Origin: ${originCity.name}`,
				eventClass: "epidemic",
				visibleMs: 1500
			});

		await moveOutbreaksMarker(outbreakEvent.outbreakCount, { animate: true });

		if (tooManyOutbreaksOccured()) // defeat -- return early
			return false;

		let affectedCity,
			cubesToDisperse = [],
			triggerCubeNeedsDestination = true,
			preventionOccured = false,
			quarantinePrevention = false,
			medicAutoTreatPrevention = false,
			preventionVisualFadeInMs = 250,
			numInfected = 0;

		for (let inf of infections)
		{			
			affectedCity = getCity(inf.infectedKey || inf.originKey);
			
			if (inf.code === outbreakInfection.code
				&& inf.preventionCode !== data.infectionPreventionCodes.notPrevented)
			{
				if (inf.preventionCode === data.infectionPreventionCodes.quarantine)
					quarantinePrevention = true;
				
				if (inf.preventionCode === data.infectionPreventionCodes.medicAutoTreat)
					medicAutoTreatPrevention = true;
				
				preventionOccured = true;
				continue;
			}
			else
				numInfected++;

			if (triggerCubeNeedsDestination) // The trigger cube has already been placed on the column, and something needs to be done with it.
			{
				$triggerCube.data("destinationKey", affectedCity.key);
				cubesToDisperse.push($triggerCube);

				// The cube supply was already decremented when the trigger cube was placed.
				numInfected--;

				triggerCubeNeedsDestination = false;
			}
			else
				cubesToDisperse.push(appendNewCubeToBoard(color, originCity.key, { outbreakDestinationKey: affectedCity.key, prepareAnimation: true }));
			
			affectedCity.incrementCubeCount(color);
		}
		// remove the handled events
		events = events.filter(e => !(infections.includes(e) || Object.is(outbreakEvent, e)));
		
		if (!cubesToDisperse.length)
		{
			// If there are no cubes to disperse, all connected cities have already
			// had an outbreak as part of resolving the current infection card and are therefore unaffected
			// by this outbreak, which means the outbreak trigger cube must be returned to the supply
			// as it has no destination.
			removeOutbreakCubeHighlights(originCity.key);
			await removeCubesFromBoard(originCity, { color });
			continue;
		}

		if (cubesToDisperse.length > 1)
		{
			updateCubeSupplyCount(color, { addend: -numInfected });
			highlightOutbreakCubes(cubesToDisperse);
			supplyCubeBounceEffect(color);
			await originCity.cluster({ animateCubes: true });
			await sleep(getDuration("longInterval"));
		}

		if (preventionOccured)
		{
			if (quarantinePrevention)
				showQuarantineArea(preventionVisualFadeInMs);
	
			if (medicAutoTreatPrevention)
				showMedicAutoTreatCircle({ fadeInMs: preventionVisualFadeInMs });
		}

		removeOutbreakCubeHighlights(originCity.key);
		await disperseOutbreakCubes(originCity.key, cubesToDisperse);

		if (preventionOccured)
		{
			await sleep(2000);

			if (quarantinePrevention)
				hideQuarantineArea();
			
			if (medicAutoTreatPrevention)
				hideMedicAutoTreatCircle();

			await sleep(500); // instead of awaiting both of the above
		}

		if (diseaseCubeLimitExceeded(color)) // defeat -- return early
			return sleep(getDuration("shortInterval"));
	}

	return sleep(getDuration("shortInterval"));
}

function outbreakTriggerCubeFlash($triggerCube)
{
	const $cubeFaces = $triggerCube.children().not(".cubeBackground"),
		initialColor = $cubeFaces.css("background"),
		strobeColor = "#00a94f";

	return propertyStrobe($cubeFaces,
		{
			initialState: { background: initialColor },
			strobeState: { background: strobeColor },
			numFlashes: 5,
			flashIntervalMs: 150,
			endOnStrobeState: true
		});
}

function highlightOutbreakCubes(cubesToDisperse)
{
	for (let $cube of cubesToDisperse)
		$cube.children().not(".cubeBackground").css("background", "#00a94f");
}

function removeOutbreakCubeHighlights(cityKey)
{
	$(`.diseaseCube.${cityKey}`).children().removeAttr("style");
}

function tooManyOutbreaksOccured()
{
	log("tooManyOutbreaksOccured()");
	const OUTBREAK_LIMIT = 8;

	if (data.outbreakCount >= OUTBREAK_LIMIT)
		return true;
	
	return false;
}

function moveOutbreaksMarker(outbreakCount, { animate } = {})
{
	return new Promise(async resolve =>
		{
			const topPercentages = [0.544, 0.5925, 0.634, 0.6798, 0.7235, 0.7685, 0.8118, 0.852, 0.896], // because the increase in distance from the top is nonlinear
				leftDimension = outbreakCount % 2 === 0 ? "outbreaksMarkerLeft" : "outbreaksMarkerRight", // because the outbreaks track zig-zags
				$marker = $("#outbreaksMarker");
			
			data.outbreakCount = outbreakCount;
		
			if (animate)
			{
				$marker.addClass("mediumGlow");
				await highlightMarkerTrack("outbreaks");
			}

			await animatePromise(
			{
				$elements: $marker,
				desiredProperties: {
					top: (data.boardHeight * topPercentages[outbreakCount]),
					left: getDimension(leftDimension)
				},
				duration: animate ? getDuration("moveMarker") : 0,
				easing: data.easings.moveMarker
			});

			if (animate)
			{
				await sleep(getDuration("mediumInterval"));

				if (tooManyOutbreaksOccured()) // defeat -- return early
				{
					data.gameEndCause = "outbreak";
					return resolve();
				}
				await highlightMarkerTrack("outbreaks", { off: true });
				$marker.removeClass("mediumGlow");
			}

			resolve();
		});
}

function disperseOutbreakCubes(originCityKey, cubesToDisperse)
{
	let destinationKey;
	for (let $cube of cubesToDisperse)
	{
		destinationKey = $cube.data("destinationKey");

		$cube.removeClass(originCityKey)
			.addClass(destinationKey)
			.removeAttr("data-destinationKey");
		
		getCity(destinationKey).clusterDiseaseCubes({ animate: true });
	}
	return sleep(getDuration("cubePlacement"));
}

function appendNewCubeToBoard(color, cityKey, { prepareAnimation, outbreakDestinationKey } = {})
{
	const $newCube = newDiseaseCubeElement(color, cityKey)
		.appendTo("#boardContainer");
	
	if (outbreakDestinationKey)
		$newCube.data("destinationKey", outbreakDestinationKey);

	if (prepareAnimation)
	{
		const $cubeSupply = $(`#${color}SupplyCube`),
			startingWidth = $cubeSupply.width(),
			startingProperties = $cubeSupply.offset();
		
		startingProperties.width = startingWidth;
		startingProperties.height = startingWidth;
		
		$newCube.css(startingProperties);
	}
	
	return $newCube;
}

function newDiseaseCubeElement(color, cityKey)
{
	const $diseaseCube =  $(`<div class='diseaseCube'>
								<div class='cubeBackground'></div>
								<div class='cubeTop'></div>
								<div class='cubeLeft'></div>
								<div class='cubeRight'></div>
							</div>`);
	
	if (color)
		$diseaseCube.addClass(color);
	
	if (cityKey)
		$diseaseCube.addClass(cityKey);
	
	return $diseaseCube;
}

async function removeCubesFromBoard(city, { $clickedCube, color, numToRemove } = {})
{
	let $cubesToRemove;

	if (!color)
		color = city.color;
	
	if (!numToRemove)
		numToRemove = 1;
	else if (numToRemove === "all")
		numToRemove = city.cubes[color];

	if (numToRemove == 1)
		$cubesToRemove = $clickedCube || $(`.diseaseCube.${city.key}.${color}`).last();
	else
		$cubesToRemove = $(`.diseaseCube.${city.key}.${color}`);
	
	$cubesToRemove.addClass("removing");

	const $supplyCube = $(`#${color}SupplyCube`),
		desiredProperties = $supplyCube.offset(),
		supplyCubeWidth = $supplyCube.width(),
		duration = getDuration("cubePlacement") * 0.5;

	desiredProperties.width = supplyCubeWidth;
	desiredProperties.height = supplyCubeWidth;

	let $cube;
	while ($cubesToRemove.length)
	{
		$cube = $cubesToRemove.last();

		await animatePromise({
			$elements: $cube,
			desiredProperties,
			duration,
			easing: data.easings.cubePlacement
		});

		$cube.remove();
		updateCubeSupplyCount(color, { addend: 1 });

		$cubesToRemove = $(`.diseaseCube.removing`);

		supplyCubeBounceEffect(color);
	}

	return city.clusterDiseaseCubes({ animate: true });
}

function supplyCubeBounceEffect(diseaseColor)
{
	return new Promise(async resolve =>
	{
		const $supplyCube = $(`#${diseaseColor}SupplyCube`),
			$supplyContainer = $(`#${diseaseColor}Supply`).parent();

		// Reset supply cube in case it is still mid-animation.
		$supplyCube.stop().removeAttr("style").appendTo($supplyContainer);
		resizeCubeSupplies();

		const supplyCubeOffset = $supplyCube.offset(),
			supplyCubeWidth = $supplyCube.width(),
			SIZE_INCREASE_FACTOR = 1.2,
			OFFSET_ADJUSTMENT = supplyCubeWidth * ((SIZE_INCREASE_FACTOR - 1) / 2),
			expandedWidth = supplyCubeWidth * SIZE_INCREASE_FACTOR;

		// Make the cube slightly bigger, then animate it back to its normal size with a bounce effect.
		await animatePromise(
		{
			$elements: $supplyCube.appendTo("body"),
			initialProperties: { 
				position: "absolute",
				top: supplyCubeOffset.top - OFFSET_ADJUSTMENT,
				left: supplyCubeOffset.left - OFFSET_ADJUSTMENT,
				width: expandedWidth,
				height: expandedWidth
			},
			desiredProperties: {
				...supplyCubeOffset,
				...{ width: supplyCubeWidth, height: supplyCubeWidth }
			},
			duration: getDuration(400),
			easing: "easeOutBounce"
		});

		$supplyCube.removeAttr("style").appendTo($supplyContainer);
		resizeCubeSupplies();
		
		resolve();
	});
}

function updateCubeSupplyCount(cubeColor, { addend, newCount } = {})
{
	const $supplyCount = $(`#${cubeColor}Supply`),
		updatedCount = !isNaN(newCount) ? newCount : parseInt($supplyCount.html()) + addend;
	
	$supplyCount.html(updatedCount);
}

function bindDiseaseCubeEvents()
{
	unbindDiseaseCubeEvents();
	
	const player = getActivePlayer(),
		{ cityKey } = player,
		$cubes = $("#boardContainer").children(`.${cityKey}.diseaseCube`);
	
	$cubes.attr("title", "Click to Treat Disease")
		.hover(function() { markTreatableDiseaseCubes($(this)) },
			function() { unmarkTreatableDiseaseCubes($cubes) })
		.click(function()
		{
			unbindDiseaseCubeEvents();
			resetActionPrompt();
			treatDisease($(this));
		});
	
	let $this;
	$cubes.each(function()
	{
		$this = $(this);
		if ($this.is(":hover"))
			markTreatableDiseaseCubes($this);
	});

	const $btnTreatDisease = $(`#btnTreatDisease`);
	$btnTreatDisease.hover(
		function()
		{
			if (!$(this).hasClass("btnDisabled"))
				markTreatableDiseaseCubes($cubes.last(), { hoveredOverButton: true });
		},
		function() { unmarkTreatableDiseaseCubes($cubes) });

	if ($btnTreatDisease.is(":hover") && !$btnTreatDisease.hasClass("btnDisabled"))
		markTreatableDiseaseCubes($cubes.last(), { hoveredOverButton: true });
}

function markTreatableDiseaseCubes($hoveredCube, { hoveredOverButton } = {})
{
	const player = getActivePlayer();

	if (hoveredOverButton)
	{
		const city = player.getLocation();
		let numDiseaseColorsOnCity = 0;

		for (let color in city.cubes)
			if (city.cubes[color] > 0)
				numDiseaseColorsOnCity++;
		
		if (numDiseaseColorsOnCity !== 1)
			return false;
	}
	
	const diseaseColor = getColorClass($hoveredCube);
	
	let $cubesToMark;
	if (player.role === "Medic" || data.cures[diseaseColor] === "cured")
		$cubesToMark = $(`.${player.cityKey}.diseaseCube.${diseaseColor}`);
	else
		$cubesToMark = $hoveredCube;
	
	$cubesToMark.append("<div class='cubeSlash'></div>")
		.addClass("cubeToRemove");
}

function unmarkTreatableDiseaseCubes($cubes)
{
	$cubes.removeClass("cubeToRemove")
		.children(".cubeSlash").remove();
}

function unbindDiseaseCubeEvents()
{
	$("#boardContainer").children(".diseaseCube")
		.unbind("click mouseenter mouseleave")
		.removeAttr("title")
		.removeClass("cubeToRemove")
		.children(".cubeSlash").remove();
	
	$("#btnTreatDisease").off("mouseenter mousleave");
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
		const $banner = $("#specialEventBanner"),
			duration = getDuration("specialEventBannerReveal"),
			easing = data.easings.specialEventBannerReveal;
		
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
			duration,
			easing
		});
		
		await sleep(visibleMs || 2500);
		
		await animatePromise(
		{
			$elements: $banner,
			desiredProperties: { left: $(window).width() },
			duration,
			easing
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
	positionInfectionPanelComponents();
	await dealFaceDownInfCard(card.index);
	await revealInfectionCard(card);

	const color = getCity(card.cityKey).color;

	if (preventionCode == 0)
	{
		await placeDiseaseCubes(card);

		if (diseaseCubeLimitExceeded(color))
			return diseaseCubeDefeatAnimation(color);
	}
	else
		await infectionPreventionAnimation(card);

	if (triggeredOutbreakEvents.length)
	{
		await resolveOutbreaks(triggeredOutbreakEvents);
		if (tooManyOutbreaksOccured())
			return outbreakDefeatAnimation();
		
		if (diseaseCubeLimitExceeded(color))
			return diseaseCubeDefeatAnimation(color);
	}
		
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
	const $highlighters = $("." + trackName + "Highlight");

	await animatePromise(
		{
			$elements: $highlighters.removeClass("hidden"),
			initialProperties: { opacity: (off ? 0.5 : 0) },
			desiredProperties: { opacity: (off ? 0 : 0.5) },
			duration: (off ? 300 : 600)
		}
	);

	if (off)
		$highlighters.addClass("hidden");

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
			$marker.offset({ left: (data.boardWidth * spaceLocations[epidemicCount - 1]) })
				.addClass("smallGlow");
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
			await sleep(getDuration("mediumInterval"));
			$marker.removeClass("smallGlow");
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
	
	unbindInfectionDiscardHover();
	
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
					maxDistance: Math.floor(deckWidth * 0.5),
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

function shuffleAnimation($container, $elements, { numShuffles } = {})
{
	return new Promise(async resolve =>
	{
		const containerWidth = $container.width(),
			containerHeight = $container.height(),
			containerOffset = $container.offset(),
			elementWidth = $elements.first().width(),
			centerOfContainer = {
				top: containerOffset.top + containerHeight / 2 - elementWidth / 2,
				left: containerOffset.left + containerWidth / 2 - elementWidth / 2
			},
			minDistance = Math.ceil(elementWidth / 4),
			maxDistance = containerHeight < containerWidth ? containerHeight / 2 : containerWidth / 2,
			easing = "easeInOutQuad";
		
		await animatePromise(
			{
				$elements,
				desiredProperties: centerOfContainer,
				duration: getDuration(500),
				easing: easing
			});

		if ($elements.length === 1)
			return resolve();
		
		for (let i = 0; i < (numShuffles || 3); i++)
		{
			await randomizeOffsets($elements,
				{
					minDistance,
					maxDistance,
					duration: getDuration(100),
					easing
				});
			
			await animatePromise(
				{
					$elements,
					desiredProperties: centerOfContainer,
					duration: getDuration(100),
					easing
				});
		}
		resolve();
	});
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
	log("getPlayerWithTooManyCards()");
	let player;
	for (let rID in data.players)
	{
		player = data.players[rID];
		log(`checking ${player.role}...`);
		log("cardKeys: ", player.cardKeys);
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
		if (player)
		{
			await player.expandPanelIfCollapsed();
			await sleep(getDuration("shortInterval"));
		}
		
		let completionInterval = getDuration("discardPlayerCard");
		if (player && Array.isArray(cardKeys))
		{
			for (let cardKey of cardKeys)
				await animateDiscardPlayerCard(player.getCardElementFromHand(cardKey));
			
			completionInterval *= (1 - data.playerCardAnimationInterval);
		}
		else if ($card.length === 1)
		{
			animateDiscardPlayerCard($card);

			// Increase completionInterval to ensure that the animation finishes completely before the Promise is resolved.
			completionInterval += 50;
		}

		await sleep(completionInterval);
		resolve();
	});
}

function animateDiscardPlayerCard($card, { removingContingencyCard } = {})
{
	const $container = removingContingencyCard ? $("#removedPlayerCards") : $("#playerDiscard"),
		$guide = $container.children(".title").first(),
		guideOffset = $guide.offset(),
		initialOffset = $card.offset(),
		initialCardProperties = {
			width: $card.width(),
			position: "absolute",
			zIndex: 10
		};

	if (removingContingencyCard)
		initialCardProperties.border = "none";
	
	$card.appendTo("body")
		.css(initialCardProperties)
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
		
		const color = getCity(card.cityKey).color;
		// if any events are left after shifting the first, an outbreak occured.
		if (events.length)
		{
			await resolveOutbreaks(events);
			if (tooManyOutbreaksOccured())
				return outbreakDefeatAnimation();
			
			if (diseaseCubeLimitExceeded(color))
				return diseaseCubeDefeatAnimation(color);
		}
		else
		{
			if (card.preventionCode === data.infectionPreventionCodes.notPrevented)
			{
				const interval = getDuration("shortInterval");

				await sleep(interval);
				await placeDiseaseCubes(card);
				await sleep(interval);

				if (diseaseCubeLimitExceeded(color))
					return diseaseCubeDefeatAnimation(color);
			}
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
		return sleep(0);
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
		eventClass: "medic"
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

	await sleep(getDuration("mediumInterval"));

	await specialEventAlert(
	{
		title: "INFECTION PREVENTED",
		description: `${getCity(cityKey).name} is quarantined.`,
		eventClass: "quarantineSpecialist",
		visibleMs: 1500
	});

	await sleep(getDuration("shortInterval"));
	
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
		let city,
			diseaseColorIsEradicated,
			$card;
		for (let i = 0; i < numCardsDrawnThisTurn; i++)
		{
			city = getCity(infectionEvents[i].cityKey);
			diseaseColorIsEradicated = diseaseIsEradicated(city.color)
			$card = $infectionContainer.find(".infectionCard").eq(i);
			
			$card.attr("data-key", city.key)
				.click(function() { pinpointCityFromCard($card) })
				.find(".infectionCardImg")
				.attr("src", `images/cards/infectionCard_${city.color}${diseaseColorIsEradicated ? "_eradicated" : ""}.png`)
				.siblings(".cityName")
				.html(city.name.toUpperCase())
				.siblings(".veil").remove();
			
			setInfectionCardTitleAttribute($card, diseaseColorIsEradicated, city);
		}
	}

	return numCardsDrawnThisTurn;
}

async function finishInfectionStep()
{
	log("finishInfectionStep()");
	log("nextStep: ", data.nextStep);
	const $container = getInfectionContainer(),
		$btn = $container.find(".btnContinue");
	
	if (currentStepIs("infect cities"))
	{
		enableEventCards();
	
		await buttonClickPromise($btn.html("CONTINUE"),
		{
			beforeClick: "show",
			afterClick: "hide"
		});
		disableEventCards();
	}
	else
		await sleep(getDuration("longInterval"));

	let $cards = $container.find(".infectionCard");
	while ($cards.length)
	{
		await discardInfectionCard($cards.first());
		$cards = $container.find(".infectionCard");
	}
	
	if (currentStepIs("setup"))
	{
		$(".drawnInfectionCard").remove(); // sometimes skipping setup leaves these unremoved.
		$container.removeAttr("style").addClass("hidden");
		return sleep(getDuration(500));
	}

	$container.fadeOut(450);
	$("#indicatorContainer").fadeOut(500, function()
	{
		$("#indicatorContainer").removeAttr("style").addClass("hidden");
		nextTurn();
	});
}

function getInfectionContainer()
{
	let containerID;

	if (eventTypeIsBeingPrompted(eventTypes.forecastPlacement))
		containerID = "forecastCards";
	else if (currentStepIs("setup"))
		containerID = "initialInfectionsContainer";
	else if (currentStepIs("infect cities"))
		containerID = "infectCitiesContainer";
	else if (currentStepIs("epIncrease")
		|| currentStepIs("epInfect")
		|| currentStepIs("epIntensify"))
		containerID = "epidemicContainer";
	
	return $("#" + containerID);
}

function getInfectionCardTextStyle()
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
				getDuration(duration || 125),
				function()
				{
					$card.insertAfter($discardTitle)
						.removeAttr("style")
						.children(".infectionCardContents")
						.removeAttr("style")
						.children(".cityName")
						.css(getInfectionCardTextStyle());
						
					$card.height(getDimension("infDiscardHeight"));

					resolve();
				});
	});
}

function positionInfectionPanelComponents()
{
	const $container = getInfectionContainer().removeAttr("style"),
		$cards = $container.find(".infectionCard"),
		$veils = $container.find(".veil"),
		cardHeight = getDimension("infCardHeight"),
		cardNameTop = getDimension("infCardNameTop"),
		cardFontSize = getDimension("infCardFont");
	
	if (currentStepIs("setup"))
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
			availableHeight = data.boardHeight - $("#setupProcedureContainer").height();
			
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

function initialInfectionStep()
{
	return new Promise(async resolve =>
	{
		prepareInitialInfections();
		await dealInitialInfectionCards();
		await finishInfectionStep();

		finishedSetupStep();
		resolve();
	})
}

function prepareInitialInfections()
{
	const $initialInfContainer = $("#initialInfectionsContainer"),
		NUM_GROUPS = 3,
		GROUP_SIZE = 3;
	
	let $infGroup = $initialInfContainer.children(".infGroup").first();
	for (let i = 0; i < NUM_GROUPS; i++)
	{
		for (let j = 0; j < GROUP_SIZE; j++)
			$infGroup.append(newInfectionCardTemplate());
		
		$infGroup = $infGroup.next(".infGroup");
	}
	
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
				await sleep(getDuration("shortInterval"));
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
		
		for (let i = 0; i < $groupInfRate.attr("data-numCubes"); i++)
			$groupInfRate.append(newDiseaseCubeElement());

		$groupInfRate.removeClass("hidden");
		makeElementsSquare($groupInfRate.children());

		$groupInfRate.animate(
		{
			marginLeft: computeGroupInfRateMargin($groupInfRate)
		},
		getDuration("shortInterval"),
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
			function() { resolve() });
	});
}

async function revealInfectionCard({ cityKey, index }, { forecasting } = {})
{
	return new Promise(resolve =>
	{
		const $card = getInfectionContainer().find(".infectionCard").eq(index),
			city = getCity(cityKey),
			diseaseColorIsEradicated = diseaseIsEradicated(city.color),
			$veil = $card.find(".veil"),
			$cardback = forecasting ? $(".drawnInfectionCard").eq(index) : $(".drawnInfectionCard").first();
		
		// The first $cardback is removed if not forecasting because each one is removed after fading out.
		$cardback.fadeOut(getDuration("revealInfCard"), function() { $(this).remove() });
		
		$card.attr("data-key", cityKey)
			.click(function() { pinpointCityFromCard($card) })
			.find(".infectionCardImg")
			.attr("src", `images/cards/infectionCard_${city.color}${diseaseColorIsEradicated ? "_eradicated" : ""}.png`)
			.siblings(".cityName")
			.html(city.name.toUpperCase());
		
		if (diseaseColorIsEradicated)
			$card.addClass("eradicated");
		
		setInfectionCardTitleAttribute($card, diseaseColorIsEradicated, city);
		
		$veil.animate({ left: "+=" + getDimension("diseaseIcon", { compliment: true }) },
			getDuration("revealInfCard"),
			data.easings.revealCard,
			() =>
			{
				$veil.remove();

				if (!data.fastForwarding && !diseaseColorIsEradicated && !forecasting)
					pinpointCity(cityKey, { pinpointClass: `${city.color}Border` });
				
				resolve();
			});
	});
}

function setInfectionCardTitleAttribute($card, diseaseColorIsEradicated, city)
{
	let title = "Infection card";
	if (diseaseColorIsEradicated)
		title +=  `
The ${getColorWord(city.color)} disease is eradicated
(no new disease cubes will be placed).`;
	else
		title += `
Click to locate ${city.name}`;

	$card.attr("title", title);
}

function placeDiseaseCubes({ cityKey, numCubes = 1 })
{
	return new Promise(async resolve =>
	{
		const city = getCity(cityKey),
			cubeSupplyOffset = $(`#${city.color}SupplyCube`).offset();
		
		for (let i = numCubes; i > 0; i--)
		{
			updateCubeSupplyCount(city.color, { addend: -1 });
			
			placeDiseaseCube(city, cubeSupplyOffset);
			await sleep(getDuration("cubePlacement") * 0.45);
		}
		
		// let the last cube animation finish completely before clustering the city
		await sleep(getDuration("cubePlacement") * 0.6);
		
		if (data.fastForwarding)
			queueCluster(cityKey);
		
		resolve(false);
	});
}

function placeDiseaseCube(city, cubeSupplyOffset)
{
	return new Promise(async resolve =>
	{
		appendNewCubeToBoard(city.color, city.key, { prepareAnimation: true })
			.offset(cubeSupplyOffset)
		
		city.incrementCubeCount();

		if (!data.fastForwarding)
		{
			supplyCubeBounceEffect(city.color);
			await city.clusterDiseaseCubes({ animate: true });
		}
		
		resolve();
	});
}

function newCityButton(cityKey)
{
	const city = getCity(cityKey),
		$btn = $(`<div class='button actionPromptOption' data-key='${cityKey}'>
					${city.name}
				</div>`);
	
	$btn.hover(function() { showTravelPathArrow({ destination: city }) },
	function() { hideTravelPathArrow() })
	.click(function() { $(this).off("mousenter mouseleave") }); // Prevents the travel path arrow from being hidden.

	return $btn;
}

function newPlayerCardElement(cardKey, { noTooltip } = {})
{
	let city,
		cardType,
		tooltip,
		cardName;
	
	if (isEventCardKey(cardKey))
	{
		cardType = "eventCard";
		tooltip = "Event card";
		cardName = data.eventCards[cardKey];
	}
	else if (isEpidemicKey(cardKey))
	{
		cardType = "epidemic";
		tooltip = "Epidemic card";
		cardName = "EPIDEMIC";
	}
	else
	{
		city = getCity(cardKey);
		cardType = city.color;
		cardName = city.name;
		tooltip = `City card
Click to locate ${city.name}`;
	}

	return $(`<div class='playerCard ${cardType}' title='${ noTooltip ? "" : tooltip }' data-key='${cardKey}'>${cardName.toUpperCase()}</div>`);
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

async function discoverACure(cardKeys)
{
	resetActionPrompt();
	disableActions();
	
	const player = getActivePlayer();
	await player.expandPanelIfCollapsed();
	
	const diseaseColor = getDiseaseColor(cardKeys[0]),
		{ discoverACure, eradication, autoTreatDisease } = eventTypes,
		{ 0: events } = await Promise.all([
			requestAction(discoverACure,
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

	if (data.gameEndCause)
		return endGame();

	// The auto-treat event (if there is one) would have been the cause of eradication (if eradication occured),
	// so we pass both here.
	if (autoTreatEvents.length)
		await animateAutoTreatDiseaseEvents([ ...autoTreatEvents, ...eradicationEvents ]);

	proceed();
}

async function outOfPlayerCardsDefeatAnimation($cardDrawContainer)
{
	const $playerDeckContainer = $("#playerDeck");
	
	$cardDrawContainer.append("<h2>Out of cards!</h2>");
	unhide($cardDrawContainer);

	await propertyStrobe($playerDeckContainer,
	{
		initialState: { backgroundColor: $playerDeckContainer.css("background-color") },
		strobeState: { backgroundColor: "#8a181a" },
		numFlashes: 10,
		flashIntervalMs: 125,
		endOnStrobeState: true
	});

	endGame();
}

function diseaseCubeLimitExceeded(color)
{
	log(color, "cubes left: ", data.diseaseCubeSupplies[color]);
	return data.gameEndCause === "cubes" && data.diseaseCubeSupplies[color] < 0;
}

async function diseaseCubeDefeatAnimation(diseaseColor)
{
	executePendingClusters();
	
	const $cubeSupply = $("#cubeSupplies");

	await propertyStrobe($cubeSupply,
	{
		initialState: { backgroundColor: $cubeSupply.css("background-color") },
		strobeState: { backgroundColor: "#8a181a" },
		numFlashes: 10,
		flashIntervalMs: 125,
		endOnStrobeState: true
	});

	$("#curtain").find(".cubesDefeat > span").html(getColorWord(diseaseColor));
	endGame();
}

async function outbreakDefeatAnimation()
{
	log("outbreakDefeatAnimation()");
	await propertyStrobe($("#outbreaksTrackHighlight").removeClass("hidden"),
	{
		initialState: { opacity: 0 },
		strobeState: { opacity: 0.5 },
		numFlashes: 5,
		flashIntervalMs: 125,
		endOnStrobeState: true
	});

	endGame();
}

async function endGame()
{
	log(`endGame(${data.gameEndCause})`);
	const $curtain = $("#curtain"),
		hidden = "hidden";

	$curtain.children("p").addClass(hidden);

	let selectorToShow;
	if (data.gameEndCause === "victory")
		selectorToShow = "#victory";
	else
		selectorToShow = `#defeat, .${data.gameEndCause}Defeat`;

	$curtain.find(selectorToShow).removeClass(hidden)
		.first().css("margin-top", data.boardHeight / 3);
	
	await animatePromise(
	{
		$elements: $curtain.removeAttr("style").removeClass("hidden"),
		initialProperties: { opacity: 0 },
		desiredProperties: { opacity: 0.9 },
		duration: 1000,
		easing: "easeInOutQuint"
	});

	// TODO: show options for what to do after the game ends
}

function animateDiscoverCure(diseaseColor, diseaseStatus)
{
	return new Promise(async resolve =>
	{
		const $cureMarker = newCureMarker(diseaseColor, diseaseStatus, { isForReveal: true });

		$cureMarker.css("opacity", 0.1)
			.animate({ opacity: 1 }, getDuration("specialEventBannerReveal") * 8, "easeOutQuad");

		let description = "";
		if (data.cures.remaining > 0)
			description = `Discover ${data.cures.remaining} more to win the game.`;

		await specialEventAlert(
		{
			title: "DISCOVERED A CURE!",
			description,
			eventClass: diseaseColor
			
		});

		if (diseaseStatus === "eradicated")
		{
			description = `No new disease cubes of this color will be placed on the board.`;
			await specialEventAlert(
				{
					title: "DISEASE ERADICATED!",
					description,
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
		
		if (data.cures.remaining > 0)
			await sleep(1500);
		
		resolve();
	});
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
	const $discardsContainer = $("#playerDiscard"),
		$discardPileTitle =  $discardsContainer.children(".title").first(),
		$removedCardsTitle = $discardsContainer.children("#removedPlayerCards").children(".title").first();
	
	let player,
		$card;

	for (let card of playerCards)
	{
		$card = newPlayerCardElement(card.key);

		if (card.pileID in data.players)
		{
			player = data.players[card.pileID];
			player.addCardKeysToHand(card.key);
			player.appendCardToHand($card);
		}
		else if (card.pile === "discard")
			$card.insertAfter($discardPileTitle);
		else if (card.pile === "removed")
			$card.insertAfter($removedCardsTitle);
		else if (card.pile === "contingency")
		{
			$card.appendTo($("#contingencyPlanner").find(".role"))
				.addClass("contingency");
			
			getPlayer("Contingency Planner").contingencyKey = card.key;
		}
	}
	
	bindPlayerCardEvents();
	setPlayerDeckImgSize();
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
		
		setInfectionCardTitleAttribute($card, wasEradicated, city);
		
		if (card.pile === "discard")
			$discardPileTitle.after($card);
		else if (card.pile === "removed")
			$removedCardsContainer.append($card);
	}

	if ($removedCardsContainer.children(".infectionCard").length)
		$removedCardsContainer.removeClass("hidden");
	
	$discardPile.find(".infectionCard")
		.click(function() { pinpointCityFromCard($(this)) });
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
			discoverACure,
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
			discoverACure,
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
		setCurrentStep("setup");
		data.nextStep = "action 1";
	}

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
			allRoles,
			startingHandPopulations,
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

	data.startingHandPopulations = startingHandPopulations;
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

	bindPlayerDeckHover();
	bindInfectionDeckHover();
	
	if (forecastInProgress())
	{
		data.currentStep.indicate();
		indicatePromptingEventCard();
	}
	else if (currentStepIs("setup"))
	{
		data.allRoles = allRoles;
		animateNewGameSetup();
	}
	else
		proceed();
}

function bindPlayerDeckHover()
{
	$("#playerDeck").off("mouseenter")
		.hover(function()
		{
			if (currentStepIs("setup"))
				return;
			
			$(this).attr("title", `${data.numPlayerCardsRemaining} card${data.numPlayerCardsRemaining != 1 ? "s" : ""}`);
		});
}

async function animateRoleDetermination()
{
	const $container = $("#roleSetupContainer"),
		slotMachines = [];

	$container.parent().removeClass("hidden");

	let player, $roleContainer;
	for (let rID in data.players)
	{
		player = data.players[rID];
		$roleContainer = $("<div class='roleContainer'></div>").appendTo($container);

		slotMachines.push(new RoleSlotMachine(player, $roleContainer));
	}
	
	for (let slotMachine of slotMachines)
	{
		slotMachine.pull();
		await sleep(getDuration(400));
	}

	const DOUBLE_SLOT_MACHINE_DURATION = getDuration(slotMachines[0].duration * 2);
	await Promise.race([
		sleep(DOUBLE_SLOT_MACHINE_DURATION),
		detectSkipping(DOUBLE_SLOT_MACHINE_DURATION)
	]);

	let slotMachine;
	for (let i = 0; i < slotMachines.length; i++)
	{
		slotMachine = slotMachines[i];
		
		if (i < slotMachines.length - 1)
			slotMachine.extractResult();
		else
			await slotMachine.extractResult();
	}

	finishedSetupStep();
}

function detectSkipping(detectionWindowMs)
{
	return new Promise(async resolve =>
	{
		for (let i = 0; i < detectionWindowMs; i++)
		{
			if (data.skipping)
				return resolve();
			
			await sleep(1);
		}

		resolve();
	});
}

class RoleSlotMachine
{
	constructor(player, $container)
	{
		this.player = player;

		this.$container = $container;

		this.$playerName = $(`<p class='name'>${this.player.name}</div>`);
		this.$container.append(this.$playerName);

		this.$slotMachine = $(`<div class='slotMachine'>
								<div class='slotMachineShadow'></div>
								<div class='selectionWindow'></div>
							</div>`);
		
		this.NUM_VISIBLE_OPTIONS = 5;
		this.MIDDLE_OPTION_INDEX = (this.NUM_VISIBLE_OPTIONS - 1) / 2;
		
		const roleOptions = this.randomizeRoleOrder([...data.allRoles], player.role);
		this.numOptions = roleOptions.length;
		
		let $optionGroup;
		for (let i = 0; i < 3; i++)
		{
			$optionGroup = $(`<div class='optionGroup optionGroup${i}'></div>`);

			for (let role of roleOptions)
				$optionGroup.append(`<div class='slotMachineOption ${toCamelCase(role)}'>${role}</div>`);

			this.$slotMachine.append($optionGroup);
		}
		
		this.$optionGroups = this.$slotMachine.children(".optionGroup");
		this.$options = this.$slotMachine.find(".slotMachineOption");
		
		this.$slotMachine.appendTo(this.$container);
		this.resizeElements();

		this.startingIndex = this.randomizeStartingIndex();
		
		this.duration = 3000;
		this.elapsedMs = 0;
		this.msPerRevolution = 250;
		this.speedReductionRate = 1.02;

		return this;
	}

	// Randomizes the order of all role options,
	// EXCEPT the roleToLandOn which is placed at this.MIDDLE_OPTION_INDEX.
	randomizeRoleOrder(roleOptions, roleToLandOn)
	{
		const randomizedRoles = [];

		roleOptions.splice(roleOptions.indexOf(roleToLandOn), 1);

		let i = 0,
			roleIndex,	
			role;
		
		while (roleOptions.length)
		{
			if (i === this.MIDDLE_OPTION_INDEX)
				role = roleToLandOn;
			else
			{
				roleIndex = randomNumberBetween(0, roleOptions.length - 1);
				role = roleOptions[roleIndex];
				roleOptions.splice(roleIndex, 1);
			}
			
			randomizedRoles.push(role);
			i++;
		}

		return randomizedRoles;
	}

	resizeElements()
	{
		const $selectionWindow = this.$slotMachine.children(".selectionWindow"),
			selectionWindowBorderHeight = getLeadingNumber($selectionWindow.css("border-top")),
			optionBorderHeight = getLeadingNumber($(".slotMachineOption").css("border-bottom"));

		this.optionHeight = this.$options.first().height() + optionBorderHeight;

		const selectionWindowHeight = this.optionHeight + (selectionWindowBorderHeight * 2) - optionBorderHeight,
			selectionWindowOffsetTop = this.$slotMachine.offset().top + (this.optionHeight * this.MIDDLE_OPTION_INDEX) - selectionWindowBorderHeight;
		
		$selectionWindow.css(
			{
				height: selectionWindowHeight,
				top: selectionWindowOffsetTop
			});

		return this;
	}

	async pull()
	{
		await this.revolveOnce({ firstRevolution: true });

		while (this.elapsedMs < this.duration)
			await this.revolveOnce();
		
		await this.finalRevolution();
	}

	randomizeStartingIndex()
	{
		const startingIndex = randomNumberBetween(0, this.numOptions);

		this.setIndex(startingIndex);

		return startingIndex;
	}

	setIndex(index)
	{
		const marginTop = -((this.numOptions * 2 - index) * this.optionHeight) + "px";

		this.$optionGroups.first().css({ marginTop });
	}

	revolveOnce({ firstRevolution } = {})
	{
		return new Promise(async resolve =>
		{
			let numOptionsThisRevolution = this.numOptions;
			
			if (firstRevolution)
				numOptionsThisRevolution -= this.startingIndex;
			else
				this.setIndex(0);
			
			for (let i = 0; i < numOptionsThisRevolution; i++)
				this.elapsedMs += await this.revolveToNextOption();
			
			resolve();
		});
	}

	revolveToNextOption({ maintainSpeed } = {})
	{
		return new Promise(resolve =>
		{
			const self = this,
				duration = this.msPerRevolution / this.numOptions,
				easing = "linear";

			this.$optionGroups.first()
				.animate({ marginTop: "+=" + self.optionHeight + "px" },
					duration, easing,
					function()
					{
						if (!maintainSpeed)
							self.reduceSpeed();
						
						return resolve(duration);
					});
		});
	}

	reduceSpeed()
	{
		const MIN_MS_PER_REVOLUTION = 1750;

		if (this.speedReductionRate >= 1)
			this.msPerRevolution *= this.speedReductionRate;
		else
			this.msPerRevolution = MIN_MS_PER_REVOLUTION;
	}

	finalRevolution()
	{
		return new Promise(async resolve =>
		{
			const self = this,
				startingIndex = 5;
			
			this.setIndex(0);
			
			for (let i = 0; i < startingIndex; i++)
				await self.revolveToNextOption({ maintainSpeed: true });
		
			this.$optionGroups.first()
				.animate({ marginTop: "+=" + self.optionHeight * (self.numOptions - startingIndex) + "px" },
					self.duration,
					"easeOutElastic",
					resolve());
		});
	}

	async extractResult()
	{
		const $role = this.$options.filter(`.${this.player.camelCaseRole}`).first(),
			roleOffset = $role.offset(),
			self = this;
		
		roleOffset.top += this.optionHeight * this.numOptions;
		
		$role.appendTo(this.$container.parent())
			.offset(roleOffset)
			.addClass("role");

		await animatePromise(
		{
			$elements: this.$slotMachine,
			desiredProperties: { opacity: 0 }
		});

		await animatePromise(
		{
			$elements: $role,
			desiredProperties: { top: "-=" + (this.optionHeight * this.MIDDLE_OPTION_INDEX) },
			duration: getDuration(600),
			easing: "easeOutBounce"
		});

		this.$container
			.height(self.$container.height())
			.attr("data-role", this.player.rID);
		this.$slotMachine.remove();

		$role.insertAfter(this.$playerName)
			.removeAttr("style")
			.hover(function()
			{
				self.player.showRoleCard($role);
			},
			function()
			{
				$(".roleCard").remove();
			});
	}
}

async function animateNewGameSetup()
{
	const setupSteps = [
			animateRoleDetermination,
			animateInitialDeal,
			animateDetermineTurnOrder,
			animatePreparePlayerDeck,
			initialInfectionStep,
			placePawnsInAtlanta,
			placeResearchStationInAtlanta
		],
		interval = getDuration("shortInterval");
	
	$("#skipSetupButtons").removeClass("hidden");
	bindBtnSkipSetupStepClick();
	bindBtnSkipSetupClick();
	
	for (let step of setupSteps)
	{
		highlightNextSetupStep();
		await sleep(getDuration(interval));
		await step();
		await sleep(getDuration(interval))
	}
	
	beginGame();
}

function finishedSetupStep()
{
	if (data.skippingSetupStep)
	{
		data.skipping = false;
		data.skippingSetupStep = false;

		bindBtnSkipSetupStepClick();
	}
}

function bindBtnSkipSetupStepClick()
{
	$("#btnSkipSetupStep")
		.off("click")
		.click(function()
		{
			$(this).off("click").addClass("btnDisabled");
			skipSetupStep();
		})
		.removeClass("btnDisabled");
}

function skipSetupStep()
{
	data.skipping = true;
	data.skippingSetupStep = true;
}

function bindBtnSkipSetupClick()
{
	$("#btnSkipSetup")
		.off("click")
		.click(function()
		{
			$(this).parent().remove();
			skipSetup();
		});
}

function skipSetup()
{
	data.skipping = true;
	data.skippingSetup = true;
	data.skippingSetupStep = false; // not skipping an individual setup step, but the whole setup procedure.

	$("#curtain").removeClass("hidden")
		.children("#skippingSetupMsg").html("Skipping setup...").removeClass("hidden");
}

async function beginGame()
{
	const $setupProcedureContainer = $("#setupProcedureContainer");

	$("#skipSetupButtons").remove();
	$setupProcedureContainer.children(".title")
		.html("SETUP COMPLETE").addClass("highlighted")
		.siblings().removeClass("highlighted")
		.children(".btnSkipSetupStep").remove();

	await Promise.all([
		clusterAll(),
		sleep(getDuration("longInterval"))
	]);

	await animatePromise(
	{
		$elements: $setupProcedureContainer,
		desiredProperties: { height: 0 },
		duration: getDuration(400)
	});

	$setupProcedureContainer.add("#setupContainer").remove();

	const $containersToShow = $("#turnProcedureContainer, #indicatorContainer");
	$containersToShow.slideDown(getDuration(400), function()
	{
		unhide($containersToShow);
		bindRoleCardHoverEvents();
		bindPawnEvents();
		data.currentStep.next();
		$("#actionsContainer").slideDown(getDuration(400), function()
		{
			unhide($(this));
			if (data.skippingSetup) doneSkippingSetup();
		});
	});
}

function doneSkippingSetup()
{
	data.skipping = false;
	data.skippingSetup = false;
	$("#curtain").fadeOut(function()
	{
		$(this).addClass("hidden").removeAttr("style")
			.children("#skippingSetupMsg").remove();
	});
}

function animatePreparePlayerDeck()
{
	return new Promise(async resolve =>
	{
		const $container = $("#preparePlayerDeckContainer").removeClass("hidden");
	
		await showEpidemicsToShuffle($container);
		await dividePlayerDeckIntoEqualPiles($container);
	
		await animatePromise(
		{
			$elements: $container.children("h4"),
			desiredProperties: { opacity: 0 },
			duration: getDuration("longInterval")
		});
	
		const $divs = $container.children("div"),
			deckProperties = getPlayerDeckProperties();
	
		await shuffleEpidemicsIntoPiles($divs);
	
		for (let i = $divs.length - 1; i >= 0; i--)
			await placePileOntoPlayerDeck($divs.eq(i), deckProperties);
	
		$container.addClass("hidden");
		finishedSetupStep();
		resolve();
	});
}

async function showEpidemicsToShuffle($container)
{
	$container.children("h4").first()
		.children(".difficulty").html(getDifficultyName())
		.siblings(".numEpidemics").html(data.numEpidemics);
	
	let $div;
	for (let i = 0; i < data.numEpidemics; i++)
	{
		$div = $("<div></div>").appendTo($container);
		newFacedownPlayerCard().appendTo($div);
		newPlayerCardElement("epi").appendTo($div);
	}
	
	const $cardbacks = $container.find("img"),
		$epidemics = $container.find(".epidemic"),
		epidemicWidth = $epidemics.first().width(),
		easing = data.easings.revealCard;
	
	$epidemics.addClass("hidden");

	await animatePromise(
	{
		$elements: $cardbacks,
		initialProperties: { opacity: 0 },
		desiredProperties: { opacity: 1 },
		duration: getDuration("revealCard")
	});
	await sleep(getDuration("mediumInterval"));
	$cardbacks.remove();
	
	return animatePromise(
	{
		$elements: $epidemics.removeClass("hidden"),
		initialProperties: { width: 0 },
		desiredProperties: { width: epidemicWidth },
		duration: getDuration("revealCard"),
		easing
	});
}

async function dividePlayerDeckIntoEqualPiles($container)
{
	const numCardsToDeal = getInitialPlayerDeckSize(),
		$divs = $container.children("div"),
		$deck = $("#imgPlayerDeck"),
		initialProperties = $deck.offset(),
		easing = data.easings.dealCard,
		desiredProps = [];

	Object.assign(initialProperties,
	{
		position: "absolute",
		width: $deck.width()
	});
	
	let $exampleCardback, cardbackWidth;
	for (let i = 0; i < $divs.length; i++)
	{
		$exampleCardback = newFacedownPlayerCard().appendTo($divs.eq(i));
		
		desiredProps[i] = $exampleCardback.offset();
		desiredProps[i].width = cardbackWidth || (cardbackWidth = $exampleCardback.width());
		desiredProps[i].zIndex = 1;

		$exampleCardback.remove();
	}

	const cardsPerPile = Math.ceil(numCardsToDeal / $divs.length),
		leftOffsetIncrement = ($divs.find(".epidemic").first().width() - cardbackWidth) / cardsPerPile;
	
	let $cardback, divIdx = 0;
	for (let i = numCardsToDeal; i > 0; i--)
	{	
		initialProperties.zIndex = i;
		desiredProps[divIdx].left += leftOffsetIncrement; // offset the next card to the right
		$cardback = newFacedownPlayerCard();
		
		animatePromise(
		{
			$elements: $cardback.appendTo($divs.eq(divIdx)),
			initialProperties,
			desiredProperties: desiredProps[divIdx],
			duration: getDuration("dealCard"),
			easing
		});

		if (i === numCardsToDeal - 1) // deck is empty
		{
			$("#imgPlayerDeck").addClass("hidden");
			setPlayerDeckImgSize({ size: getMaxPlayerDeckImgSize() - data.numEpidemics });
		}

		await sleep(getDuration("dealCard") / 6);

		if (++divIdx === $divs.length)
			divIdx = 0;
	}
}

function getInitialPlayerDeckSize({ includeEpidemics } = {})
{
	let deckSize = Object.keys(data.cities).length + Object.keys(data.eventCards).length;

	if (includeEpidemics)
		deckSize += data.numEpidemics;
	
	return deckSize;
}

function shuffleEpidemicsIntoPiles($divs)
{
	for (let i = $divs.length - 1; i > 0; i--)
		shuffleEpidemicIntoPile($divs.eq(i));
	
	return shuffleEpidemicIntoPile($divs.first());
}

function shuffleEpidemicIntoPile($div)
{
	return new Promise(async resolve =>
	{
		const $epidemic = $div.children(".epidemic"),
			initialEpidemicOffset = $epidemic.offset(),
			easing = data.easings.dealCard;
		
		let $cardbacks = $div.children("img");

		$div.height($div.height());

		await animatePromise(
		{
			$elements: $epidemic,
			desiredProperties: { width: 0 },
			duration: getDuration("dealCard"),
			easing
		});

		const $epidemicCardback = newFacedownPlayerCard();
		$epidemic.replaceWith($epidemicCardback);

		await animatePromise(
		{
			$elements: $epidemicCardback,
			initialProperties: { ...{ position: "absolute"}, ...{ initialEpidemicOffset } },
			desiredProperties: { top: $cardbacks.last().offset().top },
			duration: getDuration("dealCard") / 2,
			easing
		});

		$cardbacks = $cardbacks.add($epidemicCardback);
		await shuffleAnimation($div, $cardbacks);

		const $pile = $cardbacks.first().attr("src", "images/cards/playerDeck_3.png");
		$cardbacks.not($pile).remove();
		resolve();
	});
}

function placePileOntoPlayerDeck($div, deckPropertes)
{
	return new Promise(async resolve =>
	{
		const $pile = $div.children("img"),
			$deck = $("#imgPlayerDeck");

		await animatePromise(
		{
			$elements: $pile,
			desiredProperties: deckPropertes,
			duration: getDuration("dealCard"), 
			easing: data.easings.dealCard
		});

		if (getPlayerDeckImgSize($deck) != getMaxPlayerDeckImgSize())
			unhide($deck);
		
		increasePlayerDeckImgSize();
		$pile.remove();

		resolve();
	});
}

function getPlayerDeckProperties()
{
	const $deck = $("#imgPlayerDeck"),
		deckIsHidden = $deck.hasClass("hidden");
	
	if (deckIsHidden) unhide($deck);
	const deckProperties = $deck.offset();
	deckProperties.width = $deck.width() * 0.94;
	if (deckIsHidden) $deck.addClass("hidden");

	return deckProperties;
}

function increasePlayerDeckImgSize()
{
	const $deck = $("#imgPlayerDeck"),
		currentSize = $deck.hasClass("hidden") ? -1 : getPlayerDeckImgSize($deck),
		MAX_SIZE = getMaxPlayerDeckImgSize();

	if (currentSize == MAX_SIZE)
		return;
	
	$deck.attr("src", `images/cards/playerDeck_${Number(currentSize) + 1}.png`)
		.removeClass("hidden");
}

function setPlayerDeckImgSize({ size, numCardsInDeck } = {})
{
	const $deck = $("#imgPlayerDeck");
	
	if (!size && $deck.hasClass("hidden"))
		return;

	size = size || calculatePlayerDeckImgSize(numCardsInDeck);
	
	if (size >= 0)
		$deck.attr("src", `images/cards/playerDeck_${size}.png`);
	else
		$deck.addClass("hidden");
}

function calculatePlayerDeckImgSize(numCardsInDeck)
{
	const numCardsLeft = isNaN(numCardsInDeck) ? data.numPlayerCardsRemaining : numCardsInDeck,
		ranges = [
			{ maxCards: 0, deckSize: -1 },
			{ maxCards: 1, deckSize: 0 },
			{ maxCards: 9, deckSize: 1 },
			{ maxCards: 17, deckSize: 2 },
			{ maxCards: 25, deckSize: 3 },
			{ maxCards: 33, deckSize: 4 },
			{ maxCards: 41, deckSize: 5 },
			{ maxCards: 51, deckSize: 6 }
		];
	
	for (let range of ranges)
		if (numCardsLeft <= range.maxCards)
			return range.deckSize;
}

function getPlayerDeckImgSize($imgDeck)
{
	const deckSrc = $imgDeck.attr("src"),
		dotIdx = deckSrc.indexOf("."),
		currentSize = deckSrc.substring(dotIdx - 1, dotIdx);
	
	if (isNaN(currentSize))
		return 0;
	
	return currentSize;
}

function getMaxPlayerDeckImgSize() { return 6; }

function getDifficultyName()
{
	if (data.numEpidemics == 4)
		return "Introductory";
	
	if (data.numEpidemics == 5)
		return "Standard";
	
	if (data.numEpidemics == 6)
		return "Heroic";
}

async function placeResearchStationInAtlanta()
{
	return new Promise(async resolve =>
	{
		const ATLANTA_KEY = "atla",
			$cdcBlurb = $("#setupContainer").children("h4");

		pinpointCity(ATLANTA_KEY);
		await data.cities[ATLANTA_KEY].buildResearchStation({ animate: true });
		await sleep(getDuration("longInterval"));
		
		await animatePromise(
		{
			$elements: $cdcBlurb,
			desiredProperties: { opacity: 0 },
			duration: getDuration(400)
		});
		$cdcBlurb.remove();

		finishedSetupStep();
		resolve();
	});
}

function placePawnsInAtlanta()
{
	return new Promise(async resolve =>
	{
		const ATLANTA_KEY = "atla",
			panelWidth = $(".playerPanel").first().width(),
			$cdcBlurb = $(`<h4>Atlanta is home to the CDC, the Center for Disease Control and Prevention.</h4>`);
		
		let player,
			$pawn,
			$panel,
			pawnOffsetInAtlanta,
			initialOffset;
		
		await animatePromise(
		{
			$elements: $cdcBlurb.prependTo("#setupContainer"),
			initialProperties: { opacity: 0 },
			desiredProperties: { opacity: 1 },
			duration: getDuration(400)
		});
		pinpointCity(ATLANTA_KEY);
	
		for (let rID in data.players)
		{
			player = data.players[rID];
			appendPawnToBoard(player);
			queueCluster(player.cityKey);
		}
		executePendingClusters();
		
		for (let rID of data.turnOrder)
		{
			player = data.players[rID];
			$pawn = player.$pawn;
			$panel = player.$panel;
			
			pawnOffsetInAtlanta = $pawn.removeClass("hidden").offset();
	
			initialOffset = $panel.offset();
			initialOffset.top -= data.pawnHeight;
			initialOffset.left += panelWidth / 2;
			initialOffset.left -= data.pawnWidth / 2;
	
			await animatePromise(
			{
				$elements: $pawn,
				initialProperties: initialOffset,
				desiredProperties: pawnOffsetInAtlanta,
				duration: getDuration(400),
				easing: "easeInQuart"
			});
		}
	
		await sleep(getDuration(400));
		finishedSetupStep();
		resolve();
	});
}

function animateDetermineTurnOrder()
{
	return new Promise(async resolve =>
	{
		const interval = getDuration("shortInterval");
	
		await showStartingHandPopulations();
		await sleep(getDuration(interval));
		data.turnOrder = await showTurnOrder();
		await sleep(getDuration(interval));
		await arrangePlayerPanels();
	
		$("#roleSetupContainer").addClass("hidden");
		finishedSetupStep();
		resolve();
	});
}

async function arrangePlayerPanels()
{
	const $roleContainers = $(".roleContainer");

	lockElements($roleContainers);

	for (let rID of data.turnOrder)
		await transformIntoPlayerPanel($roleContainers.filter(`[data-role='${rID}']`));
	
	return sleep(getDuration(500));
}

async function transformIntoPlayerPanel($roleContainer)
{
	const $cards = $roleContainer.find(".playerCard"),
		$popRank = $roleContainer.parent().find(`.popRank[data-role='${$roleContainer.attr("data-role")}']`);
	
	$cards.removeAttr("style")
		.children("span.population").remove();
	
	$popRank.remove();
	$roleContainer.removeClass("roleContainer")
		.addClass("playerPanel");
	
	const initialProperties = $roleContainer.offset(),
		$playerPanel = $(".playerPanel.hidden").first().removeClass("hidden"),
		desiredProperties = $playerPanel.offset();

	initialProperties.position = "absolute";
	initialProperties.width = $roleContainer.width();
	desiredProperties.width = $playerPanel.width() + 2;
	desiredProperties.left += 1;
	desiredProperties.top -= 1; // 1px border-top will be removed

	$playerPanel.addClass("hidden");

	const borderString = "1px solid #fff";
	$roleContainer.find(".role")
		.css(
		{
			borderTop: borderString,
			borderBottom: borderString,
			borderLeft: "none",
			borderRight: "none"
		})
		.siblings(".name")
		.css("border-top", borderString);
	
	await animatePromise(
	{
		$elements: $roleContainer.appendTo($("#rightPanel")),
		initialProperties,
		desiredProperties,
		duration: getDuration(500),
		easing: "easeInOutQuint"
	});

	$roleContainer.remove();
	$playerPanel.removeClass("hidden");
}

function showTurnOrder()
{
	return new Promise(async resolve =>
	{
		const $roleSetupContainer = $("#roleSetupContainer"),
			$roleContainers = $roleSetupContainer.children(".roleContainer"),
			rankAdjustments = getPopulationRankOffsetAdjustments($roleContainers.find(".playerCard").first()),
			turnOrder = [];

		let $card,
			$rank,
			popRank = 1,
			rankOffset;
		
		for (let card of getDecidingTurnOrderCardPopulations())
		{
			turnOrder.push(card.role);
			
			$card = $roleContainers.find(`.playerCard[data-key='${card.key}']`);
			
			$card.css("border-left", `3px solid #fff`);
			
			$rank = $(`<h5 class='popRank' data-role='${card.role}'>#${popRank++}</h5>`);

			rankOffset = $card.offset();
			rankOffset.top += rankAdjustments.top;
			rankOffset.left += rankAdjustments.left;
			
			$rank.appendTo($roleSetupContainer)
				.offset(rankOffset);
			
			await animatePromise(
			{
				$elements: $rank,
				initialProperties: { opacity: 0.1 },
				desiredProperties: { opacity: 1 },
				duration: getDuration(500)
			});
			await sleep(getDuration(500));
		}
		resolve(turnOrder);
	});
}

function getPopulationRankOffsetAdjustments($exampleCard)
{
	const $exampleRank = $("<h5 class='popRank'>#1</h5>").appendTo($exampleCard.parent()),
		adjustments = {
			top: ($exampleCard.height() / 2) - ($exampleRank.height() / 2),
			left: -($exampleRank.width() + 5)
		};
	
	$exampleRank.remove();
	
	return adjustments;
}

function showStartingHandPopulations()
{
	log("showStartingHandPopulations");
	const $containers = $(".roleContainer");
	let $cards = $containers.children(".playerCard");
	const $aCard = $cards.first(),
		initialCardHeight = $aCard.height();

	let $card;
	for (let { key, population } of data.startingHandPopulations)
	{
		$card = $cards.filter(`[data-key='${key}']`);

		if (isEventCardKey(key))
			$cards = $cards.not($card);
		else
			$card.append(`<span class='population'>Population: ${numberWithCommas(population)}</span>`);
	}

	$containers.add($aCard).css("height", "auto");
	const expandedCardHeight = $aCard.height();
	$aCard.height(initialCardHeight);

	return animatePromise(
	{
		$elements: $cards,
		desiredProperties: { height: expandedCardHeight },
		duration: getDuration(400),
		easing: "easeInOutQuad"
	});
}

function getDecidingTurnOrderCardPopulations()
{
	const turnOrderCards = [];

	let startingHandPopulations = [...data.startingHandPopulations],
		highestPop,
		cardWithHighestPop;
	
	while (startingHandPopulations.length)
	{
		highestPop = 0;
		for (let card of startingHandPopulations)
		{
			if (Number(card.population) > highestPop)
			{
				highestPop = Number(card.population);
				cardWithHighestPop = card;
			}
		}
		
		turnOrderCards.push(cardWithHighestPop);
		startingHandPopulations = startingHandPopulations.filter(c => c.role != cardWithHighestPop.role);
	}

	log("turnOrderCards: ", turnOrderCards);
	return turnOrderCards;
}

function animateInitialDeal()
{
	return new Promise(async resolve =>
	{
		const startingHands = getEventsOfTurn(eventTypes.startingHand),
			$roleContainers = $("#roleSetupContainer").find(".roleContainer");
			
		await dealFaceDownStartingHands(startingHands, $roleContainers);
		await sleep(getDuration("mediumInterval"));
		await revealStartingHands(startingHands, $roleContainers);
	
		await sleep(getDuration("longInterval"));
		finishedSetupStep();
		resolve();
	});
}

async function dealFaceDownStartingHands(startingHands, $roleContainers)
{
	const startingHandSize = startingHands[0].cardKeys.length,
		numCardsToDeal = startingHands.length * startingHandSize,
		deckOffset = $("#imgPlayerDeck").offset(),
		CARD_MARGIN_BOTTOM = 4,
		finalCardbackWidth = data.STARTING_HAND_CARD_HEIGHT - CARD_MARGIN_BOTTOM,
		interval = getDuration("dealCard") * 0.4;

	await makeRoomForStartingHands(startingHandSize, $roleContainers);

	let cardsDealt = 0,
		roleIndex = 0,
		zIndex = 10 + numCardsToDeal;
	while (cardsDealt < numCardsToDeal)
	{
		dealFaceDownPlayerCard($roleContainers.eq(roleIndex), deckOffset, { finalCardbackWidth, zIndex });
		await sleep(getDuration(interval));
		
		cardsDealt++;
		if (roleIndex === $roleContainers.length - 1)
			roleIndex = 0;
		else
			roleIndex++;
		
		zIndex--;
	}
}

async function revealStartingHands(startingHands, $roleContainers)
{
	$roleContainers.children(".playerCard").remove();
	$(".drawnPlayerCard").remove();
	
	let $container;
	for (let hand of startingHands)
	{
		$container = $roleContainers.filter(`[data-role='${hand.role}']`);

		for (let cardKey of hand.cardKeys)
			revealPlayerCard(cardKey, $container);
	}
}

function makeRoomForStartingHands(startingHandSize, $roleContainers)
{
	const $aRoleContainer = $roleContainers.first(),
		initialHeight = $aRoleContainer.height();

	for (let i = 0; i < startingHandSize; i++)
		$aRoleContainer.append("<div class='playerCard'></div>");

	$aRoleContainer.css("height", "auto");
	const requiredHeight = $aRoleContainer.height();

	$aRoleContainer.children(".playerCard").remove();
	
	return animatePromise(
	{
		$elements: $roleContainers,
		initialProperties: { height: initialHeight },
		desiredProperties: { height: requiredHeight },
		duration: getDuration(400),
		easing: "easeOutQuad"
	});
}

function highlightNextSetupStep()
{
	const $procedureContainer = $("#setupProcedureContainer").removeClass("hidden"),
		highlighted = "highlighted",
		$highlightedStep = $procedureContainer.children(`.${highlighted}`);

	if ($highlightedStep.length)
	{
		$highlightedStep
			.removeClass(highlighted)
			.next()
			.addClass(highlighted);
	}
	else
		$procedureContainer.children(".step").first().addClass(highlighted);	
}

function removeCurtain()
{
	return new Promise((resolve) => {
		sleep(75)
		.then(() => {
			const curtain = $("#curtain");
			curtain.fadeOut(function()
			{
				curtain.addClass("hidden").removeAttr("style")
					.children().addClass("hidden");
				
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

			let expandedHeight = $container.height();
		
			if (expandedHeight < panelHeight)
			{
				$container.removeAttr("style")
					.css({
						height: panelHeight,
						overflowY: "hidden"
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
				
				$container
					.css({ height: panelHeight })
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
				.css({ overflowY: "hidden" })
				.animate({
					scrollTop: 0,
					height: $("#topPanel").height()
				},
				getDuration("discardPileCollapse"),
				function() { resolve(); });
		});
}

function bindInfectionDeckHover()
{
	$("#infectionDeck").hover(function()
	{
		if (currentStepIs("setup"))
			return;
		
		const MAX_CARDS_IN_DECK = 48;
		let numCardsInDeck = MAX_CARDS_IN_DECK - $("#infectionDiscard").find(".infectionCard").length;
		
		if (currentStepIs("infect cities"))
			numCardsInDeck -= $("#infectCitiesContainer").find(".playerCard").length;
		
		if (currentStepIs("epInfect"))
			numCardsInDeck -= $("#epidemicContainer").find(".playerCard").length;
		
		$(this).attr("title", `${numCardsInDeck} cards`);
	});
}

function bindInfectionDiscardHover()
{
	$("#infectionDiscard")
		.unbind("mouseenter mouseleave")
		.hover(function() { expandInfectionDiscardPile() },
		function() { collapsenfectionDiscardPile() });
}
bindInfectionDiscardHover();
function unbindInfectionDiscardHover() { $("#infectionDiscard").unbind("mouseenter mouseleave") }

$("#playerDiscard").hover(
	function() { expandPlayerDiscardPile() },
	function() { collapsePlayerDiscardPile() }
);

function expandPlayerDiscardPile({ showRemovedCardsContainer } = {})
{
	return new Promise(resolve =>
	{
		const $discardPile = $("#playerDiscard"),
			$removedCardsContainer = $discardPile.children("#removedPlayerCards"),
			panelHeight = data.topPanelHeight,
			maxHeight = data.boardHeight - panelHeight;
		
		$discardPile.stop().css("height", "auto");

		let expandedPileHeight = $discardPile.height();
		
		if (showRemovedCardsContainer || $removedCardsContainer.children(".playerCard").length)
			resizeRemovedPlayerCardsContainer($removedCardsContainer, panelHeight, expandedPileHeight);
		
		expandedPileHeight = $discardPile.height();

		if (expandedPileHeight < panelHeight)
		{
			if (!showRemovedCardsContainer)
			{
				$discardPile.css({
					overflowY: "hidden",
					height: panelHeight
				});
			}
			
			resolve();
		}
		else
		{
			if (expandedPileHeight > maxHeight)
			{
				$discardPile.css("overflow-y", "scroll");
				expandedPileHeight = maxHeight;
			}
			
			$discardPile.css(
				{
					height: panelHeight,
					zIndex: 8 // The expanded container needs to cover .pawnArrows
				})
				.animate(
				{
					height: expandedPileHeight,
					top: data.boardHeight - expandedPileHeight,
					scrollTop: showRemovedCardsContainer ? document.getElementById("playerDiscard").scrollHeight : 0
				},
				getDuration("discardPileExpand"),
				function() { resolve() });
		}
	});
}

function resizeRemovedPlayerCardsContainer($removedCardsContainer, panelHeight, expandedPileHeight)
{
	const rccHeight = $removedCardsContainer.removeClass("hidden").height(),
		rccExpandedProps = {};

	if (expandedPileHeight < panelHeight)
		rccExpandedProps.marginTop = panelHeight - expandedPileHeight;

	if (rccHeight < panelHeight)
		rccExpandedProps.height = panelHeight + 1;
	
	$removedCardsContainer.css(rccExpandedProps);
}

function collapsePlayerDiscardPile()
{
	return new Promise(resolve =>
	{
		const $discardPile = $("#playerDiscard");
		
		$discardPile.stop()
			.css("overflow-y", "hidden")
			.animate(
			{
				scrollTop: 0,
				height: data.topPanelHeight,
				top: data.boardHeight - data.topPanelHeight,
				zIndex: 7
			}, getDuration("discardPileCollapse"),
			function()
			{
				$discardPile.children("#removedPlayerCards")
					.removeAttr("style")
					.addClass("hidden");
				
				resolve();
			});
	});
}

setup();
});