<?php
    $doc = "<!DOCTYPE html>
            <html lang='en' class='blueGradient'>
                <head>
                    <meta charset='utf-8'>
                    <!-- saved from url=(0014)about:internet -->
                    <title>Pandemic</title>
                    <meta name='viewport' content='width=device-width, initial-scale=1'>
                    <link href='https://fonts.googleapis.com/css?family=Exo+2:800|Electrolize|Audiowide|Oswald:400,700|B612+Mono|Ropa+Sans&display=swap' rel='stylesheet'>
                    <link rel='stylesheet' type='text/css' href='style.css'>
                    <script src='clientCode/jquery-1.11.2.min.js'></script>
                    <script src='clientCode/jquery.easing.1.3.js'></script>
                    <script src='clientCode/utilities/miscUtils.js'></script>
                    <script src='clientCode/utilities/animationUtils.js'></script>
                    <script src='clientCode/gateKeeper.js' type='module'></script>
                </head>
                <body>
                    <div id='lobby'>
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

                                <div id='btnLogIn' class='button'>Log In</div>
                            </form>
                            
                            <h2>Don't Have an Account?</h2>
                            <form id='frmAccessCode'>    
                                <label for='txtAccessCode'>Enter Access Code:</label>
                                <input id='txtAccessCode' type='text' />
                                <div id='btnAttemptAccess' class='button'>Continue</div>
                            </form>

                            <p id='disclaimer' class='smallText'>DISCLAIMER: <span class='italics'>this is a fan-made re-creation which is intended to be a portfolio piece and is not available to the general public.
                            It cannot be played without an access code, which are granted exclusively to potential employers and a few close friends.
                            This project is not intended for sale of any kind and is in no way affiliated with or sponsored by the creators of the original game.</span></p>
                        </content>
                    </div>
                </body>
            </html>";

    echo $doc;
?>