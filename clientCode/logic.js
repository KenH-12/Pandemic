"use strict";

import {
	gameData, 
	getPlayer,
	getActivePlayer,
	locatePawnOnRoleTagClick,
	eventTypeIsBeingPrompted,
	getDifficultyName
} from "./gameData.js";
import {
	getInfectionRate,
	getColorClass,
	getColorWord,
	newDiseaseCubeElement,
	newPlayerCard,
	resizeInfectionCards,
	getInfectionCardTextStyle,
	useRoleColorForRelatedActionButtons
} from "./utilities/pandemicUtils.js";
import { strings } from "./strings.js";
import getDimension from "./dimensions.js";
import { getDuration, setDuration } from "./durations.js";
import { easings } from "./easings.js";
import PlayerPanel from "./playerPanel.js";
import DeckImageManager from "./deckImageManager.js";
import {
	eventCards,
	isEventCardKey,
	bindEventCardHoverEvents,
	unbindEventCardHoverEvents
} from "./eventCard.js";
import {
	cities,
	getCity,
	isCityKey,
	bindCityLocatorClickEvents,
	pinpointCityFromCard,
	pinpointCity,
	resetPinpointRectangles,
	researchStationKeys,
	updateResearchStationSupplyCount,
	getResearchStationSupplyCount,
	highlightAllResearchStations,
	turnOffResearchStationHighlights,
	highlightResearchStationSupply,
	turnOffResearchStationSupplyHighlight,
	enableResearchStationDragging,
	disableResearchStationDragging,
	showGovernmentGrantArrow,
	getGovernmentGrantTargetCity,
	getPacificPath
} from "./city.js";
import Event, {
	eventTypes,
	getEventType,
	getEventTypeTooltipContent,
	movementTypeRequiresDiscard,
	attachPlayersToEvents,
	MovementAction,
	DriveFerry,
	DirectFlight,
	CharterFlight,
	ShuttleFlight,
	ResearchStationPlacement,
	BuildResearchStation,
	DiseaseCubeRemoval,
	TreatDisease,
	ShareKnowledge,
	DiscoverACure,
	OperationsFlight,
	PlanContingency,
	DispatchPawn,
	Airlift,
	OneQuietNight,
	CardDraw,
	GovernmentGrant,
	ResilientPopulation,
	Forecast,
	ForecastPlacement,
	InfectCity,
	infectionPreventionCodes,
	EpidemicIncrease,
	EpidemicInfect,
	EpidemicIntensify,
	Discard,
	Outbreak,
	OutbreakInfection,
	AutoTreatDisease,
	Eradication,
	InitialInfection,
	StartingHands,
	PassActions
} from "./event.js";
import {
	eventHistory,
	getEventHistoryIcon,
	getEventIconHtml
} from "./eventHistory.js";
import {
    showTravelPathArrow,
    setTravelPathArrowColor,
    animateInvalidTravelPath,
    hideTravelPathArrow
} from "./travelPathArrow.js";
import instantiateTooltips, {
	bindPlayerDeckHoverEvents,
	decrementInfectionDeckSize,
	resetInfectionDeckSize,
	bindRoleCardHoverEvents,
	bindEpidemicCardHoverEvents,
    unbindEpidemicCardHoverEvents,
	disableTooltipsWhileDragging,
	enableTooltipsAfterDragging
} from "./tooltipInstantiation.js";

$(function(){
const playerDeckImgManager = new DeckImageManager({
		$deck: $("#playerDeckContainer img"),
		imageUrlWithoutNumber: "images/cards/playerDeck_.png",
		numImages: 7,
		maxCardCount: false // to be set once gameData is retrieved
	});

function parseEvents(events)
{
	return new Promise(resolve =>
		{
			const parsedEvents = [];
		
			// events could be an array of objects or a single object
			if (!Array.isArray(events))
				events = [events];
			
			let parsedEvent;
			for (let e of events)
			{
				//console.log("parsing event: ", e);
				if (!e) continue;
				
				if (e.code === eventTypes.startingHands.code)
				{
					if (parsedEvents.length)
						parsedEvents[0].addHand(e, cities, eventCards);
					else
						parsedEvents.push(new StartingHands(e, cities, eventCards));
				}
				else if (e.code === eventTypes.initialInfection.code)
				{
					const lastEventParsed = parsedEvents[parsedEvents.length - 1];
					if (lastEventParsed instanceof InitialInfection)
						lastEventParsed.addInfection(e, cities);
					else
						parsedEvents.push(new InitialInfection(e, cities));
				}
				else if (e.code === eventTypes.driveFerry.code)
					parsedEvents.push(new DriveFerry(e, cities));
				else if (e.code === eventTypes.directFlight.code)
					parsedEvents.push(new DirectFlight(e, cities));
				else if (e.code === eventTypes.charterFlight.code)
					parsedEvents.push(new CharterFlight(e, cities));
				else if (e.code === eventTypes.shuttleFlight.code)
					parsedEvents.push(new ShuttleFlight(e, cities));
				else if (e.code === eventTypes.buildResearchStation.code)
					parsedEvents.push(new BuildResearchStation(e, cities));
				else if (e.code === eventTypes.treatDisease.code)
					parsedEvents.push(new TreatDisease(e, cities));
				else if (e.code === eventTypes.autoTreatDisease.code)
					parsedEvents.push(new AutoTreatDisease(e, cities));
				else if (e.code === eventTypes.shareKnowledge.code)
					parsedEvents.push(new ShareKnowledge(e, cities));
				else if (e.code === eventTypes.discoverACure.code)
					parsedEvents.push(new DiscoverACure(e, cities));
				else if (e.code === eventTypes.eradication.code)
					parsedEvents.push(new Eradication(e));
				else if (e.code === eventTypes.operationsFlight.code)
					parsedEvents.push(new OperationsFlight(e, cities));
				else if (e.code === eventTypes.planContingency.code)
					parsedEvents.push(new PlanContingency(e, eventCards));
				else if (e.code === eventTypes.dispatchPawn.code)
					parsedEvents.push(new DispatchPawn(e, cities));
				else if (e.code === eventTypes.airlift.code)
				{
					parsedEvent = new Airlift(e, cities)
					parsedEvents.push(parsedEvent);
					queueEventCardRemovalCheck(parsedEvent);
				}
				else if (e.code === eventTypes.oneQuietNight.code)
				{
					parsedEvent = new OneQuietNight(e, cities)
					parsedEvents.push(parsedEvent);
					queueEventCardRemovalCheck(parsedEvent);
				}
				else if (e.code === eventTypes.governmentGrant.code)
				{
					parsedEvent = new GovernmentGrant(e, cities)
					parsedEvents.push(parsedEvent);
					queueEventCardRemovalCheck(parsedEvent);
				}
				else if (e.code === eventTypes.resilientPopulation.code)
				{
					parsedEvent = new ResilientPopulation(e, cities)
					parsedEvents.push(parsedEvent);
					queueEventCardRemovalCheck(parsedEvent);
				}
				else if (e.code === eventTypes.forecast.code)
				{
					parsedEvent = new Forecast(e, cities);
					parsedEvents.push(parsedEvent);
					queueEventCardRemovalCheck(parsedEvent);
				}
				else if (e.code === eventTypes.forecastPlacement.code)
				{
					// The previously parsed Event is always the corresponding Forecast event which drew the top 6 infection cards.
					// It can either be found in parsedEvents or eventHistory.events, but always at the end of whichever array.
					const forecastEvent = parsedEvents.length ? parsedEvents[parsedEvents.length - 1] : eventHistory.events[eventHistory.events.length - 1],
						placementEvent = new ForecastPlacement(e, cities, forecastEvent);
					
					parsedEvents.push(placementEvent);
				}
				else if (e.code === eventTypes.pass.code)
					parsedEvents.push(new PassActions(e));
				else if (e.code === eventTypes.cardDraw.code)
					parsedEvents.push(new CardDraw(e, cities, eventCards));
				else if (e.code === eventTypes.discard.code)
					parsedEvents.push(new Discard(e, cities, eventCards));
				else if (e.code === eventTypes.infectCity.code)
					parsedEvents.push(new InfectCity(e, cities));
				else if (e.code === eventTypes.epidemicIncrease.code)
					parsedEvents.push(new EpidemicIncrease(e));
				else if (e.code === eventTypes.epidemicInfect.code)
					parsedEvents.push(new EpidemicInfect(e, cities));
				else if (e.code === eventTypes.epidemicIntensify.code)
					parsedEvents.push(new EpidemicIntensify(e, cities));
				else if (e.code === eventTypes.outbreak.code)
					parsedEvents.push(new Outbreak(e, cities, parsedEvents));
				else if (e.code === eventTypes.outbreakInfection.code)
					parsedEvents.push(new OutbreakInfection(e, cities, parsedEvents));
				else
					parsedEvents.push(new Event(e, cities));
			}

			eventHistory.events = [...eventHistory.events, ...parsedEvents];

			if (Object.keys(gameData.players).length)
			{
				attachPlayersToEvents(parsedEvents);
				addToEventHistoryQueue(parsedEvents);
			}
			
			return resolve(parsedEvents);
		});
}

function addToEventHistoryQueue(newEvents)
{
	let eventIdx = eventHistory.events.length - newEvents.length;
	
	for (let event of newEvents)
	{
		if (event.hasIcon())
		{
			event.index = eventIdx;
			gameData.eventHistoryQueue.push(event);
		}

		eventIdx++;
	}
}

function appendEventHistoryIcons()
{
	for (let event of gameData.eventHistoryQueue)
		appendEventHistoryIcon(event);
	
	gameData.eventHistoryQueue.length = 0;
	eventHistory.scrollToEnd();
}

function appendEventHistoryIconOfType(targetEventType)
{
	let event,
		oneOrMoreIconsWereAppended = false;
	for (let i = 0; i < gameData.eventHistoryQueue.length; i++)
	{
		event = gameData.eventHistoryQueue[i];
		
		if (event.isOfType(targetEventType))
		{
			appendEventHistoryIcon(event);
			gameData.eventHistoryQueue.splice(i, 1);
			oneOrMoreIconsWereAppended = true;
			break;
		}
	}

	if (oneOrMoreIconsWereAppended)
		eventHistory.scrollToEnd({ addingNewIcon: true });
}

function appendEventHistoryIcon(event)
{
	const $icon = getEventHistoryIcon(event);
	
	$icon.attr("data-index", event.index);
	eventHistory.appendIcon($icon);
}

class Step
{
	constructor(name, procedure, description)
	{
		this.name = name;
		this.description = typeof description === "string" ? description : "";
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
		$container.removeClass("hidden").removeAttr("style");

		highlightTurnProcedureStep(this.name);
		
		if (eventHistory.lastEventCanBeUndone())
			eventHistory.enableUndo(undoAction);
		else
			eventHistory.disableUndo();
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
		setCurrentStep(gameData.nextStep).proceed();
	}
}

// instantiate steps
(function()
{
	const steps = gameData.steps;

	let stepName = "setup";
	steps[stepName] = new Step(stepName, [() => {}], "Setup");
	steps[stepName].indicate = function() { $("#indicatorContainer").addClass("hidden") }

	let actionsRemaining = 4;
	// "action 1" through to "action 4"
	for (let i = 1; i <= 4; i++)
	{
		stepName = `action ${i}`;
		steps[stepName] = new Step(stepName, [enableAvailableActions, finishActionStep],
			`${actionsRemaining} Action${--actionsRemaining > 1 ? "s" : ""} Remaining`);
	}

	// If the hand limit is violated as a result of the Share Knowledge action,
	// the player with 8 cards will be prompted to discard.
	stepName = "hand limit";
	steps[stepName] = new Step(stepName, [discardStep], "Discard to 7 Cards");
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

		this.description = `<span class='disabled'>[${numActionsRemaining} Action${pluralizer} Remaining]</span><br /><br />
Hand Limit Exceeded!<br/>`;

		if (playerWithTooManyCards.rID !== getActivePlayer().rID)
		{
			this.description += `The ${playerWithTooManyCards.newRoleTag()} must discard to 7 cards.`;
		}
		else
			this.description += "Discard to 7 Cards";
	}

	stepName = "draw";
	steps[stepName] = new Step(stepName, [drawStep]);

	stepName = "epIncrease";
	steps[stepName] = new Step(stepName, [epidemicIncrease]);

	stepName = "epInfect";
	steps[stepName] = new Step(stepName, [epidemicInfect]);
	
	stepName = "epIntensify";
	steps[stepName] = new Step(stepName, [epidemicIntensify]);

	stepName = "discard";
	steps[stepName] = new Step(stepName, [discardStep], "Discard to 7 Cards");
	
	stepName = "infect cities";
	steps[stepName] = new Step(stepName, [infectionStep])
	steps[stepName].setDescription = function()
	{
		this.description = `<span class='info'>&#9432;</span><span>Infection Rate: ${gameData.infectionRate}</span>`
	};
})();

function highlightTurnProcedureStep(stepName)
{
	const releventStepNames = ["action", "draw", "epidemic", "discard", "infect"];
	
	if (stepName === "hand limit")
		stepName = "action";
	else
		stepName = stepName.split(" ")[0];// Only interested in the first word

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
	gameData.currentStep.resume();
}

function proceed()
{
	gameData.currentStep.proceed();
}

function setCurrentStep(stepName)
{
	gameData.currentStep = gameData.steps[stepName];
	gameData.currentStep.procedureIdx = -1;

	return gameData.currentStep;
}

function currentStepIs(stepName)
{
	return gameData.currentStep.name === stepName;
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
	const $actionsContainer = $("#actionsContainer");

	$actionsContainer.find(".button").not("#btnCancelAction")
		.off("click")
		.addClass("btnDisabled wait");

	disableDiseaseCubeEvents();
	disableEventCards();
	disablePawnEvents();
	disableResearchStationDragging();
	eventHistory.disableUndo();
	eventHistory.disableScrollButtons();
}

function enableAvailableActions()
{
	const $actionsContainer = $("#actionsContainer"),
		player = getActivePlayer();
	
	$actionsContainer.find(".button").not("#btnCancelAction")
		.off("click")
		.addClass("btnDisabled")
		.removeClass("wait");
	
	$actionsContainer.find(".actionCategory").removeClass("hidden");
	
	useRoleColorForRelatedActionButtons(player.role);

	$actionsContainer.removeClass("hidden").removeAttr("style");
	enableAvailableActionButtons(player);
	enableAvailableSpecialActionButtons($actionsContainer, player);
	
	enablePawnEvents();
	enableDiseaseCubeEvents();

	enableEventCards();
}

function anyPlayerHasAnyEventCard()
{
	const { players } = gameData;
	let player;

	for (let rID in players)
	{
		player = players[rID];

		if (player.isHoldingAnyEventCard())
			return true;
	}
	return false;
}

function anyPlayerHasResilientPopulation()
{
	const { players } = gameData,
		resilientPopulationCardKey = eventTypes.resilientPopulation.cardKey;
	
	let player;

	for (let rID in players)
	{
		player = players[rID];

		if (player.isHoldingCardKey(resilientPopulationCardKey))
			return true;
	}
	return false;
}

function enableEventCards({ resilientPopulationOnly } = {})
{
	let $eventCards = $("#playerPanelContainer").find(".playerCard.eventCard").off("click");

	if (resilientPopulationOnly)
	{
		$eventCards.addClass("unavailable");
		$eventCards = $eventCards.filter(`[data-key='${eventTypes.resilientPopulation.cardKey}']`);
	}
	
	$eventCards.removeClass("unavailable")
		.click(function(e)
		{
			e.stopPropagation();
			
			const eventType = getEventCardEventType($(this).data("key"));
			
			if (eventTypeIsBeingPrompted(eventType))
				return false;
			
			resetActionPrompt({ actionCancelled: gameData.promptingEventType });
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
	const eventCard = eventCards[cardKey];

	if (!eventCard)
	{
		console.error(`Event Card does not exist: "${cardKey}"`);
		return false;
	}

	return eventTypes[toCamelCase(eventCard.name)];
}

function disableEventCards()
{
	$("#playerPanelContainer").find(".playerCard.eventCard")
		.off("click")
		.addClass("unavailable");
}

function actionStepInProgress()
{
	if (typeof gameData.currentStep.name === "undefined")
		return false;
	
	return gameData.currentStep.name.substring(0,6) === "action";
}

function disablePawnEvents()
{
	const { players } = gameData;

	for (let rID in players)
		players[rID].disablePawn();
}

function enablePawnEvents()
{
	const { players } = gameData,
		actionStep = actionStepInProgress(),
		activePlayer = getActivePlayer(),
		airlifting = eventTypeIsBeingPrompted(eventTypes.airlift),
		dispatcherIsActive = activePlayer.role === "Dispatcher";

	let player,
		pawnsAreEnabled = false;
	for (let rID in players)
	{
		player = players[rID];

		if (airlifting
			|| (actionStep && (dispatcherIsActive || rID === activePlayer.rID)))
		{
			player.enablePawn();
			pawnsAreEnabled = true;
		}
		else
			player.disablePawn();
	}

	if (pawnsAreEnabled)
		setTravelPathArrowColor({ airlifting });
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
			$(".eventTypeTooltip").remove();
			promptAction({ eventType: eventTypes[actionName] });
		});
}

function enableBtnCancelAction()
{
	$("#btnCancelAction").off("click")
		.click(function()
		{
			resetActionPrompt({ actionCancelled: true });
			resumeCurrentStep();
		})
		.removeClass("hidden");
}

function resetActionPrompt({ actionCancelled } = {})
{
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
			turnOffResearchStationSupplyHighlight();
			$("#boardContainer").children(".researchStation.grantStation").remove();
			researchStationKeys.delete("grantStation");
		}
		else if (eventTypeIsBeingPrompted(resilientPopulation))
		{
			resetInfectionDiscardClicksAndTooltips();
			hideResilientPopulationArrow({ reset: true });
		}

		hideTravelPathArrow();
	}

	gameData.promptingEventType = false;
	gameData.promptedTravelPathProperties = false;

	if (!actionStepInProgress())
	{
		$actionPrompt.parent().addClass("hidden");
		enablePawnEvents();
	}

	setRightPanelScrollability();
}

