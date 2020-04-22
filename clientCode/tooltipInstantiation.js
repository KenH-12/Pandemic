"use strict";

import Tooltip from "./tooltip.js";
import { strings } from "./strings.js";
import {
    gameData,
    getPlayer,
    getActivePlayer,
    locatePawnOnRoleTagClick,
    getDifficultyName
} from "./gameData.js";
import {
    eventTypes,
    getEventType,
    getEventTypeTooltipContent,
    StartingHands
} from "./event.js";
import { bindEventCardHoverEvents } from "./eventCard.js";
import { bindCityLocatorClickEvents } from "./city.js";
import {
    resizeInfectionCards,
	activePlayerCanTakeFromResearcher
} from "./utilities/pandemicUtils.js";
import { eventHistory } from "./eventHistory.js";

export default function instantiateTooltips()
{
    bindCubeSuppliesInfoHoverEvents();
	bindPlayerDeckHoverEvents();
	bindInfectionDeckHoverEvents();
	bindInfectionRateInfoHoverEvents();
	bindOutbreakMarkerHoverEvents();
	bindEventHistoryButtonHoverEvents();
	bindEventHistoryIconHoverEvents();
	bindEventDetailsHoverEvents();
	bindCuredDiseaseInfoHoverEvents();
	bindResearchStationInfoHoverEvents();
	bindActionButtonHoverEvents();
}

function bindPlayerDeckHoverEvents()
{
	const positionRelativeToSelector = "#playerDeckContainer",
		juxtaposition = "top",
		containerSelector = "#boardContainer",
		getPlayerDeckInfo = function()
		{
			const { numPlayerCardsRemaining, numEpidemics, epidemicCount } = gameData,
				{ playerDeckInfo, discardRule, outOfCardsWarning } = strings;

			return `<p>Cards left in deck: ${numPlayerCardsRemaining}</p>
				<br/>
				<p>Difficulty: ${getDifficultyName()}<br/><span class='indent-1'>-> ${numEpidemics} Epidemics</span><br/>Epidemic cards left in deck: ${numEpidemics - epidemicCount}</p>
				<br/>
				<p>${playerDeckInfo}</p>
				<p>${discardRule}</p>
				<p>${outOfCardsWarning}</p>`;
		};
	
	new Tooltip({
		getContent: getPlayerDeckInfo,
		hoverElementSelector: `${positionRelativeToSelector} .info`,
		positionRelativeToSelector,
		juxtaposition,
		containerSelector,
		cssClassString: "wideTooltip"
	}).bindHoverEvents();

	new Tooltip({
		getContent: () => `<p class='largeText'>${gameData.numPlayerCardsRemaining} cards left<p>`,
		hoverElementSelector: `${positionRelativeToSelector} img`,
		positionRelativeToSelector,
		juxtaposition,
		containerSelector
	}).bindHoverEvents();
}

function bindCubeSuppliesInfoHoverEvents()
{
	new Tooltip({
		content: `${strings.diseaseCubeSupplyInfo}<p>${strings.insufficientCubesWarning}</p>`,
		hoverElementSelector: "#cubeSupplies .info",
		positionRelativeToSelector: "#cubeSupplies",
		juxtaposition: "bottom",
		containerSelector: "#boardContainer",
		cssClassString: "wideTooltip"
	}).bindHoverEvents();
}

function bindInfectionDeckHoverEvents()
{
	const positionRelativeToSelector = "#infectionDeckContainer";
	
	new Tooltip({
		getContent: () => `<p class='largeText'>${gameData.infectionDeckSize} cards</p>`,
		hoverElementSelector: `${positionRelativeToSelector} img`,
		positionRelativeToSelector,
		juxtaposition: "bottom"
	}).bindHoverEvents();
}

function decrementInfectionDeckSize()
{
	gameData.infectionDeckSize -= 1;
	updateInfectionDeckTooltip();
}

function resetInfectionDeckSize()
{
	gameData.infectionDeckSize = gameData.maxInfectionDeckSize - $("#removedInfectionCards").find(".infectionCard").length;
	updateInfectionDeckTooltip();
}

function updateInfectionDeckTooltip()
{
	if ($("#infectionDeckContainer img").is(":hover"))
		$(".tooltip").find("p").html(`${gameData.infectionDeckSize} cards`);
}

