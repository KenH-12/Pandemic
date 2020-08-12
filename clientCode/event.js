"use strict";

import { strings } from "./strings.js";
import { eventCards, bindEventCardHoverEvents } from "./eventCard.js";
import {
	gameData,
	getPlayer,
	getActivePlayer,
	replaceRoleNamesWithRoleTags
} from "./gameData.js";
import { setDuration } from "./durations.js";
import {
	getInfectionRate,
	getColorWord,
	newDiseaseCubeElement
} from "./utilities/pandemicUtils.js";
import { postData } from "./utilities/fetchUtils.js";

const eventTypes = {
	driveFerry: {
		name: "Drive/Ferry",
		code: "dr",
		rules: [strings.actionRules.driveFerry[0]],
		instructions: "Select a Destination:",
		actionPathName: "actions/movementAction",
		propertyNames: ["originKey", "destinationKey"]
	},
	directFlight: {
		name: "Direct Flight",
		code: "df",
		rules: [strings.actionRules.directFlight[0]],
		instructions: "Select a Destination:",
		dispatchInstructions: `To dispatch a pawn via Direct Flight,
discard the City card that matches the destination city.
The card must come from the Dispatcher&#39;s hand.`,
		actionPathName: "actions/movementAction",
		propertyNames: ["originKey", "destinationKey"]
	},
	charterFlight: {
		name: "Charter Flight",
		code: "cf",
		rules: [strings.actionRules.charterFlight[0]],
		instructions: "To select a destination, drag and drop your pawn onto a city.",
		dispatchInstructions: `To dispatch a pawn via Charter Flight,
discard the City card that matches the pawn&#39;s current location.
The card must come from the Dispatcher&#39;s hand.`,
		actionPathName: "actions/movementAction",
		propertyNames: ["originKey", "destinationKey"]
	},
	chooseFlightType: {
		name: "Choose Flight Type",
		code: "ft",
		noIcon: true
	},
	shuttleFlight: {
		name: "Shuttle Flight",
		code: "sf",
		rules: [strings.actionRules.shuttleFlight[0]],
		instructions: "Select a Destination:",
		actionPathName: "actions/movementAction",
		propertyNames: ["originKey", "destinationKey"]
	},
	buildResearchStation: {
		name: "Build Research Station",
		code: "rs",
		rules: strings.actionRules.buildResearchStation,
		instructions: "",
		actionPathName: "actions/buildResearchStation",
		propertyNames: ["cityKey", "relocationKey"],
		relatedRoleName: "Operations Expert",
		relatedRoleRule: "The Operations Expert can do this action without discarding."
	},
	shareKnowledge: {
		name: "Share Knowledge",
		code: "sk",
		rules: strings.actionRules.shareKnowledge,
		actionPathName: "actions/shareKnowledge",
		propertyNames: ["cardKey", "giverRoleID", "receiverRoleID"],
		relatedRoleName: "Researcher",
		relatedRoleRule: "The Researcher may <i>give</i> a City card without needing to be in the city that matches the card."
	},
	treatDisease: {
		name: "Treat Disease",
		code: "td",
		rules: strings.actionRules.treatDisease.slice(0, 2),
		instructions: "Select a Disease Colour:",
		actionPathName: "actions/treatDisease",
		propertyNames: ["cityKey", "diseaseColor", "prevCubeCount", "newCubeCount"],
		relatedRoleName: "Medic",
		relatedRoleRule: "The Medic removes all cubes of one colour when doing this action."
	},
	autoTreatDisease: {
		name: "Auto-Treat Disease",
		code: "at",
		propertyNames: ["cityKey", "diseaseColor", "numCubesRemoved"],
		rules: [
			"If a disease has been <i>cured</i>, the Medic automatically removes all cubes of that colour from a city, simply by entering it or being there. This does not take an action.",
			"The Medic's automatic removal of cubes can occur on other roles' turns, if he is moved by the Dispatcher or the Airlift Event.",
			"The Medic also prevents placing disease cubes (and outbreaks) of <i>cured</i> diseases in his location."
		]
	},
	discoverACure: {
		name: "Discover A Cure",
		code: "dc",
		rules: strings.actionRules.discoverACure,
		actionPathName: "actions/discoverCure",
		propertyNames: ["cardKeys"],
		relatedRoleName: "Scientist",
		relatedRoleRule: "The Scientist needs only 4 cards of the same colour to do this action."
	},
	eradication: {
		name: "eradication",
		code: "er",
		propertyNames: ["diseaseColor"],
		rules: strings.diseaseInfo.eradicationRules
	},
	planContingency: {
		name: "Plan Contingency",
		code: "pc",
		capableRoleName: "Contingency Planner",
		propertyNames: ["cardKey"],
		rules: [
			"The Contingency Planner may, as an action, take <i>any</i> Event card from the Player Discard Pile and <i>store</i> it.",
			"Only 1 Event card can be stored at a time. It does not count against his hand limit.",
			"When the stored Event card is played, <i>remove it</i> from the game."
		],
		instructions: "Select an Event card to store:",
		actionPathName: "actions/planContingency"
	},
	dispatchPawn: {
		name: "Dispatch Pawn",
		code: "dp",
		capableRoleName: "Dispatcher",
		rules: [
			"The Dispatcher may, as an action, either:",
			"<li>move any pawn to any city containing another pawn, or</li>",
			"<li>move another role's pawn <span class='hoverInfo dispatchInfo'>as if it were his own</span>.</li>",
			`${strings.dispatchDiscardRule} A card discarded for a Charter Flight must match the city the pawn is moving from.`
		],
		driveFerryRules: ["Dispatch a pawn to a city connected by a white line to the one it is in."],
		directFlightRules: [
			"Discard a City card to dispatch a pawn to the city named on the card.",
			strings.dispatchDiscardRule
		],
		charterFlightRules: [
			"Discard the City card that <i>matches</i> a pawn's location to dispatch that pawn to <i>any</i> city.",
			strings.dispatchDiscardRule
		],
		rendezvousRules: ["The Dispatcher may, as an action, move any pawn to a city containing another pawn."],
		shuttleFlightRules: ["Dispatch a pawn from a city with a research station to any other city that has a research station."],
		abbreviatedRulesetLength: 3,
		instructions: "To dispatch a pawn, drag and drop it onto a valid destination city.",
		actionPathName: "actions/movementAction",
		propertyNames: ["dispatchedRoleID", "originKey", "destinationKey", "movementTypeCode", "rolesAtRendezvousDestination"]
	},
	rendezvous: {
		name: "Rendezvous",
		code: "rv",
		actionPathName: "actions/movementAction",
		noIcon: true
	},
	operationsFlight: {
		name: "Operations Flight",
		code: "of",
		capableRoleName: "Operations Expert",
		rules: ["<i>Once per turn</i>, as an action, the Operations Expert may move from a research station to any city by discarding any City card."],
		instructions: "To select a destination, drag and drop your pawn onto a city.",
		actionPathName: "actions/movementAction",
		propertyNames: ["originKey", "destinationKey", "discardKey"]
	},
	pass: {
		name: "Pass",
		code: "pa",
		propertyNames: [],
		rules: strings.actionRules.pass,
		instructions: "Pass on your remaining actions for this turn?",
		actionPathName: "actions/passActions",
		propertyNames: ["numActionsForfeited"]
	},
	cardDraw: {
		name: "Draw 2 Cards",
		code: "cd",
		actionPathName: "playSteps/drawPlayerCards",
		propertyNames: ["cardKeys"],
		rules: [
			strings.playSteps.drawTwoCards,
			"If your draws include any <i>Epidemic</i> cards, they must be resolved immediately.",
			strings.outOfCardsWarning
		]
	},
	epidemicIncrease: {
		name: "Epidemic Increase",
		code: "ec",
		actionPathName: "playSteps/epidemicIncrease",
		propertyNames: ["epidemicCount"],
		rules: [
			"The infection rate marker is moved forward 1 space on the Infection Rate Track.",
			"The current infection rate determines how many Infection cards are flipped over during a turn's Infect Cities step."
		]
	},
	epidemicInfect: {
		name: "Epidemic Infect",
		code: "ef",
		actionPathName: "playSteps/epidemicInfect",
		propertyNames: ["cityKey", "prevCubeCount", "preventionCode"],
		rules: [
			"The <i>bottom</i> card of the Infection Deck is flipped over and 3 disease cubes of the matching colour are placed on the named city.",
			"If the city already contains cubes of this colour, cubes are added until the city has 3 cubes of this colour and then an <i>outbreak</i> of this disease occurs in the city.",
			"The infection card is then placed in the Infection Discard Pile.",
			"<br/>",
			strings.insufficientCubesWarning
		]
	},
	epidemicIntensify: {
		name: "Epidemic Intensify",
		code: "et",
		actionPathName: "playSteps/epidemicIntensify",
		propertyNames: ["numDiscardsShuffled"],
		rules: ["The cards in the Infection Discard Pile are shuffled and then placed on top of the Infection Deck."]
	},
	discard: {
		name: "Discard",
		displayName: "Discard To 7 Cards",
		code: "ds",
		actionPathName: "playSteps/discardPlayerCards",
		propertyNames: ["cardKeys"],
		rules: [strings.playSteps.discardToSevenCards]
	},
	infectCity: {
		name: "Infect City",
		pluralName: "Infect Cities",
		code: "ic",
		actionPathName: "playSteps/infectCity",
		propertyNames: ["cityKey", "preventionCode"],
		rules: [
			...strings.playSteps.infectCities,
			"<br/>",
			strings.insufficientCubesWarning
		]
	},
	initialInfection: {
		name: "Initial Infection",
		displayName: "Infect 9 Cities",
		code: "ii",
		propertyNames: ["cityKey", "numCubes"],
		rules: [
			"At the start of the game, 9 Infection cards are flipped over.",
			"<br />",
			"Disease cubes of the matching colour are placed on those cities as follows:",
			"3 disease cubes are placed on each of the first 3 cities.",
			"2 disease cubes are placed on each of the second 3 cities.",
			"1 disease cube is placed on each of the last 3 cities.",
			"<br />",
			"The 9 Infection cards are then placed in the infection discard pile."
		]
	},
	startingHands: {
		name: "Starting Hands",
		code: "sh",
		propertyNames: ["cardKeys"],
		rules: [
			"At the start of the game, cards are dealt according to the number of roles:",
			"2 roles -> 4 cards each",
			"3 roles -> 3 cards each",
			"4 roles -> 2 cards each",
			"<br/>",
			"The turn order is decided by the single highest City card population in each role's starting hand."
		]
	},
	outbreak: {
		name: "Outbreak",
		code: "ob",
		propertyNames: ["outbreakCount", "originKey", "diseaseColor", "triggeredByKey"],
		rules: [
			...strings.outbreakInfo.outbreakRules,
			strings.outbreakInfo.chainReactionOutbreak,
			"<br/>",
			strings.outbreakInfo.tooManyOutbreaksWarning
		]
	},
	outbreakInfection: {
		name: "Outbreak",
		code: "oi",
		propertyNames: ["originKey", "infectedKey", "diseaseColor", "preventionCode"],
		noIcon: true
	},
	resilientPopulation: {
		name: "Resilient Population",
		code: "rp",
		cardKey: "resi",
		rules: [
			strings.eventCardPlayabilityRule,
			"Remove any 1 card in the Infection Discard Pile from the game.",
			"* You may play this between the Infect and Intensify steps of an epidemic."
		],
		instructions: "Select a card from the INFECTION DISCARDS to remove from the game.",
		propertyNames: ["cardKey", "infectionDiscardIndex"],
		actionPathName: "eventCards/resilientPopulation"
	},
	oneQuietNight: {
		name: "One Quiet Night",
		code: "oq",
		cardKey: "oneq",
		rules: [
			strings.eventCardPlayabilityRule,
			"Skip the next Infect Cities step."
		],
		actionPathName: "eventCards/oneQuietNight"
	},
	skipInfectionStep: { // this is here as a simple way to use the actionPathName in the requestAction function.
		code: "",
		actionPathName: "eventCards/skipInfectionStep",
		noIcon: true
	},
	forecast: {
		name: "Forecast",
		code: "fd",
		cardKey: "fore",
		rules: [
			strings.eventCardPlayabilityRule,
			"Draw, look at, and rearrange the top 6 cards of the Infection Deck.",
			"Put them back on top."
		],
		propertyNames: ["cardKeys"],
		actionPathName: "eventCards/forecastDraw"
	},
	forecastPlacement: {
		name: "Forecast",
		code: "fp",
		rules: [
			strings.eventCardPlayabilityRule,
			"Draw, look at, and rearrange the top 6 cards of the Infection Deck.",
			"Put them back on top."
		],
		instructions: "Drag and drop to rearrange the cards.",
		propertyNames: ["cardKeys"],
		actionPathName: "eventCards/forecastPlacement",
		noIcon: true
	},
	airlift: {
		name: "Airlift",
		code: "ar",
		cardKey: "airl",
		rules: [strings.eventCardPlayabilityRule, "Move any 1 pawn to any city."],
		instructions: "To airlift a pawn, drag and drop it onto the destination city.",
		propertyNames: ["airliftedRoleID", "originKey", "destinationKey"],
		actionPathName: "eventCards/airlift"
	},
	governmentGrant: {
		name: "Government Grant",
		code: "gg",
		cardKey: "gove",
		rules: [strings.eventCardPlayabilityRule, "Add 1 research station to any city."],
		instructions: "Drag and drop a research station from the research station supply onto the city of your choice.",
		propertyNames: ["cityKey", "relocationKey"],
		actionPathName: "actions/buildResearchStation" // since gov' grant's logic is so similar
	},
	gameEnd: {
		name: "Game End",
		code: "ge",
		propertyNames: ["reason"],
		noIcon: true
	},
	// This is not an actual event — it's here for the convenience of generating the play step tooltip.
	doFourActions: {
		name: "Do 4 Actions",
		code: "ac",
		rules: strings.playSteps.doFourActions,
		noIcon: true
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
	rv: "rendezvous",
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
	sh: "startingHands",
	ob: "outbreak",
	oi: "outbreakInfection",
	rp: "resilientPopulation",
	oq: "oneQuietNight",
	fd: "forecast",
	fp: "forecastPlacement",
	ar: "airlift",
	// aa: "airliftAccept",
	gg: "governmentGrant",
	ge: "gameEnd",
	ac: "doFourActions" // This is not an actual event — it's here for the convenience of generating the play step tooltip.
};

export default class Event
{
	constructor({ code, id, turnNum, role, details })
	{
		const eventType = getEventType(code);
		
		this.code = code;
		this.name = eventType.name;
		this.displayName = eventType.displayName;
		this.id = id;
		this.turnNum = turnNum;
		this.role = role;
		
		if (details.length)
		{
			const names = eventType.propertyNames,
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

	hasIcon()
	{
		return !getEventType(this.code).noIcon;
	}

	getDetails()
	{
		const name = (this.displayName || this.name).toUpperCase();
		
		return `<p class='title'>${name}<span class='eventTypeInfo'>&#9432;</span></p>
				${ this.player ? `<p>Role: ${this.player.newRoleTag()}</p>` : "" }`;
	}
}

class PermanentEvent extends Event {}

class StartingHands extends PermanentEvent
{
	constructor(event, cities, eventCards)
	{
		super(event);
		delete this.role;
		this.hands = [];
		this.addHand(event, cities, eventCards);
	}

	addHand(hand, cities, eventCards)
	{
		hand.cards = [];

		for (let key of hand.details.split(","))
			hand.cards.push(eventCards[key] || cities[key]);
		
		this.hands.push(hand);
	}

	setPopulationRanks(turnOrderCards)
	{
		this.populationRanks = {};
		let i = 1;
		for (let card of turnOrderCards)
			this.populationRanks[card.key] = i++;
		
		this.sortHandsByPopulationRank();
	}

	sortHandsByPopulationRank()
	{
		const sortedHands = [];

		for (let cardKey in this.populationRanks)
			for (let hand of this.hands)
				for (let card of hand.cards)
					if (card.key === cardKey)
						sortedHands.push(hand);

		this.hands = sortedHands;
	}

	getDetails()
	{
		let handDetails = "<div class='column'>",
			turnOrder = `<div class='column'>
							<p>Turn Order</p>`;

		for (let hand of this.hands)
		{
			handDetails += `<div class='hand'>
								<p>Role: ${hand.player.newRoleTag()}</p>
								<p>Starting Hand:</p>`;
			
			for (let card of hand.cards)
			{
				if (this.populationRanks.hasOwnProperty(card.key))
					turnOrder += `<p class='populationRank' data-key='${card.key}'>#${this.populationRanks[card.key]}</p>`;

				handDetails += card.getPlayerCard({ includePopulation: true });
			}
			
			handDetails += "</div>";
		}

		handDetails += "</div>";
		turnOrder += "</div>";

		return super.getDetails() + handDetails + turnOrder;
	}

	positionPopulationRanks($eventDetails)
	{
		const $playerCards = $eventDetails.find(".playerCard");
		
		let $this,
			$card;
		$eventDetails.find(".populationRank").each(function()
		{
			$this = $(this);
			$card = $playerCards.filter(`[data-key='${$this.attr("data-key")}']`).css("border-right", "3px solid #fff");

			$this.offset({
				top: $card.offset().top
			});
		});
	}
}

class InitialInfection extends PermanentEvent
{
	constructor(event, cities)
	{
		super(event);
		this.infections = [];

		this.addInfection(event, cities);
	}

	addInfection(infectionEvent, cities)
	{
		const { 0: cityKey, 1: numCubes } = infectionEvent.details.split(",");

		this.infections.push({ cityKey, city: cities[cityKey], numCubes });
	}

	getDetails()
	{
		let infectionDetails = "";
		let numCubes = 0;

		for (let infection of this.infections)
		{
			if (infection.numCubes !== numCubes)
			{
				numCubes = infection.numCubes;
				infectionDetails += this.newCubeRow(numCubes);
			}

			infectionDetails += infection.city.getInfectionCard();
		}
		
		return super.getDetails() + infectionDetails;
	}

	newCubeRow(numCubes)
	{
		const cube = newDiseaseCubeElement({ asJqueryObject: false });

		let cubeRow = "<span class='cubes'>";

		for (let i = 0; i < numCubes; i++)
			cubeRow += cube;
		
		cubeRow += "</span>";

		return cubeRow;
	}
}

class UndoableEvent extends Event
{
	requestUndo(additionalDataToPost = {})
	{
		return postData(`serverCode/actionPages/undoPages/${this.undoerFileName || `undo${toPascalCase(this.name)}`}.php`,
		{
			...{
				activeRole: getActivePlayer().rID,
				currentStep: gameData.currentStep.name,
				eventID: this.id
			},
			...additionalDataToPost
		});
	}
}

class MovementAction extends UndoableEvent
{
	constructor(event, cities)
    {
		super(event);
		this.isUndoable = true;
		this.undoerFileName = "undoMovementAction";
        this.origin = cities[this.originKey];
        this.destination = cities[this.destinationKey];
	}
	
	getDetails()
    {
		let details = super.getDetails();

		if (!(this instanceof DispatchPawn))
			details += `<p>Origin: ${getLocatableCityName(this.origin)}</p>
						<p>Destination: ${getLocatableCityName(this.destination)}</p>`;
		
		return details;
	}

	requestUndo()
	{
		return super.requestUndo({ actionCode: this.code });
	}
	
	animateUndo()
	{
		return new Promise(async resolve =>
		{
			const playerToMove = this instanceof DispatchPawn ? this.dispatchedPlayer : this.player;

			if (this.discardKey)
			{
				await this.player.panel.animateReceiveCard($("#playerDiscardContainer").children(`[data-key='${this.discardKey}']`));
				this.player.addCardKeysToHand(this.discardKey);
			}
			
			setDuration("pawnAnimation", this instanceof DriveFerry ? 500 : 1000);
			await playerToMove.updateLocation(this.origin);
			setDuration("pawnAnimation", 250);

			resolve();
		});
	}
}

class DriveFerry extends MovementAction {}

class DirectFlight extends MovementAction
{
	constructor(event, cities)
	{
		super(event, cities);
		this.discardKey = this.destination.key;
	}

	getDetails()
    {
		return `${super.getDetails()}
				<p>Discarded:</p>
				${this.destination.getPlayerCard()}`;
    }
}

class CharterFlight extends MovementAction
{
	constructor(event, cities)
	{
		super(event, cities);
		this.discardKey = this.origin.key;
	}
	
	getDetails()
    {
		return `${super.getDetails()}
				<p>Discarded:</p>
				${this.origin.getPlayerCard()}`;
    }
}

class ShuttleFlight extends MovementAction {}

class ResearchStationPlacement extends UndoableEvent
{
	constructor(event, cities)
    {
		super(event);
		this.isUndoable = true;
		this.undoerFileName = "undoResearchStationPlacement";
		this.city = cities[this.cityKey];

		if (this.relocationKey)
			this.relocatedFromCity = cities[this.relocationKey];
	}
	
	getDetails()
	{
		let relocatedFrom = "";
		if (this.relocationKey)
			relocatedFrom = `<p>Relocated Station From: ${getLocatableCityName(this.relocatedFromCity)}</p>`;

		return `${super.getDetails()}
				<p>Location: ${getLocatableCityName(this.city)}</p>
				${relocatedFrom}
				${this.getDiscardDetails()}`;
	}

	async animateUndo(animateResearchStationBackToSupply, isContingencyCard)
	{
		let cardKey = false;
		if (this instanceof BuildResearchStation && this.player.role !== "Operations Expert")
			cardKey = this.cityKey;
		else if (this instanceof GovernmentGrant)
			cardKey = this.eventCard.key;

		if (cardKey)
		{
			const $card = $("#playerDiscardContainer").find(`[data-key='${cardKey}']`);
			await this.player.panel.animateReceiveCard($card, { isContingencyCard });

			if (isContingencyCard)
				this.player.contingencyKey = cardKey;
			else
				this.player.addCardKeysToHand(cardKey);
		}

		if (this.relocationKey)
		{
			await this.city.relocateResearchStationTo(this.relocatedFromCity);
			return this.city.cluster({ animatePawns: true, animateCubes: true });
		}
		
		return animateResearchStationBackToSupply($(`.researchStation[data-key='${this.cityKey}']`));
	}
}

class BuildResearchStation extends ResearchStationPlacement
{
	getDiscardDetails()
	{
		if (this.player.role === "Operations Expert")
			return `<p>[discard not required]</p>`;
		
		return `<p>Discarded:</p>${this.city.getPlayerCard()}`;
	}
}

class DiseaseCubeRemoval extends UndoableEvent
{
	constructor(event, cities)
	{
		super(event);
		this.city = cities[this.cityKey];
	}

	getDetails()
    {
		let cubesRemoved = "";
		for (let i = 0; i < this.numCubesRemoved; i++)
			cubesRemoved += newDiseaseCubeElement({ color: this.diseaseColor, asJqueryObject: false });
		
		return `${super.getDetails()}
				<p>Location: ${getLocatableCityName(this.city)}</p>
				<span class='cubes'>
					<span>Removed: </span>${cubesRemoved}
				</span>`;
	}

	animateUndo(placeDiseaseCubes)
	{
		return new Promise(async resolve =>
		{
			await placeDiseaseCubes({ cityKey: this.cityKey, numCubes: this.numCubesRemoved, diseaseColor: this.diseaseColor });
			resolve();
		});
	}
}

class TreatDisease extends DiseaseCubeRemoval
{
	constructor(event, cities)
    {
		super(event, cities);
		this.isUndoable = true;
		this.numCubesRemoved = this.prevCubeCount - this.newCubeCount;
	}
}

class AutoTreatDisease extends DiseaseCubeRemoval
{
	constructor(event, cities)
    {
		super(event, cities);
		this.wasTriggered = true;
	}
	
	// While AutoTreatDisease is undoable and inherits from UndoableEvent,
	// its instances are triggered by other UndoableEvents -- the undoing of which triggers
	// any AutoTreatDisease events that they triggered to be undone in turn.
	// Therefore, this requestUndo method does nothing and exists only because
	// AutoTreatDisease inherits from DiseaseCubeRemoval which inherits from UndoableEvent
	// (because TreatDisease is an UndoableEvent which also inherits from DiseaseCubeRemoval).
	// Anyway, it's not as complicated as it sounds -- to summarize, this method is essentially a benign placeholder.
	requestUndo()
	{
		return new Promise(resolve => { resolve() });
	}
}

class ShareKnowledge extends UndoableEvent
{
	constructor(event, cities)
    {
		super(event);
		this.isUndoable = true;
		this.card = cities[this.cardKey];
    }

    getDetails()
    {
		const isGiver = this.giver.rID == this.role,
			participant = isGiver ? this.receiver : this.giver;

		return `${super.getDetails()}
				<p>${ isGiver ? "Gave" : "Received" } Card:</p>
				${this.card.getPlayerCard()}
				<p>${ isGiver ? "To" : "From" }: ${participant.newRoleTag()}</p>`;
	}

	animateUndo()
	{
		return new Promise(async resolve =>
		{
			const { receiver, giver, cardKey } = this;

			await receiver.giveCard(cardKey, giver);

			resolve();
		});
	}
}

class DiscoverACure extends UndoableEvent
{
	constructor(event, cities)
    {
		super(event);
		this.isUndoable = true;
		this.discards = [];
		
		for (let key of this.cardKeys)
			this.discards.push(cities[key]);
    }

    getDetails()
    {
		let discarded = "";
		for (let card of this.discards)
			discarded += card.getPlayerCard();
		
		return `${super.getDetails()}
				<p>Discarded: </p>
				${discarded}`;
	}
	
	animateUndo()
	{
		return new Promise(async resolve =>
		{
			for (let key of this.cardKeys)
				await this.player.panel.animateReceiveCard($("#playerDiscardContainer").children(`.playerCard[data-key='${key}']`));
			
			this.player.addCardKeysToHand(this.cardKeys);

			const diseaseColor = this.discards[0].color,
				$cureMarker = $(`#cureMarker${diseaseColor.toUpperCase()}`);
			await animationPromise({
				$elements: $cureMarker,
				targetProperties: { opacity: 0 }
			});
			$cureMarker.remove();

			gameData.cures[diseaseColor] = false;
			gameData.cures.remaining++;

			resolve();
		});
	}
}

class Eradication extends Event
{
	constructor(event)
    {
		super(event);
		this.wasTriggered = true;
	}
	
	getDetails()
	{
		const color = getColorWord(this.diseaseColor);
		
		return `${super.getDetails()}
				<p>The ${color} disease has been eradicated!</p>`;
	}

	animateUndo()
	{
		return new Promise(resolve =>
		{
			$(`#cureMarker${this.diseaseColor.toUpperCase()}`).attr("src", `images/pieces/cureMarker_${this.diseaseColor}.png`);
			resolve();
		});
	}
}

class OperationsFlight extends MovementAction
{
	constructor(event, cities)
    {
		super(event, cities);
		this.discard = cities[this.discardKey];
    }

    getDetails()
    {
		return `${super.getDetails()}
				<p>Discarded: </p>
				${this.discard.getPlayerCard()}`;
    }
}

class PlanContingency extends UndoableEvent
{
	constructor(event, eventCards)
    {
		super(event);
		this.isUndoable = true;
		this.eventCard = eventCards[this.cardKey];
    }

    getDetails()
    {
		return `${super.getDetails()}
				<p>Stored Event Card:</p>
				${this.eventCard.getPlayerCard()}`;
	}
	
	async animateUndo(animateDiscardPlayerCard)
	{
		const contingencyPlanner = this.player,
			$card = contingencyPlanner.$panel.find(".playerCard.eventCard.contingency");
		
		$card.closest(".role").removeClass("storingEventCard");
		await animateDiscardPlayerCard($card.removeClass("contingency unavailable"));
		contingencyPlanner.panel.checkOcclusion();
		contingencyPlanner.contingencyKey = false;

		bindEventCardHoverEvents();

		return Promise.resolve();
	}
}

class DispatchPawn extends MovementAction
{
	constructor(event, cities)
    {
		super(event, cities);
		this.movementType = getEventType(this.movementTypeCode);
		this.discard = false;
		
		if (movementTypeRequiresDiscard(this.movementType))
		{
			const { directFlight, charterFlight } = eventTypes;

			if (this.movementTypeCode === directFlight.code)
			{
				this.discard = this.destination;
				this.discardKey = this.destination.key;
			}
			else if (this.movementTypeCode === charterFlight.code)
			{
				this.discard = this.origin;
				this.discardKey = this.origin.key;
			}
		}
    }

    getDetails()
    {
		let discarded = "";
		if (this.discard)
			discarded = `<p>Discarded:</p>${this.discard.getPlayerCard()}`;
		
		return `${super.getDetails()}
				<p>Dispatched: ${this.dispatchedPlayer.newRoleTag()}</p>
				<p>Dispatch Type: <span class='hoverInfo' data-eventType='${this.movementType.code}'>${this.movementType.name}</span></p>
				<p>Origin: ${getLocatableCityName(this.origin)}</p>
				<p>Destination: ${getLocatableCityName(this.destination)}</p>
				${ this.isRendezvous() ? this.rendezvousedWith() : "" }
				${discarded}`;
	}
	
	isRendezvous()
	{
		return this.movementTypeCode === eventTypes.rendezvous.code;
	}

	rendezvousedWith()
	{
		let rendezvousRoles = "<p>Rendezvoused With:</p>";
		for (let player of this.playersAtDestination)
			rendezvousRoles += `<p class='indent-1'>${player.newRoleTag()}</p>`;
		
		return rendezvousRoles;
	}
}

class Airlift extends UndoableEvent
{
    constructor(event, cities)
    {
		super(event);
		this.isUndoable = true;
		this.eventCard = eventCards[eventTypes.airlift.cardKey];
        this.origin = cities[this.originKey];
		this.destination = cities[this.destinationKey];
    }

    getDetails()
    {
		return `${super.getDetails()}
				<p>Airlifted: ${this.airliftedPlayer.newRoleTag()}</p>
				<p>Origin: ${getLocatableCityName(this.origin)}</p>
				<p>Destination: ${getLocatableCityName(this.destination)}</p>
				<p>${ this.cardWasRemoved ? "Removed From Game" : "Discarded" }:</p>
				${this.eventCard.getPlayerCard()}`;
	}
	
	animateUndo(isContingencyCard)
	{
		return new Promise(async resolve =>
		{
			const cardKey = this.eventCard.key,
				$card = $("#playerDiscardContainer").find(`[data-key='${cardKey}']`);
			
			await this.player.panel.animateReceiveCard($card, { isContingencyCard });

			if (isContingencyCard)
				this.player.contingencyKey = cardKey;
			else
				this.player.addCardKeysToHand(cardKey);
			
			setDuration("pawnAnimation", 1000);
			await this.airliftedPlayer.updateLocation(this.origin);
			setDuration("pawnAnimation", 250);

			resolve();
		});
	}
}

class OneQuietNight extends UndoableEvent
{
	constructor(event)
    {
		super(event);
		this.isUndoable = true;
		this.eventCard = eventCards[eventTypes.oneQuietNight.cardKey];
    }
	
	getDetails()
    {
		return `${super.getDetails()}
				<p>${ this.cardWasRemoved ? "Removed From Game" : "Discarded" }:</p>
				${this.eventCard.getPlayerCard()}`;
    }

	animateUndo(isContingencyCard)
	{
		return new Promise(async resolve =>
		{
			const cardKey = this.eventCard.key,
				$card = $("#playerDiscardContainer").find(`[data-key='${cardKey}']`);
			
			await this.player.panel.animateReceiveCard($card, { isContingencyCard });

			if (isContingencyCard)
				this.player.contingencyKey = cardKey;
			else
				this.player.addCardKeysToHand(cardKey);
			
			resolve();
		});
	}
}

class GovernmentGrant extends ResearchStationPlacement
{
	constructor(event, cities)
    {
        super(event, cities);
		this.eventCard = eventCards[eventTypes.governmentGrant.cardKey];
    }
	
	getDiscardDetails()
	{
		return `<p>${ this.cardWasRemoved ? "Removed From Game" : "Discarded" }:</p>
				${this.eventCard.getPlayerCard()}`;
	}
}

class ResilientPopulation extends UndoableEvent
{
	constructor(event, cities)
    {
		super(event);
		this.isUndoable = true;
		this.eventCard = eventCards[eventTypes.resilientPopulation.cardKey];
		this.city = cities[this.cardKey];
	}
	
	getDetails()
    {
		return `${super.getDetails()}
				<p>Removed From Game:</p>
				${this.city.getInfectionCard()}
				<p>${ this.cardWasRemoved ? "Removed From Game" : "Discarded" }:</p>
				${this.eventCard.getPlayerCard()}`;
	}

	requestUndo()
	{
		return new Promise(async resolve =>
		{
			const result = await super.requestUndo();
	
			this.neighborCardKey = result.neighborCardKey;
			this.neighborWasDrawnBefore = result.neighborWasDrawnBefore;
	
			resolve(result);
		});
	}
	
	animateUndo(isContingencyCard, expandInfectionDiscardPile, collapseInfectionDiscardPile)
	{
		return new Promise(async resolve =>
		{
			const {
					eventCard,
					player,
					cardKey,
					neighborCardKey,
					neighborWasDrawnBefore
				} = this,
				eventCardKey = eventCard.key,
				$eventCard = $("#playerDiscardContainer").find(`[data-key='${eventCardKey}']`),
				$discardPile = $("#infectionDiscardContainer"),
				$discardPileTitle = $discardPile.children(".title"),
				$removedCardsContainer = $discardPile.children("#removedInfectionCards"),
				$infectionCard = $removedCardsContainer.children(`[data-key='${cardKey}']`),
				$neighborCard = neighborCardKey ? $discardPile.children(`[data-key='${neighborCardKey}']`) : false;

			await player.panel.animateReceiveCard($eventCard, { isContingencyCard });

			if (isContingencyCard)
				player.contingencyKey = eventCardKey;
			else
				player.addCardKeysToHand(eventCardKey);
			
			await expandInfectionDiscardPile({ showRemovedCardsContainer: true });
			await sleep(500);
			const infectionCardOffset = $infectionCard.offset();

			if ($removedCardsContainer.children(".infectionCard").length === 1)
				$removedCardsContainer.height($removedCardsContainer.height());
			
			$infectionCard.appendTo("#boardContainer")
				.offset(infectionCardOffset)
				.css("z-index", 10);
			
			if (isOverflowingVertically($discardPile))
			{
				// Determine an appropriate scroll position before placing the card where it was in the pile.
				let scrollTarget;
				if (neighborWasDrawnBefore)
				{
					if ($neighborCard.prev().hasClass("infectionCard"))
						scrollTarget = $neighborCard.prev().position().top;
					else
						scrollTarget = 0;
				}
				else
					scrollTarget = $neighborCard.position().top;
	
				// Scroll so that the placement position is clearly visible.
				await animationPromise({
					$elements: $discardPile,
					desiredProperties: { scrollTop: scrollTarget },
					duration: 600,
					easing: "easeInSine"
				});
			}
			
			// Animate the card to its proper position in the pile.
			let desiredOffsetTop;
			if (neighborCardKey)
			{
				desiredOffsetTop = $neighborCard.offset().top;
				if (!neighborWasDrawnBefore)
					desiredOffsetTop += $neighborCard.height();
			}
			else
				desiredOffsetTop = $discardPileTitle.offset().top + $discardPileTitle.outerHeight();

			await animationPromise({
				$elements: $infectionCard,
				desiredProperties: { top: desiredOffsetTop },
				easing: "easeOutQuad"
			});
			$infectionCard.css("z-index", "auto");
			
			if (neighborCardKey)
			{
				// New infection discards are placed at the top of the pile.
				if (neighborWasDrawnBefore)
					$infectionCard.insertBefore($neighborCard);
				else
					$infectionCard.insertAfter($neighborCard);
			}
			else
				$infectionCard.insertAfter($discardPileTitle);

			if (!$removedCardsContainer.children(".infectionCard").length)
				$removedCardsContainer.addClass("hidden").removeAttr("style");
			
			await sleep(1000);
			await collapseInfectionDiscardPile();

			resolve();
		});
	}
}

class Forecast extends PermanentEvent
{
	constructor(event, cities)
    {
		super(event);
		this.eventCard = eventCards[eventTypes.forecast.cardKey];
		this.cities = [];
		
		for (let key of this.cardKeys)
			this.cities.push(cities[key]);
	}
	
	getDetails()
    {
		let infectionCards = "";
		for (let city of this.cities)
			infectionCards += city.getInfectionCard();
		
		return `${super.getDetails()}
				<p>Top 6 Infections Cards:</p>
				${infectionCards}
				${this.placementEvent ? this.placementEvent.getDetails() : ""}
				<p>${ this.cardWasRemoved ? "Removed From Game" : "Discarded" }:</p>
				${this.eventCard.getPlayerCard()}`;
    }
}

class ForecastPlacement extends UndoableEvent
{
	constructor(event, cities, forecastEvent)
    {
		super(event);
		this.isUndoable = true;
		this.undoerFileName = "undoForecastPlacement";
		this.cities = [];
		
		for (let key of this.cardKeys)
			this.cities.push(cities[key]);
		
		forecastEvent.placementEvent = this;
		this.forecastEvent = forecastEvent;
	}
	
	getDetails()
    {
		let infectionCards = "";
		for (let city of this.cities)
			infectionCards += city.getInfectionCard();
		
		return `<p>New Order:</p>
				${infectionCards}`;
	}
	
	detachFromDrawEvent()
	{
		this.forecastEvent.placementEvent = false;
		this.forecastEvent = false;
	}
}

class PassActions extends UndoableEvent
{
	constructor(event)
	{
		super(event);
		this.isUndoable = true;
	}
	
	getDetails()
	{
		return `${super.getDetails()}
				<p>Actions Forfeited: ${this.numActionsForfeited}</p>`;
	}
}

class CardDraw extends PermanentEvent
{
	constructor(event, cities, eventCards)
    {
		super(event);
		this.cards = [];
		
		for (let key of this.cardKeys)
			this.cards.push(eventCards[key] || cities[key] || key);
    }

    getDetails()
    {
		let draws = "";
		for (let card of this.cards)
		{
			if (typeof card.getPlayerCard === "function")
				draws += card.getPlayerCard();
			else
				draws += "<div class='playerCard epidemic'>EPIDEMIC</div>";
		}
		
		return `${super.getDetails()}
				<p>Draws: </p>
				${draws}`;
    }
}

class Discard extends UndoableEvent
{
	constructor(event, cities, eventCards)
    {
		super(event);
		this.isUndoable = true;
		this.cardKeys = ensureIsArray(this.cardKeys);
		this.cards = [];
		
		for (let key of this.cardKeys)
			this.cards.push(eventCards[key] || cities[key]);
    }

    getDetails()
    {
		const HAND_LIMIT = 7;
		
		let discards = "";
		for (let card of this.cards)
			discards += card.getPlayerCard();
		
		return `${super.getDetails()}
				<p>Cards In Hand: ${ HAND_LIMIT + this.cards.length }</p>
				<p>Discarded: </p>
				${discards}`;
	}
	
	animateUndo()
	{
		return new Promise(async resolve =>
		{
			for (let key of this.cardKeys)
				await this.player.panel.animateReceiveCard($("#playerDiscardContainer").children(`.playerCard[data-key='${key}']`));
			
			this.player.addCardKeysToHand(this.cardKeys);

			resolve();
		});
	}
}

const infectionPreventionCodes = {
	notPrevented: "0",
	eradicated: "e",
	quarantine: "q",
	medicAutoTreat: "m"
};

class InfectCity extends PermanentEvent
{
	constructor(event, cities)
    {
		super(event);
		this.city = cities[this.cityKey];
    }

    getDetails()
    {
		const cube = newDiseaseCubeElement({ color: this.city.color, asJqueryObject: false });
		let infectionResult;

		if (this.preventedBy)
			infectionResult = `<p>Infection Prevented By:</p>${this.preventedBy}`;
		else
			infectionResult = `<span class='cubes'>
									<span>Placed Disease Cube: </span>${cube}
								</span>`;
		
		return `${super.getDetails()}
				<p>Infection Card: </p>
				${this.city.getInfectionCard()}
				${infectionResult}`;
    }
}

class EpidemicIncrease extends PermanentEvent
{
	constructor(event)
	{
		super(event);
		this.infectionRate = getInfectionRate(this.epidemicCount);
		this.previousInfectionRate = getInfectionRate(this.epidemicCount - 1);
	}
	getDetails()
    {
		return `${super.getDetails()}
				<p>Epidemic Count: ${this.epidemicCount}</p>
				<p>Infection Rate: ${this.previousInfectionRate} -> ${this.infectionRate}</p>`;
    }
}

class EpidemicInfect extends PermanentEvent
{
	constructor(event, cities)
    {
		super(event);
		this.city = cities[this.cityKey];
		
		this.MAX_NUM_CUBES = 3;
		this.numCubesAdded = this.MAX_NUM_CUBES - this.prevCubeCount;
    }

    getDetails()
    {
		let infectionResult;
		if (this.preventedBy)
			infectionResult = `<p>Infection Prevented By:</p>${this.preventedBy}`;
		else
		{
			let cubes = "";
			for (let i = 0; i < this.numCubesAdded; i++)
				cubes += newDiseaseCubeElement({ color: this.city.color, asJqueryObject: false });

			if (cubes)
				infectionResult = `<span class='cubes'>
										<span>Disease Cubes Added: </span>${ cubes }
									</span>`;
			else
				infectionResult = "<p>Disease Cubes Added: 0</p>";
			
			if (this.numCubesAdded < this.MAX_NUM_CUBES)
				infectionResult += "<p>(Triggered Outbreak)</p>";
		}
		
		return `${super.getDetails()}
				<p>Bottom Infection Card: </p>
				${this.city.getInfectionCard()}
				${infectionResult}`;
    }
}

class EpidemicIntensify extends PermanentEvent
{
	constructor(event, cities)
    {
		super(event);
		this.cities = [];

		if (event.cardKeys)
			for (let key of event.cardKeys)
				this.cities.push(cities[key]);
    }

    getDetails()
    {
		let details;
		if (this.cities.length)
		{
			details = `<p>Shuffled ${this.cities.length} Cards:</p>`;

			for (let city of this.cities)
				details += city.getInfectionCard();
		}
		else
			details = "<p>No cards to shuffle.</p>";
		
		return `${super.getDetails()}
				${details}`;
    }
}

class Outbreak extends PermanentEvent
{
	constructor(event, cities, arrayContainingTriggerEvent)
    {
		super(event);
		this.origin = cities[this.originKey];
		this.infections = [];
		this.triggeredOutbreaks = [];

		if (this.triggeredByKey)
			this.attachToTriggerEvent(arrayContainingTriggerEvent);
	}
	
	attachToTriggerEvent(arrayContainingTriggerEvent)
	{
		let event;
		for (let i = arrayContainingTriggerEvent.length - 1; i >= 0; i--)
		{
			event = arrayContainingTriggerEvent[i];
			if (event instanceof Outbreak && event.originKey === this.triggeredByKey)
			{
				event.triggeredOutbreaks.push(this);
				break;
			}
		}
	}

    getDetails()
    {
		return `${super.getDetails()}
				<p>Origin: ${getLocatableCityName(this.origin)}</p>
				${this.getInfectionDetails()}
				${this.getPreventionDetails()}
				<p>Outbreak Count: ${this.outbreakCount}</p>`;
	}

	getInfectionDetails()
	{
		const cube = newDiseaseCubeElement({ color: this.diseaseColor, asJqueryObject: false });
		let infectionDetails = "";

		for (let infection of [...this.infections, ...this.triggeredOutbreaks])
		{
			if (infection.preventedBy)
				continue;
			
			infectionDetails += `<span class='cubes indent-1'>
									${cube}<span> -> ${getLocatableCityName(infection.city || infection.origin)}</span>
								</span>
								<br />`;
		}

		if (infectionDetails.length)
			return `<p>Affected Cities:</p>${infectionDetails}`;
		
		return "";
	}

	getPreventionDetails()
	{
		const preventionStrings = {
			quarantined: "",
			autoTreated: ""
		};
		let preventionMethod;
		
		for (let infection of this.infections)
		{
			if (infection.preventedBy)
			{
				if (infection.preventionCode === infectionPreventionCodes.quarantine)
					preventionMethod = "quarantined";
				else if (infection.preventionCode === infectionPreventionCodes.medicAutoTreat)
					preventionMethod = "autoTreated";
				
				if (!preventionStrings[preventionMethod].length)
					preventionStrings[preventionMethod] += `<p class='indent-1'>By ${infection.preventedBy}:</p>`;
				
				preventionStrings[preventionMethod] += `<p class='indent-2'>${getLocatableCityName(infection.city)}</p>`;
			}
		}

		const { quarantined, autoTreated } = preventionStrings;
		if (quarantined.length || autoTreated.length)
			return `<p>Infections Prevented:</p>${quarantined}${autoTreated}`;
		
		return "";
	}
}

class OutbreakInfection extends PermanentEvent
{
	constructor(event, cities, arrayContainingOutbreakEvent)
    {
		super(event);
		this.city = cities[this.infectedKey];
		this.attachToOutbreakEvent(arrayContainingOutbreakEvent);
    }

	attachToOutbreakEvent(arrayContainingOutbreakEvent)
	{
		let event;
		for (let i = arrayContainingOutbreakEvent.length - 1; i >= 0; i--)
		{
			event = arrayContainingOutbreakEvent[i];
			if (event instanceof Outbreak && event.originKey === this.originKey)
			{
				event.infections.push(this);
				break;
			}
		}
	}
}

function getEventType(eventCode)
{
	return eventTypes[eventCodes[eventCode]];
}

function getEventTypeTooltipContent(eventType,
	{
		includeName = true, // Includes the event type name as the title.
		pluralNameForm, // Pluralizes the event type name in the title.
		actionNotPossible, // Includes an indication that performing the event is not currently possible.
		includeRelatedRoleRule, // Some event types have special rules that apply to a specific role.
		isDispatchType, // Indicates that the Dispatcher's special action was used to perform a movement event.
		omitHoverInfoElements // Set to true when the tooltip will not be hoverable.
	} = {})
{
	let content = "";

	// The "DISPATCH PAWN VIA" part of a title pertains to the Dispatcher's first special ability.
	// Rendezvous is a special ability in its own right, so its tooltip doesn't require the prefix.	
	if (includeName)
	{
		const dispatchPrefix = isDispatchType && eventType.code !== eventTypes.rendezvous.code ? "DISPATCH PAWN VIA<br/> " : "",
			eventTypeName = eventType[ pluralNameForm ? "pluralName" : eventType.displayName ? "displayName" : "name" ].toUpperCase();
		
		content += `<h3>${dispatchPrefix}${eventTypeName}</h3>`;
	}

	if (actionNotPossible)
		content += "<p class='actionNotPossible'>This action is not currently possible.</p>";
	
	const rules = isDispatchType ? eventTypes.dispatchPawn[toCamelCase(eventType.name.replace("/","")) + "Rules"] : eventType.rules;
	for (let rule of rules)
		content += `<p>${rule}</p>`;
	
	if (includeRelatedRoleRule)
		content += `<p class='specialAbilityRule'>${replaceRoleNamesWithRoleTags(eventType.relatedRoleRule)}</p>`;
	
	if (omitHoverInfoElements)
		content = stripTagsThatMatchSelector(content, ".hoverInfo");

	return content;
}

function movementTypeRequiresDiscard(eventType)
{
	const { directFlight, charterFlight, operationsFlight } = eventTypes;
	
	return eventType.code === directFlight.code
		|| eventType.code === charterFlight.code
		|| eventType.code === operationsFlight.code;
}

// Because Events need to be instantiated before Players.
function attachPlayersToEvents(events)
{
	const { players } = gameData;
	
	for (let event of events)
	{
		if (players.hasOwnProperty(event.role))
		{
			event.player = players[event.role];

			if (event instanceof ShareKnowledge)
			{
				event.giver = players[event.giverRoleID];
				event.receiver = players[event.receiverRoleID];
			}
			else if (event instanceof DispatchPawn)
			{
				event.dispatchedPlayer = players[event.dispatchedRoleID];
				
				if (event.isRendezvous())
				{
					event.playersAtDestination = [];
					for (let role of event.rolesAtRendezvousDestination)
						event.playersAtDestination.push(players[role]);
				}
			}
			else if (event instanceof Airlift)
				event.airliftedPlayer = players[event.airliftedRoleID];
		}
		else if (event instanceof InfectCity || event instanceof EpidemicInfect || event instanceof OutbreakInfection)
		{
			if (event.preventionCode === infectionPreventionCodes.notPrevented)
				continue;
			
			if (event.preventionCode === infectionPreventionCodes.eradicated)
				event.preventedBy = `<span class='hoverInfo' data-eventType='${eventTypes.eradication.code}'>Eradication</span>`;
			else if (event.preventionCode === infectionPreventionCodes.quarantine)
			{
				const qs = getPlayer("Quarantine Specialist");
				event.preventedBy = qs ? qs.newRoleTag() : false;
			}
			else if (event.preventionCode === infectionPreventionCodes.medicAutoTreat)
			{
				const medic = getPlayer("Medic");
				event.preventedBy = medic ? medic.newRoleTag() : false;
			}
		}
		else if (event instanceof StartingHands)
		{
			for (let hand of event.hands)
				hand.player = players[hand.role];
		}
	}
}

function getLocatableCityName(city)
{
	return `<span class='locatable' data-key='${city.key}'>${city.name}</span>`;
}

export {
	eventTypes,
	getEventType,
	getEventTypeTooltipContent,
	movementTypeRequiresDiscard,
	attachPlayersToEvents,
	PermanentEvent,
	StartingHands,
	InitialInfection,
	MovementAction,
	DriveFerry,
	DirectFlight,
	CharterFlight,
	ShuttleFlight,
	ResearchStationPlacement,
	BuildResearchStation,
	DiseaseCubeRemoval,
	TreatDisease,
	AutoTreatDisease,
	ShareKnowledge,
	DiscoverACure,
	Eradication,
	OperationsFlight,
	PlanContingency,
	DispatchPawn,
	Airlift,
	OneQuietNight,
	GovernmentGrant,
	ResilientPopulation,
	Forecast,
	ForecastPlacement,
	PassActions,
	CardDraw,
	Discard,
	infectionPreventionCodes,
	InfectCity,
	EpidemicIncrease,
	EpidemicInfect,
	EpidemicIntensify,
	Outbreak,
	OutbreakInfection
}