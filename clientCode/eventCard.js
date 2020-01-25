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
    
    showFullCard($eventCard)
    {
        const $fullCard = $(`<div class='eventCardFull'>
                                <h5>EVENT</h5>
                                <h3>${this.name.toUpperCase()}</h3>
                                <img src='images/cards/event/${toCamelCase(this.name)}.jpg' alt='${this.name}' />
                                ${this.getRules()}
                            </div>`),
            eventCardOffset = $eventCard.offset(),
            CARD_MARGIN = 5;
        
        $fullCard.appendTo("#boardContainer")
            .offset({
                top: eventCardOffset.top,
                left: eventCardOffset.left + $eventCard.width() + CARD_MARGIN
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

function bindEventCardHoverEvents($container = [])
{
    const eventCardSelector = ".playerCard.eventCard",
        $eventCards = $container.length ? $container.find(eventCardSelector) : $(eventCardSelector);
    
    let $this;
    $eventCards
        .hover(function()
        {
            $this = $(this);
            eventCards[$this.data("key")].showFullCard($this);
        },
        function()
        {
            $(".eventCardFull").remove();
        });
}

export {
    eventCards,
    bindEventCardHoverEvents
}