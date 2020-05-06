$(function()
{
    $("#btnAttemptAccess").click(function()
    {
        /* const accessKey = $("#txtAccessKey").val();

        if (!accessKey.length)
            showErrorMsg("Access Key is required."); */

        $.post("mainMenu.php", function(response)
        {
            showMainMenu(response);
        });
    });

    function showErrorMsg(msgString)
    {
        $("#lobby .errorMsg").html(`* ${msgString}`).removeClass("hidden");
    }

    async function showMainMenu(html)
    {
        const $content = $("#lobby").children(".content"),
            width = $("#header").width(),
            duration = 300;

            await animationPromise({
                $elements: $content,
                desiredProperties: { marginLeft: -width },
                duration,
                easing: "easeInQuint"
            });

            $content.children().remove();
            $content.append(html);

            await animationPromise({
                $elements: $content,
                desiredProperties: { marginLeft: 0 },
                duration,
                easing: "easeOutQuart"
            });
            removeInlineStylePropertiesFrom($content);
    }

    $("#txtAccessKey").focus();
});