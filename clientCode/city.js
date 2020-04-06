"use strict";

import { eventTypes } from "./event.js";
import { gameData, getActivePlayer } from "./gameData.js";
import { getDuration, setDuration } from "./durations.js";
import { easings } from "./easings.js";
import getDimension from "./dimensions.js";
import {
    showTravelPathArrow,
	setTravelPathArrowColor,
	animateInvalidTravelPath
} from "./travelPathArrow.js";

export default class City
{
	constructor({
		key,
		name,
		color,
		percentFromTop,
		percentFromLeft,
		connectedCityKeys,
		quarantineBoundaries,
		checksPanelOcclusion = false
	})
	{
		this.key = key;
		this.name = capitalizeWords(name);
		this.color = color;
		this.percentFromTop = percentFromTop;
		this.percentFromLeft = percentFromLeft;
		this.connectedCityKeys = connectedCityKeys; // string array
		this.quarantineBoundaries = quarantineBoundaries;
		this.checksPanelOcclusion = checksPanelOcclusion;
		
		this.hasResearchStation = false;
		
		// disease cubes
		this.cubes = {
			u: 0, // blue
			y: 0, // yellow
			b: 0, // black
			r: 0 // red
		};
	}

	incrementCubeCount(diseaseCubeSupplies, color = this.color)
	{
		const MAX_CUBES_OF_COLOR_PER_CITY = 3;

		if (this.cubes[color] < MAX_CUBES_OF_COLOR_PER_CITY)
		{
			this.cubes[color]++;
			diseaseCubeSupplies[color]--;
		}
	}

	decrementCubeCount(diseaseCubeSupplies, color, numCubesRemoved)
	{
		this.cubes[color] -= numCubesRemoved;
		diseaseCubeSupplies[color] += numCubesRemoved;
	}

	getDiseaseColorOptions()
	{
		const diseaseColorOptions = [];

		for (let color in this.cubes)
			if (this.cubes[color] > 0)
				diseaseColorOptions.push(color);

		return diseaseColorOptions;
	}
	
	isConnectedTo(cityKey)
	{
		return this.connectedCityKeys.includes(cityKey);
	}

	// Returns the left and top offsets values of the city on the board (responsive).
	// Optionally adjusts to center a piece on the city ("cube" or "pawn")
	getOffset(pieceToCenter)
	{
		const {
			boardWidth,
			boardHeight,
			cubeWidth,
			pawnHeight,
			pawnWidth
		} = gameData;
		
		let x = boardWidth * this.percentFromLeft,
			y = boardHeight * this.percentFromTop;
		
		if (pieceToCenter)
		{
			if (pieceToCenter == "cube")
			{
				const adj = cubeWidth / 2;
				x -= adj;
				y -= adj;
			}
			else if (pieceToCenter == "pawn")
			{
				y -= pawnHeight * 0.8;
				x -= pawnWidth / 2;
			}
		}
		return { left: x, top: y };
	}

	getAreaDiv()
	{
		const $areaDiv = $(`<div class='areaDiv ${this.key}'></div>`),
			offset = this.getOffset(),
			{ cityWidth } = gameData,
			halfCityWidth = cityWidth / 2;

		offset.top -= halfCityWidth;
		offset.left -= halfCityWidth;

		$areaDiv.width(cityWidth)
			.height(cityWidth)
			.offset(offset);
		
		return $areaDiv.appendTo("#boardContainer");
	}

	getResearchStation()
	{
		return $(`.researchStation[data-key='${this.key}']`);
	}
	
	// Puts a research station on this city.
	buildResearchStation(promptAction, { animate, isGovernmentGrant } = {})
	{
		let $rs,
			stationInitialOffset = false;
		if (isGovernmentGrant)
		{
			$rs = $("#boardContainer > .researchStation.grantStation");
			stationInitialOffset = $rs.offset();

			$rs.replaceWith(newResearchStationElement(this.key, promptAction))
				.removeAttr("style");
			researchStationKeys.delete("grantStation");
		}
		else
			$rs = newResearchStationElement(this.key, promptAction);
		
		this.hasResearchStation = true;
		researchStationKeys.add(this.key);
		updateResearchStationSupplyCount();

		if (animate)
		{
			stationInitialOffset = stationInitialOffset || $("#researchStationSupply .researchStation").offset();
			return this.cluster({
					stationInitialOffset,
					animateResearchStation: true,
					animatePawns: true,
					animateCubes: true
				});
		}
	}

	relocateResearchStationTo(city)
	{
		const $rs = this.getResearchStation(),
			stationInitialOffset = $rs.offset();

		$rs.removeAttr("data-key")
			.attr("data-key", city.key)
			.removeAttr("style");
		
		this.hasResearchStation = false;
		researchStationKeys.delete(this.key);

		city.hasResearchStation = true;
		researchStationKeys.add(city.key);

		this.cluster({ animatePawns: true });
		return city.cluster({ animateResearchStation: true, stationInitialOffset, animatePawns: true });
	}
	
	setPawnIndices()
	{
		const activePlayer = getActivePlayer(),
			activePawn = activePlayer.$pawn;
		
		if (activePlayer.cityKey == this.key && $(`.${this.key}.pawn`).length > 2)
		{
			activePawn.data("pawnIndex", "1");
			
			const otherPawns = $(`.${this.key}.pawn`).not(`#${activePawn.attr("id")}`);
			otherPawns.data("pawnIndex", "0");
		}

		return this;
	}

	containsPieces()
	{
		return $(`.pawn.${this.key}`).length
			|| this.getResearchStation().length
			|| $(`.diseaseCube.${this.key}`).length;
	}

	getOccupants(players)
	{
		return getFilteredMemberArray(players,
			player => player.cityKey === this.key);
	}

