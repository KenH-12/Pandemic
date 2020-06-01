<?php
    $mainMenu = "<div class='divInputControl'>
                    <label for='radDifficulty' class='subtitle'>Select Difficulty:</label>
                    <div>
                        <input type='radio' name='radDifficulty' id='radIntroductory' value='4' checked='checked'>
                        <label for='radIntroductory'>Introductory</label>
                    </div>
                    <div>
                        <input type='radio' name='radDifficulty' id='radNormal' value='5'>
                        <label for='radNormal'>Normal</label>
                    </div>
                    <div>
                        <input type='radio' name='radDifficulty' id='radHeroic' value='6'>
                        <label for='radHeroic'>Heroic</label>
                    </div>
                </div>

                <div class='divInputControl'>
                    <label for='ddlNumRoles' class='subtitle'>Number of Roles:</label>
                    <select id='ddlNumRoles'>
                        <option value='2'>2</option>
                        <option value='3'>3</option>
                        <option value='4'>4</option>
                    </select>
                </div>

                <div id='btnPlay' class='button'>PLAY</div>";
    
    echo $mainMenu;
?>