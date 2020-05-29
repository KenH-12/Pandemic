"use strict";

import getDimension from "../dimensions.js";
import { eventTypes } from "../event.js";
import { eventCards } from "../eventCard.js";
import { getCity } from "../city.js";
import { gameData, getPlayer, getActivePlayer } from "../gameData.js";

// Returns the Infection Rate (as seen on the Infection Rate Track on the game board)
// which corresponds to the number of Epidemic cards drawn thus far.
function getInfectionRate(epidemicCount)
{
	if (epidemicCount < 3)
		return 2;

	if (epidemicCount > 4)
		return 4;
	
	return 3;
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

function newDiseaseCubeElement({ color, cityKey, asJqueryObject = true } = {})
{
	let cssClasses = `diseaseCube ${color || "w"}`;
	if (cityKey) cssClasses += ` ${cityKey}`;
	
	const diseaseCubeHtml = `<div class='${cssClasses}'>
								<div class='cubeBackground'></div>
								<div class='cubeTop'></div>
								<div class='cubeLeft'></div>
								<div class='cubeRight'></div>
							</div>`;
	
	return asJqueryObject ? $(diseaseCubeHtml) : diseaseCubeHtml;
}

function newPlayerCard(relatedObject, { noTooltip } = {})
{
	if (typeof relatedObject.getPlayerCard === "function")
		return relatedObject.getPlayerCard({ noTooltip });

	return `<div class='playerCard epidemic' data-key='epid'>EPIDEMIC</div>`;
}

function getCityOrEventCardObject(key)
{
	return eventCards[key] || getCity(key);
}

function resizeInfectionCards($container)
{
	$container = $container || $("#boardContainer");

	const $infectionCards = $container.find(".infectionCard");

	if (!$infectionCards.length)
		return false;

	$infectionCards.height(getDimension("infDiscardHeight"))
		.find(".cityName")
		.css(getInfectionCardTextStyle($container));
	
	if ($container.hasClass("eventDetails"))
	{
		const cardWidth = gameData.boardWidth * 0.2,
			newContainerWidth = cardWidth / .96,
			checkWidth = !$container.width();
		
		$infectionCards.children(".infectionCardContents").width(cardWidth);
		
		if (checkWidth)
			$container.appendTo("#boardContainer");

		if ($container.width() < newContainerWidth)
			$container.width(newContainerWidth);
		
		if (checkWidth)
			$container.detach();
	}
}

function getInfectionCardTextStyle($container)
{
	const fontSize = getDimension("infDiscardFont") + "px",
		top = getDimension("infDiscardNameTop"),
		styleProperties = {
			top,
			fontSize,
		};
	
	if ($container.hasClass("eventDetails"))
	{
		styleProperties.top -= 1;
		styleProperties.lineHeight = fontSize;
	}

	return styleProperties;
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
		else if (action.name === "Share Knowledge" && activePlayerCanTakeFromResearcher())
			$actionButton.addClass("researcher");
		else
			$actionButton.removeClass(toCamelCase(action.relatedRoleName));
	}
}

function activePlayerCanTakeFromResearcher()
{
	const researcher = getPlayer("Researcher");

	return researcher &&
		researcher.isHoldingAnyCityCard() &&
		researcher.cityKey === getActivePlayer().cityKey;
}

function showLoadingGif(eventType)
{
	let $anchor = $(".actionButton:visible");

	if ($anchor.length)
	{
		$anchor = $anchor.filter(`#btn${toPascalCase(eventType.name.replace("/",""))}`);
		return {
			resetActionButtonImg: showActionButtonLoadingGifAfterMs($anchor),
			$loadingGif: false
		}
	}
	
	const  $rightPanel = $("#rightPanel"),
		$actionPrompt = $("#actionPrompt"),
		anchorElementGetters = [
			() => $rightPanel.find(".btnConfirm:visible"),
			() => $rightPanel.find(".btnContinue:visible"),
			() => {
				const $anchor = $actionPrompt.find(".playerCard");

				if ($anchor.length && eventType.code === eventTypes.shareKnowledge.code)
					return $anchor.parent();
				
				return $anchor;
			},
			() => $actionPrompt.find(".actionPromptOption"),
			() => {
				const $anchor = $actionPrompt.find(".diseaseCube.selected");
				return $anchor.length ? $anchor.parent() : $anchor;
			},
			() => {
				const { infectCity, epidemicIncrease, epidemicInfect, epidemicIntensify } = eventTypes;
				
				if (eventType.code === infectCity.code)
					return $("#infectCitiesContainer").children().last();
				
				const epidemicStepCodes = [epidemicIncrease.code, epidemicInfect.code, epidemicIntensify.code];

				if (epidemicStepCodes.includes(eventType.code))
					return $("#epidemicContainer").children().last();
				
				return "";
			},
			() => $("#stepIndicator") // default anchor
		];
	
	for (let getAnchorElement of anchorElementGetters)
	{
		$anchor = getAnchorElement();
		if ($anchor.length)
		{
			return {
				$loadingGif: $(`<div class='loadingGif'><img src='images/loading.gif' alt='loading' /></div>`).insertAfter($anchor),
				resetActionButtonImg: false
			}
		}
	}
}

// Returns an anonymous function which resets the action button image to its original icon.
function showActionButtonLoadingGifAfterMs($actionButton, ms = 1000)
{
	const $img = $actionButton.children(".actionIcon").find("img"),
		iconSrc = $img.attr("src"),
		loading = "loading",
		showGifIfStillWaiting = () =>
		{
			if ($actionButton.hasClass(loading))
				$img.attr("src", "images/loading.gif");
		},
		resetImg = () => {
			$actionButton.removeClass(loading);
			$img.attr("src", iconSrc);
		};
	
	$actionButton.addClass(loading);
	
	delayExecution(showGifIfStillWaiting, ms);

	return resetImg;
}

function updateConfirmButtonText($btnConfirm, newText)
{
	$btnConfirm.off("click").addClass("btnDisabled").html(newText);
}

function promptRefresh()
{
	const $rightPanel = $("#rightPanel");

	$rightPanel.children().addClass("hidden");

	$(`<div id='errorContainer'>
		<h3>Oops!</h3>
		<h3>Something went wrong...</h3>
		<p>Your game has been saved and the developer has been notified of this error.</p>
		<p>To continue your game, <a href=''>refresh</a> the page.</p>
	</div>`).appendTo($rightPanel);

	$("#boardContainer").children().addClass("hidden");
	$("#boardImg").fadeTo(1000, 0.4);
}

export {
	getInfectionRate,
	getColorClass,
	getColorWord,
	newDiseaseCubeElement,
	newPlayerCard,
	getCityOrEventCardObject,
	resizeInfectionCards,
	getInfectionCardTextStyle,
	useRoleColorForRelatedActionButtons,
	activePlayerCanTakeFromResearcher,
	showLoadingGif,
	updateConfirmButtonText,
	promptRefresh
}