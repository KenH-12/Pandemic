"use strict";

import { strings } from "./strings.js";
import { eventTypes } from "./event.js";

export default class SideMenu
{
    constructor(sideMenuButtons)
    {
        this.$hamburgerButton = $("#btnSideMenu");
        this.$menu = $("#sideMenu");
        this.$title = $("#sideMenuTitle");
        this.buttonContainerSelector = ".secondaryButtonContainer";

        this.confirmationButtons = [];
        for (let menuButton of sideMenuButtons)
        {
            this.$menu.append(menuButton.$btn);

            if (menuButton instanceof ConfirmationButton)
                this.confirmationButtons.push(menuButton);
            else if (menuButton.$secondaryButtonContainer)
                menuButton.$secondaryButtonContainer.insertAfter(menuButton.$btn);
        }

        this.$hamburgerButton.click(() => this.toggle());
    }

    toggle()
    {
        const { $hamburgerButton, $menu, $title } = this,
            active = "is-active";
        
        let method = "open";
        if ($hamburgerButton.hasClass(active))
            method = "close";
        
        $hamburgerButton.add($menu)
            .add($title)
            .toggleClass(active);
        
        this[method]();
    }

    open()
    {
        const self = this,
            $boardContainer = $("#boardContainer");

        this.$menu.children(".primaryButton")
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
        this.$menu.children(".primaryButton").off("click");
        $("#boardContainer").off("mousedown");
        this.resetConfirmationButtons();
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
        this.resetConfirmationButtons();
        
        flipChevrons($menu.children(".primaryButton").not($menuItem));
        unflipChevrons($menuItem);
        this.showSecondaryButtons($buttonContainer);
    }

    async showSecondaryButtons($containerToShow, { $contentToShow } = {})
    {
        await Promise.all([
            this.hideSecondaryButtons($(this.buttonContainerSelector).not(".hidden").not($containerToShow)),
            expand($containerToShow)
        ]);

        this.bindButtonClickEventListeners($containerToShow);

        if ($contentToShow)
            await this.showContent($contentToShow);
        
        return Promise.resolve();
    }

    bindButtonClickEventListeners($container)
    {
        const self = this;

        $container.children()
            .off("click")
            .click(function() { self.showContent($(this)) });
    }

    async hideSecondaryButtons($containersToHide)
    {
        if (!$containersToHide.length)
            return Promise.resolve();
        
        $containersToHide.children().off("click");
        await collapse($containersToHide);

        return Promise.resolve();
    }

    showTertiaryButtons($buttonContainer, content)
    {
        $buttonContainer.removeClass("sideMenuContent")
            .addClass("tertiaryButtonContainer");
        
        for (let key in content)
        {
            if (key === "tertiaryButtons")
                continue;

            appendHtmlToContainer($buttonContainer, "div", eventTypes[key].name, { id: key, cssClasses: "button" });
        }

        $buttonContainer.children().append("<span class='buttonChevron rightChevron'>^</span>")
            .each(function() { $(this).attr("data-section", "actionRules") });
        
        this.bindButtonClickEventListeners($buttonContainer);
    }

    async showContent($clickedBtn, { navigatingViaLink } = {})
    {
        const contentClass = "sideMenuContent",
            tertiaryButtonContainerClass = "tertiaryButtonContainer",
            buttonIsTertiary = $clickedBtn.parent().hasClass(tertiaryButtonContainerClass),
            contentIsAlreadyExpanded = $clickedBtn.next().hasClass(contentClass) || $clickedBtn.next().hasClass(tertiaryButtonContainerClass);
        
        this.resetConfirmationButtons();
        if (contentIsAlreadyExpanded)
        {
            flipChevrons($clickedBtn);
            return this.hideContent($clickedBtn.next());
        }
        
        const stringKey = $clickedBtn.attr("id"),
            content = buttonIsTertiary ? strings[$clickedBtn.attr("data-section")][stringKey] : strings[stringKey];

        flipChevrons(this.$menu.find(`.${ buttonIsTertiary ? tertiaryButtonContainerClass : "secondaryButtonContainer" }`).children(".button"));
        this.hideContent($(`.${contentClass}`).add(`.${tertiaryButtonContainerClass}`).not($clickedBtn.parent()));
        
        const $container = $(`<div class='${contentClass}'></div>`).insertAfter($clickedBtn);

        this.parseAndAppendContent($container, content, { isTertiaryContent: buttonIsTertiary });
        unflipChevrons($clickedBtn);
        await expand($container);

        if (!navigatingViaLink && $clickedBtn.position().top < 0)
            await this.scrollToElement($clickedBtn);

        this.bindLinkClicks();
        
        return Promise.resolve();
    }

