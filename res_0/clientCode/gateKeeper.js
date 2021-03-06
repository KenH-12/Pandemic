import ValidationError from "./utilities/validationError.js";
import { postData, fetchHtml } from "./utilities/fetchUtils.js";
import { strings } from "./strings.js";
import SideMenu, { SideMenuButton } from "./sideMenu.js";
import { bindSideMenuHoverEvents } from "./tooltipInstantiation.js";
import { getVersionNumber, logOut, getLoadingGifHtml } from "./utilities/pandemicUtils.js";

const selectors = {
    lobbySelector: "#lobby",
    usernameSelector: "#txtUsername",
    passwordSelector: "#txtPassword",
    btnLogInSelector: "#btnLogIn",
    btnAttemptAccessSelector: "#btnAttemptAccess",
    confirmPasswordSelector: "#txtConfirmPassword",
    emailSelector: "#txtEmailAddress",
    accessKeySelector: "#txtAccessKey",
    btnCreateAccountSelector: "#btnCreateAccount",
    verificationCodeSelector: "#txtVerificationCode",
    btnVerifySelector: "#btnVerify",
    lnkResendCodeSelector: "#lnkResendCode",
    btnForgotPasswordSelector: "#btnForgotPassword",
    btnCancelSelector: ".btnCancel"
},
data = {}

$(function()
{
    const $lobby = $(selectors.lobbySelector);

    data.imagesDir = `res_${getVersionNumber()}/images`;

    if ($lobby.attr("data-loggedIn"))
    {
        if ($lobby.attr("data-verified"))
            return showMainMenu({ animate: false });
        
        return promptAccountVerification($lobby.attr("data-email"), { animate: false });
    }
    
    removeAllDataAttributes($lobby.removeAttr("class"));
    bindLoginPageEventListeners();

    showBrowserCompatabilityWarning();
});

function bindLoginPageEventListeners()
{
    if (data.lockedOut)
        return false;
    
    const {
            btnLogInSelector,
            usernameSelector,
            passwordSelector,
            btnForgotPasswordSelector,
            btnAttemptAccessSelector,
            accessKeySelector
        } = selectors,
        $btnLogin = $(btnLogInSelector),
        $btnAttemptAccess = $(btnAttemptAccessSelector);
    
    $btnLogin.add($btnAttemptAccess).off("click")
        .removeClass("btnDisabled")
        .children(".loadingGif").remove();
    
    let $elementsToBind = $btnLogin.html("Log In").click(attemptLogin).add(usernameSelector).add(passwordSelector);
    bindKeypressEventListeners($elementsToBind.off("keypress"), 13, attemptLogin);
    
    $elementsToBind = $btnAttemptAccess.click(attemptAccess).add(accessKeySelector);
    bindKeypressEventListeners($elementsToBind.off("keypress"), 13, attemptAccess);

    $(btnForgotPasswordSelector).off("click").click(forgotPassword).removeClass("hidden");

    $("form").submit(() => false);

    $("#disclaimer").html(strings.disclaimer);
}

function unbindLoginPageEventListeners()
{
    const {
        btnLogInSelector,
        usernameSelector,
        passwordSelector,
        btnForgotPasswordSelector,
        btnAttemptAccessSelector,
        accessKeySelector
    } = selectors;

    $(btnLogInSelector).add(btnAttemptAccessSelector)
        .addClass("btnDisabled")
        .add(btnForgotPasswordSelector)
        .off("click")
        .add(usernameSelector)
        .add(passwordSelector)
        .add(accessKeySelector)
        .off("keypress");
}

