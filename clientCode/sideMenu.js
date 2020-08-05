"use strict";

export default class sideMenu
{
    constructor()
    {
        this.$hamburgerButton = $("#btnSideMenu");
        this.$menu = $("#sideMenu");
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
        const buttonContainerSelector = ".secondaryButtonContainer",
            $buttonContainer = $menuItem.next(buttonContainerSelector).stop(),
            collapse = "collapse";
        
        if ($menuItem.hasClass(collapse))
        {
            $menuItem.removeClass(collapse);
            return this.hideSecondaryButtons($buttonContainer);
        }
        
        $menuItem.addClass(collapse);
        this.showSecondaryButtons($buttonContainer);
    }

    async showSecondaryButtons($buttonContainer)
    {
        const desiredProperties = { height: $buttonContainer.removeClass("hidden").height() };
        await animationPromise({
            $elements: $buttonContainer,
            initialProperties: { height: 0 },
            desiredProperties,
            duration: 200,
            easing: "easeOutQuad"
        });
        removeInlineStylePropertiesFrom($buttonContainer);
    }

    async hideSecondaryButtons($buttonContainer)
    {
        await animationPromise({
            $elements: $buttonContainer,
            desiredProperties: { height: 0 },
            duration: 200,
            easing: "easeOutQuad"
        });
        removeInlineStylePropertiesFrom($buttonContainer.addClass("hidden"));
    }
}