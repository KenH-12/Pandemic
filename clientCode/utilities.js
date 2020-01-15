// Abbreviated console.log
function log(...args)
{
	console.log(...args);
}

// Returns a Promise that resolves after ms milliseconds.
function sleep(ms)
{
	return new Promise(resolve => setTimeout(resolve, ms));
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

async function delayExecution(fn, delayMs)
{
	await sleep(delayMs);
	fn();
}

function getFilteredMemberArray(obj, filterFn)
{
	const filteredMembers = [];
	
	let member;
	for (let key in obj)
	{
		member = obj[key];

		if (filterFn(member))
			filteredMembers.push(member);
	}

	return filteredMembers;
}

// Allows a delay before responding to an event.
const waitForFinalEvent = (function ()
{
	let timers = {};
	return function (callback, ms, uniqueId)
	{
		if (!uniqueId)
			uniqueId = "Don't call this twice without a uniqueId";
		
		if (timers[uniqueId])
			clearTimeout (timers[uniqueId]);
		
		timers[uniqueId] = setTimeout(callback, ms);
	};
})();

function unhide(...$elements)
{
	for (let $e of [...$elements])
		$e.removeClass("hidden").removeAttr("style");
}

function buttonClickPromise($btn, { beforeClick, afterClick } = {})
{
	return new Promise(resolve =>
		{
			$btn.off("click")
				.click(function()
				{
					$btn.off("click");

					if (afterClick)
					{
						if (afterClick == "hide")
							$btn.removeAttr("style").addClass("hidden");
						else if (afterClick == "fadeOut")
							$btn.fadeOut(function() { $btn.removeAttr("style").addClass("hidden"); });
					}

					resolve();
				});
			
			if (beforeClick)
			{
				if (beforeClick == "fadeIn")
					$btn.fadeIn(function() { unhide($btn); });
				else if (beforeClick == "show")
					unhide($btn);
			}
		});
}

function animatePromise({ $elements, initialProperties, desiredProperties, duration, easing })
{
	return new Promise(resolve =>
		{
			if (isNaN(duration))
				duration = 400;
			
			if (initialProperties)
				$elements.css(initialProperties);
			
			$elements.animate(desiredProperties,
				duration,
				easing || "linear",
				function()
				{
					if ($(this).is($elements.last()))
						resolve();
				});
		});
}

function propertyStrobe($elements,
	{
		initialState,
		strobeState,
		numFlashes = 3,
		flashIntervalMs = 200,
		endOnStrobeState = false
	})
{
	return new Promise(async (resolve, reject) =>
	{
		if (numFlashes < 0)
			return reject("Parameter 'numFlashes' of function 'propertyStobe' cannot be negative.");
		
		// Ensure the correct number of flashes occur.
		let iMax = 2 * numFlashes - 1;
		if (endOnStrobeState) iMax--;
		
		for (let i = 0; i <= iMax; i++)
		{
			if (i % 2 === 0)
				$elements.css(strobeState);
			else
				$elements.css(initialState);

			await sleep(flashIntervalMs);
		}
		resolve();
	});
}

// Useful for extracting numbers from the beginning of css property values such as border or padding.
function getLeadingNumber(string)
{
	let numberString = "";
	
	for (let char of string)
	{
		if (isNaN(char))
			break;
		
		numberString += char;
	}
	
	return Number(numberString);
}

// Sets the height of all matched elements to the first matched element's width.
function makeElementsSquare(cssSelector)
{
	const $elements = $(cssSelector);
	$elements.height($elements.first().width());
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

function removeWhitespace(string)
{
	return string.replace(/ /g,"");
}

// Capitalizes the first character of every word in the string, and returns the new string.
function capitalizeWords(string)
{
	let capitalizedString = string[0].toUpperCase(),
		c;
	for (let i = 1; i < string.length; i++)
	{
		c = string[i];
		
		capitalizedString += c;
		
		if (c === " ")
			capitalizedString += string[++i].toUpperCase();
	}
	return capitalizedString;
}

function toCamelCase(string)
{
	const pascalCaseString = toPascalCase(string);

	return pascalCaseString[0].toLowerCase() + pascalCaseString.substring(1);
}

function toPascalCase(string)
{
	return removeWhitespace(capitalizeWords(string));
}

function typeOutString($element, string, { trailingEllipsis })
{
	return new Promise(async resolve =>
	{
		if (trailingEllipsis)
			string += "    .    .    .";
		
		$element.html("");
		
		for (let char of string)
		{
			$element.html($element.html() + char);
			await sleep(25);
		}
		resolve();
	});
}

function numberWithCommas(x)
{
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Returns a new object with name-value pairs derived from two parallel string arrays.
function objectFromParallelArrays(names, values)
{
	const obj = {};
	
	for (let i = 0; i < names.length; i++)
		obj[names[i]] = values[i];
	
	return obj;
}

function randomNumberBetween(min, max)
{
	return Math.floor(Math.random() * max) + min;
}

function ensureIsArray(obj)
{
	if (Array.isArray(obj))
		return obj;

	return [obj];
}

function lockElements($elements)
{
	let $e, initialOffset, initialWidth;
	
	for (let i = $elements.length - 1; i >= 0; i--)
	{
		$e = $elements.eq(i);
		initialOffset = $e.offset();
		initialWidth = $e.width();

		$e.css("position", "absolute")
			.offset(initialOffset)
			.width(initialWidth);
	}
}

function getHorizontalOverflow($element)
{
	const element = document.getElementById($element.attr("id"));
	return element.scrollWidth - element.clientWidth;
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

function distanceBetweenPoints(pointA, pointB)
{
	return Math.sqrt(Math.pow(Math.abs(pointA.left - pointB.left), 2) + Math.pow(Math.abs(pointA.top - pointB.top), 2));
}

function slopeOfLine(a, b)
{
	return (a.top - b.top) / (a.left - b.left);
}
function getPerpendicularSlope(a, b)
{
	const slope =  slopeOfLine(a, b);

	if (slope === Infinity || slope === -Infinity)
		return 0;
	
	return -(1/slope);
}
function getYIntercept(a, b)
{
	return a.top - slopeOfLine(a, b)*a.left;
}
function getYInterceptFromSlope(point, slope)
{
	return point.top - slope*point.left;
}
function getVector(a, b)
{
	return {
		left: b.left - a.left,
		top: b.top - a.top
	};
}
function getVectorLength(v)
{
	return Math.sqrt( Math.pow(v.left,2) + Math.pow(v.top,2) );
}
function normalizeVector(v)
{
	const vLength = getVectorLength(v);
	return {
		left: v.left / vLength,
		top: v.top / vLength
	};
}
function getArrowClipPath({ baseOffset, tipOffset, stemWidth, headWidth, headLength, containerWidth, containerHeight } = {})
{
	headWidth = headWidth || stemWidth * 3;
	headLength = headLength || headWidth;
	
	const arrowheadBase = getPointAtDistanceAlongLine(tipOffset, baseOffset, headLength),
		halfStemWidth = stemWidth / 2,
		halfHeadWidth = headWidth / 2,
		pointProperties = [
			{ vectorPoint: arrowheadBase, belowLine: true, distanceFromVector: halfHeadWidth },
			{ vectorPoint: arrowheadBase, belowLine: true, distanceFromVector: halfStemWidth },
			{ vectorPoint: baseOffset, belowLine: true, distanceFromVector: halfStemWidth },
			{ vectorPoint: baseOffset, belowLine: false, distanceFromVector: halfStemWidth },
			{ vectorPoint: arrowheadBase, belowLine: false, distanceFromVector: halfStemWidth },
			{ vectorPoint: arrowheadBase, belowLine: false, distanceFromVector: halfHeadWidth }
		],
		perpendicularSlope = getPerpendicularSlope(baseOffset, tipOffset),
		points = [tipOffset];

	for (let i = 0; i < pointProperties.length; i++)
	{
		const {
			vectorPoint,
			belowLine,
			distanceFromVector
		} = pointProperties[i];

		points.push(getPointAtDistancePerpendicularToLine({ a: vectorPoint, distance: distanceFromVector }, {
				perpendicularSlope,
				belowLine
			}));
	}

	return getClipPathPolygonFromPoints(containerWidth, containerHeight, points);
}
function getPointAtDistancePerpendicularToLine({ a, distance }, {
		b,
		perpendicularSlope,
		belowLine
	} = {})
{
	perpendicularSlope = isNaN(perpendicularSlope) ? getPerpendicularSlope(a, b) : perpendicularSlope;

	const perpendicularDirection = belowLine ? -1 : 1;

	if (perpendicularSlope === Infinity || perpendicularSlope === -Infinity)
	{
		return {
			left: a.left,
			top: a.top + distance*perpendicularDirection
		}
	}

	const somePerpendicularX = a.left - distance*perpendicularDirection,
		somePerpendicularPoint = {
			left: somePerpendicularX,
			top: perpendicularSlope*somePerpendicularX + getYInterceptFromSlope(a, perpendicularSlope)
		};
	
	return getPointAtDistanceAlongLine(a, somePerpendicularPoint, distance);
}
function getPointAtDistanceAlongLine(a, b, distanceFromA)
{
	const u = normalizeVector(getVector(a, b));
	
	return {
		left: a.left + (distanceFromA*u.left),
		top: a.top + (distanceFromA*u.top)
	};
}
function getClipPathPolygonFromPoints(containerWidth, containerHeight, points)
{
	let clipPath = "polygon(";

	for (let point of points)
		clipPath += `${(point.left / containerWidth * 100).toFixed(2)}% ${(point.top / containerHeight * 100).toFixed(2)}%,`;
	
	clipPath = clipPath.substring(0, clipPath.length - 1);
	clipPath += ")";

	return clipPath;
}

function newDiseaseCubeElement({ color, cityKey, asJqueryObject = true } = {})
{
	let cssClasses = "diseaseCube";
	if (color) cssClasses += ` ${color}`;
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

	return `<div class='playerCard epidemic' data-key='epid'${ noTooltip ? "" : " title='Epidemic card'" }>EPIDEMIC</div>`;
}

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