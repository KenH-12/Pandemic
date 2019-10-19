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

// Useful for extracting numbers from the beginning of css property values such as border or padding.
function getNumberFromStartOfString(string)
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
	const s = capitalizeWords(string);

	return s[0].toLowerCase() + s.substring(1).replace(/ /g,"");
}

// Returns a new object with name-value pairs derived from two parallel string arrays.
function objectFromParallelArrays(names, values)
{
	const obj = {};
	
	for (let i = 0; i < names.length; i++)
		obj[names[i]] = values[i];
	
	return obj;
}

function distanceBetweenPoints(pointA, pointB)
{
	return Math.sqrt(Math.pow(Math.abs(pointA.left - pointB.left), 2) + Math.pow(Math.abs(pointA.top - pointB.top), 2));
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