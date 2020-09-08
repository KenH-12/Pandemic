<?php
    session_start();
    if (!isset($_SESSION["tmpID"]) || !isset($_SESSION["tmpUsername"]))
    {
        header("Location: index.php");
        die();
    }

    $username = $_SESSION["tmpUsername"];
    
    $html = "<h1>$username,<br/>choose your new password.</h1>

            <form id='frmNewPassword' autocomplete='off'>
                <label for='txtPassword'>New Password:</label>
                <input id='txtPassword' type='password' autocomplete='new-password' tabindex='0'/>

                <label for='txtConfirmPassword'>Confirm New Password:</label>
                <input id='txtConfirmPassword' type='password' autocomplete='new-password' tabindex='0'/>

                <div id='btnConfirmNewPassword' class='button' tabindex='0'>Confirm</div>
                <p class='validationError errorSummary hidden'>Please fix the above error(s).</p>
            </form>";
    
    echo $html;
?>