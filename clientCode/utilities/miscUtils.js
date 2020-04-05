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