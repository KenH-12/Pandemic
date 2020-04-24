"use strict";

import { PermanentEvent } from "./event.js";
import {
    hideEventHistoryButtonTooltip,
    eventDetailsTooltip
} from "./tooltipInstantiation.js";

class EventHistory
{
    constructor()
    {
        this.$container = $("#eventHistoryContainer");
        this.$iconContainer = this.$container.find("#eventHistory");
        this.$btnBack = this.$container.find(".btnBack");
        this.$btnForward = this.$container.find(".btnForward");
        this.$btnUndo = this.$container.find("#btnUndo");

        this.scrollLeft = 0;
        this.scrollDuration = 300;
        this.scrollEasing = "easeOutCubic";

        this.events = [];
    }

    appendIcon($icon)
    {
        this.$iconContainer.append($icon);
    }

    removeIcon(event)
    {
        return new Promise(async resolve =>
        {
            eventDetailsTooltip.hide().unbindHoverEvents();

            await this.scrollToEnd({ leaveButtonsDisabled: true});

            const { $iconContainer } = this,
                scrollLeft = $iconContainer.scrollLeft(),
                $icon = $iconContainer.children().last(),
                iconWidth = $icon.outerWidth() + 1,
                newScrollLeft = scrollLeft - iconWidth,
                alt = $icon.children().first().attr("alt");

            if (alt !== event.name)
            {
                console.error(`Encountered unexpected icon ('${alt}') when attempting to remove event icon: '${event.name}'`);
                return false;
            }

            animationPromise({
                $elements: $icon,
                desiredProperties: { opacity: 0 },
                duration: 100
            });

            await animationPromise({
                $elements: $iconContainer,
                desiredProperties: { scrollLeft: newScrollLeft },
                easing: "easeOutSine"
            });

            $icon.remove();

            if (this.getOverflow() > 0)
                this.enableBackButton();
        
            this.scrollLeft = newScrollLeft;

            eventDetailsTooltip.bindHoverEvents().checkHoverState();
            resolve();
        });
    }

    async slideInNewIcon()
    {
        const $icons = this.$iconContainer.children(),
            $newIcon = $icons.last().addClass("hidden"),
            freeSpace = this.$iconContainer.width() - ($icons.length - 1) * $newIcon.width();
        
        $newIcon.css("margin-left", freeSpace);

        await Promise.race([
            resolvePromiseOnLoad($newIcon),
            sleep(250)
        ]);

        await animationPromise({
            $elements: $newIcon.removeClass("hidden"),
            desiredProperties: { marginLeft: 0 },
            easing: "easeOutQuad"
        });

        $newIcon.removeAttr("style");
    }

    scrollToEnd({ addingNewIcon, leaveButtonsDisabled } = {})
    {
        return new Promise(async resolve =>
        {
            const overflow = this.getOverflow();
            
            if (addingNewIcon && overflow <= 0)
                return this.slideInNewIcon();
            
            this.disableForwardButton();
                
            await animationPromise({
                $elements: this.$iconContainer,
                desiredProperties: { scrollLeft: overflow },
                duration: this.scrollDuration,
                easing: this.scrollEasing
            });

            this.scrollLeft = overflow;
            
            if (!leaveButtonsDisabled && overflow > 0)
                this.enableBackButton();
            
            hideEventHistoryButtonTooltip();
            resolve();
        });
    }

    getOverflow()
    {
        return getHorizontalOverflow(this.$iconContainer);
    }

    enableScrollButtons()
    {
        this.enableBackButton();
        this.enableForwardButton();
    }

    enableBackButton()
    {
        const self = this;
        this.$btnBack
            .off("click")
            .click(() => self.scrollBack())
            .removeClass("btnDisabled");
        
        hideEventHistoryButtonTooltip();
    }
    
    enableForwardButton()
    {
        const self = this;
        this.$btnForward
            .off("click")
            .click(() => self.scrollForward())
            .removeClass("btnDisabled");
        
        hideEventHistoryButtonTooltip();
    }

    disableScrollButtons()
    {
        this.disableBackButton();
        this.disableForwardButton();
    }

    disableBackButton()
    {
        this.$btnBack.off("click")
            .addClass("btnDisabled");
        
        hideEventHistoryButtonTooltip();
    }

    disableForwardButton()
    {
        this.$btnForward.off("click")
            .addClass("btnDisabled");
        
        hideEventHistoryButtonTooltip();
    }

    scrollBack()
    {
        const { $iconContainer, scrollDuration, scrollEasing } = this,
            newScrollLeft = $iconContainer.scrollLeft() - $iconContainer.width(),
            scrollLeft = newScrollLeft > 0 ? newScrollLeft : 0;
        
        $iconContainer.stop()
            .animate({ scrollLeft }, scrollDuration, scrollEasing);
        
        if (this.scrollLeft !== scrollLeft)
            this.enableForwardButton();
        
        this.scrollLeft = scrollLeft;
        
        if (scrollLeft === 0)
            this.disableBackButton();
    }

    scrollForward()
    {
        const { $iconContainer, scrollDuration, scrollEasing } = this,
            overflow = this.getOverflow(),
            newScrollLeft = $iconContainer.scrollLeft() + $iconContainer.width(),
            scrollLeft = newScrollLeft > overflow ? overflow : newScrollLeft;
        
        $iconContainer.stop()
            .animate({ scrollLeft }, scrollDuration, scrollEasing);
        
        if (this.scrollLeft !== scrollLeft)
            this.enableBackButton();
        
        this.scrollLeft = scrollLeft;
        
        if (scrollLeft === overflow)
            this.disableForwardButton();
    }

    enableUndo(undoAction)
    {
        this.$btnUndo
            .off("click")
            .removeClass("btnDisabled")
            .click(function() { undoAction() });
        
        hideEventHistoryButtonTooltip();
    }

    disableUndo()
    {
        this.$btnUndo
            .off("click")
            .addClass("btnDisabled");
        
        hideEventHistoryButtonTooltip();
    }

    lastEventCanBeUndone()
    {
        const { events } = this;
        
        let event;
        for (let i = events.length - 1; i >= 0; i--)
        {
            event = events[i];

            if (event instanceof PermanentEvent)
                return false;
            
            if (event.isUndoable)
                return true;
        }
        return false;
    }
}

export const eventHistory = new EventHistory();