function setRightPanelScrollability()
{
	const $rightPanel = $("#rightPanel"),
		scrollable = "scrollable";

	if (isOverflowingVertically($rightPanel))
		$rightPanel.addClass(scrollable);
	else
		$rightPanel.removeClass(scrollable);
}

function promptAction(actionProperties)
{
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
		$actionPrompt.removeClass("hidden").removeAttr("style");

		// Event cards can be played during some non-action steps.
		if (!actionStepInProgress())
			$actionsContainer.siblings(".interface").addClass("hidden");
	}

	$actionsContainer.removeClass("hidden").removeAttr("style");
	setRightPanelScrollability();
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
		actionInterfacePopulator.$actionInterface.children().remove();
		return actionInterfacePopulator;
	},
	appendDescriptiveElements(eventType, { showEventCardDescription } = {})
	{
		if (eventType.code === eventTypes.chooseFlightType.code)
			return;
		
		const { $actionInterface } = actionInterfacePopulator;
		
		if (!showEventCardDescription && isEventCardKey(eventType.cardKey))
			return $actionInterface.append(eventCards[eventType.cardKey].getFullCard())
				.append(`<p class='instructions'>${eventType.instructions || ""}</p>`);
		
		const $actionTitleContainer = $(`<div class='actionTitle'></div>`),
			$rules = $("<div class='rules'></div>");

		let actionTitleContents = `<h2>${ eventType.name.toUpperCase() }</h2>`;
		// Simply prepending the icon will not work,
		// because the opening h2 tag has to be on the same line as the img tag
		// to avoid unwanted spacing when the document is rendered.
		if (!eventType.noIcon)
			actionTitleContents = $(getEventIconHtml(eventType) + actionTitleContents);
		
		$actionTitleContainer.append(actionTitleContents);
		
		if (eventType.abbreviatedRulesetLength)
		{
			for (let i = 0; i < eventType.abbreviatedRulesetLength; i++)
				$rules.append(`<p>${eventType.rules[i]}</p>`);
		}
		else
		{
			for (let paragraph of eventType.rules)
				$rules.append(`<p>${paragraph}</p>`);
		}
		
		$actionInterface
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
	replaceInstructions(newInstructions, nthOption = 0)
	{
		const $instructions = actionInterfacePopulator.$actionInterface.find("p.instructions");

		$instructions.eq(nthOption).html(newInstructions);

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
				<h2>OR</h2>
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
			newElementFn = newPlayerCard;
		}

		for (let key of cityKeys)
			$interface.append(newElementFn(getCityOrEventCardObject(key), { noTooltip: true }));
		
		if (typeof onClick === "function")
			$interface.children(`.${buttonClass}`).click(function() { onClick($(this)) });
		
		return actionInterfacePopulator;
	},
	appendDiscardPrompt({ cardKeys, promptMsg, buttonText, onConfirm } = {})
	{
		const { $actionInterface } = actionInterfacePopulator,
			$discardPrompt = $(`<div class='discardSelections'></div>`),
			buttonClass = "btnConfirmAction",
			isEventCard = typeof cardKeys === "string" && isEventCardKey(cardKeys),
			isContingencyCard = isEventCard && isContingencyCardKey(cardKeys);

		if (isEventCard)
		{
			if (isContingencyCard)
			{
				promptMsg = `${getPlayer("Contingency Planner").newSpecialAbilityTag()}<br />`;
				buttonText = "PLAY AND REMOVE EVENT CARD";
			}
			else
				buttonText = "PLAY EVENT CARD";
		}

		if (promptMsg)
			$discardPrompt.append(`<p>${promptMsg}</p>`);

		if (!(typeof cardKeys === "string" && isEventCardKey(cardKeys)))
			for (let key of ensureIsArray(cardKeys))
				$discardPrompt.append(newPlayerCard(getCityOrEventCardObject(key)));
		
		bindCityLocatorClickEvents({ $containingElement: $discardPrompt });

		const $btnConfirm = $(`<div class='button ${buttonClass}'>${buttonText || "DISCARD"}</div>`);
		$discardPrompt.append($btnConfirm);
		oscillateButtonBackgroundColor($btnConfirm);

		if (typeof onConfirm === "function")
			$btnConfirm.click(function()
			{
				$btnConfirm.off("click").addClass("btnDisabled");
				onConfirm();
			});

		$actionInterface.append($discardPrompt);

		bindEventCardHoverEvents($discardPrompt);
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
		const {
				operationsFlight,
				charterFlight,
				directFlight
			} = eventTypes,
			flightTypes = [
				operationsFlight,
				charterFlight
			],
			player = getActivePlayer();
		
		let nthOption = 0,
			canDoFlightType;
		
		for (let flightType of flightTypes)
		{
			canDoFlightType = `can${toPascalCase(flightType.name)}`;
			
			if (player[canDoFlightType]())
			{
				if (nthOption)
					actionInterfacePopulator.appendDivision();
				
				actionInterfacePopulator.appendDescriptiveElements(flightType);
				actionInterfacePopulator[flightType.name]({ destination, nthOption });

				nthOption++;
			}
		}

		// The destination must be taken into account when checking whether Direct Flight is an option.
		if (player.canDirectFlightTo(destination))
		{
			actionInterfacePopulator.appendDivision().appendDescriptiveElements(directFlight);
			actionInterfacePopulator[directFlight.name]({ destination, nthOption });
		}

		return true;
	},
	[eventTypes.charterFlight.name]({ destination, nthOption })
	{
		const charterFlight = eventTypes.charterFlight;
	
		if (!destination) // the user explicitly selected charter flight
		{
			// Remember the Charter Flight actionCode to avoid prompting Direct Flight when the pawn is dropped on a destination.
			gameData.promptingEventType = charterFlight;
			return true;
		}
		else
			gameData.promptingEventType = false;
		
		const currentCity = getActivePlayer().getLocation();
		
		actionInterfacePopulator
			.replaceInstructions(`Destination: ${destination.name}<br/>Discard:`, nthOption)
			.appendDiscardPrompt(
			{
				cardKeys: currentCity.key,
				buttonText: "CONFIRM",
				onConfirm: function() { movementAction(charterFlight, destination) }
			});
		return true;
	},
	[eventTypes.directFlight.name]({ destination, nthOption })
	{
		const directFlight = eventTypes.directFlight;
	
		if (destination)
		{
			actionInterfacePopulator
				.replaceInstructions(`Destination: ${destination.name}<br/>Discard:`, nthOption)
				.appendDiscardPrompt(
				{
					cardKeys: destination.key,
					buttonText: "CONFIRM",
					onConfirm: function() { movementAction(directFlight, destination) }
				});
			return true;
		}
		
		const cardKeys = getActivePlayer()[`valid${directFlight.name}DestinationKeys`]();
			
		actionInterfacePopulator.appendOptionButtons("playerCard", cardKeys, 
			function($clicked)
			{
				$clicked.off("mouseleave"); // prevents the call to hideTravelPathArrow
				movementAction(directFlight, getCity($clicked.data("key")));
			})
			.$actionInterface.find(".playerCard")
				.hover(function() { showTravelPathArrow({ destination: getCity($(this).attr("data-key")) }) },
				function() { hideTravelPathArrow() });
		
		return true;
	},
	[eventTypes.buildResearchStation.name]({ stationRelocationKey })
	{
		const { $actionInterface } = actionInterfacePopulator;

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

		if (playerIsOperationsExpert) // no city card is required
		{
			actionInterfacePopulator.appendSpecialAbilityRule(eventTypes.buildResearchStation);
			locatePawnOnRoleTagClick($actionInterface);
			
			const $btnConfirm = $("<div class='button'>CONFIRM</div>");
			$btnConfirm.click(function() { buildResearchStation(stationRelocationKey) });
			$actionInterface.append($btnConfirm);
		}
		else
		{
			newSubtitle += "<br/>Discard:";
			
			actionInterfacePopulator.appendDiscardPrompt(
			{
				cardKeys: currentCity.key,
				buttonText: "CONFIRM",
				onConfirm: function() { buildResearchStation(stationRelocationKey) }
			});
		}

		actionInterfacePopulator.replaceInstructions(newSubtitle);
		oscillateButtonBackgroundColor($actionInterface.find(".button"));
		return true;
	},
	[eventTypes.treatDisease.name]()
	{
		const { $actionInterface } = actionInterfacePopulator,
			player = getActivePlayer(),
			city = player.getLocation(),
			diseaseColorOptions = city.getDiseaseColorOptions();
		
		if (diseaseColorOptions.length > 1)
		{
			if (player.role === "Medic")
				actionInterfacePopulator.appendSpecialAbilityRule(eventTypes.treatDisease);
			
			for (let color of diseaseColorOptions)
				$actionInterface.append(newDiseaseCubeElement({ color }));

			const $cubes = $(`.${city.key}.diseaseCube`);
			$actionInterface.children(".diseaseCube")
				.hover(function()
				{
					const $cubesOfColor = $cubes.filter(`.${getColorClass($(this))}`);
					markTreatableDiseaseCubes($cubesOfColor.last());
				},
				function() { unmarkTreatableDiseaseCubes($cubes) })
				.click(function(){ treatDisease(false, getColorClass($(this))) });

			delayExecution(resizeTreatDiseaseOptions, 1);
			return true;
		}
		
		// Only one cube color on the currentCity -- action interface not needed.
		treatDisease(false, diseaseColorOptions[0]);
		return false;
	},
	[eventTypes.shareKnowledge.name]({ shareKnowledgeParticipant })
	{
		const { $actionInterface } = actionInterfacePopulator,
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

				$shareKnowledgePlayerOptions.children()
					.addClass("playerOption")
					.click(function()
					{
						$(".roleCard").remove();
						promptAction(
							{
								eventType: eventTypes.shareKnowledge,
								shareKnowledgeParticipant: getPlayer($(this).data("role"))
							});
					});

				$actionInterface.append($shareKnowledgePlayerOptions);
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
					$giveableContainer.append(newPlayerCard(getCity(cardKey), { noTooltip: true }));

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
					$takeableContainer.append(newPlayerCard(getCity(cardKey), { noTooltip: true }));

				$actionInterface.append($takeableContainer);
			}

			const $cardOptions = $(".shareableCards").children(".playerCard");
			$cardOptions.click(function()
			{
				$cardOptions.off("click");
				shareKnowledge(player, participant, $(this).data("key"));
			});
		}

		if (showResearcherSpecialAbilityRule)
			actionInterfacePopulator.appendSpecialAbilityRule(eventTypes.shareKnowledge);
		
		bindRoleCardHoverEvents();
		locatePawnOnRoleTagClick($actionInterface);

		return true;
	},
	[eventTypes.discoverACure.name]()
	{
		const { $actionInterface } = actionInterfacePopulator,
			player = getActivePlayer(),
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
		
		$actionInterface.append($cardSelectionPrompt);

		if (player.role === "Scientist")
		{
			actionInterfacePopulator.appendSpecialAbilityRule(eventType);
			locatePawnOnRoleTagClick($actionInterface);
		}

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
		oscillateButtonBackgroundColor($btnConfirm);

		actionInterfacePopulator.$actionInterface.append($btnConfirm);

		return true;
	},
	[eventTypes.operationsFlight.name]({ destination })
	{
		const operationsFlight = eventTypes.operationsFlight;
	
		if (!destination) // the user explicitly selected operations flight
		{
			// Remember the Operations Flight actionCode to avoid prompting Direct or Charter Flight when the pawn is dropped on a destination.
			gameData.promptingEventType = operationsFlight;
			return true;
		}
		else
			gameData.promptingEventType = false;
		
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
			let newSubtitle = `Dispatch ${playerToDispatch.newRoleTag()} from ${getCity(playerToDispatch.cityKey).name} to ${destination.name} `;
			
			if (dispatchMethod.code === chooseFlightType.code)
			{
				newSubtitle += "...<br/><br/>";
				
				actionInterfacePopulator
					.appendDiscardPrompt(
					{
						cardKeys: destination.key,
						promptMsg: `<span class='largeText'>via ${getDispatchInstructionTooltip(directFlight)}?</span><br/><br/>Discard:`,
						buttonText: "CONFIRM",
						onConfirm: function() { movementAction(directFlight, destination, { playerToDispatch }) }
					})
					.appendDivision()
					.appendDiscardPrompt(
					{
						cardKeys: playerToDispatch.cityKey,
						promptMsg: `<span class='largeText'>via ${getDispatchInstructionTooltip(charterFlight)}?</span><br/><br/>Discard:`,
						buttonText: "CONFIRM",
						onConfirm: function() { movementAction(charterFlight, destination, { playerToDispatch }) }
					});
			}
			else
			{
				newSubtitle += `via ${getDispatchInstructionTooltip(dispatchMethod)}?<br/><br/>Discard:`;
				
				const discardKey = dispatchMethod.code === directFlight.code ? destination.key : playerToDispatch.cityKey;
				
				actionInterfacePopulator.appendDiscardPrompt(
				{
					cardKeys: discardKey,
					buttonText: "CONFIRM",
					onConfirm: function() { movementAction(dispatchMethod, destination, { playerToDispatch }) }
				});
			}

			actionInterfacePopulator.replaceInstructions(newSubtitle);
			bindRoleCardHoverEvents();
			locatePawnOnRoleTagClick(actionInterfacePopulator.$actionInterface);
		}

		return true;
	},
	[eventTypes.planContingency.name]()
	{
		const cardKeys = getContingencyOptionCardKeys();

		gameData.promptingEventType = eventTypes.planContingency;

		actionInterfacePopulator.appendOptionButtons("playerCard", cardKeys, function($clicked)
		{
			planContingency($clicked.data("key"));
		});

		bindEventCardHoverEvents(actionInterfacePopulator.$actionInterface);
		
		return true;
	},
	[eventTypes.airlift.name]({ playerToAirlift, destination })
	{	
		if (!destination)
		{
			clusterAll({ pawns: true });
			gameData.promptingEventType = eventTypes.airlift;
			gameData.promptedTravelPathProperties = false;
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
					gameData.promptingEventType = false;
					airlift(playerToAirlift, destination);
				}
			});

			bindRoleCardHoverEvents();
			locatePawnOnRoleTagClick(actionInterfacePopulator.$actionInterface);
		}

		return true;
	},
	[eventTypes.governmentGrant.name]({ targetCity, relocationKey })
	{
		disablePawnEvents();
		disableDiseaseCubeEvents();
		
		gameData.promptingEventType = eventTypes.governmentGrant;
		
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
		
		if (!gameData.promptedTravelPathProperties)
		{
			hideTravelPathArrow();
			appendGrantStation();
			highlightResearchStationSupply();
			showGovernmentGrantArrow();
		}
		
		return true;
	},
	[eventTypes.resilientPopulation.name]({ cardKeyToRemove })
	{
		disablePawnEvents();
		hideTravelPathArrow();
		disableDiseaseCubeEvents();
		
		const eventType = eventTypes.resilientPopulation;
		
		gameData.promptingEventType = eventType;

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
			actionInterfacePopulator.replaceInstructions(`<span class='r'>One Quiet Night has already been played this turn! It cannot be played twice on the same turn.</span>`)
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

		gameData.promptingEventType = eventType;
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
	$("#playerDiscardContainer").children(".playerCard.eventCard").each(function()
	{
		cardKeys.push($(this).data("key"));
	});

	return cardKeys;
}

async function planContingency(cardKey)
{
	disableActions();
	resetActionPrompt();
	
	const contingencyPlanner = getActivePlayer(),
		eventType = eventTypes.planContingency,
		$eventCard = $("#playerDiscardContainer").find(`.playerCard[data-key='${cardKey}']`).off("mouseenter mouseleave");

	await Promise.all([
		requestAction(eventType, { cardKey }),
		contingencyPlanner.panel.animateReceiveCard($eventCard, { isContingencyCard: true })
	]);

	contingencyPlanner.contingencyKey = cardKey;

	appendEventHistoryIconOfType(eventType);
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
		promptAction({ eventType: forecast, forecastEventToLoad });

		return true;
	}

	return false;
}