function attemptLogin()
{
    unbindLoginPageEventListeners();

    if (data.lockedOut)
        return false;

    const {
            usernameSelector,
            passwordSelector,
            btnLogInSelector,
            btnForgotPasswordSelector
        } = selectors,
        credentials = {
            username: $(usernameSelector).val(),
            password: $(passwordSelector).val()
        }
    
   if (usernameOrPasswordIsEmpty(credentials))
        return false;

    const $loadingGif = $(getLoadingGifHtml());

    $(btnForgotPasswordSelector).addClass("hidden");
    $(btnLogInSelector).html("Logging In...").append($loadingGif);
    
    postData("serverCode/actionPages/login.php", credentials)
        .then(response =>
        {
            if (response && response.failure)
            {
                if (invalidCredentials(response.failure))
                {
                    bindLoginPageEventListeners();
                    return false;
                }

                return serverOperationFailed(response.failure);
            }
            
            if (response.accountNeedsVerification)
                return promptAccountVerification(response.emailAddress);
            
            showMainMenu();
        })
        .catch(e => serverOperationFailed(e.message));
}

async function forgotPassword()
{
    await transitionPageContentTo(`forgotPassword.php?usernameOrEmail=${ $(selectors.usernameSelector).val() }`);
    bindForgotPasswordPageEventListeners();
}

function bindForgotPasswordPageEventListeners()
{
    const $txtEmailOrUsername = $("#txtEmailOrUsername").select().focus(),
        $btnSendCode = $("#btnSendSecurityCode"),
        $btnCancel = $(selectors.btnCancelSelector),
        sendCode = () =>
        {
            const emailOrUsername = $txtEmailOrUsername.val(),
                $loadingGif = $(getLoadingGifHtml()).insertAfter($btnCancel);

            $btnSendCode.html("Sending Code...")
                .add($btnCancel)
                .off("click")
                .addClass("btnDisabled");

            postData("serverCode/actionPages/sendSecurityCode.php", { emailOrUsername })
                .then(response =>
                {
                    $loadingGif.remove();

                    if (response.failure)
                    {
                        $btnSendCode.removeClass("btnDisabled").html("Send Code");
                        return this.serverOperationFailed(response.failure);
                    }

                    promptSecurityCode();
                })
                .catch(e => serverOperationFailed(e.message));
        },
        cancel = () => {
            unbindForgotPasswordPageEventListeners();
            window.location.reload();
        }
    
    $btnSendCode.off("click").click(sendCode);
    bindKeypressEventListeners($btnSendCode.add($txtEmailOrUsername).off("keypress"), 13, sendCode);
    
    $btnCancel.off("click").click(cancel);
    bindKeypressEventListeners($btnCancel.off("keypress"), 13, cancel);

    $("form").submit(() => false);
}

function unbindForgotPasswordPageEventListeners()
{
    $("#btnSendSecurityCode").add(selectors.btnCancelSelector).off("click keypress");
}

async function promptSecurityCode()
{
    await transitionPageContentTo(`accountVerification.php?resettingPassword=1`);
    bindVerificationPageEventListeners(true);
}

function verifySecurityCode()
{
    unbindVerificationPageEventListeners();
    
    if (data.lockedOut)
        return false;
    
    const {
        verificationCodeSelector,
        btnVerifySelector,
        btnCancelSelector
    } = selectors,
        verificationCode = $(verificationCodeSelector).val(),
        $btnVerify = $(btnVerifySelector).html("Verifying...");

    if (!verificationCode.length)
        return securityCodeVerificationFailed("no code");

    const $loadingGif = $(getLoadingGifHtml()).insertAfter(btnCancelSelector);
    postData("serverCode/actionPages/verifySecurityCode.php", { verificationCode })
        .then(async response =>
        {
            $loadingGif.remove();

            if (response.failure)
                return securityCodeVerificationFailed(response.failure);
            
            $btnVerify.html("Verified!").css({ color: "#fff", backgroundColor: "#00a94f" })
                .siblings(".btnCancel").remove();
                
            await sleep(1000);
            promptNewPassword();
        })
        .catch(e => serverOperationFailed(e.message));
}

