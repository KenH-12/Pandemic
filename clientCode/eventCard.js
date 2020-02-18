import { eventTypes } from "./event.js";

const data = {
    MARGIN: 5
}

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

    getFullCard()
    {
        return $(`<div class='eventCardFull' data-key='${this.key}'>
                    <h5>EVENT</h5>
                    <h3>${this.name.toUpperCase()}</h3>
                    <img src='images/cards/event/${toCamelCase(this.name)}.jpg' alt='${this.name}' />
                    ${this.getRules()}
                </div>`);
    }
    
    async showFullCard($eventCard, { boardWidth, boardHeight, promptingEventType })
    {
        const $fullCard = this.getFullCard(),
            $cardImg = $fullCard.children("img");
        
        $fullCard.appendTo("#boardContainer")
            .offset(getFullCardOffset($eventCard, $fullCard, boardWidth));

        $cardImg.on("load", function()
        {
            ensureFullCardIsOnScreen($fullCard, boardHeight);
            
            if ($eventCard.hasClass("unavailable"))
                showDisabledEventCardTooltip($fullCard, promptingEventType);
        });
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

function bindEventCardHoverEvents(boardDimensions, { $containingElement } = {})
{
    const eventCardSelector = ".playerCard.eventCard",
        $eventCards = $containingElement ? $containingElement.find(eventCardSelector) : $(eventCardSelector);
    
    let $this;
    $eventCards.off("mouseenter mouseleave")
        .hover(function()
        {
            $this = $(this);
            eventCards[$this.data("key")].showFullCard($this, boardDimensions);
        },
        function() { $("#boardContainer").children(".eventCardFull, #disabledEventCard.tooltip").remove() });
}

function getFullCardOffset($eventCard, $fullCard, boardWidth)
{
    const fullCardOffset = $eventCard.offset(),
        eventCardWidth = $eventCard.outerWidth(),
        fullCardWidth = $fullCard.outerWidth();
    
    if ($eventCard.closest(".playerPanel").length
        || $eventCard.closest("#eventDetails").length)
        fullCardOffset.left += eventCardWidth + data.MARGIN;
    else if ($eventCard.closest("#playerDiscard").length)
        fullCardOffset.left -= fullCardWidth + data.MARGIN;
    else if ($eventCard.closest("#rightPanel").length)
        fullCardOffset.left = boardWidth - fullCardWidth - data.MARGIN;
    
    return fullCardOffset;
}

function ensureFullCardIsOnScreen($fullCard, boardHeight)
{
    const fullCardHeight = $fullCard.outerHeight() + data.MARGIN;

    if ($fullCard.offset().top + fullCardHeight > boardHeight)
        $fullCard.offset({ top: boardHeight - fullCardHeight });
}

function showDisabledEventCardTooltip($fullEventCard, promptingEventType)
{
    const $tooltip = $(`<div class='tooltip' id='disabledEventCard'>
                        <p>Event cards can be played at any time, <i>except</i> in between drawing and resolving a card.</p>
                        <p>However, when 2 Epidemic cards are drawn together, event cards can be played after resolving the first epidemic.</p>
                    </div>`).appendTo("#boardContainer"),
        tooltipOffset = $fullEventCard.offset();
    
    if (promptingEventType.code === eventTypes.forecastPlacement.code)
        $tooltip.prepend("<p>* You must complete the Forecast event before doing anything else.</p>");

    tooltipOffset.left += $fullEventCard.outerWidth() + data.MARGIN;
    $tooltip.offset(tooltipOffset);
}

export {
    eventCards,
    bindEventCardHoverEvents
}