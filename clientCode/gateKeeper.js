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
            hideValidationErrorsOnChangeEvent("#txtAccessCode");

            return false;
        }
        
        // more client-side validation perhaps
        // validate access code on server-side

        await transitionPageContentTo("accountCreation.php");
        $("#btnCreateAccount").click(function()
        {
            const account = new UserAccountCreator();

            if (account.detailsAreValid())
                return account.create();
            
            hideValidationErrorsOnChangeEvent("input");
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

function hideValidationErrorsOnChangeEvent(selector)
{
    $(selector).off("change").change(function()
    {
        const $errorMsg = $(this).next();
        if ($errorMsg.hasClass("validationError"))
            $errorMsg.remove();
        
        if ($(".validationError").length === 1)
            $(".validationError.errorSummary").addClass("hidden");
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
        this.email = $("#txtEmailAddress").val();
    }

    detailsAreValid()
    {
        const {
              username,
              password,
              passwordConfirmation,
              email  
            } = this,
            txtUsernameSelector = "#txtUsername",
            txtPasswordSelector = "#txtPassword",
            txtConfirmPasswordSelector = "#txtConfirmPassword",
            txtEmailSelector = "#txtEmailAddress",
            errors = [];

        if (!username.length)
            errors.push(new ValidationError(txtUsernameSelector, "Username is required."));
        else if (username.length < 2)
            errors.push(new ValidationError(txtUsernameSelector, "Username must include at least 2 characters."));
        
        if (!password.length)
            errors.push(new ValidationError(txtPasswordSelector, "Password is required."));
        else if (password.length < 8)
            errors.push(new ValidationError(txtPasswordSelector, "Password must include at least 8 characters."));
        else if (!passwordConfirmation.length)
            errors.push(new ValidationError(txtConfirmPasswordSelector, "Please confirm your password."));
        else if (password !== passwordConfirmation)
            errors.push(new ValidationError(txtConfirmPasswordSelector, "Passwords do not match."));

        if (!email.length)
            errors.push(new ValidationError(txtEmailSelector, "Email is required."));
        else if (emailIsInvalid(email))
            errors.push(new ValidationError(txtEmailSelector, "Please enter a valid email address."));

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
