"use strict";

import { strings } from "./strings.js";

export default class sideMenu
{
    constructor()
    {
        this.$hamburgerButton = $("#btnSideMenu");
        this.$menu = $("#sideMenu");
        this.buttonContainerSelector = ".secondaryButtonContainer";

        this.$hamburgerButton.click(() => this.toggle());
    }

    toggle()
    {
        const { $hamburgerButton, $menu } = this,
            active = "is-active";
        
        let method = "open";
        if ($hamburgerButton.hasClass(active))
            method = "close";
        
        $hamburgerButton.add($menu)
            .toggleClass(active);
        
        this[method]();
    }

    open()
    {
        const self = this;

        this.$menu.children(".button")
            .off("click")
            .click(function() { self.toggleContent($(this)) });
    }

    close()
    {
        this.$menu.children(".button").off("click");
    }

    toggleContent($menuItem)
    {
        const { buttonContainerSelector } = this,
            $buttonContainer = $menuItem.next(buttonContainerSelector).stop(),
            isExpanded = $menuItem.next().not(".hidden").length;
        
        if (isExpanded)
            return this.hideSecondaryButtons($buttonContainer);
        
        this.showSecondaryButtons($buttonContainer);
    }

    async showSecondaryButtons($containerToShow)
    {
        const self = this;
        
        this.hideSecondaryButtons($(self.buttonContainerSelector).not($containerToShow));

        await expand($containerToShow);

        $containerToShow.children()
            .off("click")
            .click(function() { self.showContent($(this)) });
    }

    async hideSecondaryButtons($containersToHide)
    {
        $containersToHide.children().off("click");
        collapse($containersToHide);
    }

    async showContent($secondaryButton)
    {
        const contentClass = "sideMenuContent",
            stringKey = $secondaryButton.attr("id");
        
        if ($secondaryButton.next().hasClass(contentClass))
            return this.hideContent($secondaryButton.next());
        
        if (typeof strings[stringKey] === "undefined")
            return false;

        this.hideContent($(`.${contentClass}`));
        
        const $content = $(`<div class='${contentClass}'></div>`).insertAfter($secondaryButton);

        for (let p of strings[stringKey])
            $content.append(`<p>${p}</p>`);
        
        expand($content);
    }

    async hideContent($content)
    {
        await collapse($content);
        $content.remove();
    }
}

const duration = 200,
    easing = "easeOutQuad";

async function expand($elements)
{
    await animationPromise({
        $elements,
        initialProperties: { height: 0 },
        desiredProperties: { height: $elements.stop().removeClass("hidden").height() },
        duration, easing
    });
    removeInlineStylePropertiesFrom($elements);
    return Promise.resolve();
}

async function collapse($elements)
{
    $elements.stop();
    await animationPromise({
        $elements,
        desiredProperties: { height: 0 },
        duration, easing
    });
    removeInlineStylePropertiesFrom($elements.addClass("hidden"));
    return Promise.resolve();
}