function securityCodeVerificationFailed(reason)
{
    let errorMsg;

    if (reason === "no code")
        errorMsg = "Please enter the security code you received.";
    else if (reason.includes("invalid code"))
        errorMsg = "Invalid code.";
    else if (reason.includes("code expired"))
    {
        errorMsg = "Code expired.";

        const $instructions = $(".content").children("p").first();
        
        $instructions.html(`Click "Cancel" to return to the home page and try again.`);
    }
    else if (reason.includes("too many failed attempts"))
    {
        tooManyFailedAttempts();
        errorMsg = "Too many failed attempts — try again in 15 minutes."
    }
    else
        return serverOperationFailed(reason);
    
    const { verificationCodeSelector } = selectors;

    new ValidationError(verificationCodeSelector, errorMsg).show();

    if (!data.lockedOut)
    {
        hideValidationErrorsOnChangeEvent(verificationCodeSelector);
        bindVerificationPageEventListeners(true);
    }
}

async function promptNewPassword()
{
    await transitionPageContentTo("newPassword.php");

    bindNewPasswordPageEventListeners();
}

function bindNewPasswordPageEventListeners()
{
    const $elements = $("#btnConfirmNewPassword").removeClass("btnDisabled").html("Confirm")
        .off("click").click(changePassword)
        .add("#txtPassword")
        .add("#txtConfirmPassword");

    bindKeypressEventListeners($elements.off("keypress"), 13, changePassword);
}

function unbindNewPasswordPageEventListeners()
{
    $("#btnConfirmNewPassword").off("click").addClass("btnDisabled")
        .add("#txtPassword")
        .add("#txtConfirmPassword")
        .off("keypress");
}

function changePassword()
{
    unbindNewPasswordPageEventListeners();

    const $btnConfirm = $("#btnConfirmNewPassword").html("Confirming..."),
        txtPasswordSelector = "#txtPassword",
        txtConfirmPasswordSelector = "#txtConfirmPassword",
        password = $(txtPasswordSelector).val(),
        passwordConfirmation = $(txtConfirmPasswordSelector).val(),
        $loadingGif = $(getLoadingGifHtml()).appendTo($btnConfirm);
    
    let errorMsg = getPasswordValidationError(password),
        selector = txtPasswordSelector;

    if (!errorMsg)
    {
        selector = txtConfirmPasswordSelector;
        
        if (!passwordConfirmation.length)
            errorMsg = "Please confirm your new password.";
        else if (password !== passwordConfirmation)
            errorMsg = "Passwords do not match.";
    }

    if (errorMsg)
    {
        $loadingGif.remove();
        
        new ValidationError(selector, errorMsg).show();
        hideValidationErrorsOnChangeEvent(selector);

        bindNewPasswordPageEventListeners();
        return false;
    }
    
    postData("serverCode/actionPages/updatePassword.php", { password })
        .then(async response =>
        {
            $loadingGif.remove();

            if (response.failure)
                return serverOperationFailed(response.failure);
            
            $btnConfirm.html("Success!").css({ color: "#fff", backgroundColor: "#00a94f" });
                
            await sleep(1000);
            showMainMenu();
        })
        .catch(e => serverOperationFailed(e.message));
}

function getPasswordValidationError(password)
{
    if (!password.length)
        return "Password is required.";
    else if (containsWhitespace(password))
        return "Password cannot include spaces.";
    else if (password.length < 8)
        return "Password must include at least 8 characters.";
    else if (!(containsCapitalLetter(password) && containsNumber(password)))
        return "Password must include at least one capital letter and one number.";
    
    return false;
}

async function showMainMenu({ animate } = {})
{
    const $lobby = $(selectors.lobbySelector),
        $sideMenu = $("#sideMenu");

    if (animate !== false)
        animate = true;
    
    removeAllDataAttributes($lobby.removeAttr("class"));
    await transitionPageContentTo("mainMenu.php", { animate, beforeShow: bindMainMenuEventListeners });

    if (!$sideMenu.length)
        appendSideMenu();
    
    showBrowserCompatabilityWarning();
}

function bindMainMenuEventListeners()
{
    if ($("#gameInProgress").length)
    {
        bindRoleCardHoverEvents();

        $("#btnResumeGame").click(() => window.location.replace("game.php"));
        $("#btnAbandonGame").click(promptAbandonGame);

        return false;
    }
    
    $("#btnPlay").click(function()
    {
        $(this).off("click").addClass("btnDisabled")
            .html("CREATING GAME...")
            .append(getLoadingGifHtml());
        createGame();
    });
}

