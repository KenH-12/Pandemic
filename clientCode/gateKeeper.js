import ValidationError from "./utilities/validationError.js";

$(function()
{
    $("#btnLogIn").click(async function()
    {
        await transitionPageContentTo("mainMenu.php");
        $("#btnPlay").click(function() { createGame() });
    });

    $("#btnAttemptAccess").click(async function()
    {
        const accessCode = $("#txtAccessCode").val();

        if (!accessCode.length)
        {
            new ValidationError("#txtAccessCode", "An access code is required to create an account.", "accessCodeError").show();
            hideValidationErrorsOnKeypress("#txtAccessCode");

            return false;
        }
        
        // more client-side validation perhaps
        // validate access code on server-side

        await transitionPageContentTo("accountCreation.php");
        $("#btnCreateAccount").click(function()
        {
            const account = new UserAccountCreator();

            $(".validationError").remove();

            if (account.detailsAreValid())
                return account.create();
            
            hideValidationErrorsOnKeypress("input");
        });
    });
});

async function transitionPageContentTo(pageUrl)
{
    const html = await fetchHtml(pageUrl),
        $content = $("#lobby").children(".content"),
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
    
    return Promise.resolve();
}

function createGame()
{
    const numEpidemics = $("[name='radDifficulty']:checked").val(),
        numRoles = $("#ddlNumRoles").val(),
        randomizeRoles = $("#chkRandomizeRoles").prop("checked");
    
    // initiate game in db
    // load game script
}

function hideValidationErrorsOnKeypress(selector)
{
    $(selector).off("keypress").keypress(function()
    {
        const $errorMsg = $(this).next();
        if ($errorMsg.hasClass("validationError"))
            $errorMsg.remove();
    });
}

class UserAccountCreator
{
    constructor()
    {
        this.setDetails();
    }

    setDetails()
    {
        this.username = $("#txtUsername").val();
        this.password = $("#txtPassword").val();
        this.passwordConfirmation = $("#txtConfirmPassword").val();
        this.email = $("#txtEmail").val();
    }

    detailsAreValid()
    {
        const errors = [];

        // validate username
        if (this.username.length < 2)
            errors.push(new ValidationError("#txtUsername", "Username must be at least 2 characters in length."));
        
        // passwords must match
        if (this.password !== this.passwordConfirmation)
            errors.push(new ValidationError("#txtConfirmPassword", "Passwords do not match."));

        // validate email

        if (errors.length)
        {
            for (let error of errors)
                error.show();
            
            return false;
        }

        return true;
    }

    create()
    {
        console.log("createAccount()");
    }
}
