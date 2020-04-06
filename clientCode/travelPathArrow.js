"use strict";

import { gameData, getActivePlayer } from "./gameData.js";
import { getCity } from "./city.js";

const $travelPathArrow = $("#travelPathArrow");

function showTravelPathArrow(actionProperties)
{
	const {
		promptedTravelPathProperties,
		cityWidth,
		boardWidth,
		boardHeight
	} = gameData;
	
	if (!actionProperties)
	{
		if (!promptedTravelPathProperties)
		{
			hideTravelPathArrow();
			return false;
		}
		
		actionProperties = promptedTravelPathProperties;
	}
	
	let stemWidth = cityWidth * 1.2;
	const { originOffset, destinationOffset } = getTravelPathVector(actionProperties),
		baseOffset = getPointAtDistanceAlongLine(originOffset, destinationOffset, stemWidth),
		tipOffset = getPointAtDistanceAlongLine(destinationOffset, originOffset, stemWidth),
		arrowLength = distanceBetweenPoints(baseOffset, tipOffset),
		containerWidth = boardWidth,
		containerHeight = boardHeight;
	
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

function setTravelPathArrowColor({ airlifting, governmentGranting, relocatingResearchStation } = {})
{
	let cssClass;
	if (airlifting || governmentGranting)
		cssClass = "eventArrow";
	else if (relocatingResearchStation)
		cssClass = "researchStationBackground";
	else
		cssClass = getActivePlayer().camelCaseRole;
	
	$travelPathArrow.attr("class", `${cssClass}${$travelPathArrow.hasClass("hidden") ? " hidden" : ""}`);
}

function getTravelPathVector(actionProperties)
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
			originOffset = origin.getOffset();
			destinationOffset = destination.getOffset();
		}
		else
		{
			if ($researchStation.hasClass("grantStation"))
			{
				const $supplyStation = $("#researchStationSupply").find(".researchStation");

				originOffset = $supplyStation.offset();
				originOffset.left += $supplyStation.width() / 2;
				originOffset.top += $supplyStation.height() / 2;
			}
			else
				originOffset = getCity($researchStation.attr("data-key")).getOffset();
			
			if (destination)
				destinationOffset = destination.getOffset();
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
		player = actionProperties.player || playerToAirlift || playerToDispatch || getActivePlayer();
		destinationOffset = destination.getOffset();
	}
	else // The pawn itself is the temporary destination.
	{
		player = actionProperties.player;
        destinationOffset = $pawn.offset();
		destinationOffset.left += gameData.pawnWidth * 0.5;
		destinationOffset.top += gameData.pawnHeight * 0.8;
	}

	return {
		originOffset: originOffset || player.getLocation().getOffset(),
		destinationOffset
	};
}

function animateInvalidTravelPath()
{
	return new Promise(async resolve =>
	{
		const cssClasses = $travelPathArrow.attr("class");

		await animationPromise({
			$elements: $travelPathArrow.removeAttr("class").addClass("invalid"),
			initialProperties: { opacity: .8 },
			desiredProperties: { opacity: 0 },
			duration: 500,
			easing: "easeInQuint"
		});

		$travelPathArrow.attr("class", cssClasses).addClass("hidden").removeAttr("style");
		
		if (gameData.promptedTravelPathProperties)
			showTravelPathArrow();

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