async function forecastDraw(forecastEventToLoad)
{
	gameData.promptingEventType = eventTypes.forecastPlacement;
	
	$("#btnCancelAction").off("click").addClass("hidden");
	disableActions();
	eventHistory.enableBackButton();
	$(".discardSelections").remove();

	indicatePromptingEventCard();

	const eventType = eventTypes.forecast;
	actionInterfacePopulator.$actionInterface.children(".eventCardFull").remove();
	actionInterfacePopulator.$actionInterface.prepend(`<div class='actionTitle'>
														${getEventIconHtml(eventType)}<h2>${eventType.name.toUpperCase()}</h2>
													</div>`);
	
	const forecastEvent = forecastEventToLoad || (await requestAction(eventTypes.forecast)).shift();

	// If loading an unresolved forecast, the event card will already be in the discard pile.
	if (!forecastEventToLoad)
		await discardOrRemoveEventCard(forecastEvent);
	
	await animateForecastDraw(forecastEvent.cardKeys);
	appendEventHistoryIconOfType(eventTypes.forecast);
	
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
			.replaceInstructions("Click and drag to rearrange the top 6 cards of the infection deck. When done, the cards will be put back on top of the deck in order from bottom to top.")
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
							<p><span class='hoverInfo concealed'>Top</span></p>
							<div id='forecastCards'></div>
							<p><span class='hoverInfo concealed'>Bottom</span></p>
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

		let cityKey;
		for (let i = 0; i < cardKeys.length; i++)
		{
			cityKey = cardKeys[i];
			$cardContainer.append(newInfectionCardTemplate());
			cards.push({ city: getCity(cityKey), cityKey, infectionIndex: i });
		}
		positionInfectionPanelComponents();

		const containerInitialHeight = $container.height(),
			$veils = $cardContainer.find(".veil").addClass("hidden");

		await animationPromise({
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
	await eventHistory.scrollToEnd();

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
		animationPromise({
			$elements: $elementsToFadeOut,
			desiredProperties: { opacity: 0 },
			duration
		}),
		animationPromise({
			$elements: $cardbacks,
			desiredProperties: { opacity: 1 },
			duration
		})
	]);

	await sleep(getDuration("shortInterval"));

	const cardbackInitialWidth = $cardbacks.first().width(),
		$deck = $("#infectionDeckContainer img"),
		deckWidth = $deck.width(),
		deckOffset = $deck.offset();
	
	duration = 300;

	let $card, cardOffset;
	for (let i = $cardbacks.length - 1; i >= 0 ; i--)
	{
		$card = $cardbacks.eq(i);
		cardOffset = $card.offset();

		await animationPromise(
		{
			$elements: $card.appendTo("body"),
			initialProperties: { ...cardOffset, ...{ width: cardbackInitialWidth, zIndex: 10 } },
			desiredProperties: { ...deckOffset, ...{ width: deckWidth } }, 
			duration,
			easing: "easeOutSine"
		});

		$card.remove();
	}
}

