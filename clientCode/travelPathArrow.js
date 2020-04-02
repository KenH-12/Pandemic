"use strict";

import { eventTypes } from "./event.js";
import { getCity } from "./city.js";

const $travelPathArrow = $("#travelPathArrow");

function showTravelPathArrow(gameData, actionProperties)
{
    if (!actionProperties)
	{
		if (!gameData.promptedTravelPathProperties)
		{
			hideTravelPathArrow();
			return false;
		}
		
		actionProperties = gameData.promptedTravelPathProperties;
	}
	
	let stemWidth = gameData.cityWidth * 1.2;
	const { originOffset, destinationOffset } = getTravelPathVector(actionProperties, gameData),
		baseOffset = getPointAtDistanceAlongLine(originOffset, destinationOffset, stemWidth),
		tipOffset = getPointAtDistanceAlongLine(destinationOffset, originOffset, stemWidth),
		arrowLength = distanceBetweenPoints(baseOffset, tipOffset),
		containerWidth = gameData.boardWidth,
		containerHeight = gameData.boardHeight;
	
	// Avoid weird clip-paths that could occur when the arrow is very short.
	if (arrowLength < stemWidth * 4)
		stemWidth = arrowLength / 4;
	
	const clipPath = getArrowClipPath({
			stemWidth,
			baseOffset,
			tipOffset,
			containerWidth,
			containerHeight
		});

	$travelPathArrow.css(
		{
			width: containerWidth,
			height: containerHeight,
			clipPath
		})
		.removeClass("hidden");
}

function setTravelPathArrowColor({ airlifting, governmentGranting, relocatingResearchStation, activePlayer } = {})
{
	let cssClass;
	if (airlifting || governmentGranting)
		cssClass = "eventArrow";
	else if (relocatingResearchStation)
		cssClass = "researchStationBackground";
	else
		cssClass = activePlayer.camelCaseRole;
	
	$travelPathArrow.attr("class", `${cssClass}${$travelPathArrow.hasClass("hidden") ? " hidden" : ""}`);
}

function getTravelPathVector(actionProperties, gameData)
{
	const {
		origin,
		$pawn,
        $researchStation,
		playerToAirlift,
		playerToDispatch,
		destination
	} = actionProperties;
	
	let originOffset,
		destinationOffset,
		player;
	
	if (origin || typeof $researchStation != "undefined") // Government Grant and/or research station relocation
	{
		if (typeof $researchStation == "undefined")
		{
			originOffset = origin.getOffset(gameData);
			destinationOffset = destination.getOffset(gameData);
		}
		else
		{
			if (!$researchStation.hasClass("placeholderStation"))
				originOffset = getCity($researchStation.attr("data-key")).getOffset(gameData);
			else if (gameData.promptingEventType.code === eventTypes.governmentGrant.code)
			{
				const $supplyStation = $("#researchStationSupply").find(".researchStation");

				originOffset = $supplyStation.offset();
				originOffset.left += $supplyStation.width() / 2;
				originOffset.top += $supplyStation.height() / 2;
			}
			
			if (destination)
				destinationOffset = destination.getOffset(gameData);
			else
			{
				destinationOffset = $researchStation.offset();
				destinationOffset.left += $researchStation.width() / 2;
				destinationOffset.top += $researchStation.height() / 2;
			}
		}
	}
	else if (typeof $pawn == "undefined") // Determine player and destination directly from the actionProperties.
	{
		player = actionProperties.player || playerToAirlift || playerToDispatch || gameData.players[gameData.turn];
		destinationOffset = destination.getOffset(gameData);
	}
	else // The pawn itself is the temporary destination.
	{
		player = actionProperties.player;
        destinationOffset = $pawn.offset();
		destinationOffset.left += gameData.pawnWidth * 0.5;
		destinationOffset.top += gameData.pawnHeight * 0.8;
	}

	return {
		originOffset: originOffset || player.getLocation().getOffset(gameData),
		destinationOffset
	};
}

function animateInvalidTravelPath(gameData)
{
	return new Promise(async resolve =>
	{
		const cssClasses = $travelPathArrow.attr("class");

		await animatePromise({
			$elements: $travelPathArrow.removeClass("hidden eventArrow"),
			initialProperties: { background: "darkred", opacity: .8 },
			desiredProperties: { opacity: 0 },
			duration: 500,
			easing: "easeInQuint"
		});

		$travelPathArrow.attr("class", cssClasses).addClass("hidden").removeAttr("style");
		
		if (gameData.promptedTravelPathProperties)
			showTravelPathArrow(gameData);

		resolve();
	});
}

function hideTravelPathArrow()
{
	$travelPathArrow.stop().addClass("hidden").removeAttr("style");
}

export {
    showTravelPathArrow,
    setTravelPathArrowColor,
    animateInvalidTravelPath,
    hideTravelPathArrow
}