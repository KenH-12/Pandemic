"use strict";

import Tooltip from "./tooltip.js";
import { strings } from "./strings.js";
import {
    gameData,
    getPlayer,
    getActivePlayer,
    locatePawnOnRoleTagClick,
    getDifficultyName,
	eventTypeIsBeingPrompted
} from "./gameData.js";
import {
    eventTypes,
    getEventType,
    getEventTypeTooltipContent,
    StartingHands
} from "./event.js";
import { bindEventCardHoverEvents, eventCards } from "./eventCard.js";
import { bindCityLocatorClickEvents, getCity } from "./city.js";
import {
    resizeInfectionCards,
	activePlayerCanTakeFromResearcher,
	getColorWord,
	getColorClass,
	newPlayerCard
} from "./utilities/pandemicUtils.js";
import { eventHistory } from "./eventHistory.js";

export default function instantiateTooltips()
{
	bindSideMenuHoverEvents();
	bindCubeSuppliesInfoHoverEvents();
	bindInfectionDeckHoverEvents();
	bindInfectionRateInfoHoverEvents();
	bindInfectionCardHoverEvents();
	bindOutbreakMarkerHoverEvents();
	bindEventHistoryButtonHoverEvents();
	bindEventHistoryIconHoverEvents();
	bindEventDetailsHoverEvents();
	bindCuredDiseaseInfoHoverEvents();
	bindResearchStationInfoHoverEvents();
	bindActionButtonHoverEvents();
	bindDispatchTypeHoverEvents();
	bindCityCardHoverEvents();
	bindForecastInfoHoverEvents();
	bindEventCardInfoHoverEvents();
	bindPlayStepHoverEvents();
	bindActionPromptRulesHoverEvents();
}

const containerSelector = "#boardContainer";

function bindSideMenuHoverEvents()
{
	const containerSelector = "#container";

	new Tooltip({
		content: "Info icons are littered throughout the interface. Use them to familiarize yourself with the rules!",
		hoverElementSelector: "#metaInfo",
		containerSelector
	}).bindHoverEvents();

	new Tooltip({
		content: "Words or phrases underlined in blue require a bit of explanation. Mouse over them to learn more!",
		hoverElementSelector: "#metaHoverInfo",
		containerSelector
	}).bindHoverEvents();

	new Tooltip({
		content: `<p>There are 4 different movement actions that can be performed by any role. Some roles can move in unique ways using their special abilities.</p>
<p>For most movement actions, clicking the action button will show a list of valid destinations. For others, almost any city is a valid destination.</p>
<p>You can always drag and drop an active pawn to perform a movement action. If the travel path arrow turns red when you drop the pawn, it means the destination was invalid.</p>`,
		hoverElementSelector: ".hoverInfo.validDestinationInfo",
		containerSelector
	}).bindHoverEvents();

	new Tooltip({
		getContent: ({ $hoveredElement }) =>
			getEventTypeTooltipContent(getEventType($hoveredElement.attr("data-eventType")), { omitHoverInfoElements: true}),
		cssClassString: "eventTypeTooltip",
		hoverElementSelector: "#sideMenu .hoverInfo.eventTypeInfo",
		containerSelector
	}).bindHoverEvents();

	new Tooltip({
		content: `<p>At the start of the game, after the roles' starting hands have been dealt, the remaining Player cards are divided into equal piles. The number of piles is equal to the number of Epidemic cards in the game. One Epidemic card is then shuffled into each pile, and the piles are stacked to form the Player Deck.</p>
<p>The difficulty setting determines the number of Epidemic cards that will be shuffled into the Player Deck.</p>`,
		hoverElementSelector: ".hoverInfo.epidemicDispersalInfo",
		containerSelector
	}).bindHoverEvents();
}

