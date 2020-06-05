import ValidationError from "./utilities/validationError.js";
import { postData, fetchHtml } from "./utilities/fetchUtils.js";

const fieldSelectors = {
    usernameSelector: "#txtUsername",
    passwordSelector: "#txtPassword",
    btnLogInSelector: "#btnLogIn",
    confirmPasswordSelector: "#txtConfirmPassword",
    emailSelector: "#txtEmail",
    accessCodeSelector: "#txtAccessCode"
}

$(function()
{
    const $lobby = $("#lobby"),
        loggedInAttr = "data-loggedIn";

    if ($lobby.attr(loggedInAttr))
        return showMainMenu({ animate: false });
        
    $("#btnLogIn").click(attemptLogin);
    $("#btnAttemptAccess").click(attemptAccess);
    
    $lobby.removeAttr(`class ${loggedInAttr}`);
});

function attemptLogin()
{
    const { usernameSelector, passwordSelector} = fieldSelectors,
        credentials = {
            username: $(usernameSelector).val(),
            password: $(passwordSelector).val()
        }
    
   if (usernameOrPasswordIsEmpty(credentials))
        return false;

    postData("serverCode/actionPages/login.php", credentials)
        .then(response =>
        {
            if (response && response.failure)
                return invalidCredentials(response.failure);
            
            showMainMenu();
        })
        .catch(e => console.error(e));
}

async function showMainMenu({ animate } = { animate: true })
{
    await transitionPageContentTo("mainMenu.php", { animate });
    $("#btnPlay").click(createGame);
    $("#lobby").removeAttr("class data-loggedIn");
}

async function attemptAccess()
{
    const { accessCodeSelector } = fieldSelectors,
        accessCode = $(accessCodeSelector).val();

    if (!accessCode.length)
    {
        new ValidationError(accessCodeSelector, "An access code is required to create an account.", "accessCodeError").show();
        hideValidationErrorsOnChangeEvent(accessCodeSelector);

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
}

function usernameOrPasswordIsEmpty(credentials)
{
    const { usernameSelector, passwordSelector } = fieldSelectors;
    
    let emptyFieldExists = false;
    if (!credentials.username.length)
    {
        new ValidationError(usernameSelector, "Enter your username or email address.").show();
        hideValidationErrorsOnChangeEvent(usernameSelector);
        emptyFieldExists = true;
    }

    if (!credentials.password.length)
    {
        new ValidationError(passwordSelector, "Enter your password.").show();
        hideValidationErrorsOnChangeEvent(passwordSelector);
        emptyFieldExists = true;
    }

    return emptyFieldExists;
}

function invalidCredentials(reason)
{
    const { btnLogin, passwordSelector, usernameSelector } = fieldSelectors;
    
    let selector = btnLogin,
        errorMsg = "Invalid username or password.";

    if (reason.includes("Invalid password"))
    {
        selector = passwordSelector;
        errorMsg = "Incorrect password.";
    }
    else if (reason.includes("Username does not exist"))
    {
        selector = usernameSelector;
        errorMsg = "That username does not exist.";
    }

    new ValidationError(selector, errorMsg).show();
    hideValidationErrorsOnChangeEvent(selector);
}

async function transitionPageContentTo(pageUrl, { animate } = { animate: true })
{
    const html = await fetchHtml(pageUrl),
        $content = $("#lobby").children(".content"),
        width = $("#header").width(),
        duration = 300;

    if (animate)
    {
        await animationPromise({
            $elements: $content,
            desiredProperties: { marginLeft: -width },
            duration,
            easing: "easeInQuint"
        });
    }

    $content.children().remove();
    $content.append(html);

    if (animate)
    {
        await animationPromise({
            $elements: $content,
            desiredProperties: { marginLeft: 0 },
            duration,
            easing: "easeOutQuart"
        });
        removeInlineStylePropertiesFrom($content);
    }
    
    return Promise.resolve();
}

function hideValidationErrorsOnChangeEvent(selector)
{
    const eventNames = "change keyup";

    $(selector).off(eventNames).on(eventNames, function()
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
        const {
            usernameSelector,
            passwordSelector,
            confirmPasswordSelector,
            emailSelector
        } = fieldSelectors;
        
        this.details = {
            username: $(usernameSelector).val(),
            password: $(passwordSelector).val(),
            passwordConfirmation: $(confirmPasswordSelector).val(),
            email: $(emailSelector).val()
        }
    }

    detailsAreValid()
    {
        const {
                usernameSelector,
                passwordSelector,
                confirmPasswordSelector,
                emailSelector
            } = fieldSelectors,
            {
                username,
                password,
                passwordConfirmation,
                email  
            } = this.details,
            errors = [];

        if (!username.length)
            errors.push(new ValidationError(usernameSelector, "Username is required."));
        else if (username.length < 2)
            errors.push(new ValidationError(usernameSelector, "Username must include at least 2 characters."));
        
        if (!password.length)
            errors.push(new ValidationError(passwordSelector, "Password is required."));
        else if (password.length < 8)
            errors.push(new ValidationError(passwordSelector, "Password must include at least 8 characters."));
        else if (!passwordConfirmation.length)
            errors.push(new ValidationError(confirmPasswordSelector, "Please confirm your password."));
        else if (password !== passwordConfirmation)
            errors.push(new ValidationError(confirmPasswordSelector, "Passwords do not match."));

        if (!email.length)
            errors.push(new ValidationError(emailSelector, "Email is required."));
        else if (emailIsInvalid(email))
            errors.push(new ValidationError(emailSelector, "Please enter a valid email address."));

        if (errors.length)
        {
            for (let error of errors)
                error.show();
            
            return false;
        }

        return true;
    }

    async create()
    {
        postData("serverCode/actionPages/createAccount.php", this.details)
            .then(response =>
            {
                if (response.failure)
                    return this.accountCreationFailed(response.failure);
                
                alert("success");
            })
            .catch(e => console.error(e));
    }

    accountCreationFailed(reason)
    {
        console.error("account creation failed: ", reason);
        if (reason.includes("already exists"))
        {
            console.log("already exists");
            const { usernameSelector, emailSelector } = fieldSelectors;

            if (reason.includes("Username"))
            {
                console.log("username");
                new ValidationError(usernameSelector, "That username is already taken.").show();
                hideValidationErrorsOnChangeEvent(usernameSelector);
            }
            else if (reason.includes("Email"))
            {
                console.log("email");
                new ValidationError(emailSelector, "That email address is already associated with an account.").show();
                hideValidationErrorsOnChangeEvent(emailSelector);
            }
        }
        else
        {
            console.error(reason);
            new ValidationError("#btnCreateAccount", "An error occured.");
            hideValidationErrorsOnChangeEvent("input");
        }
    }
}

function createGame()
{
    const numEpidemics = $("[name='radDifficulty']:checked").val(),
        numRoles = $("#ddlNumRoles").val();
    
    postData("serverCode/actionPages/createGame.php",
        {
            numEpidemics,
            numRoles
        })
        .then(response =>
        {
            if (response.failure)
                return gameCreationFailed(response.failure);

            window.location.replace("game.php");
        })
        .catch(e => console.error(e));
}

function gameCreationFailed(reason)
{
    alert(reason);
}