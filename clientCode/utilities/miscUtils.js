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

function resolvePromiseOnLoad($img)
{
	return new Promise(resolve =>
	{
		$img.on("load", function()
		{
			resolve();
		});
	});
}

function removeStylePropertiesFrom($element, propertyNames)
{
	if (!propertyNames)
	{
		$element.removeAttr("style");
		return false;
	}

	const element = $element[0],
		removalMethod = element.style.removeProperty ? "removeProperty" : "removeAttribute";

	for (let propertyName of ensureIsArray(propertyNames))
		element.style[removalMethod](propertyName);
}

// Sets the height of all matched elements to the first matched element's width.
function makeElementsSquare(cssSelector)
{
	const $elements = $(cssSelector);
	$elements.height($elements.first().width());
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

function isOverflowingVertically($element)
{
	const element = document.getElementById($element.attr("id"));
	return element.scrollHeight > element.clientHeight;
}

function ensureDivPositionIsWithinWindowHeight($div, { margin = 5 } = {})
{
	const windowHeight = $(window).height(),
		$images = $div.find("img");
	
	for (let i = 0; i < $images.length; i++)
		$images.eq(i).on("load", () => ensureDivPositionIsWithinWindowHeight($div));
	
	const divHeight = $div.outerHeight() + margin;

    if ($div.offset().top + divHeight > windowHeight)
		$div.offset({ top: windowHeight - divHeight });
	
	if ($div.hasClass("tooltip"))
		setTooltipArrowClipPath($div);
}

function ensureDivPositionIsWithinWindowWidth($div, { margin = 5 } = {})
{
	const windowWidth = $(window).width(),
		divWidth = $div.outerWidth() + margin,
		divLeft = $div.offset().left;
	
	if (divLeft < 0)
	{
		$div.offset({ left: margin });
		return false;
	}
		
	if (divLeft + divWidth > windowWidth)
		$div.offset({ top: windowWidth - divWidth });
}

function elementsOverlap(element1, element2)
{
	const rect1 = element1.getBoundingClientRect(),
		rect2 = element2.getBoundingClientRect();
	
	return !(rect1.right < rect2.left || 
		rect1.left > rect2.right || 
		rect1.bottom < rect2.top || 
		rect1.top > rect2.bottom);
}