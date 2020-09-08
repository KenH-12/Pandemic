<?php
    if (isset($_GET["resettingPassword"]))
    {
        $title = "Verify Your Identity";
        $instructions = "You can reset your password after entering the security code you received.";
        $labelText = "Security Code:";
        $btnCancel = "<div class='btnCancel button inlineButton' tabindex='0'>Cancel</div>";
        $lnkResendCode = "";
    }
    else
    {
        $title = "Verify Your Account";
        $instructions = "";
        $labelText = "Verification Code:";
        $btnCancel = "";
        $lnkResendCode = "<div id='resendCode'>
                            <u><a id='lnkResendCode'>Resend Code</a></u>
                            <p class='largeText hidden'>Sent another code!</p>
                        </div>";
    }
    
    $html = "<h1>$title</h1>
            <p>$instructions</p>

            <form id='frmVerificationCode' class='inlineForm'>
                <label for='txtVerificationCode'>$labelText</label>
                <input id='txtVerificationCode' type='text' tabindex='0'/>
                <div id='btnVerify' class='button inlineButton' tabindex='0'>Verify</div>
                $btnCancel
            </form>

            $lnkResendCode";
    
    echo $html;
?>