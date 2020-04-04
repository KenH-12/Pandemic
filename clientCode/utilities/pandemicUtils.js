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

// Facilitates responsiveness where simple css rules fail
// Returns a dimension value calculated using gameData.sizeRatios
function getDimension(gameData, dimension,
	{
		compliment,
		getFactor,
		format
	} = {})
{
	const ratio = gameData.sizeRatios[dimension],
		base = gameData[ratio[0]]; // some value that is updated on resize events
	let factor = compliment ? 1 - ratio[1] : ratio[1]; // the ratio to the base value, or optionally the compliment of that ratio
	
	if (format == "percent")
		factor *= 100;
	
	if (getFactor)
		return factor;
	
	return Math.round(base * factor);
}

function getDuration({ skipping, durations }, durationNameOrMs)
{
	if (skipping)
		return 0;
	
	if (isNaN(durationNameOrMs))
		return durations[durationNameOrMs];
	
	return durationNameOrMs;
}

function setDuration({ durations }, durationName, ms)
{
	durations[durationName] = ms;
}