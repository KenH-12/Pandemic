"use strict";

export default class Tooltip
{
    constructor({
            content,
            getContent,
            hoverElementSelector,
            positionRelativeToSelector,
            juxtaposition = "left",
            getJuxtaposition,
            alignArrowWithHoveredElement,
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
        this.getJuxtaposition = getJuxtaposition;
        this.alignArrowWithHoveredElement = alignArrowWithHoveredElement;

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

    bindHoverEvents()
    {
        if (this.hoverEventsAreBound)
            return this;
        
        const { hoverElementSelector } = this,
            self = this;

        $(document).off("mouseenter mouseleave", hoverElementSelector)
            .on("mouseenter", hoverElementSelector, function()
            {
                self.$hoveredElement = $(this);
                self.show();
            })
            .on("mouseleave", hoverElementSelector, function()
            {
                if (self.allowTooltipHovering)
                    return self.extendHoverBox($(this));
                
                self.hide();
            });

        this.hoverEventsAreBound = true;

        return this;
    }

    checkHoverState()
    {
        const { hoverElementSelector } = this,
            $hovered = $(":hover").filter(hoverElementSelector);
        
        if ($hovered.length)
        {
            this.$hoveredElement = $hovered;
            this.show()
        }
        else if (this.$tooltip)
            this.hide();
    }

    unbindHoverEvents()
    {
        if (!this.hoverEventsAreBound)
            return false;
        
        const { hoverElementSelector } = this;
        
        $(document).off("mouseenter mouseleave", hoverElementSelector);

        this.hoverEventsAreBound = false;
    }

    async show()
    {
        if (this.isExtendingHoverBox)
            return false;
        
        this.create();

        if (typeof this.beforeShow === "function")
            await this.beforeShow(this);

        this.$tooltip.appendTo(this.containerSelector);
        this.positionRelativeToElement();

        if (typeof this.afterShow === "function")
            this.afterShow(this);
    }

    hide()
    {
        this.$hoveredElement = false;

        if (this.$tooltip.length)
            this.$tooltip.remove();
        
        this.$tooltip = false;

        return this;
    }

    create()
    {
        if (this.$tooltip.length)
            this.$tooltip.remove();
        
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
        this.setJuxtaposition();
        
        const {
                $tooltip,
                juxtaposition,
                arrowBasePx,
                windowPadding,
                alignArrowWithHoveredElement
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

        // Without this delay, setClipPath will be called before any offset adjustments have had time to take effect.
        if (alignArrowWithHoveredElement)
            await sleep(1);
        
        this.setClipPath();
    }

    setJuxtaposition()
    {
        const validJuxtapositions = ["top", "right", "bottom", "left"];

        if (typeof this.getJuxtaposition === "function")
            this.juxtaposition = this.getJuxtaposition(this);

        if (!validJuxtapositions.includes(this.juxtaposition))
        {
            console.error(`Invalid juxtaposition "${this.juxtaposition}" returned by Tooltip.getJuxtaposition method.`);
            this.juxtaposition = "left";
        }
    }

    getRelativeElement()
    {
        if (this.hoverElementSelector === this.positionRelativeToSelector && this.$hoveredElement.length)
            return this.$hoveredElement;
        
        return $(this.positionRelativeToSelector);
    }

    setClipPath()
    {
        const {
                $tooltip,
                arrowBasePx,
                juxtaposition,
                alignArrowWithHoveredElement,
                $hoveredElement
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
            if (alignArrowWithHoveredElement)
                actualArrowCentre = $hoveredElement.offset().top + ($hoveredElement.height() / 2);
            else
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
            if (alignArrowWithHoveredElement)
                actualArrowCentre = $hoveredElement.offset().left + ($hoveredElement.width() / 2);
            else
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

    extendHoverBox($hoveredElement)
    {
        if (!this.$tooltip)
            return false;
        
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
}

function setTooltipHoveringForgivenessDefaults(tooltip)
{
    const { tooltipHoveringForgiveness: forgiveness } = tooltip,
        sides = ["top", "right", "bottom", "left"];
    
    for (let side of sides)
        if (!forgiveness[side])
            forgiveness[side] = 0;
}