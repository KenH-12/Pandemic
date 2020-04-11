import { eventTypes } from "./event.js";
import { gameData } from "./gameData.js";

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
                                <img src='images/cards/event/${toCamelCase(this.name)}.jpg' alt='${this.name}' />
                                ${this.getRules()}
                            </div>`);
        
        $fullCard.children("img").next().attr("id", `eventCardFullTooltipAnchor`);
        
        if (isContingencyCard)
            return $(`<div id='contingencyWrapper'>
                        <h2>Stored Event card:</h2>
                    </div>`).append($fullCard);
        
        return $fullCard;
    }
    
    showFullCard($eventCard)
    {
        const $fullCard = this.getFullCard($eventCard.hasClass("contingency")),
            $cardImg = $fullCard.children("img");
        
        $fullCard.appendTo("#boardContainer")
            .offset(getFullCardOffset($eventCard, $fullCard));

        $cardImg.on("load", function() { ensureDivPositionIsWithinWindowHeight($fullCard) });

        if ($eventCard.hasClass("unavailable"))
            showDisabledEventCardTooltip($fullCard);
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

function bindEventCardHoverEvents($container)
{
    const eventCardSelector = ".playerCard.eventCard",
        $eventCards = $container ? $container.find(eventCardSelector) : $(eventCardSelector);
    
    let $this;
    $eventCards.not(".contingency")
        .off("mouseenter mouseleave")
        .hover(function()
        {
            $this = $(this);
            eventCards[$this.data("key")].showFullCard($this);
        },
        function() { $("#boardContainer").children("#contingencyWrapper, .eventCardFull, #disabledEventCardTooltip").remove() });
}

function unbindEventCardHoverEvents($container)
{
    const eventCardSelector = ".playerCard.eventCard",
        $eventCards = $container ? $container.find(eventCardSelector) : $(eventCardSelector);
    
    $eventCards.not(".contingency")
        .off("mouseenter mouseleave");
}

function getFullCardOffset($eventCard, $fullCard)
{
    const fullCardOffset = $eventCard.offset(),
        eventCardWidth = $eventCard.outerWidth(),
        fullCardWidth = $fullCard.outerWidth(),
        MARGIN = 5;
    
    if ($eventCard.closest(".playerPanel").length
        || $eventCard.closest("#eventDetails").length)
    {
        fullCardOffset.left += eventCardWidth + MARGIN;

        if ($eventCard.hasClass("contingency"))
        {
            const $roleCard = $(".roleCard");
            fullCardOffset.left += $roleCard.width() + MARGIN;
            fullCardOffset.top = $roleCard.offset().top;
        }
    }
    else if ($eventCard.closest("#playerDiscard").length)
        fullCardOffset.left -= fullCardWidth + MARGIN;
    else if ($eventCard.closest("#rightPanel").length)
        fullCardOffset.left = gameData.boardWidth - fullCardWidth - MARGIN;
    
    return fullCardOffset;
}

function showDisabledEventCardTooltip($fullEventCard)
{
    const $tooltip = $(`<div class='tooltip' id='disabledEventCardTooltip'>
                        <div class='content'>
                            <p>Event cards can be played at any time, <i>except</i> in between drawing and resolving a card.</p>
                            <p>However, when 2 Epidemic cards are drawn together, event cards can be played after resolving the first epidemic.</p>
                        </div>
                    </div>`),
        { promptingEventType } = gameData;
    
    if (promptingEventType && promptingEventType.code === eventTypes.forecastPlacement.code)
        $tooltip.prepend("<p>* You must complete the Forecast event before doing anything else.</p>");

    positionTooltipRelativeToElement($tooltip, $fullEventCard.find("#eventCardFullTooltipAnchor"),
        { juxtaposeTo: "right" });
}

export {
    eventCards,
    bindEventCardHoverEvents,
    unbindEventCardHoverEvents
}