"use strict";

import getDimension from "../dimensions.js";
import { eventTypes } from "../event.js";
import { eventCards } from "../eventCard.js";
import { getCity } from "../city.js";
import { gameData, getPlayer, getActivePlayer } from "../gameData.js";
import { postData } from "./fetchUtils.js";

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

function newPlayerCard(relatedObject, { notLocatable } = {})
{
	if (typeof relatedObject.getPlayerCard === "function")
		return relatedObject.getPlayerCard({ notLocatable });

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
					return $(".epidemicFull").find(".highlighted").children("h3").children();
				
				return "";
			},
			() => $("#stepIndicator") // default anchor
		];
	
	for (let getAnchorElement of anchorElementGetters)
	{
		$anchor = getAnchorElement();
		if ($anchor.length)
		{
			const isForEpidemic = $anchor.closest(".epidemicFull").length,
				$img = $(`<img src='images/loading${ isForEpidemic ? "_epidemic" : "" }.gif' alt='loading' />`),
				$loadingGif = isForEpidemic ? $img : $(`<div class='loadingGif'></div>`).append($img);
			
			$loadingGif.insertAfter($anchor);
			
			return {
				$loadingGif,
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

function promptRefresh(error)
{
	console.error(error);
	
	const $curtain = $("#curtain"),
		$rightPanel = $("#rightPanel"),
		$container = $curtain.filter(":visible").length ? $curtain : $rightPanel,
		refreshString = "<a href=''>refresh</a> the page";

	let title,
		details,
		recommendedAction;
	
	if (error.message.includes("Maximum execution time"))
	{
		title = "It's taking longer than usual to connect...";
		details = "Please check your internet connection before you continue.";
		recommendedAction = `Your game has been saved — when you are ready to continue, ${refreshString}.`;
	}
	else
	{
		title = "Oops!</h3><h3>Something went wrong...";
		details = "Your game has been saved and the developer has been notified of this error.";
		recommendedAction = `To continue your game, ${refreshString}.`;
	}

	$("#sideMenu").add("#sideMenuTitle").addClass("hidden");

	if ($container.is($curtain))
		$curtain.empty();
	else
		$rightPanel.add("#boardContainer").children().addClass("hidden");

	$(`<div id='errorContainer'>
		<h3>${title}</h3>
		<p>${details}</p>
		<p>${recommendedAction}</p>
	</div>`).appendTo($container);
	
	$("#boardImg").fadeTo(1000, 0.4);
}

function abandonGame()
{
	const $boardContainer = $("#boardContainer");

	$("button.hamburger")
		.add($("#sideMenu").css("overflow-y", "hidden").children())
		.add($boardContainer)
		.add($boardContainer.children())
		.css("pointer-events", "none")
		.add(".pawnArrow")
		.addClass("hidden");
	
	$("#sideMenuTitle").html(`<p>ABANDONING GAME...</p><img src='images/loading.gif' alt='Abandoning game...' />`);
	
	postData("serverCode/actionPages/abandonGame.php", {})
		.then(response =>
		{
			if (response.failure)
				return promptRefresh(response.failure);
			
			window.location.replace("index.php");
		})
		.catch(e => promptRefresh(e.message));
}

function logout()
{
    postData("serverCode/logout.php", {})
        .then(response => 
        {
            if (response.failure)
                return promptRefresh(response.failure);
            
            window.location.reload(false);
        })
        .catch(e => promptRefresh(e.message));
}

function checkFullscreen()
{
	const dismissedFullscreenRecommendation = $("#chkFullscreenNotice").prop("checked");

	if (dismissedFullscreenRecommendation || gameIsFullscreen())
		return hideFullscreenRecommendation();
	
	recommendFullscreen();
}

function gameIsFullscreen()
{
	return $(window).height() >= gameData.boardHeight - 8;
}

function recommendFullscreen()
{
	const $fullscreenRecommendation = $("#fullscreenRecommendation"),
		$fullscreenShortcut = $fullscreenRecommendation.find("#fullscreenShortcut"),
		shortcut = getFullscreenKeyboardShortcut();
	
	if (shortcut)
		$fullscreenShortcut.html(shortcut);
	else
		$fullscreenShortcut.parent().addClass("hidden");
	
	animationPromise({
		$elements: $fullscreenRecommendation.removeClass("hidden"),
		initialProperties: { opacity: 0 },
		desiredProperties: { opacity: 1 }
	});

	$fullscreenRecommendation.find(".button")
		.off("click")
		.click(hideFullscreenRecommendation);
}

async function hideFullscreenRecommendation()
{
	const $fullscreenRecommendation = $("#fullscreenRecommendation");

	await animationPromise({
		$elements: $fullscreenRecommendation,
		desiredProperties: { opacity: 0 }
	});
	$fullscreenRecommendation.addClass("hidden").removeAttr("style");
}

function checkBrowserCompatibility()
{
	const browser = getBrowser();

	if (browser !== "Chrome")
		showBrowserCompatibilityWarning(browser);
}

function showBrowserCompatibilityWarning(browserName)
{
	const $curtain = $("#curtain"),
		compatWarningSelector = ".browserCompatWarning",
		hidden = "hidden";
	
	$curtain.children().addClass(hidden)
		.filter("#warningsContainer").removeClass(hidden)
		.children().not(".button").addClass(hidden)
		.filter(compatWarningSelector).removeClass(hidden)
		.find("#browserName").html(browserName === "unknown" ? "browser you are using" : `${browserName} browser`)
		.parent().siblings(".button")
		.off("click").click(hideCurtain);
	
	animationPromise({
		$elements: $curtain.removeClass(hidden),
		initialProperties: { opacity: 0 },
		desiredProperties: { opacity: 0.95 }
	});
}

async function hideCurtain()
{
	const $curtain = $("#curtain"),
		hidden = "hidden";
	
	await animationPromise({
		$elements: $curtain,
		desiredProperties: { opacity: 0 },
	});

	$curtain.addClass(hidden).removeAttr("style")
		.children().addClass(hidden);
	
	return Promise.resolve();
}

async function anyWarnings()
{
	const $curtain = $("#curtain"),
		$fullscreenRecommendation = $("#fullscreenRecommendation"),
		hidden = "hidden",
		warningsAreDisplayed = () => !$curtain.hasClass(hidden) || !$fullscreenRecommendation.hasClass(hidden);

	while (warningsAreDisplayed())
		await sleep(500);
	
	return Promise.resolve();
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
	promptRefresh,
	abandonGame,
	logout,
	hideCurtain,
	checkBrowserCompatibility,
	checkFullscreen,
	anyWarnings
}