function appendSideMenu()
{
    $(selectors.lobbySelector).append("<div id='sideMenu'></div>");

    const sideMenu = new SideMenu([
        new SideMenuButton("OVERVIEW",
		{
            buttonID: "overview",
            isPrimaryButton: true
        }),
        new SideMenuButton("GETTING STARTED",
        {
            buttonID: "gettingStarted",
            isPrimaryButton: true
        }),
        new SideMenuButton("RULES",
		{
			isPrimaryButton: true,
			descendantButtons: [
                new SideMenuButton("Objectives", { buttonID: "objectives" }),
				new SideMenuButton("Play steps", { buttonID: "playSteps" }),
				new SideMenuButton("Actions", { buttonID: "actionRules" }),
				new SideMenuButton("Roles", { buttonID: "roleInfo" }),
				new SideMenuButton("Cards", { buttonID: "cardInfo" }),
				new SideMenuButton("Diseases", { buttonID: "diseaseInfo" }),
				new SideMenuButton("Epidemics", { buttonID: "epidemicInfo" }),
				new SideMenuButton("Outbreaks", { buttonID: "outbreakInfo" })
			]
        }),
        new SideMenuButton("ABOUT",
        {
            buttonID: "about",
            isPrimaryButton: true
        }),
        new SideMenuButton("CONTACT",
        {
            buttonID: "contact",
            isPrimaryButton: true
        }),
        new SideMenuButton("LOG OUT",
        {
            buttonID: "btnlogOut",
            isExpandable: false,
            onClick: () => logOut(serverOperationFailed)
        })
    ], { omitContentSelector: ".inGameOnly" });

    const resizeSideMenu = () => { sideMenu.$menu.height($(window).height()) }

    $(window).off("resize").resize(resizeSideMenu);
    resizeSideMenu();
    bindSideMenuHoverEvents({ mainMenu: true });
}

function bindRoleCardHoverEvents()
{
    let $this,
        role,
        camelCaseRole,
        offset;
    
    $(".roleTag").each(function()
    {
        $this = $(this);
        $this.addClass(toCamelCase($this.html()));
    })
    .hover(function()
    {
        $this = $(this);
        role = $this.html();
        camelCaseRole = toCamelCase(role);
        offset = $this.offset();

        offset.top -= $this.height() / 2;
        offset.left += $this.outerWidth() + 2;

        $(`<div class='roleCard ${camelCaseRole}'>
            <h3>${role}</h3>
            <img	class='rolePortrait'
                    src='${data.imagesDir}/cards/roles/${camelCaseRole}.jpg'
                    alt='${role} Role Card' />
            <ul>${strings[`${camelCaseRole}CardText`]}</ul>
        </div>`)
            .appendTo(".content")
            .offset(offset);
    },
    () => $(".roleCard").remove());
}

function attemptAccess()
{
    const { accessKeySelector, btnAttemptAccessSelector } = selectors,
        accessKey = $(accessKeySelector).val();

    if (!accessKey.length)
    {
        new ValidationError(accessKeySelector, "An access key is required to create an account.").show();
        hideValidationErrorsOnChangeEvent(accessKeySelector);

        return false;
    }

    unbindLoginPageEventListeners();
    const $loadingGif = $(getLoadingGifHtml()).insertAfter(btnAttemptAccessSelector);
    
    postData("serverCode/actionPages/verifyAccessKey.php", { accessKey })
        .then(async response =>
        {
            $loadingGif.remove();

            if (response.failure)
                return invalidAccessKey(response.failure);

            await transitionPageContentTo("accountCreation.php");
            new UserAccountCreator().bindEventListeners();
        })
        .catch(e => serverOperationFailed(e.message));
}

