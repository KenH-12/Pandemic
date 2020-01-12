"use strict";

export default class City
{
	constructor({ key, name, percentFromTop, percentFromLeft, connectedCityKeys, quarantineBoundaries, color })
	{
		this.key = key;
		this.name = capitalizeWords(name);
		this.color = color;
		this.percentFromTop = percentFromTop;
		this.percentFromLeft = percentFromLeft;
		this.connectedCityKeys = connectedCityKeys; // string array
		this.quarantineBoundaries = quarantineBoundaries;
		
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
	getOffset({ boardHeight, boardWidth, cubeWidth, pawnHeight, pawnWidth }, pieceToCenter)
	{
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

	getResearchStation()
	{
		return $(`.researchStation[data-key='${this.key}']`);
	}
	
	// Puts a research station on this city.
	buildResearchStation(gameData, { animate, isGovernmentGrant } = {})
	{
		let $rs,
			stationInitialOffset = false;
		if (isGovernmentGrant)
		{
			$rs = $("#boardContainer > .researchStation.grantStation");
			stationInitialOffset = $rs.offset();

			log("stationInitialOffset:", stationInitialOffset);
			$rs.replaceWith(newResearchStationElement(this.key))
				.removeAttr("style");
			researchStationKeys.delete("grantStation");
		}
		else
			$rs = newResearchStationElement(this.key);
		
		this.hasResearchStation = true;
		researchStationKeys.add(this.key);
		updateResearchStationSupplyCount();

		if (animate)
		{
			stationInitialOffset = stationInitialOffset || $("#researchStationSupply .researchStation").offset();
			return this.cluster(gameData,
				{
					stationInitialOffset,
					animateResearchStation: true,
					animatePawns: true,
					animateCubes: true
				});
		}
	}

	relocateResearchStationTo(gameData, city)
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

		return city.cluster(gameData, { animateResearchStation: true, stationInitialOffset, animatePawns: true });
	}
	
	setPawnIndices(activePlayer)
	{
		const activePawn = activePlayer.$pawn;
		
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
	cluster(
        gameData,
        {
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
            cityOffset = this.getOffset(gameData),
            { pawnHeight, pawnWidth } = gameData,
			coordsArray = [];
		
		let pawnTop = cityOffset.top - pawnHeight,
			pawnLeft = cityOffset.left - pawnWidth,
			i;
		
		if (this.hasResearchStation && this.key !== stationKeyToExclude)
		{
			this.clusterResearchStation(gameData, { animateResearchStation, stationInitialOffset });

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

		const pawnAnimationDuration = getDuration(gameData, "pawnAnimation");
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
				$this.animate(newOffset, pawnAnimationDuration, gameData.easings.pawnAnimation);
			else
				$this.offset(newOffset);
			
			i++;
		});

		// reset to default
		setDuration(gameData, "pawnAnimation", 250);

		this.clusterDiseaseCubes(gameData, { animate: (animateCubes || animatePawns) });

		// Return a Promise with the most relevant duration.
		let ms = 0;
		if (animateResearchStation) // Station animation takes the longest.
			ms = getDuration(gameData, "stationPlacement");
		else if (animateCubes) // Cube animation takes longer than pawn animation.
			ms = getDuration(gameData, "cubePlacement");
		else if (animatePawns)
			ms = pawnAnimationDuration;

		return sleep(ms);
	}

	clusterResearchStation(gameData, { animateResearchStation, stationInitialOffset } = {})
	{
		log(`clustering ${this.name}'s station`);
		const $researchStation = this.getResearchStation(),
			desiredOffset = this.getOffset(gameData),
			duration = getDuration(gameData, "stationPlacement");
		
		desiredOffset.top -= gameData.stationHeight * 0.85;
		desiredOffset.left -= gameData.stationWidth * 0.8;
		
		if (animateResearchStation)
		{
			if (stationInitialOffset)
				$researchStation.offset(stationInitialOffset);
			
			$researchStation.animate(
			{
				top: desiredOffset.top,
				left: desiredOffset.left,
				width: gameData.stationWidth
			}, duration, gameData.easings.stationPlacement);
		}
		else
			$researchStation.offset(desiredOffset);
		
		return sleep(duration);
	}

	clusterDiseaseCubes(gameData, { animate } = {})
	{
		const $cubes = $(`.diseaseCube.${this.key}`),
			colors = new Set(),
			coordinates = {},
			cityOffset = this.getOffset(gameData, "cube"),
			cubeWidth = getDimension(gameData, "cubeWidth"),
			numPawnsInCity = this.getOccupants(gameData.players).length,
			duration = animate ? getDuration(gameData, "cubePlacement") : 0;
		
		if (!$cubes.length)
			return;
		
		$cubes.each(function(){ colors.add(getColorClass($(this))) });

		let topAdjustment;
		if (numPawnsInCity > 2
			|| (this.hasResearchStation && ($cubes.length > 1 || numPawnsInCity > 0)))
			topAdjustment = cubeWidth * 1.25;
		else
			topAdjustment = cubeWidth / 2;

		// Get y values to create a column for each color.
		let top;
		for (let color of [...colors])
		{
			top = cityOffset.top + topAdjustment;
			coordinates[color] = [];
			
			for (let i = 0; i < $cubes.filter(`.${color}`).length; i++)
			{
				top -= cubeWidth * 0.5
				coordinates[color].push({ top });
			}
		}

		// Sort colors by column size ascending.
		const colorOrder = [],
			MIN_COL_HEIGHT = 1,
			MAX_CUBES_OF_COLOR_ON_CITY = 3, // 4th cube causes an outbreak.
			MAX_INFECTIONS_PER_OUTBREAK = 6, // Hong Kong / Istanbul both have 6 neighbouring cities.
			MAX_COL_HEIGHT = MAX_CUBES_OF_COLOR_ON_CITY + MAX_INFECTIONS_PER_OUTBREAK;

		for (let i = MIN_COL_HEIGHT; i <= MAX_COL_HEIGHT; i++)
			for (let color in coordinates)
				if (coordinates[color].length === i)
					colorOrder.push(color);

		// Get x values to separate each column.
		let left = cityOffset.left;
		if (colors.size > 1)
			left -= (colors.size - 1) * (cubeWidth / 2);
		
		for (let color of colorOrder)
		{
			for (let coord of coordinates[color])
			{
				coord.left = left;
				coord.width = cubeWidth;
				coord.height = cubeWidth;
			}
			
			left += cubeWidth;
		}

		let $cubesOfColor;
		for (let color in coordinates)
		{
			$cubesOfColor = $cubes.filter(`.${color}`);

			for (let i = 0; i < $cubesOfColor.length; i++)
			{
				if (animate)
					$cubesOfColor.eq(i).animate(coordinates[color][i], getDuration(gameData, duration), gameData.easings.cubePlacement);
				else
					$cubesOfColor.eq(i).offset(coordinates[color][i]);
			}
		}
		return sleep(getDuration(gameData, duration));
	}

	getPlayerCard({ noTooltip })
	{
		const { name, color, key } = this, 
			tooltip = noTooltip ? "" : ` title='City card
Click to locate ${name}'`;

		return `<div class='playerCard ${color}' data-key='${key}'${tooltip}>${name.toUpperCase()}</div>`;
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
	if (key in cities)
		return cities[key];
	
	if (!(key in pacificPaths))
		console.error(`cityKey does not exist: '${key}'`);
	
	return false;
}

const researchStationKeys = new Set();
function newResearchStationElement(cityKey)
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
			$this.stop().css("z-index", 6);
			showPlaceholderStation($this);

			$window.off("mouseup").mouseup(function()
			{
				$window.off("mouseup");
				getGovernmentGrantTargetCity($this);
				hidePlaceholderStation($this);
				$this.css("z-index", 3);
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
	
	$originalStation.css("opacity", 0.7);
}
function hidePlaceholderStation($originalStation)
{
	$originalStation.css("opacity", 1);
	$("#placeholderStation").addClass("hidden");
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
	if (key in data.pacificPaths)
		return data.pacificPaths[key];
	
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

export {
    cities,
    getCity,
    researchStationKeys,
    updateResearchStationSupplyCount,
    getResearchStationSupplyCount,
    diseaseCubeSupplies,
    getPacificPath
}