function bindPlayerDeckHoverEvents()
{
	const positionRelativeToSelector = "#playerDeckContainer",
		infoIconSelector = `${positionRelativeToSelector} .info`,
		juxtaposition = "top",
		getPlayerDeckInfo = function()
		{
			const { numPlayerCardsRemaining, numEpidemics, epidemicCount } = gameData,
				{ playerDeckInfo, discardRule, outOfCardsWarning } = strings;

			return `<p>Cards left in deck: ${numPlayerCardsRemaining}</p>
				<br/>
				<p>Difficulty: ${getDifficultyName()}<br/><span class='indent-1'>-> ${numEpidemics} <span class='hoverInfo epidemicInfo'>Epidemics</span></span><br/>Epidemic cards left in deck: ${numEpidemics - epidemicCount}</p>
				<br/>
				<p>${playerDeckInfo}</p>
				<p>${discardRule}</p>
				<p>${outOfCardsWarning}</p>`;
		},
		getCardsLeft = function({ $hoveredElement })
		{
			const { numPlayerCardsRemaining: numCards } = gameData,
				hoveredElementClasses = $hoveredElement.attr("class"),
				hasWarningGlow = hoveredElementClasses && hoveredElementClasses.includes("warning");

			let centeredText = "",
				exclam = "",
				warningMsg = "";
			if (hasWarningGlow)
			{
				centeredText = " centeredText";
				exclam = "!";
				warningMsg = `<p>${strings.outOfCardsWarning}</p>`;
			} 
			
			return `<p class='largeText${centeredText}'>${numCards} card${ parseInt(numCards) !== 1 ? "s" : "" } left${exclam}<p>${warningMsg}`;
		}
	
	$(infoIconSelector).removeClass("hidden");

	new Tooltip({
		getContent: getPlayerDeckInfo,
		hoverElementSelector: infoIconSelector,
		positionRelativeToSelector,
		juxtaposition,
		containerSelector,
		allowTooltipHovering: true,
		tooltipHoveringForgiveness: { bottom: 20 },
		afterShow: ({ $tooltip }) => bindEpidemicCardHoverEvents($tooltip)
	}).bindHoverEvents();

	new Tooltip({
		getContent: getCardsLeft,
		hoverElementSelector: `${positionRelativeToSelector} img`,
		positionRelativeToSelector,
		juxtaposition,
		containerSelector
	}).bindHoverEvents();
}

