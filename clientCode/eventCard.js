import { eventTypes } from "./event.js";

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
    
    async showFullCard($eventCard, { boardWidth, boardHeight })
    {
        const $fullCard = $(`<div class='eventCardFull'>
                                <h5>EVENT</h5>
                                <h3>${this.name.toUpperCase()}</h3>
                                <img src='images/cards/event/${toCamelCase(this.name)}.jpg' alt='${this.name}' />
                                ${this.getRules()}
                            </div>`),
            $cardImg = $fullCard.children("img");
        
        $fullCard.appendTo("#boardContainer")
            .offset(getFullCardOffset($eventCard, $fullCard, boardWidth));

        $cardImg.on("load", function() { ensureFullCardIsOnScreen($fullCard, boardHeight) });
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
        function()
        {
            $(".eventCardFull").remove();
        });
}

function getFullCardOffset($eventCard, $fullCard, boardWidth)
{
    const fullCardOffset = $eventCard.offset(),
        eventCardWidth = $eventCard.outerWidth(),
        fullCardWidth = $fullCard.outerWidth(),
        MARGIN = 5;
    
    if ($eventCard.closest(".playerPanel").length
        || $eventCard.closest(".eventDetails").length)
        fullCardOffset.left += eventCardWidth + MARGIN;
    else if ($eventCard.closest("#playerDiscard").length)
        fullCardOffset.left -= fullCardWidth + MARGIN;
    else if ($eventCard.closest("#rightPanel").length)
        fullCardOffset.left = boardWidth - fullCardWidth - MARGIN;
    
    return fullCardOffset;
}

function ensureFullCardIsOnScreen($fullCard, boardHeight)
{
    const fullCardHeight = $fullCard.outerHeight();

    if ($fullCard.offset().top + fullCardHeight > boardHeight)
        $fullCard.offset({ top: boardHeight - fullCardHeight });
}

export {
    eventCards,
    bindEventCardHoverEvents
}