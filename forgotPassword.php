<?php
    $usernameOrEmail = $_GET["usernameOrEmail"];
    
    $html = "<h1>Forgot Password?</h1>
            <p>Enter the email address or username associated with your account.<br/>A security code will be sent to you, which you can use to prove your identity.</p>

            <form id='frmPasswordRecovery' class='inlineForm'>
                <label for='txtEmailOrUsername'>Email Address or Username:</label>
                <input id='txtEmailOrUsername' type='text' value='$usernameOrEmail' tabindex='0'/>
                <div id='btnSendSecurityCode' class='button inlineButton' tabindex='0'>Send Code</div>
                <div class='btnCancel button inlineButton' tabindex='0'>Cancel</div>
            </form>";
    
    echo $html;
?>