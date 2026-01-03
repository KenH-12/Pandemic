<?php
    try
    {
        $rootDir = realpath($_SERVER["DOCUMENT_ROOT"]);
        require "$rootDir/Pandemic/serverCode/connect.php";

        session_start();
        
        if (!isset($_SESSION["uID"]))
            throw new Exception("user is not logged in");
        
        $uID = $_SESSION["uID"];

        $stmt = $pdo->prepare("SELECT gameID, epidemicCards, turnNumber FROM game
                                INNER JOIN vw_player ON game.gameID = vw_player.game
                                WHERE uID = ?
                                AND endCauseID IS NULL
                                LIMIT 1");
        $stmt->execute([$uID]);

        $gameInProgress = $stmt->rowCount() === 1;

        if ($gameInProgress)
        {
            $gameDetails = $stmt->fetch();
            $game = $gameDetails["gameID"];
            $numEpidemics = $gameDetails["epidemicCards"];
            $numTurns = $gameDetails["turnNumber"];

            if ($numEpidemics == 4)
                $difficulty = "Introductory";
            else if ($numEpidemics == 5)
                $difficulty = "Standard";
            else
                $difficulty = "Heroic";

            $stmt = $pdo->query("SELECT role FROM vw_player WHERE game = $game");
            $result = $stmt->fetchAll();

            $roles = "";
            foreach ($result as $row)
            {
                if (strlen($roles))
                    $roles .= "<br/>";
                
                $roles .= "<div class='roleTag'>" . $row["role"] . "</div>";
            }
            
            $stmt = $pdo->query("SELECT yStatus, rStatus, uStatus, bStatus FROM vw_disease WHERE game = $game");
            $diseaseStatuses = $stmt->fetch();

            $numCures = 0;
            foreach ($diseaseStatuses as $key => $status)
                if ($status !== "rampant")
                    $numCures++;
            
            $content = "<div id='gameInProgress'>
                            <h3>GAME IN PROGRESS:</h3>
                            <div>
                                <p>Roles</p>
                                $roles
                            </div>
                            <div>
                                <p>Difficulty</p>
                                $difficulty
                            </div>
                            <div>
                            <p>Cures</p>
                            $numCures / 4
                            </div>
                            <div>
                                <p>Turns Taken</p>
                                $numTurns
                            </div>

                            <div id='btnResumeGame' class='button materialButton'>RESUME</div>
                            <div id='btnAbandonGame' class='button materialButton'>ABANDON</div>
                        </div>";
            
            $_SESSION["game"] = $game;
        }
        else
        {
            // Set the selected difficulty and number of roles to the last settings that were used.
            $stmt = $pdo->prepare("SELECT numEpidemics, COUNT(*) AS 'numRoles'
                                    FROM gameRecord
                                    INNER JOIN roleRecord ON gameRecord.recordID = roleRecord.recordID
                                    WHERE userID = ?
                                    GROUP BY (gameRecord.recordID)
                                    ORDER BY gameRecord.recordID DESC
                                    LIMIT 1");
            $stmt->execute([$uID]);

            if ($stmt->rowCount() === 1)
            {
                $result = $stmt->fetch();
                $lastNumEpidemics = $result["numEpidemics"];
                $lastNumRoles = $result["numRoles"];
            }
            else // default settings
            {
                $lastNumEpidemics = 4;
                $lastNumRoles = 2;
            }

            $difficulties = array("Introductory", "Standard", "Heroic");
            $difficultyRadioButtons = "";
            for ($i = 0; $i < count($difficulties); $i++)
            {
                $difName = $difficulties[$i];
                $numEpidemics = $i + 4;
                $checked = $numEpidemics == $lastNumEpidemics ? " checked='checked'" : "";

                $difficultyRadioButtons .= "<div>
                        <input type='radio' name='radDifficulty' id='rad$difName' value='$numEpidemics'$checked>
                        <label for='rad$difName'>$difName</label><span id='" . strtolower($difName) . "Info' class='info'>&#9432;</span>
                    </div>";
            }

            $numRolesOptions = "";
            for ($i = 2; $i <= 4; $i++)
            {
                $selected = $i == $lastNumRoles ? " selected" : "";
                $numRolesOptions .= "<option value='$i'$selected>$i</option>";
            }

            $stmt = $pdo->prepare("SELECT roleID, roleName FROM `role`");
            $stmt->execute();

            if ($stmt->rowCount() === 0)
                throw new Exception("Failed to retrieve role options");

            $result = $stmt->fetchAll();
            $roleSelectorOptions = "";
            foreach ($result as $row)
            {
                $roleSelectorOptions .= "<div role-id='" . $row["roleID"] . "' class='roleTag'>" . $row["roleName"] . "</div>";
            }
            
            $content = "<div class='divInputControl'>
                            <label for='radDifficulty' class='subtitle'>Difficulty:</label>
                            $difficultyRadioButtons
                        </div>
        
                        <div class='divInputControl'>
                            <label for='ddlNumRoles' class='subtitle'>Number of Roles:</label>
                            <select id='ddlNumRoles'>
                                $numRolesOptions
                            </select>
                            <span id='numberOfRolesInfo' class='info'>&#9432;</span>
                        </div>

                        <div class='divInputControl'>
                            <label for='ddlRoleSelection' class='subtitle'>Role Selection:</label>
                            <select id='ddlRoleSelection'>
                                <option value='random' selected>Random</option>
                                <option value='choose'>Choose Roles</option>
                            </select>
                        </div>
                        <div id='roleSelector' class='divInputControl hidden'>
                            <div id='selectedRoles' class='roleBucket'>
                                <label id='selectedRolesIndicator' class='subtitle'>0 of 2 roles selected</label>
                            </div>
                            <div id='deselectedRoles' class='roleBucket'>
                                $roleSelectorOptions
                            </div>
                        </div>

                        <div id='btnPlay' class='button materialButton'>PLAY</div>";
        }
    }
    catch(PDOException $e)
    {
        $failure = "Failure: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $failure = "Failure: " . $e->getMessage();
    }
    finally
    {
        if (isset($failure))
            echo "An error occured... sorry about that!<br/><a href=''>Refresh</a> the page and try again.";
        else
            echo $content;
    }
?>