function invalidAccessKey(reason)
{
    let errorMsg;

    if (reason.includes("invalid key"))
        errorMsg = "Invalid key";
    else if (reason.includes("key depleted"))
        errorMsg = "That key has already been used the maximum number of times.";
    else if (reason.includes("too many failed attempts"))
    {
        tooManyFailedAttempts();
        errorMsg = "Too many failed attempts — try again in 15 minutes.";
    }
    
    if (errorMsg)
    {
        const { accessKeySelector } = selectors;
        new ValidationError(accessKeySelector, errorMsg).show();
        
        if (!data.lockedOut)
        {
            hideValidationErrorsOnChangeEvent(accessKeySelector);
            bindLoginPageEventListeners();
        }
    }
    else
        serverOperationFailed(reason);
}

function usernameOrPasswordIsEmpty(credentials)
{
    const { usernameSelector, passwordSelector } = selectors;
    
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
    const {
        passwordSelector,
        usernameSelector,
        btnLogInSelector
    } = selectors;
    
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
    else if (reason.includes("too many failed attempts"))
    {
        tooManyFailedAttempts();
        selector = btnLogInSelector;
        errorMsg = "Too many failed attempts — try again in 15 minutes.";
    }

    if (selector)
    {
        new ValidationError(selector, errorMsg).show();
        
        if (!data.lockedOut)
            hideValidationErrorsOnChangeEvent(selector);
        
        return true;
    }

    return false;
}

async function transitionPageContentTo(pageUrl, { animate, beforeShow } = {})
{
    if (animate !== false)
        animate = true;
    
    const html = await fetchHtml(pageUrl),
        $content = $(selectors.lobbySelector).children(".content"),
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

    if (typeof beforeShow === "function")
        beforeShow();

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
    $(selector).off("change keyup")
        .on("change", function() { hideAssociatedValidationError($(this)) })
        .on("keyup", function(event)
            {
                // Ignore tab, enter, and arrow keys
                const keyCodesToIgnore = [9, 13, 37, 38, 39, 40];

                if (keyCodesToIgnore.includes(event.which) || keyCodesToIgnore.includes(event.keyCode))
                    return false;
                
                hideAssociatedValidationError($(this));
            });
}

function hideAssociatedValidationError($element)
{
    const $errorMsg = $element.next();

    if ($errorMsg.hasClass("validationError"))
        $errorMsg.remove();
    
    if ($(".validationError").length === 1)
        $(".validationError.errorSummary").addClass("hidden");
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
            } = selectors,
            self = this,
            $elements = $(btnCreateAccountSelector).off("click").click(() => self.tryCreateAccount())
                .add(usernameSelector)
                .add(passwordSelector)
                .add(confirmPasswordSelector)
                .add(emailSelector);
        
        bindKeypressEventListeners($elements.off("keypress"), 13, () => self.tryCreateAccount());
    }

    unbindEventListeners()
    {
        const {
            btnCreateAccountSelector,
            usernameSelector,
            passwordSelector,
            confirmPasswordSelector,
            emailSelector
        } = selectors;

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
        } = selectors;
        
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
            return this.createAccount();
    
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
        else if (!beginsWithLetter(username))
            errorMsg = "Username must begin with a letter.";
        else if (containsWhitespace(username))
            errorMsg = "Username cannot include spaces.";
        else if (!isAlphanumeric(username))
            errorMsg = "Username must be alphanumeric (letters, numbers, and underscores only).";
        else if (username.length < 2)
            errorMsg = "Username must include at least 2 characters.";
        
        if (errorMsg)
            validationErrors.push(new ValidationError(selectors.usernameSelector, errorMsg));
        
        return validationErrors;
    }

    validatePassword(validationErrors)
    {
        const { password, passwordConfirmation } = this.details,
            { passwordSelector, confirmPasswordSelector } = selectors;
        
        let errorMsg = getPasswordValidationError(password),
            selector = passwordSelector;

        if (!errorMsg)
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
            validationErrors.push(new ValidationError(selectors.emailSelector, errorMsg));
        
        return validationErrors;
    }

    createAccount()
    {
        const $btnCreateAccount = $(selectors.btnCreateAccountSelector)
                .addClass("btnDisabled")
                .html("Creating Account..."),
            $loadingGif = $(getLoadingGifHtml()).appendTo($btnCreateAccount);

        postData("serverCode/actionPages/createAccount.php", this.details)
            .then(response =>
            {
                $loadingGif.remove();

                if (response.failure)
                {
                    $btnCreateAccount.removeClass("btnDisabled").html("Create Account");
                    return this.accountCreationFailed(response.failure);
                }

                promptAccountVerification(this.details.email);
            })
            .catch(e => serverOperationFailed(e.message));
    }

    accountCreationFailed(reason)
    {
        if (reason.includes("already exists"))
        {
            const { usernameSelector, emailSelector } = selectors;

            if (reason.includes("Username"))
            {
                new ValidationError(usernameSelector, "That username is not available.").show();
                hideValidationErrorsOnChangeEvent(usernameSelector);
            }
            else if (reason.includes("Email"))
            {
                new ValidationError(emailSelector, "That email address is already associated with an account.").show();
                hideValidationErrorsOnChangeEvent(emailSelector);
            }

            this.bindEventListeners();
        }
        else
            serverOperationFailed(reason);
    }
}