function bindInfectionRateInfoHoverEvents()
{
	new Tooltip({
		getContent: () => `<p class='largeText'>Infection Rate: ${gameData.infectionRate}</p>${strings.infectionRateInfo}`,
		hoverElementSelector: "#infectionRateMarker img, #stepIndicator .info",
		getJuxtaposition: ({ $hoveredElement }) => $hoveredElement.closest("#stepIndicator").length ? "left" : "bottom",
		containerSelector: "#boardContainer",
		cssClassString: "wideTooltip infectionRateTooltip",
		allowTooltipHovering: true
	}).bindHoverEvents();

	new Tooltip({
		getContent: ({ $hoveredElement }) => 
			{
				const eventType = getEventType($hoveredElement.attr("data-eventType"));
				return getEventTypeTooltipContent(eventType, { pluralNameForm: true });
			},
		hoverElementSelector: ".infectionRateTooltip .hoverInfo",
		juxtaposition: "bottom",
		containerSelector: "#boardContainer",
		cssClassString: "wideTooltip eventTypeTooltip"
	}).bindHoverEvents();
}
function bindOutbreakMarkerHoverEvents()
{
	const getContent = function()
		{
			const { outbreakCount } = gameData,
				plural = parseInt(outbreakCount) !== 1;

            return `<p class='largeText'>${outbreakCount} <span class='hoverInfo' data-eventType='${eventTypes.outbreak.code}'>outbreak${ plural ? "s" : "" }</span>
                <br/>${ plural ? "have" : "has" } occured.</p>`;
		},
		juxtaposition = "right",
		obMarkerTooltipClassName = "outbreaksMarkerTooltip",
		containerSelector = "#boardContainer";
	
	new Tooltip({
		getContent,
		hoverElementSelector: "#outbreaksMarker img",
		juxtaposition,
		containerSelector,
		cssClassString: obMarkerTooltipClassName,
		allowTooltipHovering: true,
		tooltipHoveringForgiveness: { left: 10, right: 10, bottom: 1 }
	}).bindHoverEvents();

	new Tooltip({
		getContent: ({ $hoveredElement }) => getEventTypeTooltipContent(getEventType($hoveredElement.attr("data-eventType"))),
		hoverElementSelector: `.${obMarkerTooltipClassName} .hoverInfo`,
		positionRelativeToSelector: `.${obMarkerTooltipClassName}`,
		juxtaposition,
		containerSelector,
		cssClassString: "wideTooltip eventTypeTooltip"
	}).bindHoverEvents();
}

const eventHistoryButtonTooltip = new Tooltip({
	hoverElementSelector: ".eventHistoryButton",
	cssClassString: "eventHistoryButtonTooltip",
	juxtaposition: "top",
	containerSelector: "#boardContainer",
	windowPadding: 1
});
function bindEventHistoryButtonHoverEvents()
{
	eventHistoryButtonTooltip.getContent = function({ $hoveredElement })
	{
		const isEnabled = !$hoveredElement.hasClass("btnDisabled");

		if ($hoveredElement.attr("id") === "btnUndo")
		{
			if (isEnabled)
				return "Undo last action";

			if (eventHistory.lastEventCanBeUndone())
				return "Cannot undo at this time...";
			
			const { events } = eventHistory,
				lastEventName = events[events.length - 1].name;
			
			return `"${lastEventName}" events cannot be undone`;
		}

		return `${ isEnabled ? "See" : "No" } ${ $hoveredElement.hasClass("btnBack") ? "older" : "newer" } events`;
	}
	
	eventHistoryButtonTooltip.bindHoverEvents();
}
function hideEventHistoryButtonTooltip()
{
	if (eventHistoryButtonTooltip instanceof Tooltip)
		eventHistoryButtonTooltip.hide();
}

function bindEventHistoryIconHoverEvents()
{
	const getContent = function({ $hoveredElement })
		{
			const eventIndex = $($hoveredElement).attr("data-index");
			return eventHistory.events[eventIndex].getDetails();
		},
		beforeShow = function({ $hoveredElement, $tooltip })
		{
			const eventIndex = $($hoveredElement).attr("data-index"),
				event = eventHistory.events[eventIndex];

			$tooltip.attr("data-eventType", event.code);

			bindEventCardHoverEvents($tooltip);
			bindEpidemicCardHoverEvents($tooltip);
			locatePawnOnRoleTagClick($tooltip);
			bindCityLocatorClickEvents({ $containingElement: $tooltip });

			resizeInfectionCards($tooltip);
			enforceEventDetailsHeightLimit();
		},
		afterShow = function({ $hoveredElement, $tooltip })
		{
			const eventIndex = $($hoveredElement).attr("data-index"),
				event = eventHistory.events[eventIndex];
			
			bindRoleCardHoverEvents();
			if (event instanceof StartingHands)
				event.positionPopulationRanks($tooltip);
		};
	
	new Tooltip({
		getContent,
		hoverElementSelector: "#eventHistory > div",
		containerSelector: "#boardContainer",
		juxtaposition: "top",
		cssClassString: "eventDetails",
		allowTooltipHovering: true,
		tooltipHoveringForgiveness: { top: 2, left: 2, right: 3, bottom: 1 },
		beforeShow,
		afterShow
	}).bindHoverEvents();
}

