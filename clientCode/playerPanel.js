"use strict";

import { cities } from "./city.js";

// Only the northernmost cities which are directly under player panels need to be checked for occlusion.
const cityKeysToCheckForOcclusion = ["sanf", "chic", "mont", "newy", "lond"];

export default class PlayerPanel
{
    constructor(player, numPlayers)
    {
        this.downChevron = "&#171;";
        this.upChevron = "&#187;";
        this.collapseExpandMs = 200;
        this.$panel = appendPanelAndBindEventHandlers(this, player, numPlayers);

        // To keep track of the cities on the board which are occluded by this PlayerPanel
		// or which contain pieces that are occluded by this PlayerPanel (necessitating panel transparency).
		this.occlusionKeys = new Set();
        
        player.$panel = this.$panel;
    }

    collapse({ duration } = {})
    {
        return new Promise(async resolve =>
        {
            const { $btnCollapseExpand, downChevron, collapseExpandMs } = this,
                initialButtonHeight = $btnCollapseExpand.stop().height(),
                collapse = "collapse",
                expand = "expand",
                $cards = this.getCards().stop();
            
            duration = isNaN(duration) ? collapseExpandMs : duration;
            
            $btnCollapseExpand.removeClass(collapse)
                .addClass(expand)
                .attr("title", expand)
                .children().first().removeClass("hidden")
                .next().html(downChevron)
                .closest(".playerPanel").addClass("collapsed");
            
            const resultingButtonHeight = $btnCollapseExpand.height();

            $cards.slideUp(duration);
            
            await animatePromise(
            {
                $elements: $btnCollapseExpand,
                initialProperties: { height: initialButtonHeight },
                desiredProperties: { height: resultingButtonHeight },
                duration
            });
            $btnCollapseExpand.removeAttr("style");

            resolve();
        });
    }

    expand({ duration } = {})
    {
        return new Promise(async resolve =>
        {
            const { $btnCollapseExpand, upChevron, collapseExpandMs } = this,
                initialButtonHeight = $btnCollapseExpand.stop().height(),
                collapse = "collapse",
                expand = "expand",
                $cards = this.getCards().stop();
            
            duration = isNaN(duration) ? collapseExpandMs : duration;
            
            $btnCollapseExpand.removeClass(expand)
                .addClass(collapse)
                .attr("title", collapse)
                .children().first().addClass("hidden")
                .next().html(upChevron)
                .closest(".playerPanel").removeClass("collapsed");
            
            const resultingButtonHeight = $btnCollapseExpand.height();

            $cards.slideDown(duration, function() { $(this).removeAttr("style") });
            
            await animatePromise(
            {
                $elements: $btnCollapseExpand,
                initialProperties: { height: initialButtonHeight },
                desiredProperties: { height: resultingButtonHeight },
                duration
            });
            $btnCollapseExpand.removeAttr("style");

            resolve();
        });
    }

    expandIfCollapsed({ duration } = {})
    {
        return new Promise(async resolve =>
        {
            if (this.$panel.hasClass("collapsed"))
                await this.expand({ duration });
        
            resolve();
        });
    }

    getCards()
    {
        return this.$btnCollapseExpand.siblings(".playerCard");
    }

    getCard(cardKey)
	{
		return this.$panel.find(`.playerCard[data-key='${cardKey}']`);
    }
    
    appendCard($card)
    {
        $card.insertBefore(this.$panel.children(".btnCollapseExpand"));
    }

    removeCard(cardKey)
    {
        this.$panel.find(`.playerCard[data-key='${cardKey}']`).remove();
    }
    
    animateReceiveCard($card, boardDimensions, { targetProperties, isContingencyCard } = {})
	{
		targetProperties = targetProperties || this.getCardTargetProperties({ isContingencyCard });
		
		// Some initial values should be calculated before the Promise is made.
		const initialOffset = $card.offset(),
            initialWidth = $card.width(),
            panel = this;

		return new Promise(resolve =>
		{
			if ($card.hasClass("epidemic"))
				return resolve();

			let $insertAfterElement;
			if (isContingencyCard) // Contingency cards are placed within the .role div
			{
				$card.off("mouseenter mouseleave")
					.removeClass("removed")
					.addClass("contingency");
				$insertAfterElement = this.$panel.children(".role").children().first();
			}
			else
				$insertAfterElement = this.$panel.children(".role, .playerCard").last();
			
			$card.appendTo("#rightPanel") // The animation is smoother if the $card is first appended to #rightPanel.
				.css(
				{
					...{
						position: "absolute",
						zIndex: "5",
						width: initialWidth
					},
					...initialOffset
				})
				.animate(targetProperties, 500,
				function()
				{
                    $card.removeAttr("style").insertAfter($insertAfterElement);
                    panel.checkOcclusion(boardDimensions);

					resolve();
				});
		});
    }
    
