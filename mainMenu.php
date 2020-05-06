<?php
    $mainMenu = "<div class='divInputControl'>
                    <label for='radDifficulty'>Select Difficulty:</label>
                    <br />
                    <input type='radio' name='radDifficulty' value='1' checked='checked'>Introductory</option>
                    <br />
                    <input type='radio' name='radDifficulty' value='2'>Normal</option>
                    <br />
                    <input type='radio' name='radDifficulty' value='3'>Heroic</option>
                </div>

                <div class='divInputControl'>
                    <label for='ddlNumRoles'>Number of Roles:</label>
                    <select id='ddlNumRoles'>
                        <option value='2'>2</option>
                        <option value='3'>3</option>
                        <option value='4'>4</option>
                    </select>
                </div>

                <div class='divInputControl'>
                    <input type='checkbox' value='random' checked='checked' />
                    <label for='chkRandomRoles'>Randomize Roles</label>
                </div>

                <div id='btnPlay' class='button'>PLAY</div>";
    
    echo $mainMenu;
?>