    async hideContent($content)
    {
        await collapse($content);
        $content.remove();
    }

    parseAndAppendContent($container, content, { isTertiaryContent } = {})
    {
        if (content.tertiaryButtons && !isTertiaryContent)
            return this.showTertiaryButtons($container, content);
        
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
        const { $menu } = this,
            sectionID = $clickedLink.attr("data-section"),
            scrollToID = $clickedLink.attr("data-scrollToId"),
            $secondaryButton = $menu.find(`#${sectionID}`),
            $containerToShow = $secondaryButton.parent();

        if ($containerToShow.hasClass("hidden"))
            await this.showSecondaryButtons($containerToShow, { $contentToShow: $secondaryButton });
        else
            await this.showContent($secondaryButton, { navigatingViaLink: true });
        
        this.scrollToElement($menu.find(`#${scrollToID}`));
    }

    async scrollToElement($e)
    {
        const { $menu } = this;

        await animationPromise({
            $elements: $menu,
            desiredProperties: {
                scrollTop: $e.length ? $menu.scrollTop() + $e.position().top : 0
            },
            easing: "easeOutQuart"
        });

        return Promise.resolve();
    }

    resetConfirmationButtons()
    {
        for (let btn of this.confirmationButtons)
            btn.reset();
    }

    showHamburgerButton()
    {
        this.$hamburgerButton.removeClass("hidden");
    }
}

export class SideMenuButton
{
    constructor(buttonText,
        {
            buttonID,
            isPrimaryButton,
            isExpandable = true,
            descendantButtons,
            onClick
        } = {})
    {
        let cssClasses = "button";
        
        if (isPrimaryButton && Array.isArray(descendantButtons))
        {
            cssClasses += " primaryButton"
            this.$secondaryButtonContainer = $("<div class='secondaryButtonContainer hidden'></div>");
            
            for (let descendant of descendantButtons)
                this.$secondaryButtonContainer.append(descendant.$btn);
        }
        
        this.$btn = $(`<div${ buttonID ? ` id='${buttonID}'` : "" } class='${cssClasses}'>
                        ${buttonText}
                        ${ isExpandable ? "<span class='buttonChevron rightChevron'>^</span>" : "" }
                    </div>`);
        
        if (typeof onClick === "function")
            this.$btn.click(onClick);
    }
}

export class ConfirmationButton
{
    constructor(buttonID, buttonText, confirmationPromptText, onConfirm)
    {
        this.buttonText = buttonText;
        this.confirmationPromptText = confirmationPromptText;
        this.onConfirm = onConfirm;

        this.$btn = new SideMenuButton(buttonText,
            {
                buttonID,
                isExpandable: false,
                onClick: () => this.promptConfirmation()
            }).$btn;
    }

    promptConfirmation()
    {
        this.$btn.off("click")
            .addClass("confirming")
            .html(`<p>${this.confirmationPromptText}</p>
                    <div class='button confirmationButton'>CONFIRM</div>
                    <div class='button cancelButton'>CANCEL</div>`)
            .children()
            .click((e) => e.stopPropagation())
            .filter(".confirmationButton").click(() => this.onConfirm())
            .siblings(".cancelButton").click(() => this.reset());
    }

    reset()
    {
        this.$btn.html(this.buttonText)
            .off("click")
            .removeClass("confirming")
            .click(() => this.promptConfirmation());
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

function appendHtmlToContainer($container, tagName, content, { id, cssClasses } = {})
{
    $container.append(`<${tagName}${ id ? ` id='${id}'` : "" }${ cssClasses ? ` class='${cssClasses}'` : "" }>${content}</${tagName}>`);
}