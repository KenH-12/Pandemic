"use strict";

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
		hasIcon: true,
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
		hasIcon: true,
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

export default class Event
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

class DriveFerry extends Event
{
    constructor(event, cities)
    {
        super(event);
        this.origin = cities[this.originKey];
        this.destination = cities[this.destinationKey];
    }

    getDetails()
    {
        return `<p class='title'>DRIVE / FERRY</p>
				<p>Role: ${this.player.newRoleTag()}</p>
				<p>Origin: ${this.origin.name}</p>
				<p>Destination: ${this.destination.name}</p>`;
    }
}

class DirectFlight extends Event
{
	constructor(event, cities)
    {
        super(event);
        this.origin = cities[this.originKey];
        this.destination = cities[this.destinationKey];
    }

    getDetails()
    {
		const {
			name: destinationName,
			color: destinationColor
		} = this.destination;

		return `<p class='title'>DIRECT FLIGHT</p>
				<p>Role: ${this.player.newRoleTag()}</p>
				<p>Origin: ${this.origin.name}</p>
				<p>Destination: ${destinationName}</p>
				<p>Discarded:</p>
				<div class='playerCard ${destinationColor}'>${destinationName.toUpperCase()}</div>`;
    }
}

class CharterFlight extends Event
{
	constructor(event, cities)
    {
        super(event);
        this.origin = cities[this.originKey];
        this.destination = cities[this.destinationKey];
    }

    getDetails()
    {
		const {
			name: originName,
			color: originColor
		} = this.origin;

		return `<p class='title'>CHARTER FLIGHT</p>
				<p>Role: ${this.player.newRoleTag()}</p>
				<p>Origin: ${originName}</p>
				<p>Destination: ${this.destination.name}</p>
				<p>Discarded:</p>
				<div class='playerCard ${originColor}'>${originName.toUpperCase()}</div>`;
    }
}

class ShuttleFlight extends Event
{
	constructor(event, cities)
    {
        super(event);
        this.origin = cities[this.originKey];
        this.destination = cities[this.destinationKey];
    }

    getDetails()
    {
		return `<p class='title'>SHUTTLE FLIGHT</p>
				<p>Role: ${this.player.newRoleTag()}</p>
				<p>Origin: ${this.origin.name}</p>
				<p>Destination: ${this.destination.name}</p>`;
    }
}

class BuildResearchStation extends Event
{
	constructor(event, cities)
    {
		super(event);
		this.city = cities[this.cityKey];
    }

    getDetails()
    {
		log(this.player.role.toUpperCase());
		let discarded;
		if (this.player.role === "Operations Expert")
			discarded = `<p>[discard not required]</p>`;
		else
			discarded = `<p>Discarded:</p><div class='playerCard ${this.city.color}'>${this.city.name.toUpperCase()}</div>`;

		return `<p class='title'>BUILD RESEARCH STATION</p>
				<p>Role: ${this.player.newRoleTag()}</p>
				<p>Location: ${this.city.name}</p>
				${discarded}`;
    }
}

function getEventType(eventCode)
{
	return eventTypes[eventCodes[eventCode]];
}

// Because Events need to be instantiated before Players.
function attachPlayersToEvents(players, events)
{
	for (let event of events)
		if (players.hasOwnProperty(event.role))
			event.player = players[event.role];
}

export {
	eventTypes,
	getEventType,
	attachPlayersToEvents,
	DriveFerry,
	DirectFlight,
	CharterFlight,
	ShuttleFlight,
	BuildResearchStation
}