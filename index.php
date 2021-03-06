<?php
    session_start();
    $loggedIn = isset($_SESSION["uID"]);
    $verified = false;
    $email = false;

    require "serverCode/resourceDirectoryManager.php";
    $res = getResourceDirectory();
    $versionNumber = substr($res, 4);
    
    if ($loggedIn)
    {
        require "serverCode/connect.php";

        $stmt = $pdo->prepare("SELECT accountVerified, email FROM `user` WHERE userID = ?");
        $stmt->execute([$_SESSION["uID"]]);

        if ($stmt->rowCount())
        {
            $result = $stmt->fetch();
            $verified = $result["accountVerified"] == "1";
            $email = $result["email"];
        }
        else
        {
            unset($_SESSION["uID"]);
            $loggedIn = false;
        }
    }
    
    $doc = "<!DOCTYPE html>
            <html lang='en' class='blueGradient'>
                <head>
                    <meta charset='utf-8'>
                    <!-- saved from url=(0014)about:internet -->
                    <title>Pandemic</title>
                    <meta name='viewport' content='width=device-width, initial-scale=1'>
                    <link href='https://fonts.googleapis.com/css?family=Exo+2:800|Electrolize|Audiowide|Oswald:400,700|B612+Mono|Ropa+Sans&display=swap' rel='stylesheet'>
                    <link rel='stylesheet' type='text/css' href='$res/css/style.css'>
                    <link type='text/css' href='$res/css/hamburgers.css' rel='stylesheet'>
                    <link rel='icon' type='image/x-icon' sizes='16x16' href='$res/images/icons/favicon-16x16.png' />
                    <link rel='icon' type='image/x-icon' sizes='32x32' href='$res/images/icons/favicon-32x32.png' />
                    <script src='$res/clientCode/jquery-1.11.2.min.js'></script>
                    <script src='$res/clientCode/jquery.easing.1.3.js'></script>
                    <script src='$res/clientCode/utilities/miscUtils.js'></script>
                    <script src='$res/clientCode/utilities/animationUtils.js'></script>
                    <script src='$res/clientCode/utilities/stringUtils.js'></script>
                    <script src='$res/clientCode/utilities/tooltipUtils.js'></script>
                    <script src='$res/clientCode/gateKeeper.js' type='module'></script>
                </head>
                <body id='index' data-version='$versionNumber'>
                    <div id='lobby' class='hidden'
                        data-loggedIn='$loggedIn'
                        data-verified='$verified'
                        data-email='$email'>

                        <div id='header'>
                            <div>
                                <h1>PANDEMIC</h1>
                                <p class='italics'>A re-creation of the award-winning board game.</p>
                            </div>
                        </div>
                        
                        <div class='content'>
                            <form id='frmLogIn'>
                                <label for='txtUsername'>Username or Email:</label>
                                <input id='txtUsername' type='text' />

                                <label for='txtPassword'>Password:</label>
                                <input id='txtPassword' type='password' />

                                <div id='btnLogIn' class='button' tabindex='0'>Log In</div>
                                <a id='btnForgotPassword'>Forgot password?</a>
                            </form>
                            
                            <h2>Don't Have an Account?</h2>
                            <form id='frmAccessKey' class='inlineForm'>    
                                <label for='txtAccessKey'>Enter Access Key:</label>
                                <input id='txtAccessKey' type='text' />
                                <div id='btnAttemptAccess' class='button inlineButton' tabindex='0'>
                                    <img src='$res/images/icons/rightArrow.png' alt='Attempt Access'/>
                                </div>
                            </form>

                            <p id='disclaimer' class='smallText'></p>
                        </content>
                    </div>
                </body>
            </html>";

    echo $doc;
?>