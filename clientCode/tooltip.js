"use strict";

export default class Tooltip
{
    constructor({
            content,
            getContent,
            hoverElementSelector,
            positionRelativeToSelector,
            juxtaposeTo = "left",
            tooltipArrowMargin = 15,
            tooltipMargin = 5,
            containerId,
            tooltipId
        } = {})
    {
        this.content = content || "";
        this.getContent = getContent;
        
        this.hoverElementSelector = hoverElementSelector;
        this.positionRelativeToSelector = positionRelativeToSelector || this.hoverElementSelector;
        this.juxtaposeTo = juxtaposeTo;

        this.tooltipArrowMargin = tooltipArrowMargin;
        this.tooltipMargin = tooltipMargin;

        this.containerId = containerId;
        this.tooltipId = tooltipId;

        this.$tooltip = false;
        this.hoverEventsAreBound = false;
    }

    create()
    {
        const {
                content,
                tooltipId
            } = this,
            $tooltip = $(`<div${ tooltipId ? ` id='${tooltipId}'` : "" } class='tooltip'></div>`);
        
        let tooltipContent = content;

        if (!tooltipContent && typeof this.getContent === "function")
            tooltipContent = this.getContent();
        
        $tooltip.append(`<div class='content'>${tooltipContent}</div>`);
        
        this.$tooltip = $tooltip;

        return this;
    }

    async positionRelativeToElement()
    {
        const {
                $tooltip,
                positionRelativeToSelector,
                containerId,
                juxtaposeTo,
                tooltipArrowMargin,
                tooltipMargin
            } = this,
            $element = $(positionRelativeToSelector),
            elementOffset = $element.offset(),
            tooltipOffset = elementOffset;
        
        $tooltip.appendTo(containerId ? `#${this.containerId}` : "body");
        
        if (["left", "right"].includes(juxtaposeTo))
        {
            tooltipOffset.top -= Math.abs($element.height() - $tooltip.height()) / 2;
            
            if (juxtaposeTo === "left")
                tooltipOffset.left -= $tooltip.outerWidth();
            else // juxtaposeTo right
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
                tooltipOffset.top -= $tooltip.outerHeight() + tooltipArrowMargin;
            else // juxtaposeTo bottom
                tooltipOffset.top += $element.outerHeight();
        }

        $tooltip.offset(tooltipOffset);
        
        await loadAllImagesPromise($tooltip.find("img"));
        
        ensureDivPositionIsWithinWindowWidth($tooltip, { margin: tooltipMargin });
        ensureDivPositionIsWithinWindowHeight($tooltip);

        this.setClipPath();
    }

    setClipPath()
    {
        const {
                $tooltip,
                tooltipArrowMargin,
                juxtaposeTo,
                positionRelativeToSelector
            } = this,
            tooltipOffset = this.setPaddingAndReturnOffset(),
            tooltipWidth = $tooltip.width(),
            marginPercentageOfWidth = (tooltipArrowMargin / tooltipWidth)*100,
            tooltipHeight = $tooltip.height(),
            marginPercentageOfHeight = (tooltipArrowMargin / tooltipHeight)*100,
            $element = $(positionRelativeToSelector),
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

    setPaddingAndReturnOffset()
    {
        const {
                $tooltip,
                tooltipArrowMargin,
                juxtaposeTo
            } = this,
            initialTooltipHeight = $tooltip.height(),
            $tooltipContent = $tooltip.children(".content"),
            tooltipPadding = getLeadingNumber($tooltipContent.css("padding")) + tooltipArrowMargin,
            tooltipOffset = $tooltip.offset(),
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
            tooltipOffset.top -= Math.max(tooltipArrowMargin, tooltipHeight - initialTooltipHeight);
            $tooltip.offset(tooltipOffset);
        }
        
        return tooltipOffset;
    }

    bindHoverEvents()
    {
        if (this.hoverEventsAreBound)
            return false;
        
        const {
                hoverElementSelector    
            } = this,
            self = this;

        $(document).on("mouseenter", hoverElementSelector, function()
		{
            self.create()
                .positionRelativeToElement();
		})
        .on("mouseleave", hoverElementSelector, function()
        {
            self.$tooltip.remove();
            self.$tooltip = false;
        });

        this.hoverEventsAreBound = true;
    }

    unbindHoverEvents()
    {
        if (!this.hoverEventsAreBound)
            return false;
        
        const {
                hoverElementSelector    
            } = this;
        
        $(document).off("mouseenter mouseleave", hoverElementSelector);

        this.hoverEventsAreBound = false;
    }
}