"use strict";

import {
    eventHistoryButtonTooltip,
    eventDetailsTooltip
} from "./tooltipInstantiation.js";
import { gameData } from "./gameData.js";
import { getCity } from "./city.js";
import { eventTypes, getEventType } from "./event.js";
import { isEventCardKey } from "./eventCard.js";
import {
    PermanentEvent,
    TreatDisease,
    AutoTreatDisease,
    Eradication,
    InfectCity,
    EpidemicInfect,
    EpidemicIntensify,
    DiscoverACure,
    StartingHands,
    InitialInfection,
    infectionPreventionCodes
} from "./event.js";

class EventHistory
{
    constructor()
    {
        this.$container = $("#eventHistoryContainer");
        this.$iconContainer = this.$container.find("#eventHistory");
        this.$btnBack = this.$container.find(".btnBack");
        this.$btnForward = this.$container.find(".btnForward");
        this.$btnUndo = this.$container.find("#btnUndo");
        this.$undoingIndicator = this.$container.children("#undoingIndicator");

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

            await this.scrollToEnd({ leaveButtonsDisabled: true, removingIcon: true });

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
        
        return Promise.resolve();
    }

    async scrollToEnd({ addingNewIcon, leaveButtonsDisabled, removingIcon } = {})
    {
        const overflow = this.getOverflow();
        
        if (addingNewIcon && overflow <= 0)
            return this.slideInNewIcon();
        
        this.disableForwardButton();
        eventDetailsTooltip.hide().unbindHoverEvents();
        
        await animationPromise({
            $elements: this.$iconContainer,
            desiredProperties: { scrollLeft: overflow },
            duration: this.scrollDuration,
            easing: this.scrollEasing
        });

        this.scrollLeft = overflow;
        
        if (!leaveButtonsDisabled && overflow > 0)
            this.enableBackButton();

        if (!removingIcon)
            eventDetailsTooltip.bindHoverEvents().checkHoverState();

        return Promise.resolve();
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
        if (this.getOverflow() === 0 || this.scrollLeft === 0)
            return false;
        
        const self = this;
        this.$btnBack
            .off("click")
            .click(() => self.scrollBack())
            .removeClass("btnDisabled");
        
        eventHistoryButtonTooltip.checkHoverState();
    }
    
    enableForwardButton()
    {
        const self = this;
        this.$btnForward
            .off("click")
            .click(() => self.scrollForward())
            .removeClass("btnDisabled");
        
        eventHistoryButtonTooltip.checkHoverState();
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
        
        eventHistoryButtonTooltip.checkHoverState();
    }

    disableForwardButton()
    {
        this.$btnForward.off("click")
            .addClass("btnDisabled");
        
        eventHistoryButtonTooltip.checkHoverState();
    }

    async scrollBack()
    {
        eventDetailsTooltip.hide().unbindHoverEvents();
        
        const { $iconContainer, scrollDuration, scrollEasing } = this;
        
        let scrollLeft = $iconContainer.scrollLeft() - $iconContainer.width();
        if (scrollLeft <= 0)
        {
            this.disableBackButton();
            scrollLeft = 0;
        }
        
        await animationPromise({
            $elements: $iconContainer.stop(),
            desiredProperties: { scrollLeft },
            duration: scrollDuration,
            easing: scrollEasing
        });

        if (this.scrollLeft !== scrollLeft)
            this.enableForwardButton();
        
        this.scrollLeft = scrollLeft;
        eventDetailsTooltip.bindHoverEvents().checkHoverState();
    }

    async scrollForward()
    {
        eventDetailsTooltip.hide().unbindHoverEvents();
        
        const { $iconContainer, scrollDuration, scrollEasing } = this,
            overflow = this.getOverflow();
        
        let scrollLeft = $iconContainer.scrollLeft() + $iconContainer.width();
        if (scrollLeft >= overflow)
        {
            this.disableForwardButton();
            scrollLeft = overflow;
        }
        
        await animationPromise({
            $elements: $iconContainer.stop(),
            desiredProperties: { scrollLeft },
            duration: scrollDuration,
            easing: scrollEasing
        });
        
        this.scrollLeft = scrollLeft;
        this.enableBackButton();
        eventDetailsTooltip.bindHoverEvents().checkHoverState();
    }