	// Positions any pawns and disease cubes on this city into a cluster.
	// Returns a Promise with after the most relevant animation duration.
	cluster({
            animatePawns,
			$pawnToExclude,
			animateCubes,
			animateResearchStation,
			stationInitialOffset,
			stationKeyToExclude
		} = {})
	{
		const pawns = $(".pawn." + this.key).not($pawnToExclude)
				.sort(function (a, b) { return $(a).data("pawnIndex") - $(b).data("pawnIndex") }),
			pawnCount = pawns.length,
            cityOffset = this.getOffset(),
            { pawnHeight, pawnWidth } = gameData,
			coordsArray = [],
			{ checksPanelOcclusion } = this;
		
		let movementResultsToCheckForOcclusion;
		if (checksPanelOcclusion)
			movementResultsToCheckForOcclusion = [];
		
		let pawnTop = cityOffset.top - pawnHeight,
			pawnLeft = cityOffset.left - pawnWidth,
			i;
		
		if (this.hasResearchStation && this.key !== stationKeyToExclude)
		{
			const $researchStation = this.getResearchStation(),
				desiredStationOffset = this.getResearchStationOffset();
			
			if (checksPanelOcclusion && animateResearchStation)
				movementResultsToCheckForOcclusion.push({ $piece: $researchStation, newOffset: desiredStationOffset });
			
			this.clusterResearchStation({
					$researchStation,
					animateResearchStation,
					stationInitialOffset,
					desiredStationOffset
				});

			// research station appears behind a single row of pawns
			if (pawnCount < 3)
			{
				pawnTop += pawnHeight * 0.3;
				pawnLeft += pawnWidth * 0.5;
			}
		}
		
		for (i = 0; i < pawnCount; i++)
		{
			if (pawnCount > 2 && i == 2) // second row moves down a touch and the is offset slightly to the right
			{
				pawnTop += pawnHeight * 0.3;
				pawnLeft -= pawnWidth * 1.5;
			}
			
			coordsArray.push([pawnTop, pawnLeft]);
			pawnLeft += pawnWidth; // move over a pawn's width with each iteration
		}

		const pawnAnimationDuration = getDuration("pawnAnimation");
		let $this, newOffset;
		i = 0;
		pawns.each(function()
		{
			$this = $(this);
			// pawns in the back row appear behind research stations
			$this[0].style.zIndex = (pawnCount > 2 && i < 2) ? 2 : 4;
			
			newOffset = {
				top: coordsArray[i][0],
				left: coordsArray[i][1]
			};
			
			if (animatePawns)
			{
				if (checksPanelOcclusion)
					movementResultsToCheckForOcclusion.push({ $piece: $this, newOffset });
				
				$this.animate(newOffset, pawnAnimationDuration, easings.pawnAnimation);
			}
			else
				$this.offset(newOffset);

			i++;
		});

		// reset to default
		setDuration("pawnAnimation", 250);

		if (animateCubes || animatePawns)
		{
			const desiredDiseaseCubeOffsets = this.getDiseaseCubeOffsets();
			
			if (checksPanelOcclusion)
			{
				movementResultsToCheckForOcclusion = [
					...movementResultsToCheckForOcclusion,
					...formatCubeOffsetsForPanelOcclusionCheck(desiredDiseaseCubeOffsets)
				];
			}

			this.clusterDiseaseCubes({ desiredDiseaseCubeOffsets, animate: true });
		}
		else
			this.clusterDiseaseCubes();

		if (checksPanelOcclusion)
			checkMovementResultsForPanelOcclusion(this, movementResultsToCheckForOcclusion);

		// Return a Promise with the most relevant duration.
		let ms = 0;
		if (animateResearchStation) // Station animation takes the longest.
			ms = getDuration("stationPlacement");
		else if (animateCubes) // Cube animation takes longer than pawn animation.
			ms = getDuration("cubePlacement");
		else if (animatePawns)
			ms = pawnAnimationDuration;

		return sleep(ms);
	}

	clusterResearchStation({
			animateResearchStation,
			stationInitialOffset,
			desiredStationOffset,
			$researchStation
		} = {})
	{
		const duration = getDuration("stationPlacement");
		
		$researchStation = $researchStation || this.getResearchStation();
		desiredStationOffset = desiredStationOffset || this.getResearchStationOffset();
		
		if (animateResearchStation)
		{
			if (stationInitialOffset)
				$researchStation.offset(stationInitialOffset);
			
			$researchStation.animate(
			{
				top: desiredStationOffset.top,
				left: desiredStationOffset.left
			}, duration, easings.stationPlacement);
		}
		else
			$researchStation.offset(desiredStationOffset);
		
		return sleep(duration);
	}

	getResearchStationOffset()
	{
		const { stationHeight, stationWidth } = gameData,
			rsOffset = this.getOffset();
		
		rsOffset.top -= stationHeight * 0.85;
		rsOffset.left -= stationWidth * 0.8;

		return rsOffset;
	}

	clusterDiseaseCubes({ animate, desiredDiseaseCubeOffsets } = {})
	{
		return new Promise(async resolve =>
		{
			const $cubes = $(`.diseaseCube.${this.key}`),
				duration = animate ? getDuration("cubePlacement") : 0,
				easing = easings.cubePlacement;
			
			if (!$cubes.length)
				return resolve();
			
			if (!desiredDiseaseCubeOffsets)
			{
				desiredDiseaseCubeOffsets = this.getDiseaseCubeOffsets($cubes);

				if (this.checksPanelOcclusion)
					checkMovementResultsForPanelOcclusion(this, formatCubeOffsetsForPanelOcclusionCheck(desiredDiseaseCubeOffsets), gameData);
			}
	
			let $cubesOfColor, coords;
			for (let color in desiredDiseaseCubeOffsets)
			{
				$cubesOfColor = $cubes.filter(`.${color}`);
	
				for (let i = 0; i < $cubesOfColor.length; i++)
				{
					coords = desiredDiseaseCubeOffsets[color][i];

					if (animate)
						$cubesOfColor.eq(i).animate(coords, getDuration(duration), easing);
					else
						$cubesOfColor.eq(i).offset(coords);
				}
			}
			
			await sleep(getDuration(duration));
			resolve();
		});
	}

