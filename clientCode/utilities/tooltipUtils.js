async function positionTooltipRelativeToElement($tooltip, $element, { juxtaposeTo = "left", tooltipMargin } = {})
{
	tooltipMargin = tooltipMargin || 15;
	
	const elementOffset = $element.offset(),
		tooltipOffset = elementOffset;

	$tooltip.appendTo("#boardContainer")
		.data("relatedElementId", $element.attr("id"))
		.data("juxt", juxtaposeTo)
		.data("margin", tooltipMargin);
	
	if (["left", "right"].includes(juxtaposeTo))
	{
		tooltipOffset.top -= Math.abs($element.height() - $tooltip.height()) / 2;
		
		if (juxtaposeTo === "left")
			tooltipOffset.left -= $tooltip.outerWidth();
		else if (juxtaposeTo === "right")
			tooltipOffset.left += $element.outerWidth();
	}
	else // juxtaposeTo top or bottom
	{
		const elementWidth = $element.width(),
			tooltipWidth = $tooltip.width(),
			halfDeltaWidth = Math.abs(elementWidth - tooltipWidth) / 2;
		
		if (tooltipWidth > elementWidth)
			tooltipOffset.left -= halfDeltaWidth;
		else
			tooltipOffset.left += halfDeltaWidth;

		if (juxtaposeTo === "top")
			tooltipOffset.top -= $tooltip.outerHeight() + tooltipMargin;
		else // juxtaposeTo bottom
			tooltipOffset.top += $element.outerHeight();
	}

	$tooltip.offset(tooltipOffset);
	
	await loadAllImagesPromise($tooltip.find("img"));
	
	ensureDivPositionIsWithinWindowWidth($tooltip, { windowPadding: 2 });
	ensureDivPositionIsWithinWindowHeight($tooltip);
}

function setTooltipArrowClipPath($tooltip)
{
	const tooltipMargin = $tooltip.data("margin"),
		juxtaposeTo = $tooltip.data("juxt"),
		tooltipOffset = setTooltipPaddingAndReturnOffset($tooltip, { tooltipMargin, juxtaposeTo }),
		tooltipWidth = $tooltip.width(),
		marginPercentageOfWidth = (tooltipMargin / tooltipWidth)*100,
		tooltipHeight = $tooltip.height(),
		marginPercentageOfHeight = (tooltipMargin / tooltipHeight)*100,
		$element = $(`#${$tooltip.data("relatedElementId")}`),
		elementOffset = $element.offset();
	
	let actualArrowCentre,
		arrowCentrePercentage,
		halfArrowHeight,
		arrowSideEdgePercentage,
		clipPath;

	if (["left", "right"].includes(juxtaposeTo))
	{
		actualArrowCentre = elementOffset.top + ($element.height() / 2);
		arrowCentrePercentage = ((actualArrowCentre - tooltipOffset.top) / tooltipHeight) * 100;
		
		halfArrowHeight = marginPercentageOfHeight / 2;
		
		if (juxtaposeTo === "left")
		{
			arrowSideEdgePercentage = 100 - marginPercentageOfWidth;
			
			clipPath = `polygon(0 0,
						${arrowSideEdgePercentage}% 0,
						${arrowSideEdgePercentage}% ${ arrowCentrePercentage - halfArrowHeight }%,
						100% ${arrowCentrePercentage}%,
						${arrowSideEdgePercentage}% ${ arrowCentrePercentage + halfArrowHeight }%,
						${arrowSideEdgePercentage}% 100%,
						0 100%)`;
		}
		else // juxtaposeTo right
		{
			clipPath = `polygon(${marginPercentageOfWidth}% 0,
						100% 0,
						100% 100%,
						${marginPercentageOfWidth}% 100%,
						${marginPercentageOfWidth}% ${ arrowCentrePercentage + halfArrowHeight }%,
						0 ${arrowCentrePercentage}%,
						${marginPercentageOfWidth}% ${ arrowCentrePercentage - halfArrowHeight }%)`;
		}
	}
	else // juxtaposeTo top or bottom
	{
		actualArrowCentre = elementOffset.left + ($element.width() / 2);
		arrowCentrePercentage = ((actualArrowCentre - tooltipOffset.left) / tooltipWidth) * 100;

		const halfArrowWidth = marginPercentageOfWidth / 2;
		
		if (juxtaposeTo === "top")
		{
			arrowSideEdgePercentage = 100 - marginPercentageOfHeight;
			
			clipPath = `polygon(0 0,
						100% 0,
						100% ${arrowSideEdgePercentage}%,
						${ arrowCentrePercentage + halfArrowWidth }% ${arrowSideEdgePercentage}%,
						${arrowCentrePercentage}% 100%,
						${ arrowCentrePercentage - halfArrowWidth }% ${arrowSideEdgePercentage}%,
						0 ${arrowSideEdgePercentage}%)`;
		}
		else // juxtaposeTo bottom
		{
			clipPath = `polygon(0 ${marginPercentageOfHeight}%,
						${ arrowCentrePercentage - halfArrowWidth }% ${marginPercentageOfHeight}%,
						${arrowCentrePercentage}% 0,
						${ arrowCentrePercentage + halfArrowWidth }% ${marginPercentageOfHeight}%,
						100% ${marginPercentageOfHeight}%,
						100% 100%,
						0 100%)`;
		}
	}
	
	$tooltip.children(".content").css({ clipPath });
}

function setTooltipPaddingAndReturnOffset($tooltip, { tooltipOffset, tooltipMargin, juxtaposeTo } = {})
{
	tooltipOffset = tooltipOffset || $tooltip.offset();
	tooltipMargin = tooltipMargin || $tooltip.data("margin");
	juxtaposeTo = juxtaposeTo || $tooltip.data("juxt");

	const initialTooltipHeight = $tooltip.height(),
		$tooltipContent = $tooltip.children(".content"),
		tooltipPadding = getLeadingNumber($tooltipContent.css("padding")) + tooltipMargin,
		paddingDirections = {
			left: "right",
			right: "left",
			top: "bottom",
			bottom: "top"
		},
		paddingDirection = paddingDirections[juxtaposeTo];
	
	$tooltipContent.css(`padding-${paddingDirection}`, `${tooltipPadding}px`);

	// Horizontally juxtaposed tooltips sometimes require a slight offset adjustment.
	const tooltipHeight = $tooltip.height();
	if (["left", "right"].includes(juxtaposeTo) && tooltipHeight !== initialTooltipHeight)
	{
		tooltipOffset.top -= Math.max(tooltipMargin, tooltipHeight - initialTooltipHeight);
		$tooltip.offset(tooltipOffset);
	}
	
	return tooltipOffset;
}

async function ensureDivPositionIsWithinWindowHeight($div, { windowPadding = 5 } = {})
{
	const windowHeight = $(window).height(),
		divHeight = $div.outerHeight() + windowPadding;

    if ($div.offset().top + divHeight > windowHeight)
		$div.offset({ top: windowHeight - divHeight });
}

function ensureDivPositionIsWithinWindowWidth($div, { windowPadding = 5 } = {})
{
	const windowWidth = $(window).width(),
		divWidth = $div.outerWidth() + windowPadding,
		divLeft = $div.offset().left;
	
	if (divLeft < 0)
	{
		$div.offset({ left: windowPadding });
		return false;
	}
		
	if (divLeft + divWidth > windowWidth)
		$div.offset({ top: windowWidth - divWidth });
}