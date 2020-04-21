"use strict";

export default class Tooltip
{
    constructor({
            content,
            getContent,
            hoverElementSelector,
            positionRelativeToSelector,
            juxtaposition = "left",
            arrowBasePx = 15,
            windowPadding = 5,
            containerSelector,
            cssClassString,
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
        this.juxtaposition = juxtaposition;

        this.arrowBasePx = arrowBasePx;
        this.windowPadding = windowPadding;

        this.containerSelector = containerSelector || "body";
        this.cssClassString = cssClassString || "";

        this.allowTooltipHovering = allowTooltipHovering;
        if (allowTooltipHovering)
        {
            this.tooltipHoveringForgiveness = tooltipHoveringForgiveness || {};
            setTooltipHoveringForgivenessDefaults(this);
        }

        this.beforeShow = beforeShow;
        this.afterShow = afterShow;

        this.$tooltip = false;
        this.hoverEventsAreBound = false;
    }

    create()
    {
        const {
                content,
                cssClassString
            } = this,
            $tooltip = $(`<div class='tooltip ${cssClassString}'></div>`);
        
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
                juxtaposition,
                arrowBasePx,
                windowPadding
            } = this,
            $element = this.getRelativeElement(),
            elementOffset = $element.offset(),
            tooltipOffset = elementOffset;
        
        if (["left", "right"].includes(juxtaposition))
        {
            tooltipOffset.top -= Math.abs($element.height() - $tooltip.height()) / 2;
            
            if (juxtaposition === "left")
                tooltipOffset.left -= $tooltip.outerWidth();
            else // right
                tooltipOffset.left += $element.outerWidth();
        }
        else // top or bottom
        {
            const elementWidth = $element.width(),
                tooltipWidth = $tooltip.width(),
                halfDeltaWidth = Math.abs(elementWidth - tooltipWidth) / 2;
            
            if (tooltipWidth > elementWidth)
                tooltipOffset.left -= halfDeltaWidth;
            else
                tooltipOffset.left += halfDeltaWidth;

            if (juxtaposition === "top")
                tooltipOffset.top -= $tooltip.outerHeight() + arrowBasePx;
            else // bottom
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
                juxtaposition
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

        if (["left", "right"].includes(juxtaposition))
        {
            actualArrowCentre = elementOffset.top + ($element.height() / 2);
            arrowCentrePercentage = ((actualArrowCentre - tooltipOffset.top) / tooltipHeight) * 100;
            
            halfArrowHeight = marginPercentageOfHeight / 2;
            
            if (juxtaposition === "left")
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
            else // right
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
        else // top or bottom
        {
            actualArrowCentre = elementOffset.left + ($element.width() / 2);
            arrowCentrePercentage = ((actualArrowCentre - tooltipOffset.left) / tooltipWidth) * 100;

            const halfArrowWidth = marginPercentageOfWidth / 2;
            
            if (juxtaposition === "top")
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
            else // bottom
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
                juxtaposition
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
            paddingDirection = paddingDirections[juxtaposition];
        
        $tooltipContent.css(`padding-${paddingDirection}`, `${tooltipPadding}px`);

        // Horizontally juxtaposed tooltips sometimes require a slight offset adjustment.
        const tooltipHeight = $tooltip.height();
        if (["left", "right"].includes(juxtaposition) && tooltipHeight !== initialTooltipHeight)
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

    extendHoverBox($hoveredElement)
    {
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

    getTooltipHoverBox()
    {
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

function setTooltipHoveringForgivenessDefaults(tooltip)
{
    const { tooltipHoveringForgiveness: forgiveness } = tooltip,
        sides = ["top", "right", "bottom", "left"];
    
    for (let side of sides)
        if (!forgiveness[side])
            forgiveness[side] = 0;
}