	getDiseaseCubeOffsets($cubes)
	{
		const colors = new Set(),
			cityOffset = this.getOffset("cube"),
			{ players, cubeWidth } = gameData,
			numPawnsInCity = this.getOccupants(players).length,
			offsets = {};

		$cubes = $cubes || $(`.diseaseCube.${this.key}`);

		$cubes.each(function(){ colors.add(getColorClass($(this))) });
	
		let topAdjustment;
		if (numPawnsInCity > 2
			|| (this.hasResearchStation && ($cubes.length > 1 || numPawnsInCity > 0)))
			topAdjustment = cubeWidth * 1.25;
		else
			topAdjustment = cubeWidth / 2;

		// Get y values to create a column for each color.
		let top, $cubesOfColor;
		for (let color of [...colors])
		{
			offsets[color] = [];
			$cubesOfColor = $cubes.filter(`.${color}`);
			top = cityOffset.top + topAdjustment;

			for (let i = 0; i < $cubesOfColor.length; i++)
			{
				top -= cubeWidth * 0.5;
				offsets[color].push({
					top,
					$piece: this.checksPanelOcclusion ? $cubesOfColor.eq(i) : false,
				});
			}
		}

		// Sort colors by column size ascending.
		const colorOrder = [],
			MIN_COL_HEIGHT = 1,
			MAX_CUBES_OF_COLOR_ON_CITY = 3, // 4th cube causes an outbreak.
			MAX_INFECTIONS_PER_OUTBREAK = 6, // Hong Kong / Istanbul both have 6 neighbouring cities.
			MAX_COL_HEIGHT = MAX_CUBES_OF_COLOR_ON_CITY + MAX_INFECTIONS_PER_OUTBREAK;

		for (let i = MIN_COL_HEIGHT; i <= MAX_COL_HEIGHT; i++)
			for (let color in offsets)
				if (offsets[color].length === i)
					colorOrder.push(color);

		// Get x values to separate each column.
		let left = cityOffset.left;
		if (colors.size > 1)
			left -= (colors.size - 1) * (cubeWidth / 2);
		
		for (let color of colorOrder)
		{
			for (let coord of offsets[color])
			{
				coord.left = left;
				coord.width = cubeWidth;
				coord.height = cubeWidth;
			}
			left += cubeWidth;
		}

		return offsets;
	}

	getPlayerCard({ noTooltip, includePopulation } = {})
	{
		const { name, color, key } = this, 
			tooltip = noTooltip ? "" : ` title='City card
Click to locate ${name}'`,
			population = includePopulation && this.population ?
				`<span class='population'>Population: ${numberWithCommas(this.population)}</span>` : "";

		return `<div class='playerCard ${color}' data-key='${key}'${tooltip}>
					${name.toUpperCase()}
					${population}
				</div>`;
	}

	getInfectionCard({ toReveal } = {})
	{
		return `<div class='infectionCard' data-key='${this.key}'>
					<div class='infectionCardContents'>
						${ toReveal ? "<div class='veil'></div>" : "" }
						<img class='infectionCardImg' src='images/cards/infectionCard_${this.color}.png' />
						<p class='cityName'>${this.name.toUpperCase()}</p>
					</div>
				</div>`;
	}
}

const cities = {};