async function promptAccountVerification(emailAddress, { animate } = {})
{
    if (animate !== false)
        animate = true;
    
    const beforeShow = () => $(".content").children("p").first()
        .html(`A verification code has been sent to ${emailAddress}.`);
    
    await transitionPageContentTo("accountVerification.php", { beforeShow, animate });
    bindVerificationPageEventListeners();
    removeAllDataAttributes($(selectors.lobbySelector).removeAttr("class"));
}

function bindVerificationPageEventListeners(resettingPassword = false)
{
    const {
            verificationCodeSelector,
            btnVerifySelector,
            lnkResendCodeSelector,
            btnCancelSelector
        } = selectors,
        $btnVerify = $(btnVerifySelector);

    let verificationFn;

    if (resettingPassword)
    {
        const $btnCancel = $(btnCancelSelector),
            cancel = () =>
            {
                unbindVerificationPageEventListeners();
                window.location.reload();
            }

        verificationFn = verifySecurityCode;
        $btnCancel.off("click keypress").click(cancel).removeClass("btnDisabled");
        bindKeypressEventListeners($btnCancel, 13, cancel);
    }
    else
    {
        verificationFn = verifyAccount;
        $(lnkResendCodeSelector).off("click").click(resendVerificationCode);
    }

    $btnVerify.off("click")
        .click(verificationFn)
        .removeClass("btnDisabled").html("Verify");
    
    bindKeypressEventListeners($(verificationCodeSelector).focus().add($btnVerify).off("keypress"), 13, verificationFn);

    $("form").submit(() => false);
}

function unbindVerificationPageEventListeners()
{
    const {
        verificationCodeSelector,
        btnVerifySelector,
        lnkResendCodeSelector,
        btnCancelSelector
    } = selectors;

    $(btnVerifySelector).add(btnCancelSelector)
        .addClass("btnDisabled")
        .add(lnkResendCodeSelector).off("click")
        .add(verificationCodeSelector).off("keypress");
}

function verifyAccount()
{
    unbindVerificationPageEventListeners();
    
    if (data.lockedOut)
        return false;
    
    const { verificationCodeSelector, btnVerifySelector } = selectors,
        verificationCode = $(verificationCodeSelector).val(),
        $btnVerify = $(btnVerifySelector).html("Verifying...");

    if (!verificationCode.length)
        return accountVerificationFailed("no code");

    const $loadingGif = $(getLoadingGifHtml()).insertAfter($btnVerify);
    postData("serverCode/actionPages/verifyAccount.php", { verificationCode })
        .then(async response =>
        {
            $loadingGif.remove();

            if (response.failure)
                return accountVerificationFailed(response.failure);
            
            $btnVerify.html("Verified!").css({ color: "#fff", backgroundColor: "#00a94f" });
            await sleep(1000);
            
            showMainMenu();
        })
        .catch(e => serverOperationFailed(e.message));
}