function bindEventDetailsHoverEvents()
{
	const eventTypeInfoSelector = ".eventDetails .eventTypeInfo",
		hoverInfoSelector = ".eventDetails .hoverInfo",
		containerSelector = "#boardContainer",
		juxtaposition = "right",
		cssClassString = "eventTypeTooltip wideTooltip";

	new Tooltip({
		hoverElementSelector: eventTypeInfoSelector,
		getContent: function({ hoverElementSelector })
			{
				const $eventDetailsContainer = $(hoverElementSelector).closest(".eventDetails"),
					eventType = getEventType($eventDetailsContainer.attr("data-eventType")),
					roleA = $eventDetailsContainer.find(".roleTag").first().html(),
					roleB = eventType.name === "ShareKnowledge" ? $eventDetailsContainer.find(".roleTag").last().html() : false,
					includeRelatedRoleRule = relatedRoleRuleApplies(eventType, { roleA, roleB });
				
				return getEventTypeTooltipContent(eventType, { includeName: false, includeRelatedRoleRule });
			},
		containerSelector,
		juxtaposition,
		cssClassString
	}).bindHoverEvents();
	
	new Tooltip({
		hoverElementSelector: hoverInfoSelector,
		getContent: function({ hoverElementSelector })
			{
				const $this = $(hoverElementSelector),
					eventType = getEventType($this.attr("data-eventType")),
					isDispatchType = $this.parent().html().includes("Dispatch Type");

				return getEventTypeTooltipContent(eventType, { isDispatchType });
			},
		containerSelector,
		juxtaposition,
		cssClassString
	}).bindHoverEvents();
}

function bindCuredDiseaseInfoHoverEvents()
{
	const getContent = function()
		{
			return `${strings.additionalDiscoverACureInfo}
					<br/>
					${strings.victoryCondition}
					<br/>
					<br/>
					<span class='largeText'>Cures Discovered: ${4 - gameData.cures.remaining}</span>`;
		},
		juxtaposition = "top",
		containerSelector = "#boardContainer";
	
	new Tooltip({
			getContent,
			hoverElementSelector: "#cureMarkerContainer .info",
			juxtaposition,
			containerSelector,
			cssClassString: "wideTooltip"
		}).bindHoverEvents();
	
	new Tooltip({
		content: `<p class='largeText'>Disease Cured</p>`,
		hoverElementSelector: ".cureMarker:not([src$='eradicated.png'])",
		juxtaposition,
		containerSelector,
		cssClassString: "curedTooltip"
	}).bindHoverEvents();

	new Tooltip({
		content: `<p class='largeText'>Disease Eradicated</p>${strings.eradicationRules}`,
		hoverElementSelector: ".cureMarker[src$='eradicated.png']",
		juxtaposition,
		containerSelector,
		cssClassString: "wideTooltip"
	}).bindHoverEvents();
}

function bindResearchStationInfoHoverEvents()
{
	const positionRelativeToSelector = "#researchStationSupplyContainer";

	new Tooltip({
		content: strings.researchStationSupplyInfo,
		hoverElementSelector: `${positionRelativeToSelector} > .title .info`,
		positionRelativeToSelector,
		juxtaposition: "top",
		containerSelector: "#boardContainer",
		cssClassString: "wideTooltip rsInfo",
		allowTooltipHovering: true,
		tooltipHoveringForgiveness: { bottom: 30 }
	}).bindHoverEvents();

	new Tooltip({
		getContent: ({ $hoveredElement }) => getEventTypeTooltipContent(getEventType($hoveredElement.attr("data-eventType"))),
		hoverElementSelector: ".rsInfo .hoverInfo",
		positionRelativeToSelector: ".rsInfo",
		juxtaposition: "right",
		containerSelector: "#boardContainer",
		cssClassString: "wideTooltip eventTypeTooltip"
	}).bindHoverEvents();
}

