"use strict";

export default class Tooltip
{
    constructor({
            content,
            getContent,
            hoverElementSelector,
            positionRelativeToSelector,
            juxtaposeTo = "left",
            arrowBasePx = 15,
            windowPadding = 5,
            containerSelector,
            tooltipId,
            cssClasses,
            allowTooltipHovering,
            tooltipHoveringForgiveness,
            beforeShow,
            afterShow
        } = {})
    {
        this.content = content || "";
        this.getContent = getContent;
        
        this.hoverElementSelector = hoverElementSelector;
        this.positionRelativeToSelector = positionRelativeToSelector || hoverElementSelector;
        this.juxtaposeTo = juxtaposeTo;

        this.arrowBasePx = arrowBasePx;
        this.windowPadding = windowPadding;

        this.containerSelector = containerSelector || "body";
        this.tooltipId = tooltipId;
        this.cssClasses = cssClasses || "";

        this.allowTooltipHovering = allowTooltipHovering;
        this.tooltipHoveringForgiveness = tooltipHoveringForgiveness;

        this.beforeShow = beforeShow;
        this.afterShow = afterShow;

        this.$tooltip = false;
        this.hoverEventsAreBound = false;
    }

    create()
    {
        const {
                content,
                tooltipId,
                cssClasses
            } = this,
            idAttr = tooltipId ? ` id='${tooltipId}'` : "",
            $tooltip = $(`<div${idAttr} class='tooltip ${cssClasses}'></div>`);
        
        let tooltipContent = content;

        if (!tooltipContent && typeof this.getContent === "function")
            tooltipContent = this.getContent(this);
        
        $tooltip.append(`<div class='content'>${tooltipContent}</div>`);
        
        this.$tooltip = $tooltip;
    }

    async positionRelativeToElement()
    {
        const {
                $tooltip,
                juxtaposeTo,
                arrowBasePx,
                windowPadding
            } = this,
            $element = this.getRelativeElement(),
            elementOffset = $element.offset(),
            tooltipOffset = elementOffset;
        
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
                tooltipOffset.top -= $tooltip.outerHeight() + arrowBasePx;
            else // juxtaposeTo bottom
                tooltipOffset.top += $element.outerHeight();
        }

        $tooltip.offset(tooltipOffset);
        
        await loadAllImagesPromise($tooltip.find("img"));
        
        ensureDivPositionIsWithinWindowWidth($tooltip, { windowPadding });
        ensureDivPositionIsWithinWindowHeight($tooltip);

        this.setClipPath();
    }

    getRelativeElement()
    {
        if (this.hoverElementSelector === this.positionRelativeToSelector
            && this.$hoveredElement.length)
            return this.$hoveredElement;
        
        return $(this.positionRelativeToSelector);
    }

    setClipPath()
    {
        const {
                $tooltip,
                arrowBasePx,
                juxtaposeTo
            } = this,
            tooltipOffset = this.setPaddingAndReturnOffset(),
            tooltipWidth = $tooltip.width(),
            marginPercentageOfWidth = (arrowBasePx / tooltipWidth)*100,
            tooltipHeight = $tooltip.height(),
            marginPercentageOfHeight = (arrowBasePx / tooltipHeight)*100,
            $element = this.getRelativeElement(),
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
                arrowBasePx,
                juxtaposeTo
            } = this,
            initialTooltipHeight = $tooltip.height(),
            $tooltipContent = $tooltip.children(".content"),
            tooltipPadding = getLeadingNumber($tooltipContent.css("padding")) + arrowBasePx,
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
            tooltipOffset.top -= Math.max(arrowBasePx, tooltipHeight - initialTooltipHeight);
            $tooltip.offset(tooltipOffset);
        }
        
        return tooltipOffset;
    }

    bindHoverEvents()
    {
        if (this.hoverEventsAreBound)
            return false;
        
        const {
                hoverElementSelector,
                containerSelector
            } = this,
            self = this;

        $(document).off("mouseenter mouseleave", hoverElementSelector)
            .on("mouseenter", hoverElementSelector, async function()
            {
                if (self.isExtendingHoverBox)
                    return false;
                
                self.$hoveredElement = $(this);

                self.create();

                if (typeof self.beforeShow === "function")
                    await self.beforeShow(self);
                
                self.$tooltip.appendTo(containerSelector);
                self.positionRelativeToElement();

                if (typeof self.afterShow === "function")
                    self.afterShow(self);
            })
            .on("mouseleave", hoverElementSelector, function()
            {
                if (self.allowTooltipHovering)
                    return self.extendHoverBox($(this));
                
                self.hide();
            });

        this.hoverEventsAreBound = true;
    }

    // NOTE: extendHoverBox and getTooltipHoverBox are only coded for tooltips with juxtaposeTo = "top".
    // Code could be added for the other juxtapositions, but the need wasn't there when the methods were written.
    extendHoverBox($hoveredElement)
    {
        if (this.juxtaposeTo !== "top")
        {
            console.error(`Tooltip.extendHoverBox method does not support the "${this.juxtaposeTo}" tooltip juxtaposition.`);
            return this.hide();
        }
        
        this.isExtendingHoverBox = true;
        
        const $document = $(document),
            tooltipHoverBox = this.getTooltipHoverBox(),
            self = this;
    
        $document.off("mousemove")
            .mousemove(function(e)
            {
                if (e.pageY < tooltipHoverBox.top
                    || e.pageX < tooltipHoverBox.left
                    || e.pageX > tooltipHoverBox.right
                    || e.pageY > tooltipHoverBox.bottom
                    && !$hoveredElement.is(":hover"))
                {
                    $document.off("mousemove");
                    self.hide();
                    self.isExtendingHoverBox = false;
                    // Since the hover box was extended, we should check whether a different element with the same selector is now hovered.
                    const $hoveredElement = $(":hover").filter(self.hoverElementSelector);
                    if ($hoveredElement.length)
                        $hoveredElement.trigger("mouseenter");
                }
            });
    }

    // NOTE: extendHoverBox and getTooltipHoverBox are only coded for tooltips with juxtaposeTo = "top".
    // Code could be added for the other juxtapositions, but the need wasn't there when the methods were written.
    getTooltipHoverBox()
    {
        if (this.juxtaposeTo !== "top")
        {
            console.error(`Tooltip.getTooltipHoverBox method does not support the "${this.juxtaposeTo}" tooltip juxtaposition.`);
            return false;
        }
        
        const { $tooltip, tooltipHoveringForgiveness: forgiveness } = this,
            tooltipOffset = $tooltip.offset(),
            hoverBox = tooltipOffset;
        
        hoverBox.top -= forgiveness.top;
        hoverBox.left -= forgiveness.left;
        hoverBox.right = tooltipOffset.left + $tooltip.width() + forgiveness.right;
        hoverBox.bottom = tooltipOffset.top + $tooltip.height() + forgiveness.bottom;

        return hoverBox;
    }

    hide()
    {
        this.$hoveredElement = false;
        this.$tooltip.remove();
        this.$tooltip = false;
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