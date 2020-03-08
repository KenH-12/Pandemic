"use strict";

import { eventCards, bindEventCardHoverEvents } from "./eventCard.js";

const eventTypes = {
	driveFerry: {
		name: "Drive/Ferry",
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
		instructions: "Select a Destination:",
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
		propertyNames: ["cityKey", "relocationKey"],
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
		propertyNames: ["cardKey", "giverRoleID", "receiverRoleID"],
		relatedRoleName: "Researcher",
		relatedRoleRule: "The Researcher may <i>give</i> a city card without needing to be in the city that matches the card."
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
		hasIcon: true,
		code: "at",
		propertyNames: ["cityKey", "diseaseColor", "numCubesRemoved"]
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
		displayName: "Disease Eradicated",
		hasIcon: true,
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
		propertyNames: ["dispatchedRoleID", "originKey", "destinationKey", "movementTypeCode", "rolesAtRendezvousDestination"]
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
		rules: ["<i>Once per turn</i>, as an action, the Operations Expert may move from a research station to any city by discarding any city card."],
		instructions: "To select a destination, drag and drop your pawn onto a city.",
		actionPathName: "movementAction",
		propertyNames: ["originKey", "destinationKey", "discardKey"]
	},
	pass: {
		name: "Pass",
		hasIcon: true,
		code: "pa",
		propertyNames: [],
		rules: [`Forfeit your remaining actions for this turn and proceed to the "Draw 2 cards" step.`],
		instructions: "Pass on your remaining actions for this turn?",
		actionPathName: "passActions",
		propertyNames: ["numActionsForfeited"]
	},
	cardDraw: {
		name: "Draw 2 Cards",
		hasIcon: true,
		code: "cd",
		actionPathName: "drawPlayerCards",
		propertyNames: ["cardKeys"]
	},
	epidemicIncrease: {
		name: "Epidemic Increase",
		code: "ec",
		actionPathName: "epidemicIncrease",
		propertyNames: ["epidemicCount"],
		hasIcon: true
	},
	epidemicInfect: {
		name: "Epidemic Infect",
		code: "ef",
		actionPathName: "epidemicInfect",
		propertyNames: ["cityKey", "prevCubeCount", "preventionCode"],
		hasIcon: true
	},
	epidemicIntensify: {
		name: "Epidemic Intensify",
		code: "et",
		actionPathName: "epidemicIntensify",
		propertyNames: ["numDiscardsShuffled"],
		hasIcon: true
	},
	discard: {
		name: "Discard",
		displayName: "Discard To 7 Cards",
		hasIcon: true,
		code: "ds",
		actionPathName: "discardPlayerCards",
		propertyNames: ["cardKeys"]
	},
	infectCity: {
		name: "Infect City",
		hasIcon: true,
		code: "ic",
		actionPathName: "infectCity",
		propertyNames: ["cityKey", "preventionCode"],
	},
	initialInfection: {
		name: "Initial Infection",
		displayName: "Infect 9 Cities",
		hasIcon: true,
		code: "ii",
		propertyNames: ["cityKey", "numCubes"]
	},
	startingHands: {
		name: "Starting Hands",
		hasIcon: true,
		code: "sh",
		propertyNames: ["cardKeys"],
		rules: [
			"Cards are dealt according to the number of roles:",
			"2 roles: 4 cards each",
			"3 roles: 3 cards each",
			"4 roles: 2 cards each",
			"<br/>",
			"The turn order is decided by each role's highest city card population."
		]
	},
	outbreak: {
		name: "Outbreak",
		hasIcon: true,
		code: "ob",
		propertyNames: ["outbreakCount", "originKey", "diseaseColor", "triggeredByKey"]
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
			"* You may play this between the Infect and Intensify steps of an epidemic."
		],
		instructions: "Select a card from INFECTION DISCARDS to remove from the game.",
		propertyNames: ["cardKey", "infectionDiscardIndex"],
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
		name: "Forecast",
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
		propertyNames: ["airliftedRoleID", "originKey", "destinationKey"],
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
	ge: "gameEnd"
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
		return getEventType(this.code).hasIcon;
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

				handDetails += card.getPlayerCard({ includePopulation: true, noTooltip: true });
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
	requestUndo(activePlayer, currentStepName, additionalDataToPost = {})
	{
		return new Promise((resolve, reject) =>
		{
			$.post(`serverCode/actionPages/${this.undoerFileName || `undo${toPascalCase(this.name)}`}.php`,
			{
				...{
					activeRole: activePlayer.rID,
					currentStep: currentStepName,
					eventID: this.id
				},
				...additionalDataToPost
			},
			function(response)
			{
				log(response);
				const result = JSON.parse(response);
				
				if (result.failure)
					reject(result.failure);
				else
					resolve(result);
			});
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

	requestUndo(activePlayer, currentStepName)
	{
		return super.requestUndo(activePlayer, currentStepName, { actionCode: this.code });
	}
	
	animateUndo(gameData)
	{
		return new Promise(async resolve =>
		{
			const playerToMove = this instanceof DispatchPawn ? this.dispatchedPlayer : this.player;

			if (this.discardKey)
			{
				await this.player.panel.animateReceiveCard($("#playerDiscard").children(`[data-key='${this.discardKey}']`), gameData);
				this.player.addCardKeysToHand(this.discardKey);
			}
			
			setDuration(gameData, "pawnAnimation", this instanceof DriveFerry ? 500 : 1000);
			await playerToMove.updateLocation(this.origin);
			setDuration(gameData, "pawnAnimation", 250);

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
				${this.destination.getPlayerCard({ noTooltip: true })}`;
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
				${this.origin.getPlayerCard({ noTooltip: true })}`;
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

	async animateUndo(gameData, animateResearchStationBackToSupply, isContingencyCard)
	{
		let cardKey = false;
		if (this instanceof BuildResearchStation && this.player.role !== "Operations Expert")
			cardKey = this.cityKey;
		else if (this instanceof GovernmentGrant)
			cardKey = this.eventCard.key;

		if (cardKey)
		{
			const $card = $("#playerDiscard").find(`[data-key='${cardKey}']`);
			await this.player.panel.animateReceiveCard($card, gameData, { isContingencyCard });

			if (isContingencyCard)
				this.player.contingencyKey = cardKey;
			else
				this.player.addCardKeysToHand(cardKey);
		}

		if (this.relocationKey)
		{
			await this.city.relocateResearchStationTo(gameData, this.relocatedFromCity);
			return this.city.cluster(gameData, { animatePawns: true, animateCubes: true });
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
		
		return `<p>Discarded:</p>${this.city.getPlayerCard({ noTooltip: true })}`;
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
				${this.card.getPlayerCard({ noTooltip: true })}
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
			discarded += card.getPlayerCard({ noTooltip: true });
		
		return `${super.getDetails()}
				<p>Discarded: </p>
				${discarded}`;
	}
	
	animateUndo(gameData)
	{
		return new Promise(async resolve =>
		{
			for (let key of this.cardKeys)
				await this.player.panel.animateReceiveCard($("#playerDiscard").children(`.playerCard[data-key='${key}']`), gameData);
			
			this.player.addCardKeysToHand(this.cardKeys);

			const diseaseColor = this.discards[0].color,
				$cureMarker = $(`#cureMarker${diseaseColor.toUpperCase()}`);
			await animatePromise({
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
				<p>The ${color} disease has been eradicated!</p>
				<p>(no new ${color} disease cubes will be placed on the board)</p>`;
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
				${this.discard.getPlayerCard({ noTooltip: true })}`;
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
				${this.eventCard.getPlayerCard({ noTooltip: true })}`;
	}
	
	animateUndo(gameData, animateDiscardPlayerCard)
	{
		return new Promise(async resolve =>
		{
			const contingencyPlanner = this.player,
				$card = contingencyPlanner.$panel.find(".playerCard.eventCard.contingency");
			
			await animateDiscardPlayerCard($card.removeClass("contingency unavailable"));
			contingencyPlanner.panel.checkOcclusion(gameData);
			contingencyPlanner.contingencyKey = false;

			bindEventCardHoverEvents(gameData);

			resolve();
		});
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
			discarded = `<p>Discarded:</p>${this.discard.getPlayerCard({ noTooltip: true })}`;
		
		return `${super.getDetails()}
				<p>Dispatched: ${this.dispatchedPlayer.newRoleTag()}</p>
				<p>Dispatch Type: ${this.movementType.name}</p>
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
	
	animateUndo(gameData, isContingencyCard)
	{
		return new Promise(async resolve =>
		{
			const cardKey = this.eventCard.key,
				$card = $("#playerDiscard").find(`[data-key='${cardKey}']`);
			
			await this.player.panel.animateReceiveCard($card, gameData, { isContingencyCard });

			if (isContingencyCard)
				this.player.contingencyKey = cardKey;
			else
				this.player.addCardKeysToHand(cardKey);
			
			setDuration(gameData, "pawnAnimation", 1000);
			await this.airliftedPlayer.updateLocation(this.origin);
			setDuration(gameData, "pawnAnimation", 250);

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

	animateUndo(gameData, isContingencyCard)
	{
		return new Promise(async resolve =>
		{
			const cardKey = this.eventCard.key,
				$card = $("#playerDiscard").find(`[data-key='${cardKey}']`);
			
			await this.player.panel.animateReceiveCard($card, gameData, { isContingencyCard });

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

	requestUndo(activePlayer, currentStepName)
	{
		return new Promise(async resolve =>
		{
			const result = await super.requestUndo(activePlayer, currentStepName);
	
			this.neighborCardKey = result.neighborCardKey;
			this.neighborWasDrawnBefore = result.neighborWasDrawnBefore;
	
			resolve(result);
		});
	}
	
	animateUndo(gameData, isContingencyCard, expandInfectionDiscardPile, collapseInfectionDiscardPile)
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
				$eventCard = $("#playerDiscard").find(`[data-key='${eventCardKey}']`),
				$discardPile = $("#infectionDiscard"),
				$discardPileTitle = $discardPile.children(".title"),
				$removedCardsContainer = $discardPile.children("#removedInfectionCards"),
				$infectionCard = $removedCardsContainer.children(`[data-key='${cardKey}']`),
				$neighborCard = neighborCardKey ? $discardPile.children(`[data-key='${neighborCardKey}']`) : false;

			await player.panel.animateReceiveCard($eventCard, gameData, { isContingencyCard });

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
				await animatePromise({
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

			await animatePromise({
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
				draws += card.getPlayerCard({ noTooltip: true });
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
			discards += card.getPlayerCard({ noTooltip: true });
		
		return `${super.getDetails()}
				<p>Cards In Hand: ${ HAND_LIMIT + this.cards.length }</p>
				<p>Discarded: </p>
				${discards}`;
	}
	
	animateUndo(gameData)
	{
		return new Promise(async resolve =>
		{
			for (let key of this.cardKeys)
				await this.player.panel.animateReceiveCard($("#playerDiscard").children(`.playerCard[data-key='${key}']`), gameData);
			
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

function movementTypeRequiresDiscard(eventType)
{
	const { directFlight, charterFlight, operationsFlight } = eventTypes;
	
	return eventType.code === directFlight.code
		|| eventType.code === charterFlight.code
		|| eventType.code === operationsFlight.code;
}

// Because Events need to be instantiated before Players.
function attachPlayersToEvents(players, getPlayer, events)
{
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
				event.preventedBy = "Eradication";
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