// instantiate city objects
(function ()
{
	const cityInfo = [
		{
			name: "san francisco",
			color: "u",
			percentFromTop: 0.332,
			percentFromLeft: 0.047,
			checksPanelOcclusion: true,
			connectedCityKeys: ["toky", "mani", "chic", "losa"],
			quarantineBoundaries: [
				...[
					{ key: "sanf-mani", points: ["b"] },
					{ key: "sanf", points: ["bl"] },
					{ key: "losa", points: ["bl", "br"] },
					{ key: "chic", points: ["br", "tr", "tl"] },
					{ key: "sanf", points: ["t"] },
					{ key: "sanf-toky", points: ["t"] }
				],
				...getPacificTraversalPoints({ direction: "east" }),
				...[
					{ key: "toky-sanf", points: ["t"] },
					{ key: "toky", points: ["tl", "bl"] },
					{ key: "toky-sanf", points: ["b"] },
					{ key: "mani-sanf", points: ["t"] },
					{ key: "mani", points: ["tl", "bl", "br"] },
					{ key: "mani-sanf", points: ["b"] }
				],
				...getPacificTraversalPoints({ direction: "west" })	
			]
		},
		{
			name: "chicago",
			color: "u",
			percentFromTop: 0.293,
			percentFromLeft: 0.143,
			checksPanelOcclusion: true,
			connectedCityKeys: ["atla", "mont", "sanf", "losa", "mexi"],
			quarantineBoundaries: [
				{ key: "chic", points: ["t"] },
				{ key: "sanf", points: ["tl"] },
				{ key: "losa", points: ["bl"] },
				{ key: "mexi", points: ["bl", "br"] },
				{ key: "mont", points: ["br", "tr"] }
			]
		},
		{
			name: "montreal",
			color: "u",
			percentFromTop: 0.288,
			percentFromLeft: 0.217,
			checksPanelOcclusion: true,
			connectedCityKeys: ["chic", "wash", "newy"],
			quarantineBoundaries: [
				{ key: "chic", points: ["tl", "bl"] },
				{ key: "mont", points: ["bl"] },
				{ key: "wash", points: ["bl", "br"] },
				{ key: "newy", points: ["br", "tr"] },
				{ key: "mont", points: ["t"] }
			]
		},
		{
			name: "new york",
			color: "u",
			percentFromTop: 0.299,
			percentFromLeft: 0.275,
			checksPanelOcclusion: true,
			connectedCityKeys: ["mont", "wash", "lond", "madr"],
			quarantineBoundaries: [
				{ key: "mont", points: ["tl", "bl"] },
				{ key: "wash", points: ["bl"] },
				{ key: "madr", points: ["br"] },
				{ key: "lond", points: ["tr"] }
			]
		},
		{
			name: "atlanta",
			color: "u",
			percentFromTop: 0.372,
			percentFromLeft: 0.172,
			connectedCityKeys: ["chic", "wash", "miam"],
			quarantineBoundaries: [
				{ key: "chic", points: ["tr", "tl", "bl"] },
				{ key: "atla", points: ["l"] },
				{ key: "miam", points: ["bl", "br"] },
				{ key: "wash", points: ["br", "tr", "tl"] },
				{ key: "atla", points: ["tr"] }
			]
		},
		{
			name: "washington",
			color: "u",
			percentFromTop: 0.365,
			percentFromLeft: 0.250,
			connectedCityKeys: ["atla", "mont", "newy", "miam"],
			quarantineBoundaries: [
				{ key: "mont", points: ["tl"] },
				{ key: "atla", points: ["tl", "bl"] },
				{ key: "miam", points: ["bl", "br"] },
				{ key: "wash", points: ["r"] },
				{ key: "newy", points: ["br", "tr"] }
			]
		},
		{
			name: "london",
			color: "u",
			percentFromTop: 0.237,
			percentFromLeft: 0.415,
			checksPanelOcclusion: true,
			connectedCityKeys: ["newy", "madr", "esse", "pari"],
			quarantineBoundaries: [
				{ key: "newy", points: ["tl", "bl"] },
				{ key: "madr", points: ["bl", "br"] },
				{ key: "pari", points: ["br"] },
				{ key: "esse", points: ["br", "tr"] },
				{ key: "lond", points: ["t"] }
			]
		},
		{
			name: "essen",
			color: "u",
			percentFromTop: 0.217,
			percentFromLeft: 0.489,
			connectedCityKeys: ["lond", "pari", "mila", "stpe"],
			quarantineBoundaries: [
				{ key: "lond", points: ["tl", "bl"] },
				{ key: "pari", points: ["bl", "br"] },
				{ key: "mila", points: ["br"] },
				{ key: "stpe", points: ["br", "tr"] },
				{ key: "esse", points: ["t"] }
			]
		},
		{
			name: "st petersburg",
			color: "u",
			percentFromTop: 0.197,
			percentFromLeft: 0.573,
			connectedCityKeys: ["esse", "ista", "mosc"],
			quarantineBoundaries: [
				{ key: "esse", points: ["tl", "bl", "br"] },
				{ key: "stpe", points: ["bl"] },
				{ key: "ista", points: ["bl", "br"] },
				{ key: "mosc", points: ["br", "tr"] },
				{ key: "stpe", points: ["tr", "tl"] }
			]
		},
		{
			name: "madrid",
			color: "u",
			percentFromTop: 0.342,
			percentFromLeft: 0.405,
			connectedCityKeys: ["newy", "lond", "pari", "algi", "saop"],
			quarantineBoundaries: [
				{ key: "newy", points: ["tl", "bl"] },
				{ key: "madr", points: ["bl"] },
				{ key: "saop", points: ["tl", "bl", "br"] },
				{ key: "madr", points: ["b"] },
				{ key: "algi", points: ["bl", "br", "tr"] },
				{ key: "pari", points: ["tr"] },
				{ key: "lond", points: ["tr", "tl"] }
			]
		},
		{
			name: "paris",
			color: "u",
			percentFromTop: 0.289,
			percentFromLeft: 0.471,
			connectedCityKeys: ["lond", "madr", "algi", "mila", "esse"],
			quarantineBoundaries: [
				{ key: "lond", points: ["tl"] },
				{ key: "madr", points: ["bl"] },
				{ key: "algi", points: ["bl", "br", "tr"] },
				{ key: "mila", points: ["br", "tr"] },
				{ key: "esse", points: ["tr"] }
			]
		},
		{
			name: "milan",
			color: "u",
			percentFromTop: 0.270,
			percentFromLeft: 0.521,
			connectedCityKeys: ["esse", "pari", "ista"],
			quarantineBoundaries: [
				{ key: "esse", points: ["tr", "tl"] },
				{ key: "pari", points: ["tl", "bl"] },
				{ key: "ista", points: ["bl", "br", "tr"] }
			]
		},
		{
			name: "los angeles",
			color: "y",
			percentFromTop: 0.438,
			percentFromLeft: 0.063,
			connectedCityKeys: ["sydn", "sanf", "mexi", "chic"],
			quarantineBoundaries: 
			[
				...[
					{ key: "losa-sydn", points: ["b"] },
					{ key: "losa", points: ["b"] },
					{ key: "mexi", points: ["bl", "br"] },
					{ key: "chic", points: ["br", "tr", "tl"] },
					{ key: "sanf", points: ["tl", "bl"] },
					{ key: "losa", points: ["l"] },
					{ key: "losa-sydn", points: ["t"] }
				],
				...getPacificTraversalPoints({ direction: "east" }),
				...[
					{ key: "bottom-left", points: ["bl"] },
					{ key: "bottom-right", points: ["br"] },
					{ key: "sydn-losa", points: ["b"] },
					{ key: "sydn", points: ["br", "bl", "tl"] },
					{ key: "sydn-losa", points: ["t"] }
				],
				...getPacificTraversalPoints({ direction: "west" })
			]
		},
		{
			name: "mexico city",
			color: "y",
			percentFromTop: 0.475,
			percentFromLeft: 0.133,
			connectedCityKeys: ["losa", "lima", "bogo", "miam", "chic"],
			quarantineBoundaries: [
				{ key: "losa", points: ["tl", "bl"] },
				{ key: "lima", points: ["bl", "br"] },
				{ key: "bogo", points: ["r"] },
				{ key: "miam", points: ["r", "tr", "tl"] },
				{ key: "mexi", points: ["tr"] },
				{ key: "chic", points: ["tr", "tl"] }
			]
		},
		{
			name: "miami",
			color: "y",
			percentFromTop: 0.458,
			percentFromLeft: 0.219,
			connectedCityKeys: ["atla", "mexi", "bogo", "wash"],
			quarantineBoundaries: [
				{ key: "atla", points: ["tr", "tl"] },
				{ key: "mexi", points: ["tl", "bl"] },
				{ key: "bogo", points: ["bl", "br"] },
				{ key: "wash", points: ["br", "tr"] }
			]
		},
		{
			name: "bogota",
			color: "y",
			percentFromTop: 0.566,
			percentFromLeft: 0.212,
			connectedCityKeys: ["mexi", "lima", "buen", "saop", "miam"],
			quarantineBoundaries: [
				{ key: "mexi", points: ["tl", "bl"] },
				{ key: "lima", points: ["bl"] },
				{ key: "buen", points: ["bl", "br"] },
				{ key: "saop", points: ["br", "tr"] },
				{ key: "miam", points: ["tr", "tl"] }
			]
		},
		{
			name: "lima",
			color: "y",
			percentFromTop: 0.681,
			percentFromLeft: 0.185,
			connectedCityKeys: ["mexi", "bogo", "sant"],
			quarantineBoundaries: [
				{ key: "mexi", points: ["tr", "tl", "bl"] },
				{ key: "sant", points: ["bl", "br"] },
				{ key: "bogo", points: ["br", "tr"] }
			]
		},
		{
			name: "santiago",
			color: "y",
			percentFromTop: 0.799,
			percentFromLeft: 0.195,
			connectedCityKeys: ["lima"],
			quarantineBoundaries: [
				{ key: "lima", points: ["tr", "tl", "bl"] },
				{ key: "sant", points: ["bl", "br", "tr"] }
			]
		},
		{
			name: "buenos aires",
			color: "y",
			percentFromTop: 0.777,
			percentFromLeft: 0.274,
			connectedCityKeys: ["bogo", "saop"],
			quarantineBoundaries: [
				{ key: "bogo", points: ["tr", "tl", "bl"] },
				{ key: "buen", points: ["bl", "br"] },
				{ key: "saop", points: ["br", "tr"] }
			]
		},
		{
			name: "sao paulo",
			color: "y",
			percentFromTop: 0.698,
			percentFromLeft: 0.318,
			connectedCityKeys: ["bogo", "buen", "lago", "madr"],
			quarantineBoundaries: [
				{ key: "bogo", points: ["tr", "tl", "bl"] },
				{ key: "buen", points: ["bl", "br"] },
				{ key: "saop", points: ["br"] },
				{ key: "lago", points: ["br", "tr", "tl"] },
				{ key: "saop", points: ["tr"] },
				{ key: "madr", points: ["br", "tr", "tl"] },
				{ key: "saop", points: ["t"] }
			]
		},
		{
			name: "lagos",
			color: "y",
			percentFromTop: 0.547,
			percentFromLeft: 0.463,
			connectedCityKeys: ["saop", "kins", "khar"],
			quarantineBoundaries: [
				{ key: "lago", points: ["tl"] },
				{ key: "saop", points: ["tl", "bl", "br"] },
				{ key: "lago", points: ["b"] },
				{ key: "kins", points: ["bl", "br"] },
				{ key: "khar", points: ["br", "tr", "tl"] }
			]
		},
		{
			name: "khartoum",
			color: "y",
			percentFromTop: 0.527,
			percentFromLeft: 0.559,
			connectedCityKeys: ["lago", "kins", "joha", "cair"],
			quarantineBoundaries: [
				{ key: "cair", points: ["tr", "tl"] },
				{ key: "lago", points: ["tl", "bl"] },
				{ key: "kins", points: ["bl"] },
				{ key: "joha", points: ["bl", "br"] },
				{ key: "khar", points: ["br", "tr"] }
			]
		},
		{
			name: "kinshasa",
			color: "y",
			percentFromTop: 0.620,
			percentFromLeft: 0.511,
			connectedCityKeys: ["lago", "khar", "joha"],
			quarantineBoundaries: [
				{ key: "lago", points: ["tl", "bl"] },
				{ key: "joha", points: ["bl", "br"] },
				{ key: "khar", points: ["r", "tr"] }
			]
		},
		{
			name: "johannesburg",
			color: "y",
			percentFromTop: 0.728,
			percentFromLeft: 0.553,
			connectedCityKeys: ["kins", "khar"],
			quarantineBoundaries: [
				{ key: "kins", points: ["tl", "bl"] },
				{ key: "joha", points: ["bl", "br"] },
				{ key: "khar", points: ["r", "tr", "tl"] }
			]
		},
		{
			name: "algiers",
			color: "b",
			percentFromTop: 0.402,
			percentFromLeft: 0.487,
			connectedCityKeys: ["madr", "pari", "ista", "cair"],
			quarantineBoundaries: [
				{ key: "pari", points: ["br", "tr", "tl"] },
				{ key: "madr", points: ["tl", "bl"] },
				{ key: "algi", points: ["bl"] },
				{ key: "cair", points: ["bl", "br"] },
				{ key: "ista", points: ["br", "tr", "tl"] },
				{ key: "algi", points: ["tr"] }
			]
		},
		{
			name: "istanbul",
			color: "b",
			percentFromTop: 0.331,
			percentFromLeft: 0.554,
			connectedCityKeys: ["algi", "mila", "stpe", "mosc", "bagh", "cair"],
			quarantineBoundaries: [
				{ key: "mila", points: ["tl"] },
				{ key: "algi", points: ["tl", "bl"] },
				{ key: "cair", points: ["bl", "br"] },
				{ key: "bagh", points: ["br"] },
				{ key: "mosc", points: ["br", "tr"] },
				{ key: "stpe", points: ["tr", "tl"] }
			]
		},
		{
			name: "moscow",
			color: "b",
			percentFromTop: 0.270,
			percentFromLeft: 0.613,
			connectedCityKeys: ["stpe", "ista", "tehr"],
			quarantineBoundaries: [
				{ key: "stpe", points: ["tr", "tl"] },
				{ key: "ista", points: ["tl", "bl", "br"] },
				{ key: "tehr", points: ["br", "tr"] }
			]
		},
		{
			name: "cairo",
			color: "b",
			percentFromTop: 0.423,
			percentFromLeft: 0.544,
			connectedCityKeys: ["algi", "ista", "bagh", "riya", "khar"],
			quarantineBoundaries: [
				{ key: "algi", points: ["tl", "bl"] },
				{ key: "khar", points: ["bl", "br"] },
				{ key: "riya", points: ["br", "tr"] },
				{ key: "bagh", points: ["tr"] },
				{ key: "ista", points: ["tr", "tl"] }
			]
		},
		{
			name: "baghdad",
			color: "b",
			percentFromTop: 0.387,
			percentFromLeft: 0.606,
			connectedCityKeys: ["ista", "cair", "riya", "kara", "tehr"],
			quarantineBoundaries: [
				{ key: "ista", points: ["tl"] },
				{ key: "cair", points: ["tl", "bl"] },
				{ key: "riya", points: ["bl", "br"] },
				{ key: "kara", points: ["br", "tr"] },
				{ key: "tehr", points: ["tr"] }
			]
		},
		{
			name: "tehran",
			color: "b",
			percentFromTop: 0.320,
			percentFromLeft: 0.664,
			connectedCityKeys: ["mosc", "bagh", "kara", "delh"],
			quarantineBoundaries: [
				{ key: "mosc", points: ["tr", "tl"] },
				{ key: "bagh", points: ["bl"] },
				{ key: "kara", points: ["b"] },
				{ key: "delh", points: ["br", "tr"] },
				{ key: "tehr", points: ["tr"] }
			]
		},
		{
			name: "riyadh",
			color: "b",
			percentFromTop: 0.484,
			percentFromLeft: 0.616,
			connectedCityKeys: ["cair", "bagh", "kara"],
			quarantineBoundaries: [
				{ key: "bagh", points: ["tr", "tl"] },
				{ key: "cair", points: ["tl", "bl"] },
				{ key: "riya", points: ["bl", "br"] },
				{ key: "kara", points: ["br", "tr"] }
			]
		},
		{
			name: "karachi",
			color: "b",
			percentFromTop: 0.422,
			percentFromLeft: 0.679,
			connectedCityKeys: ["riya", "bagh", "tehr", "delh", "mumb"],
			quarantineBoundaries: [
				{ key: "tehr", points: ["tr", "tl"] },
				{ key: "bagh", points: ["tl", "bl"] },
				{ key: "riya", points: ["tl", "bl"] },
				{ key: "mumb", points: ["bl", "br"] },
				{ key: "delh", points: ["br", "tr"] }
			]
		},
		{
			name: "delhi",
			color: "b",
			percentFromTop: 0.392,
			percentFromLeft: 0.733,
			connectedCityKeys: ["tehr", "kara", "mumb", "chen", "kolk"],
			quarantineBoundaries: [
				{ key: "tehr", points: ["tr", "tl", "bl"] },
				{ key: "mumb", points: ["bl"] },
				{ key: "chen", points: ["bl", "br", "tr"] },
				{ key: "kolk", points: ["bl", "br", "tr"] }
			]
		},
		{
			name: "kolkata",
			color: "b",
			percentFromTop: 0.418,
			percentFromLeft: 0.786,
			connectedCityKeys: ["delh", "chen", "bang", "hong"],
			quarantineBoundaries: [
				{ key: "delh", points: ["tr", "tl", "bl"] },
				{ key: "chen", points: ["bl", "br"] },
				{ key: "bang", points: ["br"] },
				{ key: "hong", points: ["br", "tr"] },
				{ key: "kolk", points: ["tr"] }
			]
		},
		{
			name: "mumbai",
			color: "b",
			percentFromTop: 0.500,
			percentFromLeft: 0.686,
			connectedCityKeys: ["kara", "delh", "chen"],
			quarantineBoundaries: [
				{ key: "kara", points: ["tl", "bl"] },
				{ key: "mumb", points: ["bl"] },
				{ key: "chen", points: ["bl", "br", "tr"] },
				{ key: "delh", points: ["tr", "tl"] }
			]
		},
		{
			name: "chennai",
			color: "b",
			percentFromTop: 0.557,
			percentFromLeft: 0.744,
			connectedCityKeys: ["mumb", "delh", "kolk", "bang", "jaka"],
			quarantineBoundaries: [
				{ key: "delh", points: ["tr", "tl"] },
				{ key: "mumb", points: ["tl", "bl"] },
				{ key: "jaka", points: ["bl", "br"] },
				{ key: "bang", points: ["tr"] },
				{ key: "kolk", points: ["tr"] }
			]
		},
		{
			name: "beijing",
			color: "r",
			percentFromTop: 0.295,
			percentFromLeft: 0.829,
			connectedCityKeys: ["seou", "shan"],
			quarantineBoundaries: [
				{ key: "beij", points: ["tl"] },
				{ key: "shan", points: ["bl", "br"] },
				{ key: "seou", points: ["br", "tr"] }
			]
		},
		{
			name: "seoul",
			color: "r",
			percentFromTop: 0.289,
			percentFromLeft: 0.896,
			connectedCityKeys: ["beij", "shan", "toky"],
			quarantineBoundaries: [
				{ key: "beij", points: ["tl"] },
				{ key: "shan", points: ["bl", "br"] },
				{ key: "toky", points: ["br", "tr"] },
				{ key: "seou", points: ["tr"] }
			]
		},
		{
			name: "shanghai",
			color: "r",
			percentFromTop: 0.370,
			percentFromLeft: 0.834,
			connectedCityKeys: ["beij", "seou", "toky", "taip", "hong"],
			quarantineBoundaries: [
				{ key: "beij", points: ["tl"] },
				{ key: "shan", points: ["l"] },
				{ key: "hong", points: ["bl", "br"] },
				{ key: "taip", points: ["br", "r"] },
				{ key: "toky", points: ["b", "br", "tr"] },
				{ key: "seou", points: ["tr"] }
			]
		},
		{
			name: "tokyo",
			color: "r",
			percentFromTop: 0.332,
			percentFromLeft: 0.948,
			connectedCityKeys: ["seou", "shan", "osak", "sanf"],
			quarantineBoundaries: [
				...[
					{ key: "top-right", points: ["tr"] },
					{ key: "toky-sanf", points: ["t"] },
					{ key: "toky", points: ["tl"] },
					{ key: "seou", points: ["tr", "tl"] },
					{ key: "shan", points: ["tl", "bl", "br"] },
					{ key: "osak", points: ["bl", "br", "tr"] },
					{ key: "toky", points: ["br"] },
					{ key: "toky-sanf", points: ["b"] }
				],
				...getPacificTraversalPoints({ direction: "west" }),
				...[
					{ key: "sanf-toky", points: ["b"] },
					{ key: "sanf", points: ["br", "tr"] },
					{ key: "sanf-toky", points: ["t"] }
				],
				...getPacificTraversalPoints({ direction: "east" })
			]
		},
		{
			name: "bangkok",
			color: "r",
			percentFromTop: 0.506,
			percentFromLeft: 0.797,
			connectedCityKeys: ["chen", "kolk", "hong", "hoch", "jaka"],
			quarantineBoundaries: [
				{ key: "kolk", points: ["tr", "tl"] },
				{ key: "chen", points: ["tl", "bl"] },
				{ key: "jaka", points: ["bl", "br"] },
				{ key: "hoch", points: ["br"] },
				{ key: "hong", points: ["tr"] }
			]
		},
		{
			name: "hong kong",
			color: "r",
			percentFromTop: 0.460,
			percentFromLeft: 0.840,
			connectedCityKeys: ["shan", "taip", "mani", "hoch", "bang", "kolk"],
			quarantineBoundaries: [
				{ key: "shan", points: ["tr", "tl"] },
				{ key: "kolk", points: ["tl", "bl"] },
				{ key: "bang", points: ["bl"] },
				{ key: "hoch", points: ["bl"] },
				{ key: "mani", points: ["br", "tr"] },
				{ key: "taip", points: ["tr"] }
			]
		},
		{
			name: "taipei",
			color: "r",
			percentFromTop: 0.444,
			percentFromLeft: 0.900,
			connectedCityKeys: ["osak", "mani", "hong", "shan"],
			quarantineBoundaries: [
				{ key: "shan", points: ["tr", "tl"] },
				{ key: "hong", points: ["bl"] },
				{ key: "mani", points: ["bl", "br"] },
				{ key: "osak", points: ["br", "tr"] }
			]
		},
		{
			name: "osaka",
			color: "r",
			percentFromTop: 0.413,
			percentFromLeft: 0.955,
			connectedCityKeys: ["toky", "taip"],
			quarantineBoundaries: [
				{ key: "toky", points: ["tr", "tl"] },
				{ key: "taip", points: ["tl", "bl", "br"] },
				{ key: "osak", points: ["br", "tr"] }
			]
		},
		{
			name: "jakarta",
			color: "r",
			percentFromTop: 0.650,
			percentFromLeft: 0.797,
			connectedCityKeys: ["chen", "bang", "hoch", "sydn"],
			quarantineBoundaries: [
				{ key: "bang", points: ["tr", "tl"] },
				{ key: "chen", points: ["tl", "bl"] },
				{ key: "jaka", points: ["bl"] },
				{ key: "sydn", points: ["bl", "br", "tr"] },
				{ key: "hoch", points: ["tr"] }
			]
		},
		{
			name: "ho chi minh city",
			color: "r",
			percentFromTop: 0.583,
			percentFromLeft: 0.843,
			connectedCityKeys: ["jaka", "bang", "hong", "mani"],
			quarantineBoundaries: [
				{ key: "hong", points: ["tr", "tl"] },
				{ key: "bang", points: ["tl"] },
				{ key: "jaka", points: ["bl", "br"] },
				{ key: "mani", points: ["br", "tr"] }
			]
		},
		{
			name: "manila",
			color: "r",
			percentFromTop: 0.576,
			percentFromLeft: 0.917,
			connectedCityKeys: ["sydn", "hoch", "hong", "taip", "sanf"],
			quarantineBoundaries: [
				...[
					{ key: "mani-sanf", points: ["t"] },
					{ key: "mani", points: ["tr"] },
					{ key: "taip", points: ["tr", "tl"] },
					{ key: "hong", points: ["tl"] },
					{ key: "hoch", points: ["bl"] },
					{ key: "sydn", points: ["bl", "br", "tr"] },
					{ key: "mani", points: ["br"] },
					{ key: "mani-sanf", points: ["b"] }
				],
				...getPacificTraversalPoints({ direction: "west" }),
				...[
					{ key: "sanf-mani", points: ["b"] },
					{ key: "sanf", points: ["br", "tr"] },
					{ key: "sanf-mani", points: ["t"] }
				],
				...getPacificTraversalPoints({ direction: "east" })
			]
		},
		{
			name: "sydney",
			color: "r",
			percentFromTop: 0.794,
			percentFromLeft: 0.958,
			connectedCityKeys: ["jaka", "mani", "losa"],
			quarantineBoundaries: [
				...[
					{ key: "sydn-losa", points: ["t"] },
					{ key: "sydn", points: ["tr"] },
					{ key: "mani", points: ["tr", "tl", "bl"] },
					{ key: "sydn", points: ["tl"] },
					{ key: "jaka", points: ["tr", "tl", "bl"] },
					{ key: "sydn", points: ["bl", "br"] },
					{ key: "sydn-losa", points: ["b"] }
				],
				...getPacificTraversalPoints({ direction: "west" }),
				...[
					{ key: "losa-sydn", points: ["b"] },
					{ key: "losa", points: ["br", "tr", "t"] },
					{ key: "losa-sydn", points: ["t"] }
				],
				...getPacificTraversalPoints({ direction: "east" })
			]
		},
	];
	
	for (let city of cityInfo)
	{
		city.key = city.name.replace(/ /g,'').substring(0,4);
		cities[city.key] = new City(city);
	}
})();

