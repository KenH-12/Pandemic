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
		propertyNames: ["cardKey", "giverRoleID", "receiverRoleID"],
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
		propertyNames: ["dispatchedRoleID", "originKey", "destinationKey", "movementTypeCode"]
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
		propertyNames: ["cardKeys"]
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
			"You may play this between the Infect and Intensify steps of an epidemic."
		],
		instructions: "Select a card from INFECTION DISCARDS to remove from the game.",
		propertyNames: ["cardKey"],
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

	getDetails()
	{
		const name = this.displayName || this.name;
		
		return `<p class='title'>${name.toUpperCase()}</p>
				${ this.player ? `<p>Role: ${this.player.newRoleTag()}</p>` : "" }`;
	}
}

class StartingHands extends Event
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

	getDetails()
	{
		let details = "";
		for (let hand of this.hands)
		{
			details += `<div class='hand'>
							<p>Role: ${hand.player.newRoleTag()}</p>
							<p>Starting Hand:</p>`;
			for (let card of hand.cards)
				details += card.getPlayerCard({ noTooltip: true });
			
			details += "</div>";
		}

		return super.getDetails() + details;
	}
}

class InitialInfection extends Event
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
		return `${super.getDetails()}
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
		return `${super.getDetails()}
				<p>Origin: ${this.origin.name}</p>
				<p>Destination: ${this.destination.name}</p>
				<p>Discarded:</p>
				${this.destination.getPlayerCard({ noTooltip: true })}`;
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
		return `${super.getDetails()}
				<p>Origin: ${this.origin.name}</p>
				<p>Destination: ${this.destination.name}</p>
				<p>Discarded:</p>
				${this.origin.getPlayerCard({ noTooltip: true })}`;
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
		return `${super.getDetails()}
				<p>Origin: ${this.origin.name}</p>
				<p>Destination: ${this.destination.name}</p>`;
    }
}

class ResearchStationPlacement extends Event
{
	constructor(event, cities)
    {
		super(event);
		this.city = cities[this.cityKey];

		if (this.relocationKey)
			this.relocatedFromCity = cities[this.relocationKey];
	}
	
	getDetails()
	{
		let relocatedFrom = "";
		if (this.relocationKey)
			relocatedFrom = `<p>Relocated Station From: ${this.relocatedFromCity.name}</p>`;

		return `${super.getDetails()}
				<p>Location: ${this.city.name}</p>
				${relocatedFrom}
				${this.getDiscardDetails()}`;
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

class DiseaseCubeRemoval extends Event
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
				<p>Location: ${this.city.name}</p>
				<span class='cubes'>
					<span>Removed: </span>${cubesRemoved}
				</span>`;
	}
}

class TreatDisease extends DiseaseCubeRemoval
{
	constructor(event, cities)
    {
		super(event, cities);
		this.numCubesRemoved = this.prevCubeCount - this.newCubeCount;
    }
}

class AutoTreatDisease extends DiseaseCubeRemoval { }

class ShareKnowledge extends Event
{
	constructor(event, cities)
    {
		super(event);
		this.card = cities[this.cardKey];
    }

    getDetails()
    {
		return `${super.getDetails()}
				<p>Giver: ${this.giver.newRoleTag()}</p>
				<p>Receiver: ${this.receiver.newRoleTag()}</p>
				<p>Shared Card: </p>
				${this.card.getPlayerCard({ noTooltip: true })}`;
    }
}

class DiscoverACure extends Event
{
	constructor(event, cities)
    {
		super(event);
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
}

class Eradication extends Event
{
	getDetails()
	{
		const color = getColorWord(this.diseaseColor);
		
		return `${super.getDetails()}
				<p>The ${color} disease has been eradicated!</p>
				<p>(no new ${color} disease cubes will be placed on the board)</p>`;
	}
}

class OperationsFlight extends Event
{
	constructor(event, cities)
    {
		super(event);
		this.origin = cities[this.originKey];
		this.destination = cities[this.destinationKey];
		this.discard = cities[this.cardKey];
    }

    getDetails()
    {
		return `${super.getDetails()}
				<p>Origin: ${this.origin.name}</p>
				<p>Destination: ${this.destination.name}</p>
				<p>Discarded: </p>
				${this.discard.getPlayerCard({ noTooltip: true })}`;
    }
}

class PlanContingency extends Event
{
	constructor(event, eventCards)
    {
		super(event);
		this.eventCard = eventCards[this.cardKey];
    }

