<?php
    $html = "<h1>Verify Your Account</h1>
            <p></p>

            <form id='frmVerificationCode' class='inlineForm'>
                <label for='txtVerificationCode'>Verification Code:</label>
                <input id='txtVerificationCode' type='text' />
                <div id='btnVerify' class='button inlineButton'>Verify</div>
            </form>

            <div id='resendCode'>
                <u><a id='lnkResendCode'>Resend Code</a></u>
                <p class='largeText hidden'>Sent another code!</p>
            </div>";
    
    echo $html;
?>