function getCity(key)
{
	return cities[key] || false;
}

function isCityKey(cardKey)
{
	return cities.hasOwnProperty(cardKey);
}

const researchStationKeys = new Set();
function newResearchStationElement(cityKey, promptAction)
{
	const $rs = $(`<div class='researchStation' data-key='${cityKey}'>
					<img src='images/pieces/researchStation.png' alt='Research Station' />
				</div>`),
		$boardContainer = $("#boardContainer"),
		$window = $(window);

	$rs.appendTo($boardContainer)
		.draggable(
		{
			confinement: $boardContainer,
			disabled: true,
			drag: function()
			{
				setTravelPathArrowColor({ relocatingResearchStation: true });
				showTravelPathArrow({ $researchStation: $(this) });
			}
		})
		.mousedown(function()
		{
			const $this = $(this);

			if ($this.draggable("option", "disabled"))
				return false;

			turnOffResearchStationHighlights();
			showPlaceholderStation($this);

			$window.off("mouseup").mouseup(function()
			{
				$window.off("mouseup");
				getGovernmentGrantTargetCity($this, promptAction);
			});
		});
	
	return $rs;
}

function updateResearchStationSupplyCount()
{
	$("#researchStationSupplyCount").html(getResearchStationSupplyCount());
}

function getResearchStationSupplyCount()
{
	const MAX_RESEARCH_STATION_COUNT = 6;
	return MAX_RESEARCH_STATION_COUNT - researchStationKeys.size;
}

