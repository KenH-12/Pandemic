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
        const self = this,
            $boardContainer = $("#boardContainer");

        this.$menu.children(".button")
            .off("click")
            .click(function() { self.toggleContent($(this)) });
        
        // Close the menu if the user clicks anywhere else
        $boardContainer.off("mousedown")
            .mousedown(function()
            {
                $boardContainer.off("mousedown");
                self.toggle();
            });
    }

    close()
    {
        this.$menu.children(".button").off("click");
        $("#boardContainer").off("mousedown");
    }

    closeIfOpen()
    {
        if (this.$menu.hasClass("is-active"))
            this.toggle();
    }

    toggleContent($menuItem)
    {
        const { buttonContainerSelector, $menu } = this,
            $buttonContainer = $menuItem.next(buttonContainerSelector).stop(),
            isExpanded = $menuItem.next().not(".hidden").length;
        
        if (isExpanded)
        {
            flipChevrons($menuItem);
            return this.hideSecondaryButtons($buttonContainer);
        }
        
        flipChevrons($menu.children(".button").not($menuItem));
        unflipChevrons($menuItem);
        this.showSecondaryButtons($buttonContainer);
    }

    async showSecondaryButtons($containerToShow, { $contentToShow } = {})
    {
        const self = this;
        
        this.hideSecondaryButtons($(self.buttonContainerSelector).not($containerToShow));

        await expand($containerToShow);

        $containerToShow.children()
            .off("click")
            .click(function() { self.showContent($(this)) });

        if ($contentToShow)
            await this.showContent($contentToShow);
        
        return Promise.resolve();
    }

    hideSecondaryButtons($containersToHide)
    {
        if (!$containersToHide.length)
            return false;
        
        $containersToHide.children().off("click");
        collapse($containersToHide);
    }

    async showContent($secondaryButton)
    {
        const contentClass = "sideMenuContent",
            stringKey = $secondaryButton.attr("id");
        
        if ($secondaryButton.next().hasClass(contentClass))
        {
            flipChevrons($secondaryButton);
            return this.hideContent($secondaryButton.next());
        }
        
        if (typeof strings[stringKey] === "undefined")
            return false;

        flipChevrons(this.$menu.find(".secondaryButtonContainer").children(".button"));
        this.hideContent($(`.${contentClass}`));
        
        const $container = $(`<div class='${contentClass}'></div>`).insertAfter($secondaryButton);

        this.parseAndAppendContent($container, strings[stringKey]);
        unflipChevrons($secondaryButton);
        await expand($container);

        this.bindLinkClicks();
        
        return Promise.resolve();
    }

    async hideContent($content)
    {
        await collapse($content);
        $content.remove();
    }

    parseAndAppendContent($container, content)
    {
        let tagName = "p",
            member;
        
        if (!Array.isArray(content) && typeof content === "object")
        {
            for (let key in content)
            {
                member = content[key];
                tagName = key.includes("Heading") ? "h5" : "p";
                    
                for (let string of ensureIsArray(member))
                    appendHtmlToContainer($container, tagName, string);
            }

            return false;
        }
        
        for (let p of content)
        {
            if (Array.isArray(p))
            {
                tagName = p[0];
                p = p[1];
            }
            else
                tagName = "p";
            
            appendHtmlToContainer($container, tagName, p);
        }
    }

    bindLinkClicks()
    {
        const $links = this.$menu.find("a"),
            sideMenu = this;

        for (let i = 0; i < $links.length; i++)
            $links.eq(i).click(function() { sideMenu.goToSection($(this)) });
    }

    async goToSection($clickedLink)
    {
        const { $menu, buttonContainerSelector } = this,
            sectionID = $clickedLink.attr("data-section"),
            scrollToID = $clickedLink.attr("data-scrollToId"),
            $secondaryButton = $menu.find(`#${sectionID}`),
            $containerToShow = $secondaryButton.parent();

        if ($secondaryButton.hasClass("hidden"))
            this.hideSecondaryButtons($(buttonContainerSelector).not($containerToShow));

        await this.showSecondaryButtons($containerToShow, { $contentToShow: $secondaryButton });
        
        animationPromise({
            $elements: $menu,
            desiredProperties: {
                scrollTop: scrollToID ? $menu.scrollTop() + $containerToShow.find(`#${scrollToID}`).offset().top : 0
            },
            easing: "easeOutQuart"
        });
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

function flipChevrons($buttons)
{
    $buttons.each(function() { $(this).children(".buttonChevron").addClass("rightChevron") })
}

function unflipChevrons($buttons)
{
    $buttons.each(function() { $(this).children(".buttonChevron").removeClass("rightChevron") })
}

function appendHtmlToContainer($container, tagName, content)
{
    $container.append(`<${tagName}>${content}</${tagName}>`);
}