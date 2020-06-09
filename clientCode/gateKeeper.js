import ValidationError from "./utilities/validationError.js";
import { postData, fetchHtml } from "./utilities/fetchUtils.js";
import { strings } from "./strings.js";

const fieldSelectors = {
    lobbySelector: "#lobby",
    usernameSelector: "#txtUsername",
    passwordSelector: "#txtPassword",
    btnLogInSelector: "#btnLogIn",
    btnAttemptAccessSelector: "#btnAttemptAccess",
    confirmPasswordSelector: "#txtConfirmPassword",
    emailSelector: "#txtEmailAddress",
    accessCodeSelector: "#txtAccessCode",
    btnCreateAccountSelector: "#btnCreateAccount"
}

$(function()
{
    const $lobby = $(fieldSelectors.lobbySelector),
        loggedInAttr = "data-loggedIn";

    if ($lobby.attr(loggedInAttr))
        return showMainMenu({ animate: false });
    
    $lobby.removeAttr(`class ${loggedInAttr}`);
    bindLoginPageEvents();
});

function bindLoginPageEvents()
{
    const {
            btnLogInSelector,
            usernameSelector,
            passwordSelector,
            btnAttemptAccessSelector,
            accessCodeSelector
        } = fieldSelectors,
        $btnLogin = $(btnLogInSelector),
        $btnAttemptAccess = $(btnAttemptAccessSelector);
    
    $btnLogin.add($btnAttemptAccess).off("click")
        .removeClass("btnDisabled")
        .children(".loadingGif").remove();
    
    let $elementsToBind = $btnLogin.html("Log In").click(attemptLogin).add(usernameSelector).add(passwordSelector);
    bindKeypressEventListener($elementsToBind.off("keypress"), 13, attemptLogin);
    
    $elementsToBind = $btnAttemptAccess.click(attemptAccess).add(accessCodeSelector);
    bindKeypressEventListener($elementsToBind.off("keypress"), 13, attemptAccess);
}

function unbindLoginPageEvents()
{
    const {
        btnLogInSelector,
        usernameSelector,
        passwordSelector,
        btnAttemptAccessSelector,
        accessCodeSelector
    } = fieldSelectors;

    $(btnLogInSelector).add(btnAttemptAccessSelector)
        .off("click").addClass("btnDisabled")
        .add(usernameSelector)
        .add(passwordSelector)
        .add(accessCodeSelector)
        .off("keypress");
}

function attemptLogin()
{
    unbindLoginPageEvents();

    const {
            usernameSelector,
            passwordSelector,
            btnLogInSelector
        } = fieldSelectors,
        credentials = {
            username: $(usernameSelector).val(),
            password: $(passwordSelector).val()
        }
    
   if (usernameOrPasswordIsEmpty(credentials))
        return false;

    const $loadingGif = $(strings.loadingGifHtml);

    $(btnLogInSelector).html("Logging In...").append($loadingGif);
    
    postData("serverCode/actionPages/login.php", credentials)
        .then(response =>
        {
            if (response && response.failure)
            {
                if (invalidCredentials(response.failure))
                {
                    bindLoginPageEvents();
                    return false;
                }

                return serverOperationFailed(response.failure);
            }
            
            showMainMenu();
        })
        .catch(e => serverOperationFailed(e.message));
}

async function showMainMenu({ animate } = {})
{
    if (animate !== false)
        animate = true;
    
    await transitionPageContentTo("mainMenu.php", { animate });
    $(fieldSelectors.lobbySelector).removeAttr("class data-loggedIn");

    if ($("#gameInProgress").length)
    {
        let $this;
        $(".roleTag").each(function()
        {
            $this = $(this);
            $this.addClass(toCamelCase($this.html()));
        });

        $("#btnResumeGame").click(() => window.location.replace("game.php"));
        $("#btnAbandonGame").click(promptAbandonGame);
    }
    else
    {
        $("#btnPlay").click(function()
        {
            $(this).off("click").addClass("btnDisabled")
                .html("CREATING GAME...")
                .append(strings.loadingGifHtml);
            createGame();
        });
    }
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
    new UserAccountCreator().bindEventListeners();
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
    const { passwordSelector, usernameSelector } = fieldSelectors;
    
    let selector,
        errorMsg;

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

    if (selector)
    {
        new ValidationError(selector, errorMsg).show();
        hideValidationErrorsOnChangeEvent(selector);
        return true;
    }

    return false;
}

