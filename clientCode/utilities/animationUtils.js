"use strict";

function animationPromise({ $elements, initialProperties, desiredProperties, duration, easing, callback })
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
					{
						resolve();

						if (typeof callback === "function")
							callback();
					}
				});
		});
}

function bobUpAndDown($e, { initialOffset, bobDistance, duration, easing } = {})
{
	return new Promise(async resolve =>
	{
		initialOffset = initialOffset || $e.offset();
		easing = easing || "easeInOutSine";

		const desiredProperties = {
			left: initialOffset.left,
			top: initialOffset.top - (bobDistance || $e.height())
		};
	
		await animationPromise({
			$elements: $e,
			desiredProperties,
			duration,
			easing
		});

		await animationPromise({
			$elements: $e,
			desiredProperties: initialOffset,
			duration,
			easing
		});
		resolve();
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

async function oscillateButtonBackgroundColor($button)
{
	const flashing = "flashing",
		secondaryButtonColors = "button-secondary-color",
		interval = 600;

	$button.addClass(flashing);

	while (!$button.hasClass("hidden") && !$button.hasClass("btnDisabled"))
	{
		await sleep(interval);
		$button.addClass(secondaryButtonColors);
		await sleep(interval);
		$button.removeClass(secondaryButtonColors);
	}

	$button.removeClass(`${flashing} ${secondaryButtonColors}`);
}

function oscillateBetweenCssTransitions($elements, classA, classB, interval, conditionFn)
{
	return new Promise(async resolve =>
	{
		conditionFn = typeof conditionFn === "function" ? conditionFn : () => false;
		
		do
		{
			if ($elements.hasClass(classA))
				$elements.removeClass(classA).addClass(classB);
			else
				$elements.removeClass(classB).addClass(classA);
			
			await sleep(interval);
		}
		while (conditionFn());

		$elements.removeClass(`${classA} ${classB}`);

		resolve();
	});
}