function bindActionButtonHoverEvents()
{
	const $actionButtons = $("#rightPanel").find(".actionButton"),
		containerSelector = "#boardContainer",
		getContent = function(tooltip)
			{
				const $btn = $(tooltip.positionRelativeToSelector),
					eventType = eventTypes[toCamelCase($btn.attr("id").substring(3))];
	
				return getEventTypeTooltipContent(eventType,
					{
						actionNotPossible: $btn.hasClass("btnDisabled"),
						includeRelatedRoleRule: relatedRoleRuleApplies(eventType)
					});
			};
	
	let buttonSelector;
	for (let i = 0; i < $actionButtons.length; i++)
	{
		buttonSelector = `#${$actionButtons.eq(i).attr("id")}`;
		
		new Tooltip({
			getContent,
			hoverElementSelector: `${buttonSelector} .actionInfo`,
			positionRelativeToSelector: buttonSelector,
			containerSelector,
			cssClassString: "eventTypeTooltip wideTooltip"
		}).bindHoverEvents();
	}
}

function relatedRoleRuleApplies(eventType, { roleA, roleB } = {})
{
	if (!eventType.relatedRoleName)
		return false;
	
	roleA = roleA || getActivePlayer().role;

	if (roleA === eventType.relatedRoleName)
		return true;
	
	// Share Knowledge is the only event type which has a related role rule that can apply to an
	// event performed by a role which is not the related role (see the Researcher's special ability).
	if (eventType.name !== "Share Knowledge")
		return false;
	
	if (typeof roleB === "undefined")
		return activePlayerCanTakeFromResearcher();
	
	return roleB === "Researcher";
}

function enforceEventDetailsHeightLimit($detailsContainer)
{
	$detailsContainer = $detailsContainer || $(".eventDetails");

	if (!$detailsContainer.length)
		return false;
	
	const offsetTop = $detailsContainer.offset().top,
		minOffsetTop = gameData.topPanelHeight + 5;
	
	if (offsetTop >= minOffsetTop)
	{
		$detailsContainer.removeClass("scrollable");
		return false;
	}

	const currentHeight = $detailsContainer.height(),
		heightReduction = minOffsetTop - offsetTop;

	$detailsContainer.addClass("scrollable")
		.height(currentHeight - heightReduction)
		.offset({ top: minOffsetTop });
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
					player = getPlayer($this.attr("data-role"));
				else
					player = getActivePlayer();
			}
			
			if (player)
				player.showRoleCard($hoveredElement);
		},
		function() { $(".roleCard, #contingencyWrapper, #disabledEventCardTooltip").remove() });
}

function bindEpidemicCardHoverEvents($container)
{
	$container.find(".playerCard.epidemic")
		.off("mouseenter mouseleave")
		.hover(function() { showFullEpidemicCard($(this).attr("id", "epidemicFullAnchor")) },
			function()
			{
				$(this).removeAttr("id");
				$("#boardContainer").children(".epidemicFull").remove();
			});
}

function unbindEpidemicCardHoverEvents($container)
{
	$container.find(".playerCard.epidemic")
		.off("mouseenter mouseleave");
	
	$(".epidemicFull").remove();
}

function showFullEpidemicCard($epidemicCard)
{
	const $fullEpidemicCard = $(`<div class='epidemicFull'>
									<h2>EPIDEMIC</h2>
									<div class='increase'>
										<h3>1 — INCREASE</h3>
										<p>MOVE THE INFECTION RATE MARKER FORWARD 1 SPACE.</P>
									</div>
									<div class='infect'>
										<h3>2 — INFECT</h3>
										<p>DRAW THE BOTTOM CARD FROM THE INFECTION DECK AND PUT 3 CUBES ON THAT CITY. DISCARD THAT CARD.</p>
									</div>
									<div class='intensify'>
										<h3>3 — INTENSIFY</h3>
										<p>SHUFFLE THE CARDS IN THE INFECTION DISCARD PILE AND PUT THEM ON TOP OF THE INFECTION DECK.</p>
									</div>
								</div>`),
		eventDetails = ".eventDetails";
	
	let $relativeTo = $epidemicCard,
		juxtaposition = "left";
	
	if ($epidemicCard.closest(eventDetails).length)
	{
		$relativeTo = $(eventDetails);
		juxtaposition = "right";
	}

	positionTooltipRelativeToElement($fullEpidemicCard, $relativeTo, { juxtaposition });
}

export {
    bindPlayerDeckHoverEvents,
	decrementInfectionDeckSize,
	hideEventHistoryButtonTooltip,
    resetInfectionDeckSize,
    bindRoleCardHoverEvents,
    bindEpidemicCardHoverEvents,
    unbindEpidemicCardHoverEvents
}