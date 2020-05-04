<?php
    $doc = "<!DOCTYPE html>
            <html lang='en'>
            <head>
                <meta charset='utf-8'>
                <!-- saved from url=(0014)about:internet -->
                <title>Pandemic</title>
                <meta name='viewport' content='width=device-width, initial-scale=1'>
                <link href='https://fonts.googleapis.com/css?family=Exo+2:800|Electrolize|Audiowide|Oswald:400,700|B612+Mono|Ropa+Sans&display=swap' rel='stylesheet'>
                <link rel='stylesheet' type='text/css' href='style.css'>
                <script src='clientCode/jquery-1.11.2.min.js'></script>
                <script src='clientCode/jquery-ui.min.js'></script>
                <script src='clientCode/jquery.easing.1.3.js'></script>
                <script src='clientCode/utilities/miscUtils.js'></script>
                <script src='clientCode/utilities/stringUtils.js'></script>
                <script src='clientCode/utilities/tooltipUtils.js'></script>
                <script src='clientCode/utilities/geometryUtils.js'></script>
                <script src='clientCode/utilities/animationUtils.js'></script>
                <script src='clientCode/setup.js'></script>
                <script type='module' src='clientCode/logic.js'></script>
            </head>
            <body>
                <div id='lobby'>
                    <h1>PANDEMIC</h1>
                    <p class='italics'>A re-creation of the award-winning board game.</p>
                    
                    <form>
                        <label for='txtAccessKey'>Enter Access Key:</label>
                        <input id='txtAccessKey' type='text' />
                        <div class='button'>Continue</div>
                    </form>

                    <p id='disclaimer' class='smallText'>DISCLAIMER: <span class='italics'>this is a fan-made re-creation which is intended to be a portfolio piece and is not available to the general public.
                    It cannot be played without an access key, which are granted exclusively to potential employers and a few close friends.
                    It is not intended for sale of any kind. This project is in no way affiliated with or sponsored by the creators of the original game.</span></p>
                </div>
            </body>";

    echo $doc;
?>