function bindCubeSuppliesInfoHoverEvents()
{
	const { diseaseCubeSupplyInfo, insufficientCubesWarning } = strings,
		cubeSuppliesSelector = "#cubeSupplies",
		juxtaposition = "bottom";
	
	new Tooltip({
		content: `${diseaseCubeSupplyInfo}<p>${insufficientCubesWarning}</p>`,
		hoverElementSelector: `${cubeSuppliesSelector} .info`,
		positionRelativeToSelector: cubeSuppliesSelector,
		juxtaposition,
		containerSelector
	}).bindHoverEvents();

	const getContent = function({ $hoveredElement })
	{
		const color = getColorWord(getColorClass($hoveredElement));
		
		return `<p>The ${color} disease is threatening to spread out of control!</p>
			<p>${insufficientCubesWarning}</p>`;
	}

	new Tooltip({
		getContent,
		hoverElementSelector: `${cubeSuppliesSelector} .diseaseCube[class*='warning']`,
		juxtaposition,
		containerSelector,
		cssClassString: "cubeWarningTooltip"
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
	if (gameData.currentStep.name !== "setup" && $("#infectionDeckContainer img").is(":hover"))
		$(".tooltip").find("p").html(`${gameData.infectionDeckSize} cards`);
}

function bindInfectionRateInfoHoverEvents()
{
	const tooltipCssClass = "infectionRateTooltip",
		{ infectionRateInfo } = strings;

	new Tooltip({
		getContent: () => `<p class='largeText'>Infection Rate: ${gameData.infectionRate}</p>${infectionRateInfo}`,
		hoverElementSelector: "#infectionRateMarker img",
		juxtaposition: "bottom",
		containerSelector,
		cssClassString: tooltipCssClass,
		allowTooltipHovering: true,
		afterShow: ({ $tooltip }) => bindEpidemicCardHoverEvents($tooltip)
	}).bindHoverEvents();

	new Tooltip({
		content: infectionRateInfo,
		hoverElementSelector: "#stepIndicator .info",
		juxtaposition: "left",
		containerSelector,
		cssClassString: tooltipCssClass,
		allowTooltipHovering: true,
		tooltipHoveringForgiveness: { right: 10 },
		afterShow: ({ $tooltip }) => bindEpidemicCardHoverEvents($tooltip)
	}).bindHoverEvents();

	new Tooltip({
		getContent: ({ $hoveredElement }) => 
			{
				const eventType = getEventType($hoveredElement.attr("data-eventType"));
				return getEventTypeTooltipContent(eventType, { pluralNameForm: true, omitHoverInfoElements: true });
			},
		hoverElementSelector: `.${tooltipCssClass} .hoverInfo:not(.epidemicInfo)`,
		positionRelativeToSelector: `.${tooltipCssClass}`,
		alignArrowWithHoveredElement: true,
		juxtaposition: "left",
		containerSelector,
		cssClassString: "eventTypeTooltip"
	}).bindHoverEvents();
}

function bindInfectionCardHoverEvents()
{
	const getContent = ({ $hoveredElement }) =>
		{
			let content = "— Infection card —<br/>";
			
			if ($hoveredElement.closest("#infectionDiscardContainer").length
				&& eventTypeIsBeingPrompted(eventTypes.resilientPopulation))
			{
				if ($hoveredElement.hasClass("selectedForRemoval"))
					content += `Selected for removal...<br/>Click the "Play Event Card" button to confirm.`;
				else
					content += "Select for removal?";
			}
			else
			{
				content += `Click to locate ${getCity($hoveredElement.attr("data-key")).name}`;

				if ($hoveredElement.closest("#forecastCards").length)
					content += "<br/> or drag and drop to reorder.";
			}
			
			return content;
		},
		infectionCardSelector = ".infectionCard:not(.template):not(.notLocatable)";
	
	new Tooltip({
		getContent,
		hoverElementSelector: `#boardContainer ${infectionCardSelector}`,
		getJuxtaposition: ({ $hoveredElement }) =>
		{
			if ($hoveredElement.closest(".eventDetails").length)
				return "right";
			
			return "left";
		},
		containerSelector,
		beforeShow: ({ $hoveredElement, $tooltip }) =>
		{
			// Infection discard tooltips need to be marked as such so that they do not remain visible
			// after Epidemic Intensify removes the associated infection card element.
			if ($hoveredElement.closest("#infectionDiscardContainer").length)
				$tooltip.addClass("infDiscardTooltip");
		}
	}).bindHoverEvents();

	new Tooltip({
		getContent,
		hoverElementSelector: `#rightPanel ${infectionCardSelector}`,
		containerSelector: "#rightPanel",
		beforeShow: ({ $hoveredElement, $tooltip }) =>
		{
			// Forecasted infection card tooltips need to be marked as such so that they do not
			// remain visible when the cards are placed back on the deck.
			if ($hoveredElement.closest("#forecastCards").length)
				$tooltip.addClass("forecastedCardTooltip");
		}
	}).bindHoverEvents();
}

function bindOutbreakMarkerHoverEvents()
{
	const getContent = function({ $hoveredElement })
		{
			const { outbreakCount } = gameData,
				plural = parseInt(outbreakCount) !== 1,
				markerHasWarningGlow = $hoveredElement.parent().attr("class").includes("warning");

            return `<p class='largeText centeredText'>${outbreakCount} <span class='hoverInfo' data-eventType='${eventTypes.outbreak.code}'>outbreak${ plural ? "s" : "" }</span>
				<br/>${ plural ? "have" : "has" } occured${ markerHasWarningGlow ? "!" : "." }</p>
				<p>${strings.outbreakInfo.tooManyOutbreaksWarning}</p>`;
		},
		juxtaposition = "right",
		obMarkerTooltipClassName = "outbreaksMarkerTooltip";
	
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
		beforeShow: ({ $tooltip }) => {
			// Don't show the 'too many outbreaks' warning in the secondary toolip.
			const $tooManyOutbreaksWarning = $tooltip.find("p").last(),
				$br = $tooManyOutbreaksWarning.prev();
			
			$tooManyOutbreaksWarning.add($br).remove();
		},
		hoverElementSelector: `.${obMarkerTooltipClassName} .hoverInfo`,
		positionRelativeToSelector: `.${obMarkerTooltipClassName}`,
		juxtaposition,
		alignArrowWithHoveredElement: true,
		containerSelector,
		cssClassString: "eventTypeTooltip"
	}).bindHoverEvents();
}

