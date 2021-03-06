"use strict";

import { eventTypes } from "./event.js";
import { gameData, eventTypeIsBeingPrompted, getPlayer } from "./gameData.js";
import Tooltip from "./tooltip.js";
import { strings } from "./strings.js";

export default class EventCard
{
    constructor(key, name)
    {
        this.key = key;
        this.name = name;
    }

    getPlayerCard()
	{
		return `<div class='playerCard eventCard' data-key='${this.key}'>${this.name.toUpperCase()}</div>`;
    }

    getFullCard(isContingencyCard)
    {
        const $fullCard = $(`<div class='eventCardFull' data-key='${this.key}'>
                                <h5>EVENT</h5>
                                <h3>${this.name.toUpperCase()}</h3>
                                <img src='${gameData.imagesDir}/cards/event/${toCamelCase(this.name)}.jpg' alt='${this.name}' />
                                ${this.getRules()}
                            </div>`);
        
        $fullCard.children("img").next().attr("id", `eventCardFullTooltipAnchor`);
        
        if (isContingencyCard)
            return $(`<div id='contingencyWrapper'>
                        <h2>Stored Event card:</h2>
                    </div>`).append($fullCard);
        
        return $fullCard;
    }
    
    async showFullCard($eventCard)
    {
        const $fullCard = this.getFullCard($eventCard.hasClass("contingency"));
        
        $fullCard.appendTo("#boardContainer")
            .offset(getFullCardOffset($eventCard, $fullCard));
        
        await loadAllImagesPromise($fullCard.find("img"));
        ensureDivPositionIsWithinWindowHeight($fullCard);
    }

    getRules()
    {
        let description = "";
        for (let rule of eventTypes[toCamelCase(this.name)].rules)
            description += `<p>${rule}</p>`;
        
        return description;
    }
}

// Instantiate event cards
const eventCards = {};
(function ()
{
	const cards = [
						["resi", "Resilient Population"],
						["oneq", "One Quiet Night"],
						["fore", "Forecast"],
						["airl", "Airlift"],
						["gove", "Government Grant"]
					];

	for (let card of cards)
		eventCards[card[0]] = new EventCard(card[0], card[1]);
})();

function isEventCardKey(cardKey)
{
	return eventCards.hasOwnProperty(cardKey);
}

function bindEventCardHoverEvents($container)
{
    const eventCardSelector = ".playerCard.eventCard",
        $eventCards = $container ? $container.find(eventCardSelector) : $(eventCardSelector);
    
    let $this;
    $eventCards.not(".contingency")
        .off("mouseenter mouseleave")
        .hover(async function()
        {
            $this = $(this);

            if ($this.closest("#playerDiscardContainer").length)
            {
                await sleep(250);

                if (!$this.filter(":hover").length)
                    return false;
            }

            eventCards[$this.data("key")].showFullCard($this);
        },
        function() { $("#boardContainer").children("#contingencyWrapper, .eventCardFull, .disabledEventCardTooltip").remove() });
    
    bindDisabledEventCardHoverEvents();
}

function unbindEventCardHoverEvents($container)
{
    const eventCardSelector = ".playerCard.eventCard",
        $eventCards = $container ? $container.find(eventCardSelector) : $(eventCardSelector);
    
    $eventCards.not(".contingency")
        .off("mouseenter mouseleave");
    
    if (disabledEventCardTooltip instanceof Tooltip)
        disabledEventCardTooltip.unbindHoverEvents();
}

function getFullCardOffset($eventCard, $fullCard)
{
    const fullCardOffset = $eventCard.offset(),
        eventCardWidth = $eventCard.outerWidth(),
        fullCardWidth = $fullCard.outerWidth(),
        MARGIN = 5;
    
    if ($eventCard.closest(".playerPanel").length
        || $eventCard.closest(".eventDetails").length)
    {
        fullCardOffset.left += eventCardWidth + MARGIN;

        if ($eventCard.hasClass("contingency"))
        {
            const $roleCard = $(".roleCard");
            fullCardOffset.left += $roleCard.width() + MARGIN;
            fullCardOffset.top = $roleCard.offset().top;
        }
    }
    else if ($eventCard.closest("#playerDiscardContainer").length)
        fullCardOffset.left -= fullCardWidth + MARGIN;
    else if ($eventCard.closest("#rightPanel").length)
        fullCardOffset.left = gameData.boardWidth - fullCardWidth - MARGIN;
    
    return fullCardOffset;
}

let disabledEventCardTooltip;
function bindDisabledEventCardHoverEvents()
{
    if (disabledEventCardTooltip instanceof Tooltip)
        return disabledEventCardTooltip.bindHoverEvents();
    
    const getContent = function()
    {
        const forecastPriorityMsg = eventTypeIsBeingPrompted(eventTypes.forecastPlacement) ?
            "<p class='r'>* You must resolve the Forecast event before doing anything else.</p>" : "";
        
        return `${forecastPriorityMsg}${strings.eventCardPlayabilityExceptions}`;
    }

    let hoverElementSelector = ".eventCard.unavailable";
    if (getPlayer("Contingency Planner"))
        hoverElementSelector += ":not(.contingency), .contingencyPlanner.storingEventCard:has(.contingency.unavailable)";
    
    disabledEventCardTooltip = new Tooltip({
        getContent,
        beforeShow: () => loadAllImagesPromise($(".eventCardFull").find("img")),
        hoverElementSelector,
        positionRelativeToSelector: "#eventCardFullTooltipAnchor",
        juxtaposition: "right",
        arrowBasePx: 20,
        containerSelector: "#boardContainer",
        cssClassString: "disabledEventCardTooltip"
    }).bindHoverEvents();
}

export {
    eventCards,
    isEventCardKey,
    bindEventCardHoverEvents,
    unbindEventCardHoverEvents
}