    enableUndo(undoAction)
    {
        if (!this.lastEventCanBeUndone())
            return false;
        
        this.$btnUndo
            .off("click")
            .removeClass("btnDisabled")
            .click(function()
            {
                eventHistoryButtonTooltip.hide().unbindHoverEvents();
                undoAction();
            });
        
        eventHistoryButtonTooltip.checkHoverState();
    }

    disableUndo()
    {
        this.$btnUndo
            .off("click")
            .addClass("btnDisabled");
        
        eventHistoryButtonTooltip.checkHoverState();
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

    async indicateUndoIsInProgress()
    {
        const $elements = $(`<span>Undoing last action...</span><img src='images/loading.gif' />`).css("opacity", 0.01);
        this.$undoingIndicator.append($elements);

        await animationPromise({
            $elements,
            desiredProperties: { opacity: 1 },
            duration: 200
        });

        removeInlineStylePropertiesFrom($elements, "opacity");
    }

    async indicateFinishedUndoing()
    {
        const { $undoingIndicator } = this,
            opacity = 0.01,
            $elements = $undoingIndicator.children("img").css({ opacity }).siblings();

        await animationPromise({
            $elements,
            desiredProperties: { opacity },
            duration: 200
        });
        
        $undoingIndicator.empty();

        eventHistoryButtonTooltip.bindHoverEvents().checkHoverState();
    }
}

function getEventHistoryIcon(event)
{
    return $(getEventIconHtml(getEventType(event.code), { event }))
}

function getEventIconHtml(eventType, { event } = {})
{
	if (eventType.noIcon)
		return "";
	
	const { name } = eventType,
		fileName = getEventIconFileName(eventType, event),
		fileExtension = getEventIconFileExtension(eventType, event),
		classAttribute = `class='${getEventIconCssClasses(event)}'`;
	
	let iconHtml = event ? `<div id='icon${event.id}' ${classAttribute}>` : "";

	iconHtml += `<img	src='images/eventIcons/${fileName}.${fileExtension}'
						alt='${name}'
						${ !event ? classAttribute : ""} />`;
	
	if (event)
		iconHtml += "</div>";

	return iconHtml;
}

function getEventIconFileName(eventType, event)
{
	let fileName = toCamelCase(eventType.name).replace("/", "");
	
	if (!event)
	return fileName;

	if (event instanceof TreatDisease
		|| event instanceof AutoTreatDisease
		|| event instanceof Eradication)
		fileName += `_${event.diseaseColor}`;
	else if (event instanceof InfectCity
			|| event instanceof EpidemicInfect)
	{
		if (event instanceof EpidemicInfect)
			fileName = toCamelCase(eventTypes.infectCity.name);
		
		fileName += `_${getCity(event.cityKey).color}`;
		if (event.preventionCode !== infectionPreventionCodes.notPrevented)
			fileName += `_${event.preventionCode}`;
	}
	else if (event instanceof DiscoverACure)
		fileName += `_${getCity(event.cardKeys[0]).color}`;
	else if (event instanceof StartingHands)
		fileName += `_${Object.keys(gameData.players).length}`;
	
	return fileName;
}

function getEventIconFileExtension(eventType, event)
{
	if ( event instanceof InitialInfection
		|| (event instanceof InfectCity || event instanceof EpidemicInfect) && event.preventionCode === infectionPreventionCodes.quarantine
		|| event instanceof DiscoverACure && event
		|| eventType.cardKey && isEventCardKey(eventType.cardKey)
		|| event instanceof EpidemicIntensify
		|| event instanceof AutoTreatDisease
		|| event instanceof Eradication)
		return "jpg";
	
	return "png";
}

function getEventIconCssClasses(event)
{
	if (!event) return "actionIcon";

	if (event.role && gameData.players[event.role])
		return `${gameData.players[event.role].camelCaseRole}Border`;
	else if (event instanceof InfectCity)
		return `${getCity(event.cityKey).color}Border darkBlueBackground`;
	else if (event instanceof EpidemicInfect)
		return "darkGreenBorder lightGreenBackground";
	else if (event instanceof Eradication)
		return `${event.diseaseColor}Border`;
	
	return "darkGreenBorder";
}

const eventHistory = new EventHistory();

export {
    eventHistory,
    getEventHistoryIcon,
    getEventIconHtml
}