function showPlaceholderStation($originalStation)
{
	$("#placeholderStation")
		.removeAttr("style")
		.offset($originalStation.offset())
		.removeClass("hidden");
	
	$originalStation.css({
		zIndex: 6,
		opacity: 0.7
	});
}
function hidePlaceholderStation($originalStation)
{
	removeStylePropertiesFrom($originalStation.removeClass("hidden"), ["z-index", "opacity"]);
	$("#placeholderStation").addClass("hidden");
}

async function highlightAllResearchStations()
{
	const $researchStations = $("#boardContainer").children(".researchStation").not("#placeholderStation");

	if ($researchStations.first().hasClass("glowing"))
		return false;

	$researchStations.addClass("glowing");
	
	while ($researchStations.first().hasClass("glowing"))
	{
		if ($researchStations.first().hasClass("mediumGlow"))
			$researchStations.removeClass("mediumGlow").addClass("smallGlow");
		else
			$researchStations.removeClass("smallGlow").addClass("mediumGlow");
		
		await sleep(500);
	}
}

function turnOffResearchStationHighlights()
{
	$("#boardContainer").children(".researchStation")
		.not("#placeholderStation")
		.removeClass("mediumGlow smallGlow glowing");
}

async function getGovernmentGrantTargetCity($researchStation, promptAction)
{
	const stationOffset = $researchStation.offset(),
		distanceThreshold = getDimension("piecePlacementThreshold"),
		relocating = !$researchStation.hasClass("grantStation"),
		relocationKey = relocating ? $researchStation.attr("data-key") : false,
		eventType = eventTypes.governmentGrant;

	// Measure from the element's centre.
	stationOffset.top += $researchStation.height() / 2;
	stationOffset.left += $researchStation.width() / 2;

	let targetCity;
	for (let key in cities)
	{
		targetCity = getCity(key);
		if (!targetCity.hasResearchStation
			&& distanceBetweenPoints(stationOffset, targetCity.getOffset()) < distanceThreshold)
		{
			hidePlaceholderStation($researchStation);

			if (relocating)
			{
				const origin = getCity(relocationKey);
				origin.clusterResearchStation();
				gameData.promptedTravelPathProperties = { origin, destination: targetCity };
			}
			else
			{
				gameData.promptedTravelPathProperties = { $researchStation, destination: targetCity };
				resetGrantStation($researchStation);
				turnOffResearchStationSupplyHighlight();
			}
			showTravelPathArrow();
			
			return promptAction({ eventType, targetCity, relocationKey });
		}
	}
	
	disableResearchStationDragging();
	$researchStation.addClass("hidden");
	await animateInvalidTravelPath();
	hidePlaceholderStation($researchStation);
	
	if (relocating)
	{
		getCity(relocationKey).clusterResearchStation();
		
		if (!gameData.promptedTravelPathProperties)
			highlightAllResearchStations();
	}
	else
	{
		await resetGrantStation($researchStation);

		if (!gameData.promptedTravelPathProperties)
		{
			highlightResearchStationSupply($researchStation);
			showGovernmentGrantArrow();
		}

	}
	showTravelPathArrow();
	enableResearchStationDragging();
}

