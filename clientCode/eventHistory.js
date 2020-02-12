export default class EventHistory
{
    constructor()
    {
        this.$container = $("#eventHistoryContainer");
        this.$iconContainer = this.$container.find("#eventHistory");
        this.$btnBack = this.$container.find(".btnBack");
        this.$btnForward = this.$container.find(".btnForward");
    }

    appendIcon($icon)
    {
        this.$iconContainer.append($icon);
    }

    async slideInNewIcon()
    {
        const $icons = this.$eventHistory.children("img"),
            $newIcon = $icons.last().addClass("hidden"),
            freeSpace = this.$eventHistory.width() - ($icons.length - 1) * $newIcon.width();
        
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

    scrollToEnd({ addingNewIcon } = {})
    {
        const overflow = getHorizontalOverflow(this.$iconContainer);
        
        if (addingNewIcon && overflow <= 0)
            return this.slideInNewIcon();
        
        this.$iconContainer.animate({ scrollLeft: overflow });
    }
}