const eventHistoryButtonTooltip = new Tooltip({
	hoverElementSelector: ".eventHistoryButton",
	cssClassString: "eventHistoryButtonTooltip",
	juxtaposition: "top",
	containerSelector,
	windowPadding: 1
});
function bindEventHistoryButtonHoverEvents()
{
	eventHistoryButtonTooltip.getContent = function({ $hoveredElement })
	{
		const isEnabled = !$hoveredElement.hasClass("btnDisabled");

		if ($hoveredElement.attr("id") === "btnUndo")
		{
			if (isEnabled || gameData.currentStep.name === "setup")
				return "Undo last action";

			if (eventHistory.lastEventCanBeUndone())
				return "Cannot undo at this time...";
			
			const { events } = eventHistory,
				lastEvent = events[events.length - 1];
			
			return `"${lastEvent.displayName || lastEvent.name}" events<br/>cannot be undone`;
		}

		return `${ isEnabled ? "See" : "No" } ${ $hoveredElement.hasClass("btnBack") ? "older" : "newer" } events`;
	}
	
	eventHistoryButtonTooltip.bindHoverEvents();
}

const eventDetailsTooltip = new Tooltip({
	hoverElementSelector: "#eventHistory > div",
	containerSelector,
	juxtaposition: "top",
	cssClassString: "eventDetails",
	allowTooltipHovering: true,
	tooltipHoveringForgiveness: { top: 2, left: 2, right: 3, bottom: 3 }
});
function bindEventHistoryIconHoverEvents()
{
	eventDetailsTooltip.getContent = function({ $hoveredElement })
	{
		const eventIndex = $($hoveredElement).attr("data-index");
		return eventHistory.events[eventIndex].getDetails();
	}

	eventDetailsTooltip.beforeShow = function({ $hoveredElement, $tooltip })
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
	}

	eventDetailsTooltip.afterShow = function({ $hoveredElement, $tooltip })
	{
		const eventIndex = $($hoveredElement).attr("data-index"),
			event = eventHistory.events[eventIndex];
		
		bindRoleCardHoverEvents();
		if (event instanceof StartingHands)
			event.positionPopulationRanks($tooltip);
	}
	
	eventDetailsTooltip.bindHoverEvents();
}