async function highlightResearchStationSupply($grantStation)
{
	const $stationContainer = $("#researchStationSupply").children(".researchStation");

	$grantStation.addClass("glowing");

	while ($grantStation.hasClass("glowing"))
	{
		if ($stationContainer.hasClass("bigGlow"))
			$stationContainer.removeClass("bigGlow").addClass("mediumGlow");
		else
			$stationContainer.removeClass("mediumGlow").addClass("bigGlow");
		
		await sleep(500);
	}
	
	$stationContainer.removeClass("bigGlow mediumGlow");
}

function turnOffResearchStationSupplyHighlight()
{
	$("#governmentGrantArrow").addClass("hidden");
	$("#researchStationSupply").children(".researchStation").removeClass("bigGlow mediumGlow");
	$(".grantStation").removeClass("glowing");
}

async function showGovernmentGrantArrow()
{
	const $arrow = $("#governmentGrantArrow");

	const initialOffset = positionGovernmentGrantArrow($arrow),
		bobDistance = $arrow.height() * 0.75,
		duration = 350;

	while (!$arrow.hasClass("hidden"))
		await bobUpAndDown($arrow, { initialOffset, bobDistance, duration });
}

function positionGovernmentGrantArrow($arrow)
{
	const $researchStationSupply = $("#researchStationSupply"),
		offset = $researchStationSupply.offset();
	
	$arrow = $arrow || $("#governmentGrantArrow");
	makeElementsSquare($arrow.removeClass("hidden"));
	
	offset.top -= $arrow.outerHeight();
	offset.left += $researchStationSupply.outerWidth() / 2;
	offset.left -= $arrow.outerWidth() / 2;

	$arrow.offset(offset);

	return offset;
}