    getCardTargetProperties({ isContingencyCard } = {})
	{
		const $guide = this.$panel.children().last(),
			guideHeight = $guide.height(),
			guideOffset = isContingencyCard ? this.$panel.children(".role").offset() : $guide.offset(),
			$exampleCard = $("#playerPanelContainer").find(".playerCard").first(),
			exampleCardHeight = $exampleCard ? $exampleCard.height() : false,
			top = exampleCardHeight ? guideOffset.top + exampleCardHeight : guideOffset.top + guideHeight;
		
		const targetProperties = {
			width: $guide.width(),
			height: exampleCardHeight || guideHeight,
			top: top,
			left: guideOffset.left
		};
		
		return targetProperties;
	}

    setCollapsedCardCount(cardCount)
	{
		this.$panel.find(".numCardsInHand")
			.html(`— ${cardCount} card${cardCount === 1 ? "" : "s"} in hand —`);
	}
    
    async checkOcclusion(boardDimensions, citiesToCheck)
	{
        const wasCollapsed = this.$panel.hasClass("collapsed");
        this.expandIfCollapsed({ duration: 0 });
        
        if (citiesToCheck)
		{
			for (let city of ensureIsArray(citiesToCheck))
				this.addOrRemoveOcclusion(city, boardDimensions);
		}
		else
			for (let key of cityKeysToCheckForOcclusion)
                this.addOrRemoveOcclusion(cities[key], boardDimensions);
        
        if (wasCollapsed)
            this.collapse({ duration: 0 });
	}

	addOrRemoveOcclusion(city, boardDimensions)
	{
        if (this.occludes(city, boardDimensions))
		{
			this.addOcclusion(city);
			log("panel occludes ", city.name);
		}
		else
			this.removeOcclusion(city);
	}

	occludes(city, boardDimensions)
	{
        if (!cityKeysToCheckForOcclusion.includes(city.key))
            return false;
        
        const panel = this.$panel[0],
			$cityArea = city.getAreaDiv(boardDimensions);

		if (elementsOverlap(panel, $cityArea[0]))
		{
			$cityArea.remove();
			log("areaDiv occluded");
			return true;
		}

		let occlusionDetected = false;
		$("#boardContainer").children(`.${city.key}`).each(function()
		{
			if (elementsOverlap(panel, $(this)[0]))
			{
				log("piece occluded");
				occlusionDetected = true;
				return false;
			}
		});
		
		return occlusionDetected;
    }

    checkMovementResultForOcclusion($piece, newOffset, boardDimensions)
    {
        const currentOffset = $piece.offset();

        $piece.offset(newOffset);

        this.checkOcclusion(boardDimensions, getCityFromPiece($piece));

        $piece.offset(currentOffset);
    }

	addOcclusion(city)
	{
		this.occlusionKeys.add(city.key);
		this.$panel.addClass("transparent");
	}

	removeOcclusion(city)
	{
        if (this.occlusionKeys.has(city.key))
            log("removed occlusion:", city.name);
        
        this.occlusionKeys.delete(city.key);

        if (this.occlusionKeys.size === 0)
        {
            if (this.$panel.hasClass("transparent"))
                log("No occlusions remain!");
            
            this.$panel.removeClass("transparent");
        }
    }
}

function appendPanelAndBindEventHandlers(panel, player, numPlayers)
{
    const { camelCaseRole, name, role } = player,
        $panel = $(`<div class='playerPanel playerPanel-${numPlayers} hidden' id='${camelCaseRole}'>
                        <div class='name'>${name}</div>
                        <div class='role ${camelCaseRole}'>
                            <p>${role}</p>
                        </div>
                        <div class='btnCollapseExpand collapse' title='collapse'>
                            <p class='numCardsInHand hidden'>— 0 cards in hand —</p>
                            <div>${panel.upChevron}</div>
                        </div>
                    </div>`).appendTo("#playerPanelContainer");
    
    $panel.children(".role")
        .on("click", ":not(.eventCard)", function() { player.pinpointLocation() });
    
    panel.$btnCollapseExpand = $panel.children(".btnCollapseExpand")
        .click(function()
        {
            if ($(this).hasClass("collapse"))
                panel.collapse();
            else
                panel.expand();
        });
    
    return $panel;
}

function getCityFromPiece($piece)
{
    for (let c of $piece.attr("class").split(" "))
        if (cities.hasOwnProperty(c))
            return cities[c];
}