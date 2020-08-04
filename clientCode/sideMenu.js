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
        
    }

    close()
    {
        
    }
}