async function resetGrantStation($grantStation)
{
	$grantStation = $grantStation || $("#boardContainer > .researchStation.grantStation");

	if (!$grantStation.length)
		return false;
	
	$grantStation.offset($("#researchStationSupply img").offset());
}

function getAllResearchStations()
{
	return [...researchStationKeys]
		.filter(key => isCityKey(key))
		.map(key => getCity(key).getResearchStation());
}

function enableResearchStationDragging()
{
	for (let $rs of getAllResearchStations())
		$rs.draggable("enable").addClass("relocatable");
}

function disableResearchStationDragging()
{
	for (let $rs of getAllResearchStations())
		$rs.draggable({ disabled: true }).removeClass("relocatable");
}

const diseaseCubeSupplies = {
    y: 24,
    r: 24,
    u: 24,
    b: 24
};

const pacificPaths = {
    "sanf-toky": { percentFromTop: 0.328, percentFromLeft: 0 },
    "sanf-mani": { percentFromTop: 0.349, percentFromLeft: 0 },
    "losa-sydn": { percentFromTop: 0.491, percentFromLeft: 0 },
    "toky-sanf": { percentFromTop: 0.331, percentFromLeft: 1 },
    "mani-sanf": { percentFromTop: 0.554, percentFromLeft: 1 },
    "sydn-losa": { percentFromTop: 0.774, percentFromLeft: 1 },
    "top-left": { percentFromTop: 0, percentFromLeft: 0 },
    "top-right": { percentFromTop: 0, percentFromLeft: 1 },
    "bottom-left": { percentFromTop: 1, percentFromLeft: 0 },
    "bottom-right": { percentFromTop: 1, percentFromLeft: 1 }
};

function getPacificPath(key)
{
	if (key in pacificPaths)
		return pacificPaths[key];
	
	return console.error(`pacificPath does not exist: '${key}'`);
}

function getPacificTraversalPoints({ direction })
{
	if (direction === "east")
	{
		return [
			{ key: "bottom-left", points: ["bl"] },
			{ key: "bottom-right", points: ["br"] }
		];
	}
	
	if (direction === "west")
	{
		return [
			{ key: "bottom-right", points: ["br"] },
			{ key: "bottom-left", points: ["bl"] }
		];
	}
}

function checkMovementResultsForPanelOcclusion(city, resultsToCheck)
{
	const { players } = gameData;

	for (let rID in players)
		players[rID].panel.checkMovementResultsForOcclusion(city, resultsToCheck);
}

// Disease cube offsets are created as an object with a property for each color of disease cube the city contains.
// Each color property contains an array of coordinates (one set of coordinates for each disease cube).
function formatCubeOffsetsForPanelOcclusionCheck(diseaseCubeOffsets)
{
	let offsets = [];

	for (let color in diseaseCubeOffsets)
	{
		for (let offset of diseaseCubeOffsets[color])
		{
			offsets.push({
				$piece: offset.$piece,
				newOffset: {
					top: offset.top,
					left: offset.left
				}
			});
		}
	}
	
	return offsets;
}

export {
    cities,
	getCity,
	isCityKey,
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
    diseaseCubeSupplies,
    getPacificPath
}