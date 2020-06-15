"use strict";

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

// Allows a delay before responding to an event.
const waitForFinalEvent = (function ()
{
	let timers = {};
	return function (callback, ms, uniqueId)
	{
		if (!uniqueId)
			uniqueId = "Don't call this twice without a uniqueId";
		
		if (timers[uniqueId])
			clearTimeout(timers[uniqueId]);
		
		timers[uniqueId] = setTimeout(callback, ms);
	};
})();

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
					$btn.fadeIn(function() { $btn.removeClass("hidden").removeAttr("style"); });
				else if (beforeClick == "show")
					$btn.removeClass("hidden").removeAttr("style");
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

function ensureIsArray(obj)
{
	if (Array.isArray(obj))
		return obj;

	return [obj];
}

// Returns a new object with name-value pairs derived from two parallel string arrays.
function objectFromParallelArrays(names, values)
{
	const obj = {};
	
	for (let i = 0; i < names.length; i++)
		obj[names[i]] = values[i];
	
	return obj;
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

function randomNumberBetween(min, max)
{
	return Math.floor(Math.random() * max) + min;
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

function removeInlineStylePropertiesFrom($elements, propertyNames)
{
	if (!propertyNames)
	{
		$elements.removeAttr("style");
		return false;
	}

	let element,
		removalMethod;
	
	for (let i = 0; i < $elements.length; i++)
	{
		element = $elements.eq(i)[0];
		removalMethod = element.style.removeProperty ? "removeProperty" : "removeAttribute";
	
		for (let propertyName of ensureIsArray(propertyNames))
			element.style[removalMethod](propertyName);
	}
}

function removeAllDataAttributes($element)
{
	$.each($element.data(), i => $element.removeAttr(`data-${i}`));
}

// Sets the height of all matched elements to the first matched element's width.
function makeElementsSquare(cssSelector)
{
	const $elements = $(cssSelector);
	$elements.height($elements.first().width());
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

function loadAllImagesPromise($images)
{
	const promises = [];
	let promise;
	
	for (let i = 0; i < $images.length; i++)
	{
		promise = new Promise(resolve =>
		{
			$images.eq(i).on("load", () => resolve());
		});
		
		promises.push(promise);
	}
		
	return Promise.all(promises);
}

function emailIsInvalid(email)
{
	return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());
}

function devToolsIsOpen()
{
	const element = new Image();
	let isOpen = false;

	Object.defineProperty(element, 'id', {
		get: () => isOpen = true
	});

	console.log(element);

	return isOpen;
}

function bindKeypressEventListeners($elements, keyCode, fn)
{
	$elements.keypress(function(event)
	{
		if (event.which === keyCode || event.keyCode === keyCode)
		{
			fn();
			return false;
		}
		return true;
	});
}