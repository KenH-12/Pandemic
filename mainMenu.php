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
            $content = "<div class='divInputControl'>
                            <label for='radDifficulty' class='subtitle'>Difficulty:</label>
                            <div>
                                <input type='radio' name='radDifficulty' id='radIntroductory' value='4' checked='checked'>
                                <label for='radIntroductory'>Introductory</label><span id='introductoryInfo' class='info'>&#9432;</span>
                            </div>
                            <div>
                                <input type='radio' name='radDifficulty' id='radStandard' value='5'>
                                <label for='radStandard'>Standard</label><span id='standardInfo' class='info'>&#9432;</span>
                            </div>
                            <div>
                                <input type='radio' name='radDifficulty' id='radHeroic' value='6'>
                                <label for='radHeroic'>Heroic</label><span id='heroicInfo' class='info'>&#9432;</span>
                            </div>
                        </div>
        
                        <div class='divInputControl'>
                            <label for='ddlNumRoles' class='subtitle'>Number of Roles:</label>
                            <select id='ddlNumRoles'>
                                <option value='2'>2</option>
                                <option value='3'>3</option>
                                <option value='4'>4</option>
                            </select>
                            <span id='numberOfRolesInfo' class='info'>&#9432;</span>
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