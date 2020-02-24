"use strict";

export default class PlayerPanel
{
    constructor(player, numPlayers)
    {
        this.downChevron = "&#171;";
        this.upChevron = "&#187;";
        this.collapseExpandMs = 200;
        this.$panel = appendPanelAndBindEventHandlers(this, player, numPlayers);
        
        player.$panel = this.$panel;
    }

    collapse()
    {
        return new Promise(async resolve =>
        {
            const { $btnCollapseExpand, downChevron, collapseExpandMs } = this,
                initialButtonHeight = $btnCollapseExpand.stop().height(),
                collapse = "collapse",
                expand = "expand",
                $cards = this.getCards().stop();
            
            $btnCollapseExpand.removeClass(collapse)
                .addClass(expand)
                .attr("title", expand)
                .children().first().removeClass("hidden")
                .next().html(downChevron)
                .closest(".playerPanel").addClass("collapsed");
            
            const resultingButtonHeight = $btnCollapseExpand.height();

            $cards.slideUp(collapseExpandMs);
            
            await animatePromise(
            {
                $elements: $btnCollapseExpand,
                initialProperties: { height: initialButtonHeight },
                desiredProperties: { height: resultingButtonHeight },
                duration: collapseExpandMs
            });
            $btnCollapseExpand.removeAttr("style");

            resolve();
        });
    }

    expand()
    {
        return new Promise(async resolve =>
        {
            const { $btnCollapseExpand, upChevron, collapseExpandMs } = this,
                initialButtonHeight = $btnCollapseExpand.stop().height(),
                collapse = "collapse",
                expand = "expand",
                $cards = this.getCards().stop();
            
            $btnCollapseExpand.removeClass(expand)
                .addClass(collapse)
                .attr("title", collapse)
                .children().first().addClass("hidden")
                .next().html(upChevron)
                .closest(".playerPanel").removeClass("collapsed");
            
            const resultingButtonHeight = $btnCollapseExpand.height();

            $cards.slideDown(collapseExpandMs, function() { $(this).removeAttr("style") });
            
            await animatePromise(
            {
                $elements: $btnCollapseExpand,
                initialProperties: { height: initialButtonHeight },
                desiredProperties: { height: resultingButtonHeight },
                duration: collapseExpandMs
            });
            $btnCollapseExpand.removeAttr("style");

            resolve();
        });
    }

    getCards()
    {
        return this.$btnCollapseExpand.siblings(".playerCard");
    }

    expandIfCollapsed()
	{
		return new Promise(async resolve =>
		{
			if (this.$panel.hasClass("collapsed"))
                await this.expand();
		
			resolve();
		});
	}
}

function appendPanelAndBindEventHandlers(panel, player, numPlayers)
{
    const { camelCaseRole, name, role } = player,
        $panel = $(`<div class='playerPanel playerPanel${numPlayers} hidden' id='${camelCaseRole}'>
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