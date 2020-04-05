function elementsOverlap(element1, element2)
{
	const rect1 = element1.getBoundingClientRect(),
		rect2 = element2.getBoundingClientRect();
	
	return !(rect1.right < rect2.left || 
		rect1.left > rect2.right || 
		rect1.bottom < rect2.top || 
		rect1.top > rect2.bottom);
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