function bindEventDetailsHoverEvents()
{
	const eventTypeInfoSelector = ".eventDetails .eventTypeInfo",
		hoverInfoSelector = ".eventDetails .hoverInfo",
		juxtaposition = "right",
		cssClassString = "eventTypeTooltip";

	new Tooltip({
		hoverElementSelector: eventTypeInfoSelector,
		getContent: function({ hoverElementSelector })
			{
				const $eventDetailsContainer = $(hoverElementSelector).closest(".eventDetails"),
					eventType = getEventType($eventDetailsContainer.attr("data-eventType")),
					roleA = $eventDetailsContainer.find(".roleTag").first().html(),
					roleB = eventType.name === "ShareKnowledge" ? $eventDetailsContainer.find(".roleTag").last().html() : false,
					includeRelatedRoleRule = relatedRoleRuleApplies(eventType, { roleA, roleB });
				
				return getEventTypeTooltipContent(eventType, { includeName: false, includeRelatedRoleRule, omitHoverInfoElements: true });
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

function bindCuredDiseaseInfoHoverEvents()
{
	const {
			additionalDiscoverACureInfo,
			victoryCondition,
			curedDiseaseInfo,
			diseaseInfo
		} = strings,
		getContent = function()
		{
			return `${additionalDiscoverACureInfo}
					<br/>
					${victoryCondition}
					<br/>
					<br/>
					<span class='largeText'>Cures Discovered: ${4 - gameData.cures.remaining}</span>`;
		},
		juxtaposition = "top";
	
	new Tooltip({
			getContent,
			hoverElementSelector: "#cureMarkerContainer .info",
			juxtaposition,
			containerSelector
		}).bindHoverEvents();
	
	new Tooltip({
		content: `<p class='largeText'>Disease Cured!</p>${curedDiseaseInfo}<br/>${victoryCondition}`,
		hoverElementSelector: ".cureMarker:not([src$='eradicated.png'])",
		juxtaposition,
		containerSelector,
		cssClassString: "curedTooltip"
	}).bindHoverEvents();

	new Tooltip({
		content: `<p class='largeText'>Disease Eradicated</p>${diseaseInfo.eradicationRules}`,
		hoverElementSelector: ".cureMarker[src$='eradicated.png']",
		juxtaposition,
		containerSelector
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
		containerSelector,
		cssClassString: "rsInfo",
		allowTooltipHovering: true,
		tooltipHoveringForgiveness: { bottom: 30 }
	}).bindHoverEvents();

	new Tooltip({
		getContent: ({ $hoveredElement }) =>
			getEventTypeTooltipContent(getEventType($hoveredElement.attr("data-eventType")), { omitHoverInfoElements: true }),
		hoverElementSelector: ".rsInfo .hoverInfo",
		positionRelativeToSelector: ".rsInfo",
		juxtaposition: "right",
		alignArrowWithHoveredElement: true,
		containerSelector,
		cssClassString: "eventTypeTooltip"
	}).bindHoverEvents();
}

function bindActionButtonHoverEvents()
{
	const $actionButtons = $("#rightPanel").find(".actionButton"),
		getContent = function(tooltip)
			{
				const $btn = $(tooltip.positionRelativeToSelector),
					eventType = eventTypes[toCamelCase($btn.attr("id").substring(3))];
	
				return getEventTypeTooltipContent(eventType,
					{
						actionNotPossible: $btn.hasClass("btnDisabled"),
						includeRelatedRoleRule: relatedRoleRuleApplies(eventType),
						omitHoverInfoElements: true
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
			cssClassString: "eventTypeTooltip"
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

function bindDispatchTypeHoverEvents()
{
	new Tooltip({
		hoverElementSelector: ".dispatchTypeInfo",
		getContent: ({ $hoveredElement }) => {
			const eventType = getEventType($hoveredElement.attr("data-eventType"));
			return getEventTypeTooltipContent(eventType, { includeName: true, isDispatchType: true });
		},
		juxtaposition: "top",
		containerSelector: "#rightPanel",
		cssClassString: "eventTypeTooltip"
	}).bindHoverEvents();
}

function bindCityCardHoverEvents()
{
	const getContent = ({ $hoveredElement }) => `— City card —<br/>Click to locate ${getCity($hoveredElement.attr("data-key")).name}`,
		playerCardSelector = ".playerCard:not(.eventCard):not(.epidemic):not(.notLocatable)";

	new Tooltip({
		getContent,
		hoverElementSelector: `#boardContainer ${playerCardSelector}`,
		getJuxtaposition: ({ $hoveredElement }) => $hoveredElement.closest("#playerDiscardContainer").length ? "left" : "right",
		containerSelector
	}).bindHoverEvents();

	new Tooltip({
		getContent,
		hoverElementSelector: `#rightPanel ${playerCardSelector}:not(.template)`,
		containerSelector: "#rightPanel"
	}).bindHoverEvents();
}

function bindForecastInfoHoverEvents()
{
	const containerSelector = "#forecastContainer";
	
	new Tooltip({
		getContent: ({ $hoveredElement }) => $hoveredElement.html() === "Top" ? strings.forecastTopInfo : strings.forcastBottomInfo,
		getJuxtaposition: ({ $hoveredElement }) => $hoveredElement.html() === "Top" ? "top" : "bottom",
		hoverElementSelector: `${containerSelector} .hoverInfo:not(.concealed)`,
		positionRelativeToSelector: containerSelector,
		containerSelector
	}).bindHoverEvents();
}

function bindEventCardInfoHoverEvents()
{
	const getContent = () => strings.eventCardInfo + newPlayerCard(eventCards["airl"]),
		eventCardInfoSelector = ".eventCardInfo",
		sideMenuSelector = "#sideMenu",
		containerSelector = "#container";
	
	new Tooltip({
		getContent,
		hoverElementSelector: `#rightPanel ${eventCardInfoSelector}`,
		juxtaposition: "bottom",
		containerSelector: "#rightPanel",
		positionRelativeToSelector: "#stepIndicator",
		alignArrowWithHoveredElement: true
	}).bindHoverEvents();

	new Tooltip({
		getContent,
		hoverElementSelector: `${sideMenuSelector} ${eventCardInfoSelector}`,
		containerSelector
	}).bindHoverEvents();

	new Tooltip({
		content: strings.eventCardPlayabilityExceptions,
		hoverElementSelector: `${sideMenuSelector} .eventCardExceptions`,
		containerSelector,
	}).bindHoverEvents();
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
	$container.find(".playerCard.epidemic, .epidemicInfo")
		.off("mouseenter mouseleave")
		.hover(function() { showFullEpidemicCard($(this).attr("id", "epidemicFullAnchor")) },
			function()
			{
				$(this).removeAttr("id");
				$(containerSelector).children(".epidemicFull").remove();
			});
}

function unbindEpidemicCardHoverEvents($container)
{
	$container.find(".playerCard.epidemic")
		.off("mouseenter mouseleave");
	
	$(containerSelector).children(".epidemicFull").remove();
}

async function showFullEpidemicCard($hoveredElement)
{
	if ($hoveredElement.closest("#playerDiscardContainer").length)
	{
		await sleep(250);
		
		if (!$hoveredElement.filter(":hover").length)
			return false;
	}
	
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
	
	let $relativeTo = $hoveredElement,
		juxtaposition = "left",
		tooltipMargin = 5;
	
	if ($hoveredElement.closest(eventDetails).length)
	{
		$relativeTo = $(eventDetails);
		juxtaposition = "right";
	}
	else if ($hoveredElement.hasClass("epidemicInfo"))
	{
		if ($hoveredElement.closest(".infectionRateTooltip").length)
		{
			$relativeTo = $(".infectionRateTooltip");
			juxtaposition = "bottom";
		}
		else if ($hoveredElement.closest(".tooltip").length)
			$relativeTo = $(".tooltip");
		else
		{
			tooltipMargin = 10;
			$relativeTo = $("#turnProcedureContainer");
		}
	}

	positionTooltipRelativeToElement($fullEpidemicCard, $relativeTo, { juxtaposition, tooltipMargin });
}

function bindPlayStepHoverEvents()
{
	const positionRelativeToSelector = "#turnProcedureContainer",
		$procedureContainer = $(positionRelativeToSelector),
		playStepInfoSelector = ".playStepInfo",
		epidemicInfoSelector = ".epidemicInfo",
		getContent = function({ $hoveredElement })
		{
			const eventTypeCode = $hoveredElement.attr("data-eventType"),
				pluralNameForm = $hoveredElement.parent().hasClass("infect");
			
			return getEventTypeTooltipContent(getEventType(eventTypeCode), { pluralNameForm, omitHoverInfoElements: true });
		},
		hiddenClass = "hidden",
		playStepTooltip = new Tooltip({
			hoverElementSelector: `${playStepInfoSelector}:not(.${hiddenClass}):not(${epidemicInfoSelector})`,
			getContent,
			containerSelector,
			positionRelativeToSelector,
			alignArrowWithHoveredElement: true,
			cssClassString: "playStepTooltip eventTypeTooltip"
		}).bindHoverEvents(),
		oneQuietNightToolip = new Tooltip({
			hoverElementSelector: `${playStepInfoSelector}.oneQuietNight`,
			getContent: () =>  `<h3>ONE QUIET NIGHT</h3><p>${eventTypes.oneQuietNight.rules[1]}</p>`,
			containerSelector: "#rightPanel",
			juxtaposition: "bottom",
			positionRelativeToSelector,
			cssClassString: "playStepTooltip eventTypeTooltip"
		}).bindHoverEvents();
	
	$("#turnProcedureInfo").on("mouseenter", function()
	{
		const $infoIcon = $(this),
			$playStepInfoIcons = $procedureContainer.find(playStepInfoSelector).removeClass(hiddenClass),
			textShadowClass = "whiteTextShadow";

		$infoIcon.addClass(textShadowClass);
		$procedureContainer.off("mouseleave").on("mouseleave", function()
		{
			$procedureContainer.off("mouseleave");
			$playStepInfoIcons.addClass(hiddenClass);
			$infoIcon.removeClass(textShadowClass);
			playStepTooltip.hide();
			oneQuietNightToolip.hide();

			unbindEpidemicCardHoverEvents($procedureContainer)
		});

		bindEpidemicCardHoverEvents($procedureContainer);
	});
}

function bindActionPromptRulesHoverEvents()
{
	new Tooltip({
		hoverElementSelector: "#actionPrompt .rules .hoverInfo:not(.dispatchInfo)",
		positionRelativeToSelector: ".rules",
		juxtaposition: "left",
		alignArrowWithHoveredElement: true,
		containerSelector,
		getContent: ({ $hoveredElement }) => getEventTypeTooltipContent(getEventType($hoveredElement.attr("data-eventType"))),
		cssClassString: "eventTypeTooltip"
	}).bindHoverEvents();

	new Tooltip({
		hoverElementSelector: "#actionPrompt .rules .hoverInfo.dispatchInfo",
		positionRelativeToSelector: ".dispatchInfo",
		juxtaposition: "left",
		alignArrowWithHoveredElement: true,
		containerSelector,
		content: `<p>Essentially, the Dispatcher can use any of the 4 basic movement actions to move any pawn.</p><p>${strings.dispatchDiscardRule}</p>`
	}).bindHoverEvents();
}

function getHoverElementsWhichInterfereWithDragging()
{
	return $(containerSelector).find(".info, .marker, #eventHistory > div");
}

function disableTooltipsWhileDragging()
{
	getHoverElementsWhichInterfereWithDragging()
		.css("pointer-events", "none");
}

function enableTooltipsAfterDragging()
{
	removeInlineStylePropertiesFrom(getHoverElementsWhichInterfereWithDragging(), "pointer-events");
}

export {
    bindPlayerDeckHoverEvents,
	decrementInfectionDeckSize,
	eventHistoryButtonTooltip,
	eventDetailsTooltip,
    resetInfectionDeckSize,
    bindRoleCardHoverEvents,
    bindEpidemicCardHoverEvents,
	unbindEpidemicCardHoverEvents,
	disableTooltipsWhileDragging,
	enableTooltipsAfterDragging
}