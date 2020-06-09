<?php
    $mainMenu = "<h1>Account Creation</h1>
                <p>Choose your username and password.<br/>An email address is required for account verification and password recovery — you will not receive any unwanted emails.</p>

                <form id='frmCreateAccount' autocomplete='off'>
                    <label for='txtUsername'>Username:</label>
                    <input id='txtUsername' type='text' maxlength='20' />

                    <label for='txtPassword'>Password:</label>
                    <input id='txtPassword' type='password' autocomplete='new-password' />

                    <label for='txtConfirmPassword'>Confirm Password:</label>
                    <input id='txtConfirmPassword' type='password' autocomplete='new-password' />

                    <label for='txtEmailAddress'>Email:</label>
                    <input id='txtEmailAddress' type='text' />

                    <div id='btnCreateAccount' class='button'>Create Account</div>
                    <p class='validationError errorSummary hidden'>Please fix the above error(s).</p>
                </form>";
    
    echo $mainMenu;
?>