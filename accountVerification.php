<?php
    $html = "<div class='content'>
                <h1>Verify Your Account</h1>
                <p></p>

                <form id='frmVerificationCode' class='inlineForm'>
                    <label for='txtVerificationCode'>Verification Code:</label>
                    <input id='txtVerificationCode' type='text' />
                    <div id='btnVerifyAccount' class='button inlineButton'>Verify</div>
                </form>

                <u><a>Resend Code</a></u>
            </div>";
    
    echo $html;
?>