async function transitionPageContentTo(pageUrl, { animate } = {})
{
    if (animate !== false)
        animate = true;
    
    const html = await fetchHtml(pageUrl),
        $content = $(fieldSelectors.lobbySelector).children(".content"),
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
    bindEventListeners()
    {
        const {
                btnCreateAccountSelector,
                usernameSelector,
                passwordSelector,
                confirmPasswordSelector,
                emailSelector
            } = fieldSelectors,
            self = this,
            $elements = $(btnCreateAccountSelector).off("click").click(() => self.tryCreateAccount())
                .add(usernameSelector)
                .add(passwordSelector)
                .add(confirmPasswordSelector)
                .add(emailSelector);
        
        bindKeypressEventListener($elements.off("keypress"), 13, () => self.tryCreateAccount());
    }

    unbindEventListeners()
    {
        const {
            btnCreateAccountSelector,
            usernameSelector,
            passwordSelector,
            confirmPasswordSelector,
            emailSelector
        } = fieldSelectors;

        $(btnCreateAccountSelector).off("click")
            .add(usernameSelector)
            .add(passwordSelector)
            .add(confirmPasswordSelector)
            .add(emailSelector)
            .off("keypress");
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

    tryCreateAccount()
    {
        this.unbindEventListeners();
        this.setDetails();

        if (this.detailsAreValid())
            return this.create();
    
        this.bindEventListeners();
        hideValidationErrorsOnChangeEvent("input");
    }

    detailsAreValid()
    {
        const validationErrors = [];

        this.validateUsername(validationErrors);
        this.validatePassword(validationErrors);
        this.validateEmailAddress(validationErrors);

        if (validationErrors.length)
        {
            for (let error of validationErrors)
                error.show();
            
            return false;
        }

        return true;
    }

    validateUsername(validationErrors)
    {
        const { username } = this.details;
        let errorMsg;

        if (!username.length)
            errorMsg = "Username is required.";
        else if (containsWhitespace(username))
            errorMsg = "Username cannot include spaces.";
        else if (username.length < 2)
            errorMsg = "Username must include at least 2 characters.";
        
        if (errorMsg)
            validationErrors.push(new ValidationError(fieldSelectors.usernameSelector, errorMsg));
        
        return validationErrors;
    }

    validatePassword(validationErrors)
    {
        const { password } = this.details,
            { passwordSelector, confirmPasswordSelector } = fieldSelectors;
        
        let errorMsg,
            selector = passwordSelector;

        if (!password.length)
            errorMsg = "Password is required.";
        else if (containsWhitespace(password))
            errorMsg = "Password cannot include spaces.";
        else if (password.length < 8)
            errorMsg = "Password must include at least 8 characters.";
        else
        {
            selector = confirmPasswordSelector;

            if (!passwordConfirmation.length)
                errorMsg = "Please confirm your password.";
            else if (password !== passwordConfirmation)
                errorMsg = "Passwords do not match.";
        }
        
        if (errorMsg)
            validationErrors.push(new ValidationError(selector, errorMsg));
        
        return validationErrors;
    }

    validateEmailAddress(validationErrors)
    {
        const { email } = this.details;
        let errorMsg;

        if (!email.length)
            errorMsg = "Email is required.";
        else if (emailIsInvalid(email))
            errorMsg = "Please enter a valid email address.";

        if (errorMsg)
            validationErrors.push(new ValidationError(fieldSelectors.emailSelector, errorMsg));
        
        return validationErrors;
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
                return serverOperationFailed(response.failure);

            window.location.replace("game.php");
        })
        .catch(e => console.error(e));
}

function promptAbandonGame()
{
    const $container = $("#gameInProgress"),
        $title = $container.children("h3").first(),
        originalTitle = $title.html(),
        $originalButtons = $container.find(".button").addClass("hidden"),
        $btnConfirm = $("<div class='button' id='btnConfirmAbandon'>OK</div>").appendTo($container),
        $btnCancel = $("<div class='button' id='btnCancelAbandon'>CANCEL</div>").appendTo($container);
    
    $title.html("ABANDON GAME?");

    $btnConfirm.click(function()
    {
        $btnConfirm.off("click")
            .addClass("btnDisabled")
            .append(strings.loadingGifHtml);
        
        $btnCancel.remove();

        abandonGame();
    });
    $btnCancel.click(() =>
    {
        $btnConfirm.add($btnCancel).remove();
        $title.html(originalTitle);
        $originalButtons.removeClass("hidden");
    });
}

function abandonGame()
{
    postData("serverCode/actionPages/deleteGame.php", {})
        .then(response =>
        {
            if (response.failure)
                return serverOperationFailed(response.failure);
            
            showMainMenu();
        })
        .catch(e => console.error(e));
}

function serverOperationFailed(reason)
{
    if (reason.includes("not logged in"))
        window.location.reload(false);
    else
    {
        $(".content").remove();
        new ValidationError("#header", "An error occured. <a href=''>Refresh</a> the page and try again.").show();
    }
}