function accountVerificationFailed(reason)
{
    let errorMsg;

    if (reason === "no code")
        errorMsg = "Please enter the verification code you received.";
    else if (reason.includes("invalid code"))
        errorMsg = "Invalid code.";
    else if (reason.includes("code expired"))
    {
        errorMsg = "Code expired. Try resending a new code.";

        const $instructions = $(".content").children("p").first(),
            emailAddress = $instructions.html().substring($instructions.html().lastIndexOf(" "));
        
        $instructions.html(`Click the "Resend Code" link below to send a new verification code to ${emailAddress}`);
    }
    else if (reason.includes("too many failed attempts"))
    {
        tooManyFailedAttempts();
        errorMsg = "Too many failed attempts — try again in 15 minutes."
    }
    else
        return serverOperationFailed(reason);
    
    const { verificationCodeSelector } = selectors;

    new ValidationError(verificationCodeSelector, errorMsg).show();

    if (!data.lockedOut)
    {
        hideValidationErrorsOnChangeEvent(verificationCodeSelector);
        bindVerificationPageEventListeners();
    }
}

function resendVerificationCode()
{
    const $container = $("#resendCode"),
        $link = $container.find("#lnkResendCode").parent(),
        $msg = $link.addClass("hidden").siblings("p").html("Sending another code...").removeClass("hidden"),
        $loadingGif = $(getLoadingGifHtml()).appendTo($container);

    postData("serverCode/actionPages/resendVerificationCode.php")
        .then(async response =>
        {
            $loadingGif.remove();

            if (response.failure)
                return serverOperationFailed(response.failure);
            
            $msg.html("Sent another code!");
            await sleep(2500);
        
            await animationPromise({
                $elements: $msg,
                desiredProperties: { opacity: 0 }
            });
        
            $msg.addClass("hidden").removeAttr("style");
            $link.removeClass("hidden");
        })
        .catch(e => serverOperationFailed(e.message));
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
        .catch(e => serverOperationFailed(e.message));
}

function promptAbandonGame()
{
    const $container = $("#gameInProgress"),
        $title = $container.children("h3").first(),
        originalTitle = $title.html(),
        $originalButtons = $container.find(".button").addClass("hidden"),
        $btnConfirm = $("<div class='button materialButton' id='btnConfirmAbandon'>OK</div>").appendTo($container),
        $btnCancel = $("<div class='button materialButton' id='btnCancelAbandon'>CANCEL</div>").appendTo($container);
    
    $title.html("ABANDON GAME?");

    $btnConfirm.click(function()
    {
        $btnConfirm.off("click")
            .addClass("btnDisabled")
            .append(getLoadingGifHtml());
        
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
    postData("serverCode/actionPages/abandonGame.php", {})
        .then(response =>
        {
            if (response.failure)
                return serverOperationFailed(response.failure);
            
            showMainMenu();
        })
        .catch(e => serverOperationFailed(e.message));
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

function tooManyFailedAttempts()
{
    data.lockedOut = true;
    unbindLoginPageEventListeners();
    unbindVerificationPageEventListeners();

    $(selectors.btnVerifySelector).prev().off("keypress");
    $(".loadingGif").remove();
}

function showBrowserCompatabilityWarning()
{
    const browserName = getBrowser();
    
    if (browserName === "Chrome")
        return false;

    const $warning = $(`<div id='warningsContainer'>
                            <h3 class='browserCompatWarning'>— Compatibility Warning —</h3>
                            <p class='browserCompatWarning'>This application has not been tested on the <span id='browserName'></span>. Some features may not function as intended.</p>
                            <p class='browserCompatWarning'>Please use the <a href='https://www.google.com/intl/en_ca/chrome/'>Google Chrome</a> browser for a smoother experience.</p>
                            <br/>
                            <p class='browserCompatWarning'>Also note that this application was intended to run on desktop computers and will not render correctly for screens less than 1024 pixels wide.</p>
                            <br/>
                            <p class='browserCompatWarning'>Sorry for the inconvenience — I am only one man, and this project was <i>massive</i>.</p>
                        </div>`);
    
    $("#lobby > .content").append($warning)
        .find("#browserName").html(browserName === "unknown" ? "browser you are using" : `${browserName} browser`);
}