async function oneQuietNight()
{
	resetActionPrompt();
	disableActions();

	const eventType = eventTypes.oneQuietNight,
		events = await requestAction(eventType);
	
	await discardOrRemoveEventCard(events.shift());

	if (isOneQuietNight())
		indicateOneQuietNightStep();

	appendEventHistoryIconOfType(eventType);
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
	
	$("#turnProcedureContainer").find(".step.infect").children("span").first()
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
	const $infectionDiscards = $("#infectionDiscardContainer").children(".infectionCard");

	if ($infectionDiscards.length)
	{
		showResilientPopulationArrow();
		
		$infectionDiscards.off("click")
			.click(function()
			{
				hideResilientPopulationArrow({ selectionWasMade: true });
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

async function showResilientPopulationArrow()
{
	const $arrow = $("#resilientPopulationArrow");
	
	if ($arrow.hasClass("doNotShow"))
		return false;
	
	const initialOffset = positionResilientPopulationArrow($arrow),
		bobDistance = $arrow.height() * 0.75,
		duration = 350;

	$arrow.removeClass("hidden");
	while (!$arrow.hasClass("hidden"))
		await bobUpAndDown($arrow, { initialOffset, bobDistance, duration });
}
function positionResilientPopulationArrow($arrow)
{
	const $infectionDiscardPile = $("#infectionDiscardContainer"),
		offset = $infectionDiscardPile.offset();
	
	$arrow = $arrow || $("#resilientPopulationArrow");
	makeElementsSquare($arrow.removeClass("hidden"));
	
	offset.top += gameData.topPanelHeight + $arrow.outerHeight() * 0.8;
	offset.left += $infectionDiscardPile.outerWidth() / 2;
	offset.left -= $arrow.outerWidth() / 2;

	$arrow.offset(offset);

	return offset;
}
function hideResilientPopulationArrow({ selectionWasMade, reset } = {})
{
	const $arrow = $("#resilientPopulationArrow").stop().addClass("hidden"),
		doNotShow = "doNotShow";

	if (selectionWasMade)
		$arrow.addClass(doNotShow);
	else if (reset || !eventTypeIsBeingPrompted(eventTypes.resilientPopulation))
		$arrow.removeClass(doNotShow);
}

async function resilientPopulation(cardKeyToRemove)
{
	resetInfectionDiscardClicksAndTooltips();
	resetActionPrompt();
	disableActions();
	disableInfectionDiscardHoverEvents();

	const eventType = eventTypes.resilientPopulation,
		events = await requestAction(eventType, { cardKeyToRemove });

	await discardOrRemoveEventCard(events.shift());
	await resilientPopulationAnimation(cardKeyToRemove);
	appendEventHistoryIconOfType(eventType);

	resizeInfectionDiscardElements();
	enableInfectionDiscardHoverEvents();
	hideResilientPopulationArrow({ reset: true });
	resumeCurrentStep();
}

function resetInfectionDiscardClicksAndTooltips()
{
	let $this, city;
	$("#infectionDiscardContainer").children(".infectionCard")
		.off("click")
		.click(function() { pinpointCityFromCard($(this)) })
		.each(function()
		{
			$this = $(this);
			city = getCity($this.attr("data-key"));

			setInfectionCardTitleAttribute($this, city);
		})
		.css("cursor", "url('images/target_black.png'), auto");
}

async function resilientPopulationAnimation(cardKeyToRemove)
{
	const discardPileID = "infectionDiscardContainer",
		$discardPile = $(`#${discardPileID}`),
		$removedCardsContainer = $discardPile.children("#removedInfectionCards").removeClass("hidden"),
		$cardToRemove = $discardPile.children(`[data-key='${cardKeyToRemove}']`);
	
	await expandInfectionDiscardPile({ showRemovedCardsContainer: true });

	const initialOffset = $cardToRemove.offset();
	$cardToRemove.appendTo("#boardContainer")
		.offset(initialOffset);

	await animationPromise(
	{
		$elements: $cardToRemove,
		initialProperties:
		{
			position: "absolute",
			zIndex: 10
		},
		desiredProperties: { top: $removedCardsContainer.offset().top + $removedCardsContainer.height() },
		duration: 750,
		easing: "easeInOutQuad"
	});

	$cardToRemove.appendTo($removedCardsContainer)
		.add($removedCardsContainer)
		.removeAttr("style");

	await sleep(getDuration("longInterval"));
	return collapseInfectionDiscardPile();
}

async function tryAirlift(playerToAirlift)
{
	const { airlift } = eventTypes,
		destination = getDestination(airlift, { player: playerToAirlift });

	if (!destination)
		return invalidMovement(playerToAirlift.getLocation());

	const airliftDetails = { eventType: airlift, playerToAirlift, destination };
	gameData.promptedTravelPathProperties = airliftDetails;
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
	appendEventHistoryIconOfType(eventType);

	// If any events are left after shifting the airliftEvent, they are auto-treat disease events.
	if (events.length)
		await animateAutoTreatDiseaseEvents(events);
	
	enablePawnEvents();
	resumeCurrentStep();
}

async function appendGrantStation()
{
	const $boardContainer = $("#boardContainer");

	let $grantStation = $boardContainer.find(".researchStation.grantStation");
	
	if (!$grantStation.length)
		$grantStation = $(`<img class='researchStation grantStation' src='images/pieces/researchStation.png' />`)
			.appendTo("#boardContainer");

	researchStationKeys.add("grantStation");
	
	setTravelPathArrowColor({ governmentGranting: true });
	$grantStation.draggable({
			containment: $boardContainer,
			drag: function()
			{
				disableTooltipsWhileDragging();
				showTravelPathArrow({ $researchStation: $(this) });
			}
		})
		.mousedown(function()
		{
			turnOffResearchStationSupplyHighlight();

			$(window).off("mouseup").mouseup(function()
			{
				$(window).off("mouseup");
				getGovernmentGrantTargetCity($grantStation, promptAction);
				
				enableTooltipsAfterDragging()
			});
		});
	
	// Without a slight delay here, the offset will not be set correctly.
	await sleep(1);
	$grantStation.offset($("#researchStationSupplyContainer img").offset());

	return $grantStation;
}

function animateResearchStationBackToSupply($researchStation)
{
	return new Promise(resolve =>
	{
		const key = $researchStation.hasClass("grantStation") ? "grantStation" : $researchStation.attr("data-key"),
			city = isCityKey(key) ? getCity(key) : false;
		
		$researchStation
			.draggable({ disabled: true })
			.animate($("#researchStationSupplyContainer img").offset(),
				getDuration("stationPlacement"),
				function()
				{
					researchStationKeys.delete(key);
					updateResearchStationSupplyCount();
					$researchStation.remove();

					if (city)
					{
						city.hasResearchStation = false;
						city.cluster({ animatePawns: true, animateCubes: true });
					}

					resolve();
				});
	});
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

async function governmentGrant(targetCity, relocationKey)
{
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
	}
	else
		await targetCity.buildResearchStation(promptAction, { animate: true, isGovernmentGrant: true });
	
	hideTravelPathArrow();
	appendEventHistoryIconOfType(eventType);
	resumeCurrentStep();
}

function clusterAll({ pawns, playerToExcludePawn, researchStations, stationKeyToExclude } = {})
{
	const rIdToExclude = playerToExcludePawn ? playerToExcludePawn.rID : false;
	
	if (pawns)
	{
		const { players } = gameData;

		for (let rID in players)
			if (rID !== rIdToExclude)
				queueCluster(players[rID].cityKey);
	}

	if (researchStations)
	{
		const rsKeys = [...researchStationKeys]
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
		const cardKey = event.eventCard.key,
			$card = $("#playerPanelContainer").find(`.playerCard[data-key='${cardKey}']`),
			player = gameData.players[event.role];
		
		$card.removeClass("unavailable");

		if (isContingencyCardKey(cardKey))
		{
			await animateContingencyCardRemoval();
			player.contingencyKey = false;
			event.cardWasRemoved = true;
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
		const $card = getContingencyCardElement().removeClass("contingency").addClass("removed"),
			contingencyPlanner = getPlayer("Contingency Planner");

		contingencyPlanner.panel.$panel.find(".role")
			.removeClass("storingEventCard");

		disablePlayerDiscardHoverEvents();
		await expandPlayerDiscardPile({ showRemovedCardsContainer: true });
		await animateDiscardPlayerCard($card, { removingContingencyCard: true });
		contingencyPlanner.panel.checkOcclusion();
		await sleep(getDuration("longInterval"));
		await collapsePlayerDiscardPile();
		enablePlayerDiscardHoverEvents();

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
		
		gameData.promptedTravelPathProperties = actionDetails;
		promptAction(actionDetails);

		await playerToDispatch.getLocation().cluster();
	}
	else // The dispatch method can be executed immediately.
		movementAction(method, destination, { playerToDispatch });
}

function determineDispatchDetails(playerToDispatch)
{
	const {
			driveFerry,
			shuttleFlight,
			rendezvous,	
			directFlight,
			charterFlight
		} = eventTypes,
		dispatchMethods = [
			driveFerry,
			shuttleFlight,
			rendezvous,
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
		return `<span class='hoverInfo dispatchTypeInfo' data-eventType='${eventType.code}'>${eventType.name}</span>`;
	
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
				this.$discardsContainer.append(newPlayerCard(getCityOrEventCardObject(key), { noTooltip: true }));

			this.keeperCount = 0;
			this.discardSelectionCount = cardKeys.length;
			
			this.$keepersContainer.addClass("hidden");

			this.bindConfirmClick();
		}
		else
		{
			for (let key of cardKeys)
				this.$keepersContainer.append(newPlayerCard(getCityOrEventCardObject(key), { noTooltip: true }));

			this.discardSelectionCount = 0;
			this.keeperCount = cardKeys.length;

			const self = this;
			this.getKeeperCardElements().click(function() { self.toggleDiscardSelection($(this)) });
		}

		this.updateCountIndicators();
		bindEventCardHoverEvents(this.$container);

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
		const textColor = this.requirementsMet() ? "#0bad0b" : "red";
		
		// Show the keeper count for a plain old discard event to emphasize the hand limit.
		if (this.eventTypeCode === eventTypes.discard.code)
		{
			this.$keepersContainer.find("span")
				.html(`${this.keeperCount} / ${gameData.HAND_LIMIT} `)
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
		
		oscillateButtonBackgroundColor($btn);
	}
}

function requestAction(eventType, dataToPost)
{
	if (eventType.code !== eventTypes.pass.code)
		indicateActionsLeft({ addend: -1 });
	else
		indicateActionsLeft({ zeroRemaining: true });
	
	console.log(`requestAction(${eventType.code})`);
	return new Promise((resolve, reject) =>
	{
		$.post(`serverCode/actionPages/${eventType.actionPathName}.php`,
		{
			...{
				actionCode: eventType.code,
				currentStep: gameData.currentStep.name,
				role: getActivePlayer().rID
			},
			...dataToPost
		},
		function(response)
		{
			console.log(response);
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
					gameData.turnNum = turnNum;
					
				if (nextStep)
					gameData.nextStep = nextStep;
				else if (proceedFromDiscardToStep)
					bypassDiscardStep(proceedFromDiscardToStep);

				if (numPlayerCardsRemaining)
					gameData.numPlayerCardsRemaining = numPlayerCardsRemaining;

				if (gameEndCause)
					gameData.gameEndCause = gameEndCause;
				
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
	
	const { pass } = eventTypes;

	await requestAction(pass);
	appendEventHistoryIconOfType(pass);
	proceed();
}

function getValidShareKnowledgeParticipants(player)
{
	// Begin by creating an array of all other players in the same city as the initiating player. 
	const playersInSameCity = player.getLocation().getOccupants(gameData.players)
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
	
	const eventType = eventTypes.shareKnowledge;
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

	await requestAction(eventType,
		{
			giver: giver.rID,
			receiver: receiver.rID,
			cardKey: cardKey
		});

	await Promise.all([
		giver.panel.expandIfCollapsed(),
		receiver.panel.expandIfCollapsed()
	]);
	await giver.giveCard(cardKey, receiver);
	appendEventHistoryIconOfType(eventType);
	
	proceed();
}

function promptResearchStationRelocation()
{
	const { $actionInterface } = actionInterfacePopulator;
	// Prompt the player to choose a city from which to relocate a research station.
	actionInterfacePopulator.replaceInstructions(`<span class='r'>Research Station Supply is empty!</span>
	<br />Select a City from which to relocate a Research Station.`);

	let city;
	for (let key in cities)
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
			showTravelPathArrow({ origin: city, destination: getActivePlayer().getLocation() });
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
		city = player.getLocation(),
		eventType = eventTypes.buildResearchStation;

	await requestAction(eventType,
		{
			locationKey: city.key,
			relocationKey: relocationKey || 0
		});
	
	// Operations Expert special ability:
	// "As an action, build a research station in his current city without discarding a city card"
	if (!playerIsOperationsExpert)
	{
		await movePlayerCardsToDiscards({ player, $card: player.panel.getCard(city.key) });
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
		await city.buildResearchStation(promptAction, { animate: true });
	
	appendEventHistoryIconOfType(eventType);
	proceed();
}

async function movementAction(eventType, destination, { playerToDispatch, operationsFlightDiscardKey } = {})
{
	const { promptingEventType } = gameData,
		player = playerToDispatch || getActivePlayer(),
		originCity = player.getLocation();

	let movementDetails;
	if (promptingEventType)
	{
		eventType = promptingEventType;
		destination = getDestination(eventType);

		if (destination)
		{
			movementDetails = {
				eventType: eventType,
				destination: destination
			};

			gameData.promptedTravelPathProperties = movementDetails;
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
				gameData.promptedTravelPathProperties = movementDetails;
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
		appendEventHistoryIconOfType(playerToDispatch || eventType.code === eventTypes.rendezvous.code ? eventTypes.dispatchPawn : eventType);

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
	disablePawnEvents();
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
			autoTreatEvents = events.filter(e => e instanceof AutoTreatDisease
												|| e instanceof Eradication),
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
				city.decrementCubeCount(gameData.diseaseCubeSupplies, e.diseaseColor, city.cubes[e.diseaseColor]);

				await sleep(interval);
				await hideMedicAutoTreatCircle();
				appendEventHistoryIconOfType(autoTreatDisease);
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

		await movePlayerCardsToDiscards({ player, $card: player.panel.getCard(discardKey) });
		player.removeCardsFromHand(discardKey);

		resolve();
	});
}

async function treatDisease($cube, diseaseColor)
{
	disableActions();
	resetActionPrompt();
	
	const city = getActivePlayer().getLocation(),
		eventType = eventTypes.treatDisease;

	diseaseColor = diseaseColor || getColorClass($cube);

	const events = await requestAction(eventType,
		{
			cityKey: city.key,
			diseaseColor
		});
		
	let numToRemove,
		eradicated = false;
	for (let event of events)
	{
		if (event instanceof TreatDisease)
			numToRemove = event.prevCubeCount - event.newCubeCount;
		else if (event instanceof Eradication)
			eradicated = true;
	}
	
	await removeCubesFromBoard(city,
	{
		$clickedCube: $cube,
		color: diseaseColor,
		numToRemove
	});
	city.decrementCubeCount(gameData.diseaseCubeSupplies, diseaseColor, numToRemove);
	appendEventHistoryIconOfType(eventType);

	if (eradicated)
		await eradicationEvent(diseaseColor);
	
	proceed();
}

function eradicationEvent(diseaseColor)
{
	return new Promise(async resolve =>
	{
		flipCureMarkerToEradicated(diseaseColor);

		gameData.cures[diseaseColor] = "eradicated";
		
		await specialEventAlert(
		{
			title: "DISEASE ERADICATED!",
			description: `No new disease cubes of this color will be placed on the board`,
			eventClass: diseaseColor
		});

		appendEventHistoryIconOfType(eventTypes.eradication);
		resolve();
	});
}

function flipCureMarkerToEradicated(diseaseColor, $cureMarker)
{
	if (!diseaseColor)
		return false;
	
	$cureMarker = $cureMarker ? $cureMarker : $(`#cureMarker${diseaseColor.toUpperCase()}`)
	
	$cureMarker.prop("src", `images/pieces/cureMarker_${diseaseColor}_eradicated.png`);
}

function finishActionStep()
{
	if (currentStepIs("action 4"))
		$("#actionsContainer").slideUp();
	
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
			if (movementTypeRequiresDiscard(eventType))
			{
				if (getActivePlayer().hasMultipleFlightOptions(destination))
					eventType = eventTypes.chooseFlightType;
				
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

	if (gameData.numPlayerCardsRemaining == 0) // the players lose.
	{
		gameData.gameEndCause = "cards";
		return outOfPlayerCardsDefeatAnimation($container);
	}

	$container.add($btn).removeClass("hidden").removeAttr("style");

	// Event cards can be played before drawing.
	enableEventCards();

	oscillateButtonBackgroundColor($btn);
	await buttonClickPromise($btn,
	{
		beforeClick: "fadeIn",
		afterClick: "hide"
	});

	disableEventCards();
	eventHistory.disableUndo();

	const cardKeys = await performDrawStep()
		.catch((reason) => console.log(reason));
	if (!cardKeys) return false;

	if (gameData.nextStep === "epIncrease")
	{
		let title;
		
		if (numEpidemicsToResolve() === 1)
		{
			gameData.epidemicCount++;
			title = "EPIDEMIC!"
		}
		else
		{
			gameData.epidemicCount += 2;
			title = "DOUBLE EPIDEMIC!!";
		}
		
		await specialEventAlert({ title, eventClass: "epidemic", visibleMs: 1250 });
	}

	await sleep(750);
	finishDrawStep(cardKeys);
}

async function performDrawStep()
{
	return new Promise(async (resolve, reject) =>
	{
		const $container = $("#cardDrawContainer"),
			{ numPlayerCardsRemaining } = gameData,
			numCardsToDeal = numPlayerCardsRemaining >= 2 ? 2 : numPlayerCardsRemaining,
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
		
		if (gameData.gameEndCause) // not enough player cards remain in the deck -- the players lose.
		{
			await sleep(getDuration("longInterval"));
			reject("Out of player cards -- the players lose.");
			return outOfPlayerCardsDefeatAnimation($container);
		}

		bindCityLocatorClickEvents();
		bindEventCardHoverEvents($container);
		
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
	appendEventHistoryIconOfType(eventTypes.cardDraw);

	proceed();
}

async function dealFaceDownPlayerCards($container, numCardsToDeal)
{
	const deckProperties = playerDeckImgManager.getProperties();

	for (let i = 0; i < numCardsToDeal; i++)
	{
		dealFaceDownPlayerCard($container, deckProperties);
		
		if (!currentStepIs("setup"))
			playerDeckImgManager.decrementCardCount().setImage();
		
		await sleep(getDuration("dealCard") * 0.5);
	}
	return sleep(getDuration("longInterval"));
}

function dealFaceDownPlayerCard($container, deckProperties, { finalCardbackWidth, zIndex } = {})
{
	const $playerCard = $("<div class='playerCard template'></div>").appendTo($container),
		containerOffset = $playerCard.offset(),
		$cardback = newFacedownPlayerCard().addClass("drawnPlayerCard");
	
	if (zIndex)
		$cardback.css({ zIndex });

	$cardback
		.appendTo("body")
		.width(deckProperties.width)
		.offset(
			{
				top: deckProperties.top,
				left: deckProperties.left
			})
		.animate(
			{
				width: finalCardbackWidth || $container.width() * 0.152,
				top: containerOffset.top,
				left: containerOffset.left
			},
			getDuration("dealCard"),
			easings.dealCard,
			function() { $cardback.removeClass("template") });
}

function newFacedownPlayerCard()
{
	return $("<img src='images/cards/playerCardback.png' alt='Player Card'/>");
}

async function revealPlayerCard(cardKey, $container)
{
	const $card = $(newPlayerCard(getCityOrEventCardObject(cardKey))),
		duration = getDuration("revealPlayerCard");

	if ($container.hasClass("roleContainer"))
		$card.appendTo($container);
	else
		$card.prependTo($container);

	const cardWidth = $card.width();

	await animationPromise({
		$elements: $card,
		initialProperties: { width: 0 },
		desiredProperties: { width: cardWidth },
		duration,
		easing: easings.revealCard
	});

	$card.removeAttr("style");
}

async function animateCardsToHand($cards)
{
	const { panel } = getActivePlayer();

	await panel.expandIfCollapsed();
	const targetProperties = panel.getCardTargetProperties();
	
	// If the second card is not an epidemic, both cards will be moved to the player's hand at once,
	// and the first card should be offset from the second.
	let lastCardTop = targetProperties.top;
	if (!$cards.first().hasClass("epidemic"))
		lastCardTop += $cards.first().height();
	
	// There will always be 2 cards to handle.
	panel.animateReceiveCard($cards.last(),
	{
		targetProperties: {
			...targetProperties,
			...{ top: lastCardTop }
		}
	});
	
	// If there are 0 epidemics, the cards are animated to the hand simultaneously.
	// If $cards.first() is an epidemic, await the same duration to finish the draw animation before expanding the epidemic.
	if ($cards.first().hasClass("epidemic"))
		await sleep(getDuration("dealCard"));
	// Returning the second Promise (instead of Promise.all) avoids an issue where the cards
	// can swap positions after being inserted into the hand.
	return panel.animateReceiveCard($cards.first(), targetProperties);
}

function resizeAll()
{
	console.log("resizeAll()");
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

		gameData.windowWidth = gameData.boardWidth + gameData.panelWidth;

		resolve();
	});
}
$(window).resize(function(){ waitForFinalEvent(function(){resizeAll(true)}, 500, "resize"); });

function resizeBoard()
{
	gameData.boardWidth = $("#boardImg").width();
	gameData.boardHeight = $("#boardImg").height();
	$("#boardContainer").height(gameData.boardHeight);

	resetPinpointRectangles();
	gameData.cityWidth = getDimension("cityWidth");
}

function resizeTopPanelElements()
{
	const $topPanel = $("#topPanel"),
		$topPanelDivs = $topPanel.children("div");
	
	$topPanelDivs.css("height", "auto");
	gameData.topPanelHeight = $("#topPanel").height();
	$topPanelDivs.height(gameData.topPanelHeight);
	resizeCubeSupplies();
	gameData.infectionDeckOffset = $("#infectionDeckContainer img").offset();

	resizeInfectionDiscardElements();
}

function resizeCubeSupplies()
{
	$(".cubeSupply").css("margin-top", getDimension("cubeSupplyMarginTop") + "px");
	makeElementsSquare(".cubeSupply .diseaseCube");
}

function resizeInfectionDiscardElements()
{
	const $infDiscard = $("#infectionDiscardContainer"),
		panelHeight = $("#topPanel").height();

	positionRemovedInfectionCardsContainer("collapse");
		
	$infDiscard.css("height", panelHeight);
	resizeInfectionCards($infDiscard);
	
	$infDiscard.children("#infDiscardVeil").offset({ top: $infDiscard.children(".title").first().outerHeight() });
}

function positionRemovedInfectionCardsContainer()
{
	const $removedCardsContainer = $("#removedInfectionCards");
	
	if (!$removedCardsContainer.children(".infectionCard").length)
		return false;

	const $discardPile = $removedCardsContainer.parent(),
		$discards = $discardPile.children(".infectionCard"),
		occupiedPanelHeight = $discardPile.children(".title").outerHeight()
			+ (($discards.first().outerHeight() + 2) * $discards.length),
		{ topPanelHeight } = gameData;
	
	let mTop = 20;
	if (occupiedPanelHeight < topPanelHeight)
		mTop = (topPanelHeight - occupiedPanelHeight);

	$removedCardsContainer.css("margin-top", mTop + "px");
}

function resizeBottomPanelElements()
{
	const $eventHistoryContainer = $("#eventHistoryContainer"),
		{ boardHeight, topPanelHeight } = gameData,
		panelOffsetTop = boardHeight - topPanelHeight;
	$(".bottomPanelDiv").not($eventHistoryContainer)
		.height(topPanelHeight)
		.offset({ top: panelOffsetTop });

	const $cureMarkerContainer = $("#cureMarkerContainer"),
		titleHeight = $cureMarkerContainer.children(".title").outerHeight() + 4;
	$cureMarkerContainer
		.height(topPanelHeight + titleHeight)
		.offset({ top: panelOffsetTop - titleHeight });
	
	const ehContainerHeight = topPanelHeight * 0.4;
	$eventHistoryContainer.height(ehContainerHeight)
		.offset({ top: boardHeight - ehContainerHeight })
		.children().height(ehContainerHeight)
		.css("line-height", ehContainerHeight*1.07 + "px");
	
	if (boardHeight <= $(window).height())
		ensureDivPositionIsWithinWindowHeight($eventHistoryContainer, { windowPadding: 0 });
	
	eventHistory.scrollToEnd();
}

function resizeRightPanelElements()
{
	const rightPanel = $("#rightPanel");
	rightPanel.height(gameData.boardHeight);
	gameData.panelWidth = rightPanel.width();
	
	if ($("#infectionsContainer, #initialInfectionsContainer, #forecastContainer").not(".hidden").length)
	{
		positionInfectionPanelComponents();
		positionFaceDownInfectionCards();
	}
	
	resizeTreatDiseaseOptions();
}

function resizeTreatDiseaseOptions()
{
	makeElementsSquare("#actionInterface .diseaseCube");
}

function repositionMarkers()
{
	moveInfectionRateMarker();
	moveOutbreaksMarker(gameData.outbreakCount);
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
		
		const cubeWidth = getDimension("cubeWidth");
		$("#boardContainer > .diseaseCube").width(cubeWidth).height(cubeWidth);
		gameData.cubeWidth = cubeWidth;
	
		positionAutoTreatCircleComponents();
		
		// a slight delay is required for all pending clusters to resolve properly
		if (gameData.pendingClusters.size)
			return sleep(50);
		else // cluster all cities containing pawns, disease cubes, or research stations
		{
			let city;
			for (let key in cities)
			{
				city = getCity(key);
				if (city.containsPieces())
					city.cluster();
			}
		}

		managePlayerPanelOcclusion();

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
	gameData[`${pieceName}Height`] = $demoElement.height();
	gameData[`${pieceName}Width`] = $demoElement.width();
	$demoElement.addClass("hidden");
}

function positionPawnArrows()
{
	const { players } = gameData;
	let player;

	for (let rID in players)
	{
		player = players[rID];

		if (player.hasOwnProperty("$pawnArrow") && !player.$pawnArrow.hasClass("hidden"))
			player.animatePawnArrow();
	}
}

// It is important to call this function after the specialEventBanner's content has been set
// because its height is an essential part of the repostitioning formula.
function repositionSpecialEventBanner()
{
	const $banner = $("#specialEventBanner"),
		bannerHeight = $banner.height(),
		{ boardHeight } = gameData;
	
	$banner.offset({ top: boardHeight/2 - bannerHeight });

	$(".specialEventImg").css(
	{
		top: boardHeight/2 + bannerHeight/4,
		left: getDimension("specialEventImgMarginLeft")
	});
}

function managePlayerPanelOcclusion(citiesToCheck)
{
	const { players } = gameData;

	for (let rID in players)
		players[rID].panel.checkOcclusion(citiesToCheck);
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

	async showRoleCard($hoveredElement)
	{
		const {
				$panel,
				camelCaseRole,
				role,
				contingencyKey
			} = this,
			hoveredElementOffset = $hoveredElement.length ? $hoveredElement.offset() : false,
			roleCardOffset = hoveredElementOffset || $panel.offset(),
			CARD_MARGIN = 5,
			$roleCard = $(`<div class='roleCard ${camelCaseRole}'>
							<h3>${role}</h3>
							<img	class='rolePortrait'
									src='images/cards/roles/${camelCaseRole}.jpg'
									alt='${role} Role Card' />
							<ul>${strings[`${camelCaseRole}CardText`]}</ul>
						</div>`).appendTo("#boardContainer"),
			showFullContingencyCard = role === "Contingency Planner" && contingencyKey && !hoveredElementOffset;
		
		if (hoveredElementOffset)
		{
			// Without a slight delay, the calculated $roleCard height is inaccurate.
			// So we hide the card so that it doesn't appear in the wrong place for a split second,
			// wait 10ms, show the card, then calculate the actual height.
			$roleCard.addClass("hidden");
			await sleep(10);
			$roleCard.removeClass("hidden");
			
			if ($hoveredElement.closest(".eventDetails").length)
			{
				const $eventDetails = $(".eventDetails");
				roleCardOffset.left = $eventDetails.offset().left + $eventDetails.outerWidth() + CARD_MARGIN;
			}
			else
				roleCardOffset.left = gameData.boardWidth - ($roleCard.width() + CARD_MARGIN);
		}
		else
		{
			roleCardOffset.top += CARD_MARGIN;
			roleCardOffset.left += $panel.width() + CARD_MARGIN;
		}
		
		$roleCard.offset(roleCardOffset);
		ensureDivPositionIsWithinWindowHeight($roleCard);

		if (showFullContingencyCard)
			eventCards[contingencyKey].showFullCard(getContingencyCardElement());
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
			managePlayerPanelOcclusion(origin);

			resolve();
		});
	}

	pinpointLocation()
	{
		pinpointCity(this.cityKey, { pinpointClass: `${this.camelCaseRole}Border` });
	}

	getPawnOffset()
	{
		const offset = this.$pawn.offset(),
			{ pawnWidth, pawnHeight } = gameData;

		offset.left += pawnWidth / 2;
		offset.top += pawnHeight;

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
			initialOffset = this.getPawnOffset(),
			{ pawnHeight, boardWidth } = gameData;
	
		let arrowClass = "",
			dropShadowBlurRadiusFactor = .003,
			initialOffsetTopAdj = pawnHeight * 2;
		if (eventTypeIsBeingPrompted(eventTypes.airlift))
			arrowClass = "airlift";
		else if (getActivePlayer().role !== this.role)
		{
			arrowClass = "dispatch";
			dropShadowBlurRadiusFactor = 0.002;
			initialOffsetTopAdj -= pawnHeight / 3;
		}

		$arrow.stop()
			.removeClass("airlift dispatch hidden")
			.addClass(arrowClass)
			.css("filter", `drop-shadow(0px 0px ${boardWidth*dropShadowBlurRadiusFactor}px #fff)`);
		
		makeElementsSquare($arrow);	

		initialOffset.top -= initialOffsetTopAdj;
		initialOffset.left -= $arrow.width() / 2;
		$arrow.offset(initialOffset);

		const bobDistance = $arrow.height() / 3;

		while (!$arrow.hasClass("hidden"))
			await bobUpAndDown($arrow, { initialOffset, bobDistance });
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
		return this.cardKeys.includes(cardKey) || this.contingencyKey === cardKey;
	}

	isHoldingAnyCityCard()
	{
		return (this.cardKeys.filter(cardKey => isCityKey(cardKey) ).length > 0);
	}

	isHoldingAnyEventCard()
	{
		return (this.cardKeys.filter(cardKey => isEventCardKey(cardKey) ).length > 0)
			|| isEventCardKey(this.contingencyKey);
	}

	giveCard(cardKey, receiver)
	{
		return new Promise(async resolve =>
		{
			await Promise.all([
				this.panel.expandIfCollapsed(),
				receiver.panel.expandIfCollapsed()
			]);
			
			const $card = this.panel.getCard(cardKey),
				initialProperties = $card.offset(),
				$insertAfterMe = receiver.$panel.children(".role, .playerCard").last(),
				desiredOffset = $insertAfterMe.offset(),
				giver = this;

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

					giver.removeCardsFromHand(cardKey);
					receiver.addCardKeysToHand(cardKey);

					giver.panel.checkOcclusion();
					receiver.panel.checkOcclusion();

					resolve();
				});
		});
	}

	// Appends either a single cardKey or an array of cardKeys to this Player's cardKeys array.
	// Excludes Epidemic cards because they go straight to the discard pile after being resolved.
	addCardKeysToHand(cardKeys)
	{
		this.cardKeys = [
			...this.cardKeys,
			...ensureIsArray(cardKeys).filter(key => !isEpidemicKey(key))
		];

		this.panel.setCollapsedCardCount(this.cardKeys.length);
	}

	// Removes the card element from the player's panel,
	// and removes the cardKey from the player object's cardKeys array.
	// Accepts a single cardKey string, or an array of cardKey strings.
	removeCardsFromHand(cardKeys)
	{
		for (let key of ensureIsArray(cardKeys))
		{
			this.panel.removeCard(key);
			this.cardKeys.splice(this.cardKeys.indexOf(key), 1);
		}

		this.panel.setCollapsedCardCount(this.cardKeys.length);
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

	canDirectFlightTo(destination)
	{
		return this[`valid${eventTypes.directFlight.name}DestinationKeys`]().includes(destination.key);
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
		for (let key in cities)
			if (cities[key].hasResearchStation && key != this.cityKey)
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
		const playersAtCurrentLocation = this.getLocation().getOccupants(gameData.players);
		
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
			if (cardsOfColor.length >= NUM_CARDS_REQUIRED && !gameData.cures[color])
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
			return [...researchStationKeys].filter(key => key != this.cityKey);
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
			for (let key in cities)
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
			for (let key in cities)
				if (key !== this.cityKey)
					destinationKeys.push(key);
		}

		return destinationKeys;
	}

	[`valid${eventTypes.rendezvous.name}DestinationKeys`]()
	{
		// The Dispatcher can move any pawn to a city containing another pawn.
		// This action is herein referred to as "rendezvous".
		const destinationKeys = [],
			{ players } = gameData;

		// Only allowed on the Dispatcher's turn.
		if (getActivePlayer().role !== "Dispatcher")
			return destinationKeys;

		let player;
		for (let rID in players)
		{
			player = players[rID];

			if (this.cityKey !== player.cityKey)
				destinationKeys.push(player.cityKey);
		}

		return destinationKeys;
	}

	[`valid${eventTypes.airlift.name}DestinationKeys`]()
	{
		const destinationKeys = [];

		// Any city besides the current city is a valid destination.
		for (let key in cities)
			if (key !== this.cityKey)
				destinationKeys.push(key);

		return destinationKeys;
	}

	hasMultipleFlightOptions(destination)
	{
		const {
			charterFlight,
				operationsFlight
			} = eventTypes,
			flightTypes = [
				charterFlight,
				operationsFlight
			];
		
		// The destination must be considered for Direct Flight, but is irrelevant for Charter Flight and Operations Flight.
		let numOptions = this.canDirectFlightTo(destination) ? 1 : 0,
			canDoFlightType;

		for (let flightType of flightTypes)
		{
			canDoFlightType = `can${toPascalCase(flightType.name)}`;

			if (this[canDoFlightType]() && ++numOptions > 1)
				return true;
		}
		
		return false;
	}
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
	const activePlayer = getActivePlayer();
	
	gameData.turn = activePlayer.nextTurnID;
	gameData.turnNum++;

	if (isOneQuietNight())
		indicateOneQuietNightStep();

	
	await activePlayer.getLocation()
		.setPawnIndices()
		.cluster({ animatePawns: true });

	proceed();
}

function instantiatePlayers(playerInfoArray)
{
	if (typeof playerInfoArray == "undefined")
	{
		console.error("Failed to instantiate players.");
		return;
	}

	const { players, gameIsResuming } = gameData;

	let player,
		numPlayers = 0;
	
	for (let pInfo of playerInfoArray)
	{
		player = new Player(pInfo);
		players[player.rID] = player;
		numPlayers++;
	}

	for (let rID of getTurnOrder())
	{
		player = players[rID];
		player.panel = new PlayerPanel(player, numPlayers);

		if (gameIsResuming)
		{
			appendPawnToBoard(player);
			queueCluster(player.cityKey);
		}
	}

	if (gameIsResuming)
	{
		bindPawnEvents();
		$(".playerPanel").removeClass("hidden").removeAttr("style");
	}
}

function getTurnOrder()
{
	const turnOrderCards = getDecidingTurnOrderCardPopulations(),
		startingHandsEvent = eventHistory.events[0];
	
	startingHandsEvent.setPopulationRanks(turnOrderCards);
	
	return turnOrderCards.map(card => card.role);
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

function bindPawnEvents()
{
	$(".pawn:not(#demoPawn, #placeholderPawn)")
		.draggable(
		{
			disabled: true, // pawn dragging is enabled and disabled according to the game state.
			containment: $("#boardContainer"),
			drag: function()
			{
				disableTooltipsWhileDragging();
				
				const $this = $(this);
				showTravelPathArrow({ $pawn: $this, player: getPlayer($this.attr("data-role")) });
			}
		})
		.mousedown(function()
		{
			if ($(this).draggable("option", "disabled"))
				return false;
			
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
					enableTooltipsAfterDragging();
				});

			// The dragged pawn appear in front of other pawns and disease cubes.
			$this.css("z-index", 6);
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

function getDiseaseColor(key)
{
	return getCity(key).color;
}

function getCityOrEventCardObject(key)
{
	return eventCards[key] || getCity(key);
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
			city.buildResearchStation(promptAction);
		
		// place disease cubes on the city if it has any
		for (let c = 0; c < colors.length; c++)
		{
			color = colors[c];
			numCubes = cityInfo[`${color}Cubes`];
			
			for (let n = 0; n < numCubes; n++)
			{
				appendNewCubeToBoard(color, city.key);
				city.incrementCubeCount(gameData.diseaseCubeSupplies, color);
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
	gameData.pendingClusters.add(cityKey);
}

function executePendingClusters(details)
{
	for (let cityKey of gameData.pendingClusters)
		getCity(cityKey).cluster(details);
	
	gameData.pendingClusters.clear();
}

async function resolveOutbreaks(events)
{
	const pendingOutbreaks = events.filter(e => e instanceof Outbreak),
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
		infections = events.filter(e => (e instanceof OutbreakInfection && e.originKey === outbreakEvent.originKey)
										|| (e instanceof Outbreak
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
			
			if (inf instanceof OutbreakInfection
				&& inf.preventionCode !== infectionPreventionCodes.notPrevented)
			{
				if (inf.preventionCode === infectionPreventionCodes.quarantine)
					quarantinePrevention = true;
				
				if (inf.preventionCode === infectionPreventionCodes.medicAutoTreat)
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
			
			affectedCity.incrementCubeCount(gameData.diseaseCubeSupplies, color);
		}
		// remove the handled events
		events = events.filter(e => !(infections.includes(e) || Object.is(outbreakEvent, e)));
		
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
				showMedicAutoTreatCircle({ color, fadeInMs: preventionVisualFadeInMs });
		}

		if (cubesToDisperse.length)
		{
			removeOutbreakCubeHighlights(originCity.key);
			await disperseOutbreakCubes(originCity.key, cubesToDisperse);
		}
		else
		{
			// If there are no cubes to disperse, it means that all potential infections caused by the current outbreak were prevented
			// (either by the Quarantine Specialist, the Medic, or by the city having already
			// had an outbreak as part of resolving the current infection card),
			// which means the outbreak trigger cube must be returned to the supply as it has no destination.
			removeOutbreakCubeHighlights(originCity.key);
			await removeCubesFromBoard(originCity, { color, slow: true });
		}

		if (preventionOccured)
		{
			await sleep(2000);

			if (quarantinePrevention)
				hideQuarantineArea();
			
			if (medicAutoTreatPrevention)
				hideMedicAutoTreatCircle();

			await sleep(500); // instead of awaiting both of the above
		}

		managePlayerPanelOcclusion();
		appendEventHistoryIconOfType(eventTypes.outbreak);

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
	const OUTBREAK_LIMIT = 8;

	if (gameData.outbreakCount >= OUTBREAK_LIMIT)
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
			
			gameData.outbreakCount = outbreakCount;
		
			if (animate)
			{
				$marker.addClass("mediumGlow");
				await highlightMarkerTrack("outbreaks");
			}

			await animationPromise(
			{
				$elements: $marker,
				desiredProperties: {
					top: (gameData.boardHeight * topPercentages[outbreakCount]),
					left: getDimension(leftDimension)
				},
				duration: animate ? getDuration("moveMarker") : 0,
				easing: easings.moveMarker
			});

			if (animate)
			{
				await sleep(getDuration("mediumInterval"));

				if (tooManyOutbreaksOccured()) // defeat -- return early
				{
					gameData.gameEndCause = "outbreak";
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

		$cube.removeClass(`${originCityKey} infecting`)
			.addClass(destinationKey)
			.removeAttr("data-destinationKey");
		
		getCity(destinationKey).clusterDiseaseCubes({ animate: true });
	}
	return sleep(getDuration("cubePlacement"));
}

function appendNewCubeToBoard(color, cityKey, { prepareAnimation, outbreakDestinationKey } = {})
{
	const $newCube = newDiseaseCubeElement({ color, cityKey })
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
		
		$newCube.css(startingProperties).addClass("infecting");
	}
	
	return $newCube;
}

async function removeCubesFromBoard(city, { $clickedCube, color, numToRemove, slow } = {})
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
		duration = getDuration("cubePlacement") * (slow ? 1.5 : 0.5);

	desiredProperties.width = supplyCubeWidth;
	desiredProperties.height = supplyCubeWidth;

	let $cube;
	while ($cubesToRemove.length)
	{
		$cube = $cubesToRemove.last();

		await animationPromise({
			$elements: $cube,
			desiredProperties,
			duration,
			easing: easings.cubePlacement
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
		await animationPromise(
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
			duration: 400,
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

function enableDiseaseCubeEvents()
{
	const player = getActivePlayer(),
		{ cityKey } = player,
		$cubes = $("#boardContainer").children(`.${cityKey}.diseaseCube`),
		$btnTreatDisease = $("#btnTreatDisease");
	
	$cubes.attr("title", "Click to Treat Disease")
		.off("click mouseenter mouseleave")
		.hover(function()
		{
			if (!$btnTreatDisease.hasClass("btnDisabled"))
				markTreatableDiseaseCubes($(this));
		},
		function() { unmarkTreatableDiseaseCubes($cubes) })
		.click(function()
		{
			if (!$btnTreatDisease.hasClass("btnDisabled"))
			{
				unmarkTreatableDiseaseCubes($cubes);
				treatDisease($(this));
			}
		});
	
	let $this;
	$cubes.each(function()
	{
		$this = $(this);
		if ($this.is(":hover"))
			markTreatableDiseaseCubes($this);
	});
}

function disableDiseaseCubeEvents()
{
	$("#boardContainer").children(".diseaseCube")
		.off("click mouseenter mouseleave")
		.removeAttr("title");
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
	if (player.role === "Medic" || gameData.cures[diseaseColor] === "cured")
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

function highlightEpidemicStep($epidemic, epidemicStep)
{
	$epidemic.children(".highlighted").removeClass("highlighted");
	$epidemic.children(`.${epidemicStep}`).addClass("highlighted");

	return sleep(500);
}

function prepareEpidemicStep()
{
	return new Promise(async resolve =>
	{
		const numUnresolved = numEpidemicsToResolve(),
			isBetweenEpidemics = betweenEpidemics(),
			$container = $("#epidemicContainer"),
			$epidemics = $container.children(".epidemicFull");
		
		if (isBetweenEpidemics)
			$epidemics.last().addClass("resolved");
		
		const $epidemic = $epidemics.not(".resolved").last(),
			returnValues = {
				$epidemic: $epidemic,
				$btn: $container.find(".button").addClass("hidden")
			};
	
		if (numUnresolved === 2 || isBetweenEpidemics)
			$epidemics.first().removeClass("hidden").addClass("pending");

		$container.removeClass("hidden");
		
		if (!isBetweenEpidemics)
			await revealEpidemicFull($epidemic);

		resolve(returnValues);
	});
}

function revealEpidemicFull($epidemic)
{
	const $epidemicSteps = $epidemic.children().not("h2"),
		numHidden = $epidemicSteps.filter(".hidden").length;

	$epidemic.removeClass("hidden pending")
		.children().removeClass("hidden").removeAttr("style");
	
	if (numHidden === 0)
		return sleep(0);
	
	let $step, stepHeight,
		promise;
	
	for (let i = 0; i < $epidemicSteps.length; i++)
	{
		$step = $epidemicSteps.eq(i);
		stepHeight = $step.outerHeight();

		promise = animationPromise({
			$elements: $step,
			initialProperties: { height: 0 },
			desiredProperties: { height: stepHeight },
			easing: "easeOutQuad",
			callback: () => $step.removeAttr("style")
		});
		
		if ($step.is($epidemicSteps.last()))
			return promise;
	}
}

function specialEventAlert({ title, description, eventClass, visibleMs })
{
	return new Promise(async resolve =>
	{
		const $banner = $("#specialEventBanner"),
			duration = getDuration("specialEventBannerReveal"),
			easing = "easeOutQuint";
		
		$banner.removeAttr("class").addClass(eventClass)
			.children("#specialEventTitle").html(title)
			.next().html(description || "");
		
		// Important that this step is done after the banner's contents have been set
		// and the banner is visible.
		repositionSpecialEventBanner();
		
		$banner.offset({ left: -($(window).width()) });

		await animationPromise(
		{
			$elements: $banner,
			initialProperties: { left: -($(window).width()) },
			desiredProperties: { left: 0 },
			duration,
			easing
		});
		
		await sleep(visibleMs || 2500);
		
		await animationPromise(
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
function betweenEpidemics()
{
	// The current step must be Epidemic Step 1: Increase, else we are not waiting to resolve an epidemic.
	// Additionally, 1 epidemicIntensify event needs to have been recorded this turn, else 0 epidemics have been resolved this turn.
	return currentStepIs("epIncrease")
		&& getEventsOfTurn(eventTypes.epidemicIntensify).length === 1;
}

async function epidemicIncrease()
{
	const { $epidemic, $btn } = await prepareEpidemicStep(),
		eventType = eventTypes.epidemicIncrease;
	
	if (betweenEpidemics())
	{
		// If two epidemics were drawn on the same turn, event cards can be played after resolving the first
		// (but not during resolution of the second).
		// We should also give the user a chance to undo the playing of any undoable event cards between epidemics.
		if (anyPlayerHasAnyEventCard() || eventHistory.lastEventCanBeUndone())
		{
			enableEventCards();

			await buttonClickPromise($btn.html("NEXT EPIDEMIC").removeClass("hidden"));
			$btn.addClass("hidden");
		}
		
		await revealEpidemicFull($epidemic);
	}

	disableEventCards();
	await highlightEpidemicStep($epidemic, "increase");
	
	const { 0: event } = await requestAction(eventType);

	await moveInfectionRateMarker({ newEpidemicCount: event.epidemicCount, animate: true });
	appendEventHistoryIconOfType(eventType);

	proceed();
}

async function epidemicInfect()
{
	disableEventCards();

	const { $epidemic } = await prepareEpidemicStep(),
		eventType = eventTypes.epidemicInfect,
		interval = getDuration("longInterval");

	await highlightEpidemicStep($epidemic, "infect");

	const { 0: events } = await Promise.all(
		[
			requestAction(eventType),
			sleep(interval) // minumum wait time so things don't happen too quickly
		]),
		{ cityKey, prevCubeCount, preventionCode } = events.shift(), // epInfect event
		triggeredOutbreakEvents = events, // any remaining events were triggered by the infection.
		$MAX_NUM_CUBES = 3,	
		card = {
			cityKey,
			city: getCity(cityKey),
			numCubes: $MAX_NUM_CUBES - prevCubeCount,
			preventionCode: preventionCode,
			infectionIndex: 0
		};

	getInfectionContainer().append(newInfectionCardTemplate());
	positionInfectionPanelComponents();
	await dealFaceDownInfCard(card, { dealFromBottomOfDeck: true });
	await revealInfectionCard(card);

	const { color } = card.city;

	if (preventionCode === infectionPreventionCodes.notPrevented)
	{
		await placeDiseaseCubes(card);
		appendEventHistoryIconOfType(eventType);

		if (diseaseCubeLimitExceeded(color))
			return diseaseCubeDefeatAnimation(color);
	}
	else
	{
		await infectionPreventionAnimation(card);
		appendEventHistoryIconOfType(eventType);
	}

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
	} = await prepareEpidemicStep(),
		eventType = eventTypes.epidemicIntensify;

	await highlightEpidemicStep($epidemic, "intensify");

	// Resilient Population may be played between the infect and intensify steps of an epidemic.
	// We should also give the user a chance to undo the Resilient Population event before beginning the intensify step.
	if (anyPlayerHasResilientPopulation() || eventHistory.lastEventCanBeUndone())
	{
		enableEventCards({ resilientPopulationOnly: true });
		
		oscillateButtonBackgroundColor($btn.removeClass("hidden btnDisabled"));
		await buttonClickPromise($btn.html("INTENSIFY"));
		$btn.addClass("hidden");
	}
	eventHistory.disableUndo();
	disableEventCards();

	await Promise.all([
		requestAction(eventType),
		animateEpidemicIntensify()
	]);
	resetInfectionDeckSize();
	appendEventHistoryIconOfType(eventType);
	
	$epidemic.children(".highlighted").removeClass("highlighted");
	
	disableEventCards();
	await finishIntensifyStep($epidemic);

	proceed();
}

function finishIntensifyStep($epidemic)
{
	return new Promise(async resolve =>
	{
		// Collapse epidemic card
		const $epidemicSteps = $epidemic.children().not("h2");
		await animationPromise(
		{
			$elements: $epidemicSteps,
			desiredProperties: { height: 0 },
			easing: "easeInQuad"
		});
		$epidemicSteps.addClass("hidden");

		// Hide the .epidemicFull and show a new epidemic playercard element to discard
		const $card = $(newPlayerCard("epidemic"));
		$epidemic.addClass("hidden").before($card);
		await movePlayerCardsToDiscards({ $card });
		bindEpidemicCardHoverEvents($("#playerDiscardContainer"));
	
		getInfectionContainer().addClass("hidden");
	
		if (gameData.nextStep === "epIncrease")
			$epidemic.addClass("resolved");
		else
			$(".epidemicFull").removeClass("resolved");

		resolve();
	});
}

async function highlightMarkerTrack(trackName, { off } = {})
{
	const $highlighters = $("." + trackName + "Highlight");

	await animationPromise(
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
			epidemicCount = newEpidemicCount || gameData.epidemicCount;

		if (newEpidemicCount)
			gameData.epidemicCount = newEpidemicCount;
		
		gameData.infectionRate = getInfectionRate(epidemicCount);
		
		if (animate)
		{
			$marker.offset({ left: (gameData.boardWidth * spaceLocations[epidemicCount - 1]) })
				.addClass("smallGlow");
			await highlightMarkerTrack(trackName);
		}
		
		await animationPromise(
		{
			$elements: $marker,
			desiredProperties: {
				left: (gameData.boardWidth * spaceLocations[epidemicCount])
			},
			duration: animate ? getDuration("moveMarker") : 0,
			easing: easings.moveMarker
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

async function animateEpidemicIntensify()
{
	const $container = $("#infectionDiscardContainer"),
		$title = $container.children(".title").first(),
		$cards = $container.children(".infectionCard").addClass("template"), // template css class prevents the target cursor from appearing
		delay = getDuration("longInterval");
	
	disableInfectionDiscardHoverEvents();
	await expandInfectionDiscardPile();

	if ($cards.length === 0)
	{
		$title.html("[NO CARDS TO SHUFFLE]");
		await sleep(delay * 2);
		$title.html("INFECTION DISCARDS");

		collapseInfectionDiscardPile();
		enableInfectionDiscardHoverEvents();

		return sleep(delay);
	}

	const $veil = $container.children("#infDiscardVeil"),
		$deck = $("#infectionDeckContainer img"),
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
			animationPromise(
				{
					$elements: $cardbacks,
					desiredProperties: { opacity: 1 },
					duration: duration
				}),
			animationPromise(
				{
					$elements: $cards.children(".infectionCardContents"),
					desiredProperties: { opacity: 0 },
					duration: duration
				}),
			animationPromise(
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
	await animationPromise(
		{
			$elements: $cardbacks,
			desiredProperties: { ...centerOfContainer, ...{ width: deckWidth } },
			duration,
			easing
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
					duration,
					easing
				});
			
			await animationPromise(
				{
					$elements: $cardbacks,
					desiredProperties: centerOfContainer,
					duration,
					easing
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
		await animationPromise(
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
	collapseInfectionDiscardPile();
	enableInfectionDiscardHoverEvents();

	return sleep(delay);
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
		
		await animationPromise(
			{
				$elements,
				desiredProperties: centerOfContainer,
				duration: getDuration(500),
				easing
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
			
			await animationPromise(
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
	const player = getPlayerWithTooManyCards(),
		$discardPrompt = new DiscardPrompt(
			{
				eventTypeCode: eventTypes.discard.code,
				buttonText: "CONFIRM",
				cardKeys: player.cardKeys,
				numDiscardsRequired: player.cardKeys.length - gameData.HAND_LIMIT,
				onConfirm: confirmDiscards
			});
	
	// Event cards can be played instead of discarding.
	enableEventCards();

	const $container = $("#discardStepContainer").empty();
	$container.siblings(".interface").addClass("hidden");

	$container.append($discardPrompt)
		.slideDown(function() { $container.removeClass("hidden").removeAttr("style") });
}

// Returns the player who has more cards than the hand limit.
// It's impossible for there to be more than one player with too many cards at one time
// because two players never receive cards simultaneously.
function getPlayerWithTooManyCards()
{
	const { players, HAND_LIMIT } = gameData;
	let player;
	
	for (let rID in players)
	{
		player = players[rID];
		
		if (player.cardKeys.length > HAND_LIMIT)
			return player;
	}
}

async function confirmDiscards(discardKeys)
{
	const player = getPlayerWithTooManyCards(),
		eventType = eventTypes.discard;
	
	removeDiscardPrompt();

	await Promise.all(
		[
			requestAction(eventType,
				{
					discardingRole: player.rID,
					cardKeys: discardKeys
				}),
			movePlayerCardsToDiscards({ player, cardKeys: discardKeys })
		]);

	player.removeCardsFromHand(discardKeys);
	appendEventHistoryIconOfType(eventType);
	
	proceed();
}

function removeDiscardPrompt()
{
	const $discardStepContainer = $("#discardStepContainer");

	$discardStepContainer.find("btnConfirm").off("click");

	$discardStepContainer.slideUp(function()
	{
		$discardStepContainer.children(".discardPrompt").remove();
	});
}

function movePlayerCardsToDiscards({ player, cardKeys, $card } = {})
{
	return new Promise(async (resolve) =>
	{
		if (player)
		{
			await player.panel.expandIfCollapsed();
			await sleep(getDuration("shortInterval"));
		}
		
		let completionInterval = getDuration("discardPlayerCard");
		if (player && Array.isArray(cardKeys))
		{
			for (let cardKey of cardKeys)
				await animateDiscardPlayerCard(player.panel.getCard(cardKey));
			
			completionInterval *= (1 - gameData.playerCardAnimationInterval);
		}
		else if ($card.length === 1)
		{
			animateDiscardPlayerCard($card);

			// Increase completionInterval to ensure that the animation finishes completely before the Promise is resolved.
			completionInterval += 50;
		}

		if (player)
			player.panel.checkOcclusion();
		
		await sleep(completionInterval);
		resolve();
	});
}

function animateDiscardPlayerCard($card, { removingContingencyCard } = {})
{
	const $container = removingContingencyCard ? $("#removedPlayerCards") : $("#playerDiscardContainer"),
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
				
				bindEventCardHoverEvents($container);
			});
	
	return sleep(getDuration("discardPlayerCard") * gameData.playerCardAnimationInterval);
}

function isEpidemicKey(cardKey)
{
	return cardKey.substring(0,3) === "epi";
}

function newInfectionCardTemplate()
{
	const fontSize = getDimension("infCardFont"),
		cityNameTop = getDimension("infCardNameTop");
	
	return $(`<div class='infectionCard template'>
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
	
	const $container = $("#infectCitiesContainer"),
		$btn = $container.find(".button").addClass("hidden"),
		{ infectionRate } = gameData,
		{ infectCity } = eventTypes;
	
	let events,
		card,
		infectionCount = 0;
	
	$container.children(".infectionCard").remove();
	// Create infection card template elements
	for (let i = 0; i < infectionRate; i++)
		$btn.before(newInfectionCardTemplate());
		
	positionInfectionPanelComponents();

	// If the game is resumed during the infection step,
	// there may already have been one or more infection cards drawn this turn.
	infectionCount += loadInfCardsDrawnThisTurn();

	$container.removeClass("hidden");

	// Prompt and perform infections until the infection rate is reached
	let eventCardsCanBePlayed;
	while (infectionCount < infectionRate)
	{
		// Event cards cannot be played while resolving infection cards,
		// but they can be played before, between, or after resolving infection cards.
		eventCardsCanBePlayed = anyPlayerHasAnyEventCard();
		if (eventCardsCanBePlayed || eventHistory.lastEventCanBeUndone())
		{
			if (eventCardsCanBePlayed || infectionRate - infectionCount < 2)
				$btn.html("INFECT CITY");
			else
				$btn.html(`INFECT ${infectionRate - infectionCount} CITIES`);
			
			enableEventCards();
			oscillateButtonBackgroundColor($btn.removeClass("hidden"));
			await buttonClickPromise($btn);
			$btn.addClass("hidden");
		}
		else
			await sleep(500);
		
		// Infection card is being drawn and resolved.
		disableEventCards();
		eventHistory.disableUndo();

		events = await requestAction(infectCity);
		
		card = events.shift();
		card.infectionIndex = infectionCount;
		
		await dealFaceDownInfCard(card);
		await revealInfectionCard(card);
		
		const { color } = card.city;
		// if any events are left after shifting the first, an outbreak occured.
		if (events.length)
		{
			appendEventHistoryIconOfType(infectCity);

			await resolveOutbreaks(events);
			if (tooManyOutbreaksOccured())
				return outbreakDefeatAnimation();
			
			if (diseaseCubeLimitExceeded(color))
				return diseaseCubeDefeatAnimation(color);
		}
		else
		{
			if (card.preventionCode === infectionPreventionCodes.notPrevented)
			{
				const interval = getDuration("shortInterval");

				await sleep(interval);
				await placeDiseaseCubes(card);
				await sleep(interval);
				appendEventHistoryIconOfType(infectCity);

				if (diseaseCubeLimitExceeded(color))
					return diseaseCubeDefeatAnimation(color);
			}
			else
			{
				await infectionPreventionAnimation(card);
				appendEventHistoryIconOfType(infectCity);
			}
		}

		infectionCount++;
	}

	finishInfectionStep();
}

async function infectionPreventionAnimation({ preventionCode, cityKey })
{
	const { quarantine, medicAutoTreat, eradicated } = infectionPreventionCodes;

	if (preventionCode === quarantine)
		return quarantineAnimation();
	else if (preventionCode === medicAutoTreat)
		return medicAutoTreatAnimation(cityKey);
	else if (preventionCode === eradicated)
		return sleep(0);
}

function diseaseIsEradicated(diseaseColor)
{
	return gameData.cures[diseaseColor] === "eradicated";
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
	
	const circleRadius = gameData.cityWidth * 3,
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
	
	$cureMarker.on("load", function() { positionAutoTreatCircleComponents($circle, $cureMarker) });
	
	animationPromise(
	{
		$elements: $cureMarker,
		desiredProperties: { opacity: 0.8 },
		duration: duration
	});

	await animationPromise(
	{
		$elements: $circle,
		desiredProperties: { opacity: 0.5 },
		duration: duration
	});

	await sleep(getDuration("longInterval"));

	const $elements = $circle.add($cureMarker)
	await animationPromise(
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
	
	$cureMarker.on("load", function() { positionAutoTreatCircleComponents($circle, $cureMarker) });
	
	animationPromise(
	{
		$elements: $cureMarker,
		desiredProperties: { opacity: 0.8 },
		duration: fadeInMs || 500
	});

	return animationPromise(
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

		await animationPromise(
		{
			$elements: $elements,
			desiredProperties: { opacity: 0 },
			duration: 500
		});

		$elements.remove();

		resolve();
	});
}

async function quarantineAnimation()
{
	await showQuarantineArea(750);
	await sleep(1500);
	
	return hideQuarantineArea();
}

function showQuarantineArea(duration)
{
	return animationPromise(
	{
		$elements: $("#quarantineArea"),
		initialProperties: {
			width: gameData.boardWidth,
			height: gameData.boardHeight,
			opacity: 0,
			clipPath: getQuarantineAreaClipPath()
		},
		desiredProperties: { opacity: 0.4 },
		duration: duration || 500
	});
}

function hideQuarantineArea()
{
	return animationPromise(
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
		cityWidthAdj = getDimension("cityWidth", { getFactor: true }) * 120,
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
			$card;
		for (let i = 0; i < numCardsDrawnThisTurn; i++)
		{
			city = getCity(infectionEvents[i].cityKey);
			$card = $infectionContainer.find(".infectionCard").eq(i);
			
			$card.attr("data-key", city.key)
				.click(function() { pinpointCityFromCard($card) })
				.removeClass("template")
				.find(".infectionCardImg")
				.attr("src", `images/cards/infectionCard_${city.color}.png`)
				.siblings(".cityName")
				.html(city.name.toUpperCase())
				.siblings(".veil").remove();
			
			setInfectionCardTitleAttribute($card, city);
		}
	}

	return numCardsDrawnThisTurn;
}

async function finishInfectionStep()
{
	const $container = getInfectionContainer();
	
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

function discardInfectionCard($card, duration)
{
	const $discardPile = $("#infectionDiscardContainer"),
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
						.css(getInfectionCardTextStyle($discardPile));
						
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
		
		$(".groupInfRate.hidden").css("margin-left", gameData.panelWidth);
		makeElementsSquare(".groupInfRate > div");
		$(".groupInfRate").not(".hidden")
			.each(function()
			{
				$(this).css("margin-left", computeGroupInfRateMargin($(this)));
			});
		
		// determine and evenly distribute the available height for .infGroup elements
		const $infGroups = $(".infGroup"),
			availableHeight = gameData.boardHeight - $("#setupProcedureContainer").height();
			
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
		appendEventHistoryIconOfType(eventTypes.initialInfection);
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
		const initialInfections = eventHistory.events.filter(e => e instanceof InitialInfection)[0]
			.infections.map((inf, i) => { return { ...inf, infectionIndex: i } }),
			GROUP_SIZE = 3; // 3 groups of 3 infection cards
		let group;

		while (initialInfections.length)
		{
			await showNextGroupInfRate();
			
			group = initialInfections.splice(0, GROUP_SIZE);
			await dealFaceDownInfGroup(group);
			
			for (let card of group)
			{
				await sleep(getDuration("shortInterval"));
				await revealInfectionCard(card);
				await placeDiseaseCubes(card);
			}
		}
	
		gameData.fastForwarding = false;
		executePendingClusters();
		resolve();
	});
}

function computeGroupInfRateMargin($groupInfRate)
{
	return (gameData.panelWidth - getDimension("groupInfRateCubeWidth") * $groupInfRate.children().length) / 2;
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
		easings.revealCard,
		() => resolve());
	});
}

async function dealFaceDownInfGroup(group)
{
	for (let card of group)
	{
		dealFaceDownInfCard(card);
		await sleep(getDuration("dealCard") * 0.65);
	}
	return sleep(getDuration("dealCard") * 0.35);
}

function dealFaceDownInfCard({ infectionIndex }, { dealFromBottomOfDeck } = {})
{
	decrementInfectionDeckSize();
	
	return new Promise(resolve =>
	{
		const $container = getInfectionContainer().find(".infectionCard").eq(infectionIndex)
			.children(".infectionCardContents").first();
		
		const containerTop = $container.offset().top,
			$cardback = $(`<img class='drawnInfectionCard' data-index='${infectionIndex}'
								src='images/cards/infectionCardback.png'
								alt='Infection Card' />`),
			{ infectionDeckOffset, boardWidth } = gameData;
		
		$cardback.appendTo(dealFromBottomOfDeck ? "#boardContainer" : "body");

		// align the drawn card with the deck, and animate it to where it will be revealed
		$cardback
			.width($("#infectionDeckContainer img").width())
			.offset(
			{
				left: infectionDeckOffset.left,
				top: infectionDeckOffset.top
			})
			.css("z-index", dealFromBottomOfDeck ? 1 : 5)
			.animate(
			{
				width: getDimension("diseaseIcon"),
				left: boardWidth + 1,
				top: containerTop
			},
			getDuration("dealCard"),
			easings.dealCard,
			function()
			{
				if (dealFromBottomOfDeck)
					$cardback.appendTo("#epidemicContainer");
				
				resolve();
			});
	});
}

function positionFaceDownInfectionCards()
{
	const $cardbacks = $(".drawnInfectionCard");

	if (!$cardbacks.length)
		return false;

	const width = getDimension("diseaseIcon"),
		left = gameData.boardWidth + 1;
	
	let $this, $container;
	$cardbacks.each(function()
	{
		$this = $(this);
		$container = getInfectionContainer().find(".infectionCard").eq($this.attr("data-index"));

		$this.offset({
			left,
			top: $container.offset().top
		}).width(width);
	});

	makeElementsSquare($cardbacks);
}

async function revealInfectionCard({ city, cityKey, infectionIndex }, { forecasting } = {})
{
	return new Promise(resolve =>
	{
		const $card = getInfectionContainer().find(".infectionCard").eq(infectionIndex),
			diseaseColorIsEradicated = diseaseIsEradicated(city.color),
			$veil = $card.find(".veil"),
			$cardback = forecasting ? $(".drawnInfectionCard").eq(infectionIndex) : $(".drawnInfectionCard").first();
		
		// The first $cardback is removed if not forecasting because each one is removed after fading out.
		$cardback.fadeOut(getDuration("revealInfCard"), function() { $(this).remove() });
		
		$card.attr("data-key", cityKey)
			.click(function() { pinpointCityFromCard($card) })
			.find(".infectionCardImg")
			.attr("src", `images/cards/infectionCard_${city.color}.png`)
			.siblings(".cityName")
			.html(city.name.toUpperCase());
		
		setInfectionCardTitleAttribute($card, city);
		
		$veil.animate({ left: "+=" + getDimension("diseaseIcon", { compliment: true }) },
			getDuration("revealInfCard"),
			easings.revealCard,
			() =>
			{
				$veil.remove();
				$card.removeClass("template");

				if (!gameData.fastForwarding && !diseaseColorIsEradicated && !forecasting)
					pinpointCity(cityKey, { pinpointClass: `${city.color}Border` });
				
				resolve();
			});
	});
}

function setInfectionCardTitleAttribute($card, city)
{
	$card.attr("title", `Infection card
Click to locate ${city.name}`);
}

function placeDiseaseCubes({ cityKey, numCubes = 1, diseaseColor })
{
	return new Promise(async resolve =>
	{
		const city = getCity(cityKey),
			color = diseaseColor || city.color,
			cubeSupplyOffset = $(`#${color}SupplyCube`).offset();
		
		for (let i = numCubes; i > 0; i--)
		{
			updateCubeSupplyCount(color, { addend: -1 });
			
			placeDiseaseCube(city, color, cubeSupplyOffset);
			await sleep(getDuration("cubePlacement") * 0.45);
		}
		
		// let the last cube animation finish completely before clustering the city
		await sleep(getDuration("cubePlacement") * 0.6);
		
		if (gameData.fastForwarding)
			queueCluster(cityKey);
		
		resolve(false);
	});
}

function placeDiseaseCube(city, diseaseColor, cubeSupplyOffset)
{
	return new Promise(async resolve =>
	{
		const $cube = appendNewCubeToBoard(diseaseColor, city.key, { prepareAnimation: true })
			.offset(cubeSupplyOffset);
		
		city.incrementCubeCount(gameData.diseaseCubeSupplies);

		if (!gameData.fastForwarding)
		{
			supplyCubeBounceEffect(diseaseColor);
			await city.clusterDiseaseCubes({ animate: true });
			$cube.removeClass("infecting");
		}
		
		resolve();
	});
}

function newCityButton(city)
{
	const $btn = $(`<div class='button actionPromptOption' data-key='${city.key}'>${city.name}</div>`);
	
	$btn.hover(function() { showTravelPathArrow({ destination: city }) },
	function() { hideTravelPathArrow() })
	.click(function() { $(this).off("mousenter mouseleave") }); // Prevents the travel path arrow from being hidden.

	return $btn;
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
	await player.panel.expandIfCollapsed();
	
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
	const newDiseaseStatus = eradicationEvents.length && !autoTreatEvents.length ? "eradicated" : "cured",
		{ cures, gameEndCause } = gameData;
	
	cures[diseaseColor] = newDiseaseStatus;
	cures.remaining--;
	
	await animateDiscoverCure(diseaseColor, newDiseaseStatus);

	if (gameEndCause)
		return endGame();

	if (autoTreatEvents.length)
		await animateAutoTreatDiseaseEvents([ ...autoTreatEvents, ...eradicationEvents ]);

	proceed();
}

async function outOfPlayerCardsDefeatAnimation($cardDrawContainer)
{
	const $playerDeckContainer = $("#playerDeckContainer"),
		$outOfCardsMsg = $("<h2>Out of cards!</h2>"),
		numFlashes = 10,
		flashIntervalMs = 150,
		endOnStrobeState = true;
	
	$cardDrawContainer.append($outOfCardsMsg)
		.removeClass("hidden")
		.removeAttr("style");

	await Promise.all([
		propertyStrobe($playerDeckContainer,
		{
			initialState: { backgroundColor: $playerDeckContainer.css("background-color") },
			strobeState: { backgroundColor: "#8a181a" },
			numFlashes,
			flashIntervalMs,
			endOnStrobeState
		}),
		propertyStrobe($outOfCardsMsg,
		{
			initialState: { color: "#8a181a" },
			strobeState: { color: "#fff" },
			numFlashes,
			flashIntervalMs,
			endOnStrobeState
		})
	]);
	
	endGame();
}

function diseaseCubeLimitExceeded(color)
{
	return gameData.gameEndCause === "cubes" && gameData.diseaseCubeSupplies[color] < 0;
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
	const $curtain = $("#curtain"),
		hidden = "hidden",
		{ gameEndCause, boardHeight } = gameData;

	$curtain.children("p").addClass(hidden);

	let selectorToShow;
	if (gameEndCause === "victory")
		selectorToShow = "#victory";
	else
	{
		selectorToShow = `#defeat, .${gameEndCause}Defeat`;
		$curtain.addClass("epidemic");
	}

	$curtain.find(selectorToShow).removeClass(hidden)
		.first().css("margin-top", boardHeight / 3);
	
	await animationPromise(
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
		const $cureMarker = newCureMarker(diseaseColor, "cured", { isForReveal: true }),
			{ cures } = gameData,
			{ discoverACure, eradication } = eventTypes;

		$cureMarker.css("opacity", 0.1)
			.animate({ opacity: 1 }, getDuration("specialEventBannerReveal") * 8, "easeOutQuad");

		let description = "";
		if (cures.remaining > 0)
			description = `Discover ${cures.remaining} more to win the game.`;

		await specialEventAlert(
		{
			title: "DISCOVERED A CURE!",
			description,
			eventClass: diseaseColor
		});
		appendEventHistoryIconOfType(discoverACure);

		if (diseaseStatus === "eradicated")
		{
			flipCureMarkerToEradicated(diseaseColor, $cureMarker);
			description = `No new disease cubes of this color will be placed on the board.`;
			await specialEventAlert(
			{
				title: "DISEASE ERADICATED!",
				description,
				eventClass: diseaseColor
			});
			appendEventHistoryIconOfType(eradication);
		}

		await animationPromise(
		{
			$elements: $cureMarker,
			initialProperties: {
				...$cureMarker.offset(),
				...{ width: $cureMarker.width() }
			},
			desiredProperties: getCureMarkerDesiredProperties(diseaseColor),
			duration: getDuration("cureMarkerAnimation"),
			easing: "easeInOutQuart"
		});

		$cureMarker.removeClass("specialEventImg").removeAttr("style")
			.addClass("cureMarker")
			.attr("id", `cureMarker${diseaseColor.toUpperCase()}`);
		
		positionCureMarkers();
		
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
	const $discardsContainer = $("#playerDiscardContainer"),
		$discardPileTitle =  $discardsContainer.children(".title").first(),
		$removedCardsTitle = $discardsContainer.children("#removedPlayerCards").children(".title").first(),
		{ players, removedEventCardKeys, gameIsResuming } = gameData;
	
	playerDeckImgManager.setMaxCardCount(getInitialPlayerDeckSize({ includeEpidemics: true }));

	if (gameIsResuming)
		playerDeckImgManager.decrementCardCount(playerCards.length);
	
	playerDeckImgManager.setImage();

	let player,
		$card;

	for (let card of playerCards)
	{
		$card = $(newPlayerCard(getCityOrEventCardObject(card.key)));

		if (card.pileID in players)
		{
			player = players[card.pileID];
			player.addCardKeysToHand(card.key);
			player.panel.appendCard($card);
		}
		else if (card.pile === "discard")
			$card.insertAfter($discardPileTitle);
		else if (card.pile === "removed")
		{
			removedEventCardKeys.push(card.key);
			$card.insertAfter($removedCardsTitle);
		}
		else if (card.pile === "contingency")
		{
			player = getPlayer("Contingency Planner");

			$card.addClass("contingency")
				.appendTo(player.panel.$panel.find(".role").addClass("storingEventCard"));
			
			player.contingencyKey = card.key;
		}
	}
	
	bindCityLocatorClickEvents();
	bindEpidemicCardHoverEvents($discardsContainer);
	flagRemovedEventCardEvents();
}

// When an event card is played 'from contingency' (the Contingency Planner stored the event card and then played it),
// it is removed from the game rather than simply discarded.
// This function creates arrays which will exist briefly while the game is being resumed (page was refreshed while the game is in progress).
// These arrays facilitate the efficient flagging of 'event card Events' which removed their associated event card from the game.
function prepareToFlagRemovedEventCardEvents()
{
	gameData.eventCardEvents = [];
	gameData.removedEventCardKeys = [];
}
function queueEventCardRemovalCheck(event)
{
	if (Array.isArray(gameData.eventCardEvents))
		gameData.eventCardEvents.push(event);
}
function flagRemovedEventCardEvents()
{
	const { eventCardEvents, removedEventCardKeys } = gameData;

	// Only the Contingency Planner can cause event cards to be removed from the game.
	if (eventCardEvents && getPlayer("Contingency Planner"))
	{
		let event, cardKey;
		for (let i = eventCardEvents.length - 1; i >= 0; i--)
		{
			event = eventCardEvents[i];
			cardKey = event.eventCard.key;
	
			// Was the event card removed from the game?
			if (removedEventCardKeys.includes(cardKey))
			{
				event.cardWasRemoved = true;
				removedEventCardKeys.splice(removedEventCardKeys.indexOf(cardKey), 1);
	
				// Finished flagging events?
				if (removedEventCardKeys.length === 0)
					break;
			}
		}
	}

	// These are no longer needed after this function call.
	delete gameData.removedEventCardKeys;
	delete gameData.eventCardEvents;
}

function loadInfectionDiscards(cards)
{
	if (typeof cards == "undefined")
		return false;
	
	gameData.infectionDeckSize -= cards.length;
	
	const $discardPile = $("#infectionDiscardContainer"),
		$discardPileTitle = $discardPile.children(".title").first(),
		$removedCardsContainer = $discardPile.children("#removedInfectionCards"),
		infectionKeysDrawnThisTurn = getInfectCityEventsOfTurn().map(event => event.cityKey);
	
	let card, city, $card;
	for (let i = 0; i < cards.length; i++)
	{
		card = cards[i];
		city = getCity(card.key);

		if (infectionKeysDrawnThisTurn.includes(city.key))
			continue;

		$card = $(`<div class='infectionCard' data-key='${city.key}'>
					<div class='infectionCardContents'>
						<img	class='infectionCardImg'
								src='images/cards/infectionCard_${city.color}.png'/>
						<p class='cityName'>${city.name.toUpperCase()}</p>
					</div>
				</div>`);
		
		setInfectionCardTitleAttribute($card, city);
		
		if (card.pile === "discard")
			$discardPileTitle.after($card);
		else if (card.pile === "removed")
			$removedCardsContainer.append($card);
	}

	if ($removedCardsContainer.children(".infectionCard").length)
		$removedCardsContainer.removeClass("hidden");
	
	bindCityLocatorClickEvents({ $containingElement: $discardPile });
}

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
		numEpsResolvedThisTurn = getEventsOfTurn(epidemicIntensify).length;

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
function getEventsOfTurn(desiredEventTypes, { turnNum } = {})
{
	const { events } = eventHistory,
		eventsOfTurn = [];
	
	turnNum = turnNum || gameData.turnNum;
	desiredEventTypes = ensureIsArray(desiredEventTypes);
	
	for (let i = events.length - 1; i >= 0; i--)
	{
		event = events[i];
		
		// Skip events queued for next turn.
		if (event.turnNum > turnNum)
			continue;

		if (event.turnNum < turnNum)
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
		gameData.nextStep = "action 1";
	}

	delete gamestate.stepName;
	Object.assign(gameData, gamestate);
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
			gameData.cures[diseaseColor] = status;
			gameData.cures.remaining--;

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
		2: events
	} = await Promise.all([retrieveGameData(), retrievePlayerCards(), retrieveEventHistory()])
		.catch(function(err)
		{
			console.error(err);
			$("#curtain").children("p").first().html("An error occured: " + err);
		});
	
	if (gamestate.gameIsResuming)
		prepareToFlagRemovedEventCardEvents();
	
	await parseEvents(events);
	loadGamestate(gamestate);
	loadCityStates(cities);

	gameData.startingHandPopulations = startingHandPopulations;
	instantiatePlayers(players);
	attachPlayersToEvents(eventHistory.events);
	
	addToEventHistoryQueue(eventHistory.events);
	if (gameData.gameIsResuming)
		appendEventHistoryIcons();
	
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
	
	managePlayerPanelOcclusion();

	await removeCurtain();

	instantiateTooltips();
	bindEventCardHoverEvents();
	enablePlayerDiscardHoverEvents();
	
	if (currentStepIs("setup"))
	{
		gameData.allRoles = allRoles;
		animateNewGameSetup();
	}
	else
	{
		bindPlayerDeckHoverEvents();
		
		if (forecastInProgress())
		{
			gameData.currentStep.indicate();
			indicatePromptingEventCard();
		}
		else
			proceed();
	}
}

async function animateRoleDetermination()
{
	const $container = $("#roleSetupContainer"),
		slotMachines = [],
		{ players } = gameData;

	$container.parent().removeClass("hidden");

	let player, $roleContainer;
	for (let rID in players)
	{
		player = players[rID];
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
			if (gameData.skipping)
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
		
		const roleOptions = this.randomizeRoleOrder([...gameData.allRoles], player.role);
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
				duration = this.msPerRevolution / this.numOptions;

			this.$optionGroups.first()
				.animate({ marginTop: "+=" + self.optionHeight + "px" },
					duration,
					"linear",
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
		
		if (gameData.skipping)
			$role.addClass("hidden");
		
		$role.appendTo(this.$container.parent())
			.offset(roleOffset)
			.addClass("role")
			.removeClass("hidden");

		await animationPromise(
		{
			$elements: this.$slotMachine,
			desiredProperties: { opacity: 0 }
		});

		await animationPromise(
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
	if (gameData.skippingSetupStep)
	{
		gameData.skipping = false;
		gameData.skippingSetupStep = false;

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
	gameData.skipping = true;
	gameData.skippingSetupStep = true;
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
	gameData.skipping = true;
	gameData.skippingSetup = true;
	gameData.skippingSetupStep = false; // not skipping an individual setup step, but the whole setup procedure.

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

	await animationPromise(
	{
		$elements: $setupProcedureContainer,
		desiredProperties: { height: 0 },
		duration: getDuration(400)
	});

	$setupProcedureContainer.add("#setupContainer").remove();

	const $containersToShow = $("#turnProcedureContainer, #indicatorContainer");
	$containersToShow.slideDown(getDuration(400), function()
	{
		$containersToShow.removeClass("hidden").removeAttr("style");
		bindRoleCardHoverEvents();
		bindPawnEvents();
		gameData.currentStep.next();
		$("#actionsContainer").slideDown(getDuration(400), function()
		{
			$(this).removeClass("hidden").removeAttr("style");
			if (gameData.skippingSetup) doneSkippingSetup();
		});
	});
}

function doneSkippingSetup()
{
	gameData.skipping = false;
	gameData.skippingSetup = false;
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
	
		await animationPromise(
		{
			$elements: $container.children("h4"),
			desiredProperties: { opacity: 0 },
			duration: getDuration("longInterval")
		});
	
		const $divs = $container.children("div"),
			pileSize = Math.ceil(playerDeckImgManager.maxCardCount / gameData.numEpidemics),
			deckProperties = playerDeckImgManager.getProperties();
	
		await shuffleEpidemicsIntoPiles($divs);
	
		playerDeckImgManager.setCardCount(0);
		for (let i = $divs.length - 1; i >= 0; i--)
		{
			await placePileOntoPlayerDeck($divs.eq(i), deckProperties);
			playerDeckImgManager.incrementCardCount(pileSize).setImage();
		}

		bindPlayerDeckHoverEvents();
	
		$container.addClass("hidden");
		finishedSetupStep();
		resolve();
	});
}

async function showEpidemicsToShuffle($container)
{
	const { numEpidemics } = gameData;

	$container.children("h4").first()
		.children(".difficulty").html(getDifficultyName())
		.siblings(".numEpidemics").html(numEpidemics);
	
	let $div;
	for (let i = 0; i < numEpidemics; i++)
	{
		$div = $("<div></div>").appendTo($container);
		newFacedownPlayerCard().appendTo($div);
		$(newPlayerCard("epidemic")).appendTo($div);
	}
	
	const $cardbacks = $container.find("img"),
		$epidemics = $container.find(".epidemic"),
		epidemicWidth = $epidemics.first().width();
	
	$epidemics.addClass("hidden");

	await animationPromise(
	{
		$elements: $cardbacks,
		initialProperties: { opacity: 0 },
		desiredProperties: { opacity: 1 },
		duration: getDuration("revealCard")
	});
	await sleep(getDuration("mediumInterval"));
	$cardbacks.remove();
	
	return animationPromise(
	{
		$elements: $epidemics.removeClass("hidden"),
		initialProperties: { width: 0 },
		desiredProperties: { width: epidemicWidth },
		duration: getDuration("revealCard"),
		easing: easings.revealCard
	});
}

async function dividePlayerDeckIntoEqualPiles($container)
{
	const numCardsToDeal = getInitialPlayerDeckSize(),
		$divs = $container.children("div"),
		$deck = $("#playerDeckContainer img"),
		initialProperties = $deck.offset(),
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
		
		animationPromise(
		{
			$elements: $cardback.appendTo($divs.eq(divIdx)),
			initialProperties,
			desiredProperties: desiredProps[divIdx],
			duration: getDuration("dealCard"),
			easing: easings.dealCard
		});

		if (i === numCardsToDeal - 1) // deck is empty
			playerDeckImgManager.setImage(false);

		await sleep(getDuration("dealCard") / 6);

		if (++divIdx === $divs.length)
			divIdx = 0;
	}
}

function getInitialPlayerDeckSize({ includeEpidemics } = {})
{
	let deckSize = parseInt(Object.keys(cities).length) + parseInt(Object.keys(eventCards).length);

	if (includeEpidemics)
		deckSize += parseInt(gameData.numEpidemics);
	
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
			easing = easings.dealCard;
		
		let $cardbacks = $div.children("img");

		$div.height($div.height());

		await animationPromise(
		{
			$elements: $epidemic,
			desiredProperties: { width: 0 },
			duration: getDuration("dealCard"),
			easing
		});

		const $epidemicCardback = newFacedownPlayerCard();
		$epidemic.replaceWith($epidemicCardback);

		await animationPromise(
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

function placePileOntoPlayerDeck($pileContainer, deckProperties)
{
	return new Promise(async resolve =>
	{
		const $pile = $pileContainer.children("img");

		await animationPromise(
		{
			$elements: $pile,
			desiredProperties: deckProperties,
			duration: getDuration("dealCard"), 
			easing: easings.dealCard
		});

		$pile.remove();
		resolve();
	});
}

async function placeResearchStationInAtlanta()
{
	return new Promise(async resolve =>
	{
		const ATLANTA_KEY = "atla",
			$cdcBlurb = $("#setupContainer").children("h4");

		pinpointCity(ATLANTA_KEY);
		await cities[ATLANTA_KEY].buildResearchStation(promptAction, { animate: true });
		await sleep(getDuration("longInterval"));
		
		await animationPromise(
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
			$cdcBlurb = $(`<h4>Atlanta is home to the CDC, the Center for Disease Control and Prevention.</h4>`),
			{ players, turnOrder, pawnHeight, pawnWidth } = gameData;
		
		let player,
			$pawn,
			$panel,
			pawnOffsetInAtlanta,
			initialOffset;
		
		await animationPromise(
		{
			$elements: $cdcBlurb.prependTo("#setupContainer"),
			initialProperties: { opacity: 0 },
			desiredProperties: { opacity: 1 },
			duration: getDuration(400)
		});
		pinpointCity(ATLANTA_KEY);
	
		for (let rID in players)
		{
			player = players[rID];
			appendPawnToBoard(player);
			queueCluster(player.cityKey);
		}
		executePendingClusters();
		
		for (let rID of turnOrder)
		{
			player = players[rID];
			$pawn = player.$pawn;
			$panel = player.$panel;
			
			pawnOffsetInAtlanta = $pawn.removeClass("hidden").offset();
	
			initialOffset = $panel.offset();
			initialOffset.top -= pawnHeight;
			initialOffset.left += panelWidth / 2;
			initialOffset.left -= pawnWidth / 2;
	
			await animationPromise(
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
		gameData.turnOrder = await showTurnOrder();
		appendEventHistoryIconOfType(eventTypes.startingHands);
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

	for (let rID of gameData.turnOrder)
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
	
	await animationPromise(
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
			
			await animationPromise(
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
	const $containers = $(".roleContainer");
	let $cards = $containers.children(".playerCard");
	const $aCard = $cards.first(),
		initialCardHeight = $aCard.height();

	let $card;
	for (let { key, population } of gameData.startingHandPopulations)
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

	return animationPromise(
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

	let startingHandPopulations = [...gameData.startingHandPopulations],
		highestPop,
		cardWithHighestPop,
		city;
	
	while (startingHandPopulations.length)
	{
		highestPop = 0;
		for (let card of startingHandPopulations)
		{
			city = getCity(card.key);
			if (city)
				city.population = card.population;

			if (Number(card.population) >= highestPop)
			{
				highestPop = Number(card.population);
				cardWithHighestPop = card;
			}
		}
		
		turnOrderCards.push(cardWithHighestPop);
		startingHandPopulations = startingHandPopulations.filter(c => c.role != cardWithHighestPop.role);
	}

	return turnOrderCards;
}

function animateInitialDeal()
{
	return new Promise(async resolve =>
	{
		const startingHandsEvent = getEventsOfTurn(eventTypes.startingHands)[0],
			$roleContainers = $("#roleSetupContainer").find(".roleContainer");
			
		await dealFaceDownStartingHands(startingHandsEvent, $roleContainers);
		await sleep(getDuration("mediumInterval"));
		await revealStartingHands(startingHandsEvent, $roleContainers);
	
		await sleep(getDuration("longInterval"));
		finishedSetupStep();
		resolve();
	});
}

async function dealFaceDownStartingHands(startingHandsEvent, $roleContainers)
{
	const startingHandSize = startingHandsEvent.hands[0].cards.length,
		numCardsToDeal = startingHandsEvent.hands.length * startingHandSize,
		deckProperties = playerDeckImgManager.getProperties(),
		finalCardbackWidth = 20,
		interval = getDuration("dealCard") * 0.4;
	
	await makeRoomForStartingHands(startingHandSize, $roleContainers);

	let cardsDealt = 0,
		roleIndex = 0,
		zIndex = 10 + numCardsToDeal;
	while (cardsDealt < numCardsToDeal)
	{
		dealFaceDownPlayerCard($roleContainers.eq(roleIndex), deckProperties, { finalCardbackWidth, zIndex });
		await sleep(getDuration(interval));
		
		cardsDealt++;
		if (roleIndex === $roleContainers.length - 1)
			roleIndex = 0;
		else
			roleIndex++;
		
		zIndex--;
	}
}

async function revealStartingHands(startingHandsEvent, $roleContainers)
{
	$roleContainers.children(".playerCard").remove();
	$(".drawnPlayerCard").remove();
	
	let $container;
	for (let hand of startingHandsEvent.hands)
	{
		$container = $roleContainers.filter(`[data-role='${hand.role}']`);

		for (let card of hand.cards)
			revealPlayerCard(card.key, $container);
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
	
	return animationPromise(
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

function expandInfectionDiscardPile({ showRemovedCardsContainer } = {})
{
	return new Promise(resolve =>
		{
			const $container = $("#infectionDiscardContainer"),
				panelHeight = $("#topPanel").height(),
				maxHeight = gameData.boardHeight - panelHeight - 5;

			$container.stop().css("height", "auto");
			positionRemovedInfectionCardsContainer();

			if (eventTypeIsBeingPrompted(eventTypes.resilientPopulation))
				hideResilientPopulationArrow();

			if (showRemovedCardsContainer)
			{
				const $removedCardsContainer = $("#removedInfectionCards");
				$removedCardsContainer.removeClass("hidden");

				if (!$removedCardsContainer.children(".infectionCard").length)
					$removedCardsContainer.height($removedCardsContainer.height() * 2.5);
			}

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
				
				const desiredProperties = { height: expandedHeight + 2 };
				if (showRemovedCardsContainer)
					desiredProperties.scrollHeight = document.getElementById($container.attr("id")).scrollHeight;

				$container
					.css({ height: panelHeight })
					.animate(desiredProperties,
					getDuration("discardPileExpand"),
					function() { resolve() });
			}
		});
}
function collapseInfectionDiscardPile()
{
	return new Promise(resolve =>
		{
			positionRemovedInfectionCardsContainer();
			
			$("#infectionDiscardContainer")
				.stop()
				.css({ overflowY: "hidden" })
				.animate({
					scrollTop: 0,
					height: $("#topPanel").height()
				},
				getDuration("discardPileCollapse"),
				function()
				{
					if (eventTypeIsBeingPrompted(eventTypes.resilientPopulation))
						showResilientPopulationArrow();
					
					resolve();
				});
		});
}

function enableInfectionDiscardHoverEvents()
{
	$("#infectionDiscardContainer")
		.unbind("mouseenter mouseleave")
		.hover(function() { expandInfectionDiscardPile() },
		function() { collapseInfectionDiscardPile() });
}
enableInfectionDiscardHoverEvents();
function disableInfectionDiscardHoverEvents() { $("#infectionDiscardContainer").unbind("mouseenter mouseleave") }

function enablePlayerDiscardHoverEvents()
{
	$("#playerDiscardContainer").off("mouseenter mouseleave")
		.hover(function() { expandPlayerDiscardPile() }, function() { collapsePlayerDiscardPile() });
}

function disablePlayerDiscardHoverEvents()
{
	$("#playerDiscardContainer").off("mouseenter mouseleave");
}

function expandPlayerDiscardPile({ showRemovedCardsContainer } = {})
{
	return new Promise(resolve =>
	{
		const $discardPile = $("#playerDiscardContainer"),
			$removedCardsContainer = $discardPile.children("#removedPlayerCards"),
			{ topPanelHeight, boardHeight } = gameData,
			maxHeight = boardHeight - topPanelHeight;
		
		unbindEventCardHoverEvents($discardPile);
		unbindEpidemicCardHoverEvents($discardPile);
		
		$discardPile.stop().css("height", "auto");

		let expandedPileHeight = $discardPile.height();
		
		if (showRemovedCardsContainer || $removedCardsContainer.children(".playerCard").length)
			resizeRemovedPlayerCardsContainer($removedCardsContainer, expandedPileHeight);
		
		expandedPileHeight = $discardPile.height();

		if (expandedPileHeight < topPanelHeight)
		{
			if (!showRemovedCardsContainer)
			{
				$discardPile.css({
					overflowY: "hidden",
					height: topPanelHeight
				});
			}
			
			bindEventCardHoverEvents($discardPile);
			bindEpidemicCardHoverEvents($discardPile);
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
					height: topPanelHeight,
					zIndex: 8 // The expanded container needs to cover .pawnArrows
				})
				.animate(
				{
					height: expandedPileHeight,
					top: boardHeight - expandedPileHeight,
					scrollTop: showRemovedCardsContainer ? document.getElementById("playerDiscardContainer").scrollHeight : 0
				},
				getDuration("discardPileExpand"),
				function()
				{
					bindEventCardHoverEvents($discardPile);
					bindEpidemicCardHoverEvents($discardPile);

					resolve();
				});
		}
	});
}

function resizeRemovedPlayerCardsContainer($removedCardsContainer, expandedPileHeight)
{
	const rccHeight = $removedCardsContainer.removeClass("hidden").height(),
		rccExpandedProps = {},
		{ topPanelHeight } = gameData;

	if (expandedPileHeight < topPanelHeight)
		rccExpandedProps.marginTop = topPanelHeight - expandedPileHeight;

	if (rccHeight < topPanelHeight)
		rccExpandedProps.height = topPanelHeight + 1;
	
	$removedCardsContainer.css(rccExpandedProps);
}

function collapsePlayerDiscardPile()
{
	return new Promise(resolve =>
	{
		const $discardPile = $("#playerDiscardContainer"),
			{ topPanelHeight, boardHeight } = gameData;
		
		unbindEventCardHoverEvents($discardPile);
		unbindEpidemicCardHoverEvents($discardPile);
		removeRepresentationsOfDiscardedEventCards($discardPile);
		
		$discardPile.stop()
			.css("overflow-y", "hidden")
			.animate(
			{
				scrollTop: 0,
				height: topPanelHeight,
				top: boardHeight - topPanelHeight,
				zIndex: 7
			}, getDuration("discardPileCollapse"),
			function()
			{
				$discardPile.children("#removedPlayerCards")
					.removeAttr("style")
					.addClass("hidden");
				
				bindEventCardHoverEvents($discardPile);
				bindEpidemicCardHoverEvents($discardPile);
				
				resolve();
			});
	});
}

function removeRepresentationsOfDiscardedEventCards($discardPile)
{
	const $discardedEventCards = $discardPile.find(".eventCard");

	for (let i = 0; i < $discardedEventCards.length; i++)
		$(`.eventCardFull[data-key='${$discardedEventCards.eq(i).attr("data-key")}']`).remove();
}

async function undoAction()
{
	const { event, eventIndex } = getLastUndoableEvent();

	if (!event)
		return false;
	
	disableActions();
	await eventHistory.scrollToEnd({ leaveButtonsDisabled: true });

	if (currentStepIs("draw"))
		$("#cardDrawContainer").addClass("hidden").find(".button").off("click");
	else if (currentStepIs("epIntensify"))
		$("#epidemicContainer").find(".button").off("click").addClass("btnDisabled");
	else if (currentStepIs("infect cities"))
		$("#infectCitiesContainer").addClass("hidden").find(".button").off("click");
	else if (currentStepIs("hand limit"))
		removeDiscardPrompt();
	else
		resetActionPrompt({ actionCancelled: true });

	const {
			undoneEventIds,
			wasContingencyCard,
			prevStepName,
			prevTurnNum,
			prevTurnRoleID
		} = await event.requestUndo();

	await animateUndoEvents(undoneEventIds, wasContingencyCard);
	eventHistory.events.length = eventIndex;
	
	if (prevStepName)
	{
		// If a One Quiet Night event skipped the 'infect cities' step,
		// revert to the 'infect cities' step of the previous turn.
		if (prevTurnNum && prevTurnRoleID)
		{
			gameData.turnNum = prevTurnNum;
			gameData.turn = prevTurnRoleID;

			$("#actionsContainer").slideUp();
		}
		
		setCurrentStep(prevStepName);
		proceed();
	}
	else if (forecastInProgress())
	{
		gameData.currentStep.indicate();
		indicatePromptingEventCard();
	}
	else
		resumeCurrentStep();
}

function getLastUndoableEvent()
{
	const { events } = eventHistory;
	let event, i;

	for (i = events.length - 1; i >= 0; i--)
	{
		event = events[i];
		
		if (event.isUndoable)
			return { event, eventIndex: i };
	}

	return { event: false };
}

function animateUndoEvents(undoneEventIds, wasContingencyCard)
{
	return new Promise(async resolve =>
	{
		if (!undoneEventIds)
			return resolve();
		
		disableInfectionDiscardHoverEvents();
		disablePlayerDiscardHoverEvents();
		
		const { events } = eventHistory;
		let event;
		
		for (let id of undoneEventIds.reverse())
		{
			for (let i = events.length - 1; i >= 0; i--)
			{
				event = events[i];
				if (event.id == id)
					break;
			}
	
			if (wasContingencyCard && !event.wasTriggered)
			{
				await expandPlayerDiscardPile({ showRemovedCardsContainer: true });
				await sleep(getDuration("shortInterval"));
			}

			if (event instanceof MovementAction
				|| event instanceof Discard
				|| event instanceof DiscoverACure
				|| event instanceof Airlift
				|| event instanceof OneQuietNight)
				await event.animateUndo(wasContingencyCard);
			else if (event instanceof DiseaseCubeRemoval)
				await event.animateUndo(placeDiseaseCubes);
			else if (event instanceof ResearchStationPlacement)
				await event.animateUndo(animateResearchStationBackToSupply, wasContingencyCard);
			else if (event instanceof PlanContingency)
				await event.animateUndo(animateDiscardPlayerCard);
			else if (event instanceof OneQuietNight)
			{
				await event.animateUndo(wasContingencyCard);
				indicateOneQuietNightStep({ off: true });
			}
			else if (event instanceof ResilientPopulation)
				await event.animateUndo(wasContingencyCard, expandInfectionDiscardPile, collapseInfectionDiscardPile);
			else if (typeof event.animateUndo === "function")
				await event.animateUndo();
			
			if (wasContingencyCard && !event.wasTriggered) await collapsePlayerDiscardPile();

			if (event instanceof ForecastPlacement)
			{
				event.detachFromDrawEvent();
				eventHistory.enableBackButton();
			}
			else
				await eventHistory.removeIcon(event);
		}

		enableInfectionDiscardHoverEvents();
		enablePlayerDiscardHoverEvents();

		resolve();
	});
}

setup();
});