    getDetails()
    {
		return `${super.getDetails()}>
				<p>Stored Event Card:</p>
				${this.eventCard.getPlayerCard({ noTooltip: true })}`;
    }
}

class DispatchPawn extends Event
{
	constructor(event, cities)
    {
		super(event);
		this.origin = cities[this.originKey];
		this.destination = cities[this.destinationKey];
		this.movementType = getEventType(this.movementTypeCode);
		this.discard = false;
		
		if (movementTypeRequiresDiscard(this.movementType))
		{
			const { directFlight, charterFlight } = eventTypes;

			if (this.movementTypeCode === directFlight.code)
				this.discard = this.destination;
			else if (this.movementTypeCode === charterFlight.code)
				this.discard = this.origin;
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
				<p>Origin: ${this.origin.name}</p>
				<p>Destination: ${this.destination.name}</p>
				${discarded}`;
    }
}

class Airlift extends Event
{
    constructor(event, cities)
    {
        super(event);
        this.origin = cities[this.originKey];
		this.destination = cities[this.destinationKey];
    }

    getDetails()
    {
		return `${super.getDetails()}
				<p>Airlifted: ${this.airliftedPlayer.newRoleTag()}</p>
				<p>Origin: ${this.origin.name}</p>
				<p>Destination: ${this.destination.name}</p>
				<p>Discarded:</p>
				<div class='playerCard eventCard'>AIRLIFT</div>`;
    }
}

class OneQuietNight extends Event
{
    getDetails()
    {
		return `${super.getDetails()}
				<p>Discarded:</p>
				<div class='playerCard eventCard'>ONE QUIET NIGHT</div>`;
    }
}

class GovernmentGrant extends ResearchStationPlacement
{
	getDiscardDetails()
	{
		return `<p>Discarded:</p>
				<div class='playerCard eventCard'>GOVERNMENT GRANT</div>`;
	}
}

class ResilientPopulation extends Event
{
	constructor(event, cities)
    {
		super(event);
		this.city = cities[this.cardKey];
	}
	
	getDetails()
    {
		return `${super.getDetails()}
				<p>Removed From Game:</p>
				${this.city.getInfectionCard()}
				<p>Discarded:</p>
				<div class='playerCard eventCard'>RESILIENT POPULATION</div>`;
    }
}

class Forecast extends Event
{
	constructor(event, cities)
    {
		super(event);
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
				<p>Discarded:</p>
				<div class='playerCard eventCard'>FORECAST</div>`;
    }
}

class ForecastPlacement extends Event
{
	constructor(event, cities)
    {
		super(event);
		this.cities = [];
		
		for (let key of this.cardKeys)
			this.cities.push(cities[key]);
	}
	
	getDetails()
    {
		let infectionCards = "";
		for (let city of this.cities)
			infectionCards += city.getInfectionCard();
		
		return `<p>New Order:</p>
				${infectionCards}`;
    }
}

class CardDraw extends Event
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

class Discard extends Event
{
	constructor(event, cities, eventCards)
    {
		super(event);
		this.cards = [];
		
		for (let key of ensureIsArray(this.cardKeys))
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
}

const infectionPreventionCodes = {
	notPrevented: "0",
	eradicated: "e",
	quarantine: "q",
	medicAutoTreat: "m"
};

class InfectCity extends Event
{
	constructor(event, cities)
    {
		super(event);
		this.city = cities[this.cityKey];
    }

    getDetails()
    {
		return `${super.getDetails()}
				<p>Infection Card: </p>
				${this.city.getInfectionCard()}
				${ this.preventedBy ? `<p>Infection Prevented By:</p>${this.preventedBy}` : "" }`;
    }
}

class EpidemicIncrease extends Event
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

class EpidemicInfect extends Event
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

class EpidemicIntensify extends Event
{
	constructor(event, cities)
    {
		super(event);
		this.cities = [];

		for (let key of event.cardKeys)
			this.cities.push(cities[key]);
    }

    getDetails()
    {
		let infectionCards = "";
		for (let city of this.cities)
			infectionCards += city.getInfectionCard();
		
		return `${super.getDetails()}
				<p>Pre-Intensify Discard Pile:</p>
				${infectionCards}`;
    }
}

class Outbreak extends Event
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
		let infectionDetails = "";
		for (let infection of this.infections)
			infectionDetails += this.getInfectionDetails(infection)
		
		let triggeredOutbreakDetails = "";
			for (let outbreak of this.triggeredOutbreaks)
			triggeredOutbreakDetails += `${this.getInfectionDetails(outbreak)}`;
		
		return `${super.getDetails()}
				<p>Origin: ${this.origin.name}</p>
				${ infectionDetails ? `<p>Affected Cities:</p>${infectionDetails}` : "" }
				${triggeredOutbreakDetails}
				<p>Outbreak Count: ${this.outbreakCount}</p>`;
	}

	getInfectionDetails(infection)
	{
		const cube = newDiseaseCubeElement({ color: this.diseaseColor, asJqueryObject: false });
		return `<span class='cubes'>
					${cube}<span> -> ${ infection instanceof OutbreakInfection ? infection.infectedCity.name : infection.origin.name }</span>
				</span>
				<br />`;
	}
}

class OutbreakInfection extends Event
{
	constructor(event, cities, arrayContainingOutbreakEvent)
    {
		super(event);
		this.infectedCity = cities[this.infectedKey];
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
				event.dispatchedPlayer = players[event.dispatchedRoleID];
			else if (event instanceof Airlift)
				event.airliftedPlayer = players[event.airliftedRoleID];
		}
		else if (event instanceof InfectCity || event instanceof EpidemicInfect)
		{
			if (event.preventionCode === infectionPreventionCodes.notPrevented)
				continue;
			
			if (event.preventionCode === infectionPreventionCodes.eradicated)
				event.preventedBy = "Eradication";
			else if (event.preventionCode === infectionPreventionCodes.quarantine)
				event.preventedBy = getPlayer("Quarantine Specialist").newRoleTag();
			else if (event.preventionCode === infectionPreventionCodes.medicAutoTreat)
				event.preventedBy = getPlayer("Medic").newRoleTag();
		}
		else if (event instanceof StartingHands)
		{
			for (let hand of event.hands)
				hand.player = players[hand.role];
		}
	}
}

export {
	eventTypes,
	getEventType,
	movementTypeRequiresDiscard,
	attachPlayersToEvents,
	StartingHands,
	InitialInfection,
	DriveFerry,
	DirectFlight,
	CharterFlight,
	ShuttleFlight,
	BuildResearchStation,
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