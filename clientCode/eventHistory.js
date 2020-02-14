export default class EventHistory
{
    constructor()
    {
        this.$container = $("#eventHistoryContainer");
        this.$iconContainer = this.$container.find("#eventHistory");
        this.$btnBack = this.$container.find(".btnBack");
        this.$btnForward = this.$container.find(".btnForward");
        this.$btnUndo = this.$container.find("#btnUndo");

        this.scrollLeft = 0;
        this.scrollDuration = 300;
        this.scrollEasing = "easeOutCubic";
    }

    appendIcon($icon)
    {
        this.$iconContainer.append($icon);
    }

    removeIcon(event)
    {
        return new Promise(async resolve =>
        {
            await this.scrollToEnd({ leaveButtonsDisabled: true});

            const { $iconContainer } = this,
                scrollLeft = $iconContainer.scrollLeft(),
                $icon = $iconContainer.children("img").last(),
                iconWidth = $icon.outerWidth() + 1,
                newScrollLeft = scrollLeft - iconWidth,
                alt = $icon.attr("alt");

            if (alt !== event.name)
            {
                console.error(`Encountered unexpected icon ('${alt}') when attempting to remove event icon: '${event.name}'`);
                return false;
            }

            animatePromise({
                $elements: $icon,
                desiredProperties: { opacity: 0.1 },
                duration: 100
            });

            await animatePromise({
                $elements: $iconContainer,
                desiredProperties: { scrollLeft: newScrollLeft },
                easing: "easeOutSine"
            });

            $icon.remove();

            if (this.getOverflow() > 0)
                this.enableBackButton();
        
            this.scrollLeft = newScrollLeft;

            resolve();
        });
    }

    async slideInNewIcon()
    {
        const $icons = this.$iconContainer.children("img"),
            $newIcon = $icons.last().addClass("hidden"),
            freeSpace = this.$iconContainer.width() - ($icons.length - 1) * $newIcon.width();
        
        $newIcon.css("margin-left", freeSpace);

        await Promise.race([
            resolvePromiseOnLoad($newIcon),
            sleep(250)
        ]);

        await animatePromise({
            $elements: $newIcon.removeClass("hidden"),
            desiredProperties: { marginLeft: 0 },
            easing: "easeOutQuad"
        });

        $newIcon.removeAttr("style");
    }

    scrollToEnd({ addingNewIcon, leaveButtonsDisabled } = {})
    {
        return new Promise(async resolve =>
        {
            const overflow = this.getOverflow();
            
            if (addingNewIcon && overflow <= 0)
                return slideInNewIcon();
            
            this.disableForwardButton();
                
            await animatePromise({
                $elements: this.$iconContainer,
                desiredProperties: { scrollLeft: overflow },
                duration: this.scrollDuration,
                easing: this.scrollEasing
            });

            this.scrollLeft = overflow;
            
            if (!leaveButtonsDisabled && overflow > 0)
                this.enableBackButton();
            
            resolve();
        });
    }

    getOverflow()
    {
        return getHorizontalOverflow(this.$iconContainer);
    }

    enableScrollButtons()
    {
        this.enableBackButton();
        this.enableForwardButton();
    }

    enableBackButton()
    {
        const self = this;
        this.$btnBack
            .off("click")
            .click(() => self.scrollBack())
            .removeClass("btnDisabled");
    }
    
    enableForwardButton()
    {
        const self = this;
        this.$btnForward
            .off("click")
            .click(() => self.scrollForward())
            .removeClass("btnDisabled");
    }

    disableScrollButtons()
    {
        this.disableBackButton();
        this.disableForwardButton();
    }

    disableBackButton()
    {
        this.$btnBack.off("click")
            .addClass("btnDisabled");
    }

    disableForwardButton()
    {
        this.$btnForward.off("click")
            .addClass("btnDisabled");
    }

    scrollBack()
    {
        const { $iconContainer, scrollDuration, scrollEasing } = this,
            newScrollLeft = $iconContainer.scrollLeft() - $iconContainer.width(),
            scrollLeft = newScrollLeft > 0 ? newScrollLeft : 0;
        
        $iconContainer.stop()
            .animate({ scrollLeft }, scrollDuration, scrollEasing);
        
        if (this.scrollLeft !== scrollLeft)
            this.enableForwardButton();
        
        this.scrollLeft = scrollLeft;
        
        if (scrollLeft === 0)
            this.disableBackButton();
    }

    scrollForward()
    {
        const { $iconContainer, scrollDuration, scrollEasing } = this,
            overflow = this.getOverflow(),
            newScrollLeft = $iconContainer.scrollLeft() + $iconContainer.width(),
            scrollLeft = newScrollLeft > overflow ? overflow : newScrollLeft;
        
        $iconContainer.stop()
            .animate({ scrollLeft }, scrollDuration, scrollEasing);
        
        if (this.scrollLeft !== scrollLeft)
            this.enableBackButton();
        
        this.scrollLeft = scrollLeft;
        
        if (scrollLeft === overflow)
            this.disableForwardButton();
    }

    enableUndo(undoAction)
    {
        this.$btnUndo
            .off("click")
            .removeClass("btnDisabled")
            .click(function() { undoAction() })
            .attr("title", "Undo last action");
    }

    disableUndo({ undoIsIllegal, lastEventName } = {})
    {
        this.$btnUndo
            .off("click")
            .addClass("btnDisabled")
            .attr("title", undoIsIllegal ? `${lastEventName} events cannot be undone.` : "Cannot undo at this time...");
    }
}