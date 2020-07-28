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
	activePlayerCanTakeFromResearcher,
	getColorWord,
	getColorClass
} from "./utilities/pandemicUtils.js";
import { eventHistory } from "./eventHistory.js";

export default function instantiateTooltips()
{
    bindCubeSuppliesInfoHoverEvents();
	bindInfectionDeckHoverEvents();
	bindInfectionRateInfoHoverEvents();
	bindOutbreakMarkerHoverEvents();
	bindEventHistoryButtonHoverEvents();
	bindEventHistoryIconHoverEvents();
	bindEventDetailsHoverEvents();
	bindCuredDiseaseInfoHoverEvents();
	bindResearchStationInfoHoverEvents();
	bindActionButtonHoverEvents();
	bindDispatchTypeHoverEvents();
	bindForecastInfoHoverEvents();
	bindPlayStepHoverEvents();
	bindActionPromptRulesHoverEvents();
}

const containerSelector = "#boardContainer";

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
				<p>Difficulty: ${getDifficultyName()}<br/><span class='indent-1'>-> ${numEpidemics} Epidemics</span><br/>Epidemic cards left in deck: ${numEpidemics - epidemicCount}</p>
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
		containerSelector
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
				return getEventTypeTooltipContent(eventType, { pluralNameForm: true });
			},
		hoverElementSelector: `.${tooltipCssClass} .hoverInfo:not(.epidemicInfo)`,
		positionRelativeToSelector: `.${tooltipCssClass}`,
		alignArrowWithHoveredElement: true,
		juxtaposition: "left",
		containerSelector,
		cssClassString: "eventTypeTooltip"
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
				<p>${strings.tooManyOutbreaksWarning}</p>`;
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
	tooltipHoveringForgiveness: { top: 2, left: 2, right: 3, bottom: 1 }
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
		positionRelativeToSelector: ".eventDetails",
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
	const getContent = function()
		{
			return `${strings.additionalDiscoverACureInfo}
					<br/>
					${strings.victoryCondition}
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
			
			return getEventTypeTooltipContent(getEventType(eventTypeCode), { pluralNameForm });
		},
		hiddenClass = "hidden",
		playStepTooltip = new Tooltip({
			hoverElementSelector: `${playStepInfoSelector}:not(.${hiddenClass}):not(${epidemicInfoSelector})`,
			getContent,
			containerSelector,
			positionRelativeToSelector,
			alignArrowWithHoveredElement: true,
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

			unbindEpidemicCardHoverEvents($procedureContainer)
		});

		bindEpidemicCardHoverEvents($procedureContainer);
	});
}

function bindActionPromptRulesHoverEvents()
{
	new Tooltip({
		hoverElementSelector: "#actionPrompt .rules .hoverInfo",
		positionRelativeToSelector: ".rules",
		juxtaposition: "left",
		alignArrowWithHoveredElement: true,
		containerSelector,
		getContent: ({ $hoveredElement }) => getEventTypeTooltipContent(getEventType($hoveredElement.attr("data-eventType"))),
		cssClassString: "eventTypeTooltip"
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