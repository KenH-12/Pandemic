<?php
function queryCausedError($pdo)
{
    return $pdo->errorInfo()[0] != "00000";
}

function throwException($pdo, $msg)
{
    throw new Exception("$msg: " . implode(", ", $pdo->errorInfo()));
}

function callDbFunctionSafe($pdo, $fnName, $args)
{
    $placeholders = "?";
    
    if (is_array($args))
    {
        for ($i = 1; $i < count($args); $i++)
            $placeholders .= ", ?";
    }
    else
        $args = array($args);
    
    $stmt = $pdo->prepare("SELECT pandemic.$fnName($placeholders) AS 'returnVal'");
    $stmt->execute($args);

    return $stmt->fetch()["returnVal"];
}

function sendVerificationCode($pdo, $userID)
{
    $vCode = callDbFunctionSafe($pdo, "udf_generateVerificationCode", $userID);

    if ($vCode == "0")
        throwException($pdo, "Failed to set verification code");
    
    $stmt = $pdo->prepare("SELECT username, email FROM `user` WHERE userID = ?");
    $stmt->execute([$userID]);

    if ($stmt->rowCount() === 0)
    {
        session_start();
        unset($_SESSION["uID"]);
        throw new Exception("user not logged in");
    }

    $result = $stmt->fetch();

    $username = $result["username"];
    $to = $result["email"];
    $subject = "Pandemic Account Verification";
    $message = "<html>
                <head>
                    <title>Pandemic Account Verification</title>
                </head>
                <body>
                    <h3>Hello, $username.</h3>
                    <h5>Ready to save the world?!</h5>
                    <p>Verify your Pandemic account using this code: $vCode</p>
                    <p>(code will expire after 1 hour)</p>
                </body>
                </html>";
    $headers = "MIME-Version: 1.0\r\nContent-type: text/html; charset=iso-8859-1";
}

function recordFailedLoginAttempt($pdo, $usernameOrId, $ipAddress)
{
    // Record the username that was used in the attempt.
    if (is_numeric($usernameOrId))
    {
        $stmt = $pdo->prepare("SELECT username from user WHERE userID = ?");
        $stmt->execute([$usernameOrId]);
        
        if ($stmt->rowCount() === 0)
            $username = "0";
        else
            $username = $stmt->fetch()["username"];
    }
    else
        $username = $usernameOrId;
    
    $timeOfAttempt = (new DateTime(null, new DateTimeZone("America/Toronto")))->format("Y-m-d H:i:s");

    $stmt = $pdo->prepare("INSERT INTO failedLoginAttempt (ipAddress, username, timeOfAttempt) VALUES (?, ?, ?)");
    $stmt->execute([$ipAddress, $username, $timeOfAttempt]);
}

function countFailedAttempts($pdo, $ipAddress)
{
    $fifteenMinsAgo = (new DateTime("15 minutes ago", new DateTimeZone("America/Toronto")))->format("Y-m-d H:i:s");

    $stmt = $pdo->prepare("SELECT COUNT(*) AS 'numAttempts'
                            FROM failedLoginAttempt
                            WHERE ipAddress = ?
                            AND timeOfAttempt > ?");
    $stmt->execute([$ipAddress, $fifteenMinsAgo]);

    $numAttempts = $stmt->fetch()["numAttempts"];

    throwExceptionIfFailedAttemptLimitReached($numAttempts);
    
    return $numAttempts;
}

function throwExceptionIfFailedAttemptLimitReached($numAttempts)
{
    $MAX_ATTEMPTS = 10;

    if ($numAttempts >= $MAX_ATTEMPTS)
    {
        session_start();
        unset($_SESSION["uID"]);
        throw new Exception("too many failed attempts");
    }
}

function clearFailedLoginAttempts($pdo)
{
    $ip = getClientIpAddress();

    $stmt = $pdo->prepare("DELETE FROM failedLoginAttempt WHERE ipAddress = ?");
    $stmt->execute([$ip]);
}

function getClientIpAddress()
{
    if (isset($_SERVER['HTTP_CLIENT_IP']))
        return $_SERVER['HTTP_CLIENT_IP'];
    
    if (isset($_SERVER['HTTP_X_FORWARDED_FOR']))
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    
    return $_SERVER['REMOTE_ADDR'];
}

function getTurnNumber($pdo, $game)
{
    $stmt = $pdo->prepare("SELECT turnNum
                        FROM vw_gamestate
                        WHERE game = ?");
    $stmt->execute([$game]);
    
    return $stmt->fetch()["turnNum"];
}

function getCurrentStepName($pdo, $game)
{
    $stmt = $pdo->prepare("SELECT stepName
                            FROM vw_gamestate
                            WHERE game = ?");
    $stmt->execute([$game]);

    return $stmt->fetch()["stepName"];
}

function getActiveRole($pdo, $game)
{
    $stmt = $pdo->prepare("SELECT turn AS 'roleID' FROM vw_gamestate WHERE game = ?");
    $stmt->execute([$game]);

    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to retrieve active role");

    return $stmt->fetch()["roleID"];
}

function getActionEventTypes()
{
    return array('dr','df','cf','sf','rs','sk','td','dc','pc','dp','of');
}

function countEventsOfTurn($pdo, $game, $eventTypes, $turnNum = false)
{
    if (is_array($eventTypes))
        $eventTypes = "'" . implode("','", $eventTypes) . "'";
    else
        $eventTypes = "'$eventTypes'";
    
    if (!$turnNum)
        $turnNum = getTurnNumber($pdo, $game);

    $stmt = $pdo->prepare("SELECT COUNT(*) AS 'numEvents'
                        FROM vw_event
                        WHERE game = ?
                        AND turnNum = $turnNum
                        AND eventType IN ($eventTypes)");
    $stmt->execute([$game]);

    return $stmt->fetch()["numEvents"];
}

function validateColor($color)
{
    $validColors = array("y", "r", "u", "b");

    if (!in_array($color, $validColors))
        throw new Exception("Invalid color: $color");
    
    return $color;
}

function getCubeColumnName($color)
{
    return validateColor($color) . "Cubes";
}

function getCubeCount($pdo, $game, $cityKey, $diseaseColor)
{
    $cubeColumn = getCubeColumnName($diseaseColor);
    
    $stmt = $pdo->prepare("SELECT $cubeColumn
                        FROM vw_location
                        WHERE game = ?
                        AND locationKey = ?");
    $stmt->execute([$game, $cityKey]);

    $cubeCount = $stmt->fetch()[$cubeColumn];
    
    if (!is_numeric($cubeCount))
        throwException($pdo, "Failed to retrieve cube count ($cityKey, $cubeColumn)");
    else if ($cubeCount > 3 || $cubeCount < 0)
        throwException($pdo, "Cube count out of range ($cityKey, $cubeColumn, $cubeCount)");

    return $cubeCount;
}

function addCubesToCity($pdo, $game, $cityKey, $diseaseColor, $cubesToAdd)
{
    $MAX_CUBE_COUNT = 3;
    $cubeCount = getCubeCount($pdo, $game, $cityKey, $diseaseColor);
    $cubeColumn = getCubeColumnName($diseaseColor);
    $result["prevCubeCount"] = $cubeCount;
    
    if ($cubeCount + $cubesToAdd <= $MAX_CUBE_COUNT)
        $newCubeCount = $cubeCount + $cubesToAdd;
    else
    {
        $newCubeCount = $MAX_CUBE_COUNT;
        $result["outbreakEvents"] = outbreak($pdo, $game, $cityKey, $diseaseColor);
    }

    if ($newCubeCount != $cubeCount)
    {
        $stmt = $pdo->prepare("UPDATE vw_location
                                SET $cubeColumn = $newCubeCount
                                WHERE game = ?
                                AND locationKey = ?");
        $stmt->execute([$game, $cityKey]);
        
        if ($stmt->rowCount() !== 1)
            throwException($pdo, "Failed to add $cubesToAdd cubes ($diseaseColor) to $cityKey");
        
        checkAndRecordDiseaseCubeDefeat($pdo, $game, $diseaseColor);
    }

    return $result;
}

function removeCubesFromCity($pdo, $game, $role, $cityKey, $cubeColor, $removeAll, $eventType, $cubeCount = false)
{
    if ($cubeCount === false)
        $cubeCount = getCubeCount($pdo, $game, $cityKey, $cubeColor);
    
    if ($removeAll)
        $newCubeCount = 0;
    else
    {
        $newCubeCount = $cubeCount - 1;

        if ($newCubeCount < 0)
            throwException($pdo, "Failed to remove cube from $cityKey: city already has 0 $cubeColor cubes.");
    }
    
    $cubeColumn = getCubeColumnName($cubeColor);
    $stmt = $pdo->prepare("UPDATE vw_location
                        SET $cubeColumn = $newCubeCount
                        WHERE game = ?
                        AND locationKey = ?");
    $stmt->execute([$game, $cityKey]);

    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to remove $cubeColor cube(s) from $cityKey");

    if ($eventType === "td")
        return recordEvent($pdo, $game, $eventType, "$cityKey,$cubeColor,$cubeCount,$newCubeCount", $role);
    else if ($eventType === "at")
        return recordEvent($pdo, $game, $eventType, "$cityKey,$cubeColor,$cubeCount", $role);
}

function recordEvent($pdo, $game, $type, $details, $role = NULL)
{
    $turnNum = getTurnNumber($pdo, $game);

    $stmt = $pdo->prepare("INSERT INTO vw_event
                                (game, turnNum, eventType, details, role)
                            VALUES
                                (:game, :turnNum, :type, :details, :role)");
    $stmt->execute([
        "game" => $game,
        "turnNum" => $turnNum,
        "type" => $type,
        "details" => $details,
        "role" => $role
    ]);
    
    if ($stmt->rowCount() != 1)
        throwException($pdo, "Failed to insert event ($type, $details)");

    return array("id" => $pdo->lastInsertId(),
                "turnNum" => $turnNum,
                "code" => $type,
                "details" => $details,
                "role" => $role);
}

function outbreak($pdo, $game, $originCityKey, $diseaseColor)
{
    $events = array();

    $OUTBREAK_LIMIT = 8;

    $stmt = $pdo->prepare("SELECT outbreakCount
                            FROM vw_gamestate
                            WHERE game = ?");
    $stmt->execute([$game]);
    $outbreakCount = $stmt->fetch()["outbreakCount"];
    
    $cubeColumn = getCubeColumnName($diseaseColor);
    $pendingOutbreakKeys = array($originCityKey);
    // A city cannot outbreak more than once
    // as a result of resolving the current infection card.
    $currentOutbreakKeys = array($originCityKey);
    
    while (count($pendingOutbreakKeys) > 0)
    {
        $outbreakDetails = array_shift($pendingOutbreakKeys);

        if (is_array($outbreakDetails))
        {
            $outbreakKey= $outbreakDetails["outbreakKey"];
            $triggeredByKey = $outbreakDetails["triggeredByKey"];
        }
        else
        {
            $outbreakKey = $outbreakDetails;
            $triggeredByKey = 0;
        } 
        
        $outbreakCount++;
        $events[] = recordEvent($pdo, $game, "ob", "$outbreakCount,$outbreakKey,$diseaseColor,$triggeredByKey");

        // If the outbreak limit is reached, the game is over and the players lose.
        if ($outbreakCount == $OUTBREAK_LIMIT)
        {
            recordGameEndCause($pdo, $game, "outbreak");
            return $events;
        }

        $stmt = $pdo->prepare("UPDATE game SET numOutbreaks = $outbreakCount WHERE gameID = ?");
        $stmt->execute([$game]);
        
        if ($stmt->rowCount() !== 1)
            throwException($pdo, "Failed to update gamestate after outbreak.");

        $connections = getConnectedCityKeyPairs($pdo, $outbreakKey);

        if (count($connections) === 0)
            throwException($pdo, "Failed to retrieve cities connected to $outbreakKey");

        foreach ($connections as $con)				
        {
            $affectedKey = $con["cityKeyA"] === $outbreakKey ? $con["cityKeyB"] : $con["cityKeyA"];

            // Cities which have already been triggered to outbreak as a result of
            // resolving the current infection card will already contain 3 cubes of the relevant color,
            // and can therefore be ignored.
            if (in_array($affectedKey, $currentOutbreakKeys))
                continue;
        
            $infectionPrevention = checkInfectionPrevention($pdo, $game, $affectedKey, $diseaseColor);
            if ($infectionPrevention != "0")
            {
                // Infection prevented -- the city will not be affected.
                $events[] = recordEvent($pdo, $game, "oi", "$outbreakKey,$affectedKey,$diseaseColor,$infectionPrevention");
                continue;
            }

            $cubeCount = getCubeCount($pdo, $game, $affectedKey, $diseaseColor);

            if ($cubeCount < 3) // add one more cube to the city
            {
                $stmt = $pdo->prepare("UPDATE vw_location
                                        SET $cubeColumn = ($cubeCount + 1)
                                        WHERE game = ?
                                        AND locationKey = '$affectedKey'");
                $stmt->execute([$game]);

                if ($stmt->rowCount() !== 1)
                    throwException($pdo, "Failed to add $cubeColumn to $affectedKey (outbreak infection triggered by $outbreakKey)");
                
                $events[] = recordEvent($pdo, $game, "oi", "$outbreakKey,$affectedKey,$diseaseColor,$infectionPrevention");
            }
            else // the affected city will have an outbreak
            {
                $outbreakDetails = array("outbreakKey" => $affectedKey, "triggeredByKey" => $outbreakKey);
                array_push($pendingOutbreakKeys, $outbreakDetails);
                array_push($currentOutbreakKeys, $affectedKey);
            }
        }

        // Let each individual outbreak resolve fully before checking this,
        // and return early if the players lose.
        if (checkAndRecordDiseaseCubeDefeat($pdo, $game, $diseaseColor))
            return $events;
    }

    return $events;
}

function nextTurn($pdo, $game, $currentTurnRoleID)
{
    $nextTurnNum = getTurnNumber($pdo, $game) + 1;

    $stmt = $pdo->prepare("SELECT nextID
                            FROM vw_player
                            WHERE game = ?
                            AND rID = ?");
    $stmt->execute([$game, $currentTurnRoleID]);
    $nextTurnRoleID = $stmt->fetch()["nextID"];
    
    $stmt = $pdo->prepare("UPDATE game
                        SET turnRoleID = $nextTurnRoleID,
                            turnNumber = $nextTurnNum
                        WHERE gameID = ?
                        AND turnRoleID = ?
                        AND stepID = udf_getStepID('infect cities')"); // 'infect cities' is always the last step in a turn
    $stmt->execute([$game, $currentTurnRoleID]);

    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to increment turn");

    return $nextTurnRoleID;
}

/*  Updates the step to the very next one and returns the new step description.
    NOTE:   Use only when the order of steps is guaranteed
            (such as from 'action1' through to 'action 4' to 'draw cards').
            The order of some steps will vary based on card draws etc.
*/
function nextStep($pdo, $game, $currentStep, $currentTurnRoleID)
{
    $stmt = $pdo->prepare("SELECT description
                            FROM step
                            WHERE stepID = udf_getStepID(?) + 1");
    $stmt->execute([$currentStep]);

    if ($stmt->rowCount() === 1)
        $nextStep = $stmt->fetch()["description"];
    else
        $nextStep = "action 1";
    
    $stmt = $pdo->prepare("UPDATE game
                            SET stepID = udf_getStepID(:nextStep)
                            WHERE gameID = :game
                            AND turnRoleID = :turn
                            AND stepID = udf_getStepID(:currentStep)");
    $stmt->execute([
        "nextStep" => $nextStep,
        "game" => $game,
        "turn" => $currentTurnRoleID,
        "currentStep" => $currentStep
    ]);

    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to update step ($currentStep -> $nextStep)");
    
    if ($nextStep === "draw" && countCardsInPlayerDeck($pdo, $game) == 0)
        recordGameEndCause($pdo, $game, "cards");
    
    return $nextStep;
}

function countCardsInPlayerDeck($pdo, $game)
{
    $stmt = $pdo->prepare("SELECT COUNT(*) AS 'numCards'
                        FROM vw_playerCard
                        WHERE game = ?
                        AND pile = 'deck'");
    $stmt->execute([$game]);
    
    return $stmt->fetch()["numCards"];
}

// Updates the step to the specified nextStep,
// or determines the nextStep after a hand-limit-reached condition.
// Calls nextTurn() if necessary.
// Ensures that the expected currentStep and currentTurnRoleID match what's in the db.
// Returns the nextStep.
function updateStep($pdo, $game, $currentStep, $nextStep, $currentTurnRoleID)
{
    if ($currentStep === "infect cities" && $nextStep === "action 1")
        $currentTurnRoleID = nextTurn($pdo, $game, $currentTurnRoleID);
    else if ($currentStep === "hand limit" && !$nextStep)
    {
        // If the current turn was interrupted by the hand-limit-reached condition,
        // determine which step comes next.
        $MAX_ACTIONS_PER_TURN = 4;
        $numActionsTakenThisTurn = countEventsOfTurn($pdo, $game, getActionEventTypes());

        if ($numActionsTakenThisTurn < $MAX_ACTIONS_PER_TURN)
            $nextStep = "action " . ($numActionsTakenThisTurn + 1);
        else // The draw step comes after the player has performed 4 actions.
            $nextStep = "draw";
    }
    
    if ($currentStep === $nextStep)
        return $nextStep;

    $nextStepID = callDbFunctionSafe($pdo, "udf_getStepID", $nextStep);
    $stmt = $pdo->prepare("UPDATE game
                        SET stepID = $nextStepID
                        WHERE gameID = ?
                        AND stepID = ?
                        AND turnRoleID = ?");
    $stmt->execute([$game, callDbFunctionSafe($pdo, "udf_getStepID", $currentStep), $currentTurnRoleID]);
    
    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to update step from '$currentStep' to '$nextStep'");
    
    return $nextStep;
}

function getPlayerCardType($pdo, $cardKey)
{
    $stmt = $pdo->prepare("SELECT diseaseColor FROM city WHERE cityKey = ?");
    $stmt->execute([$cardKey]);
    $color = $stmt->fetch()["diseaseColor"];

    if (!$color)
        return false;

    if ($color == "e")
        return "event";
    
    if ($color == "x")
        return "epidemic";
    
    // city colors (b, r, u, y) are the only other possibilities.
    return "city";
}

function discardPlayerCards($pdo, $game, $role, $cardKeys)
{
    $cardType = "player";
    $currentPile = $role;
    $newPile = "discard";
    
    moveCardsToPile($pdo, $game, $cardType, $currentPile, $newPile, $cardKeys);
}

function discardInfectionCards($pdo, $game, $cardKeys)
{
    $cardType = "infection";
    // infection cards are drawn from the deck and immediately placed in the discard pile.
    $currentPile = "deck";
    $newPile = "discard";

    moveCardsToPile($pdo, $game, $cardType, $currentPile, $newPile, $cardKeys);
}

// Moves the specified playerCard or infectionCard keys to the newPile,
// given the cardType ("infection" or "player"), and the currentPile.
// Accepts pile names or pile IDs for currentPile and newPile.
function moveCardsToPile($pdo, $game, $cardType, $currentPile, $newPile, $cardKeys)
{
    if ($cardType !== "infection" && $cardType !== "player")
        throwException($pdo, "Failed to move cards. Invalid card type: '$cardType'");
    
    $cardView = "vw_" . $cardType . "Card";

    if (!is_array($cardKeys))
        $cardKeys = array($cardKeys);

    $cardIndex = getMaxCardIndex($pdo, $game, $cardView, $newPile);

    $dbFnName = "udf_getPileID";
    $inputParams = array(
        "game" => $game,
        "newPile" => is_numeric($newPile) ? $newPile : callDbFunctionSafe($pdo, $dbFnName, $newPile),
        "currentPile" => is_numeric($currentPile) ? $currentPile : callDbFunctionSafe($pdo, $dbFnName, $currentPile)
    );

    $stmt = $pdo->prepare("UPDATE pandemic.$cardView
                        SET pileID = :newPile,
                            cardIndex = :cardIndex
                        WHERE game = :game
                        AND pileID = :currentPile
                        AND cardKey = :cardKey");
    
    // looping is necessary (as opposed to using WHERE cardKey IN ($cardKeys))
    // to allow the individual setting of cardIndex
    for ($i = 0; $i < count($cardKeys); $i++)
    {
        $cardKey = $cardKeys[$i];
        
        $inputParams["cardIndex"] = ++$cardIndex; // the next available cardIndex
        $inputParams["cardKey"] = $cardKey;

        $stmt->execute($inputParams);

        if ($stmt->rowCount() !== 1)
            throwException($pdo, "Failed to move player card '$cardKey' from $currentPile to $newPile");
    }
}

function getMaxCardIndex($pdo, $game, $viewName, $pile)
{
    $pileID = is_numeric($pile) ? $pile : callDbFunctionSafe($pdo, "udf_getPileID", $pile);

    $stmt = $pdo->prepare("SELECT MAX(cardIndex) AS 'maxIdx'
                        FROM $viewName
                        WHERE game = ?
                        AND pileID = $pileID");
    $stmt->execute([$game]);

    return $stmt->fetch()["maxIdx"];
}

function roleHasTooManyCards($pdo, $game, $role)
{
    $HAND_LIMIT = 7;

    $stmt = $pdo->prepare("SELECT COUNT(*) AS 'handSize'
                        FROM vw_playerCard
                        WHERE game = ?
                        AND pileID = ?");
    $stmt->execute([$game, $role]);

    return $stmt->fetch()["handSize"] > $HAND_LIMIT;
}

function getRoleID($pdo, $roleName)
{
    $stmt = $pdo->prepare("SELECT roleID FROM role WHERE roleName = ?");
    $stmt->execute([$roleName]);
    
    return $stmt->fetch()["roleID"];
}

function getRoleName($pdo, $roleID)
{
    $stmt = $pdo->prepare("SELECT roleName FROM role WHERE roleID = ?");
    $stmt->execute([$roleID]);
    
    return $stmt->fetch()["roleName"];
}

function getLocationKey($pdo, $game, $role)
{
    $stmt = $pdo->prepare("SELECT location as 'locationKey'
                            FROM vw_player
                            WHERE game = ?
                            AND rID = " . (is_numeric($role) ? "?" : "udf_getRoleID(?)"));
    $stmt->execute([$game, $role]);
    
    if ($stmt->rowCount() === 1)
        return $stmt->fetch()["locationKey"];

    return false;
}

function cityHasResearchStation($pdo, $game, $cityKey)
{
    $stmt = $pdo->prepare("SELECT researchStation
                            FROM vw_location
                            WHERE game = ?
                            AND locationKey = ?");
    $stmt->execute([$game, $cityKey]);

    return $stmt->fetch()["researchStation"] == "1";
}

function placeResearchStation($pdo, $game, $cityKey, $relocationKey = "0")
{
    if ($relocationKey != "0")
        addOrRemoveResearchStation($pdo, $game, $relocationKey, true);
    
    addOrRemoveResearchStation($pdo, $game, $cityKey);
}

function addOrRemoveResearchStation($pdo, $game, $cityKey, $remove = false)
{
    $stmt = $pdo->prepare("UPDATE vw_location
                            SET researchStation = ?
                            WHERE game = ?
                            AND locationKey = ?");
    $stmt->execute([($remove ? 0 : 1), $game, $cityKey]);

    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to " . ($remove ? "remove" : "add") . " research station (from '$cityKey')");
}

function getCityColor($pdo, $cityKey)
{
    $stmt = $pdo->prepare("SELECT diseaseColor FROM city WHERE cityKey = ?");
    $stmt->execute([$cityKey]);

    return $stmt->fetch()["diseaseColor"];
}

function getDiseaseStatus($pdo, $game, $diseaseColor)
{
    $status = validateColor($diseaseColor) . "Status";

    $stmt = $pdo->prepare("SELECT $status FROM vw_disease WHERE game = ?");
    $stmt->execute([$game]);

    return $stmt->fetch()[$status];
}

function setDiseaseStatus($pdo, $game, $diseaseColor, $newStatus)
{
    $statusColumn = validateColor($diseaseColor) . "StatusID";
    $newStatusID = callDbFunctionSafe($pdo, "udf_getDiseaseStatusID", $newStatus);

    $stmt = $pdo->prepare("UPDATE pandemic
                        SET $statusColumn = $newStatusID
                        WHERE gameID = ?");
    $stmt->execute([$game]);
    
    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to set disease status ($diseaseColor, $newStatus)");

    // Record and return any "eradicaton" events
    if ($newStatus === "eradicated")
        return recordEvent($pdo, $game, "er", $diseaseColor);
}

function checkInfectionPrevention($pdo, $game, $cityKey, $diseaseColor)
{
    // Possible return values
    $preventionCodes = array("eradicated" => "e",
                        "quarantined" => "q",
                        "medic" => "m",
                        "not prevented" => "0");
    
    $diseaseStatus = getDiseaseStatus($pdo, $game, $diseaseColor);

    // There are 3 ways an infection can be prevented:
    // - The disease color is eradicated
    // - The Quarantine Specialist is in the city or in a connected city
    // - The disease is cured and the Medic is in the city
    if ($diseaseStatus == "eradicated")
        return $preventionCodes["eradicated"];
    
    if (cityIsQuarantined($pdo, $game, $cityKey))
        return $preventionCodes["quarantined"];
    
    if ($diseaseStatus == "cured" && roleIsInCity($pdo, $game, "Medic", $cityKey))
        return $preventionCodes["medic"];

    return $preventionCodes["not prevented"];
}

function roleIsInCity($pdo, $game, $role, $cityKey)
{
    return (getLocationKey($pdo, $game, $role) === $cityKey);
}

function cityIsQuarantined($pdo, $game, $cityKey)
{
    $qsLocationKey = getLocationKey($pdo, $game, "Quarantine Specialist");

    // No Quarantine Specialist in the game?
    if (!$qsLocationKey)
        return false;
    
    // The Quarantine Specialist quarantines their current location
    // and all cities connected to their current location.
    return $qsLocationKey === $cityKey || citiesAreConnected($pdo, $qsLocationKey, $cityKey);
}

function citiesAreConnected($pdo, $cityKeyA, $cityKeyB)
{
    $cityConnections = getConnectedCityKeyPairs($pdo, $cityKeyA);
    
    foreach ($cityConnections as $row)
    {
        if ($cityKeyA == $row["cityKeyA"])
            $connectedKey = $row["cityKeyB"];
        else
            $connectedKey = $row["cityKeyA"];
        
        if ($cityKeyB == $connectedKey)
            return true;
    }

    return false;
}

function getConnectedCityKeyPairs($pdo, $cityKey)
{
    $stmt = $pdo->prepare("SELECT cityKeyA, cityKeyB
                            FROM cityConnection
                            WHERE ? IN (cityKeyA, cityKeyB)");
    $stmt->execute([$cityKey]);

    return $stmt->fetchAll();
}

function getAutoTreatDiseaseEvents($pdo, $game, $cityKey, $diseaseColor = false)
{
    if ($diseaseColor)
        $diseaseColors = array($diseaseColor);
    else
        $diseaseColors = array("y", "r", "u", "b");
    
    $events = array();
    $role = getRoleID($pdo, "Medic");
    $removeAll = true;
    $eventType = "at"; // Auto-Treat

    for ($i = 0; $i < count($diseaseColors); $i++)
    {
        $color = $diseaseColors[$i];
        $cubeCount = getCubeCount($pdo, $game, $cityKey, $color);

        if ($cubeCount > 0 && getDiseaseStatus($pdo, $game, $color) === "cured")
        {
            $events[] = removeCubesFromCity($pdo, $game, $role, $cityKey, $color, $removeAll, $eventType, $cubeCount);

            if (numDiseaseCubesOnBoard($pdo, $game, $color) == 0)
                $events[] = setDiseaseStatus($pdo, $game, $color, "eradicated");
        }
    }

    if (count($events) > 0)
        return $events;
    
    return false;
}

function updateRoleLocation($pdo, $game, $role, $originKey, $destinationKey)
{
    $stmt = $pdo->prepare("UPDATE vw_player
                        SET location = :destinationKey
                        WHERE game = :game
                        AND rID = :rID
                        AND location = :originKey");
    $stmt->execute([
        "destinationKey" => $destinationKey,
        "game" => $game,
        "rID" => $role,
        "originKey" => $originKey
    ]);
    
    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to update pawn location from '$originKey' to '$destinationKey'");
}

function validateOperationsFlight($pdo, $game, $role, $discardKey)
{
    // The specified discard must be a City card.
    if (getPlayerCardType($pdo, $discardKey) !== "city")
        throwException($pdo, "Invalid Operations Flight: the discard must be a City card.");
    
    // The player must be the Operations Expert.
    if (getRoleName($pdo, $role) !== "Operations Expert")
        throwException($pdo, "Invalid Operations Flight: invalid role.");

    // The player cannot have already performed Operations Flight this turn.
    $OPERATIONS_FLIGHT_CODE = "of";
    if (countEventsOfTurn($pdo, $game, $OPERATIONS_FLIGHT_CODE) > 0)
        throwException($pdo, "Invalid Operations Flight: this action can be performed only once per turn.");
}

// Returns an array of roles whose pawns are currently at the specified destination.
// Validates Rendezvous event requests by throwing an PDOException if 0 pawns are at the specified destination.
function getRolesAtRendezvousDestination($pdo, $game, $role, $destinationKey)
{
    // The Dispatcher can move any pawn to any city containing another pawn.
    $rolesAtDestination = array();
    $stmt = $pdo->prepare("SELECT rID
                            FROM vw_player
                            WHERE game = ?
                            AND location = ?
                            AND rID != ?");
    $stmt->execute([$game, $destinationKey, $role]);
    
    if ($stmt->rowCount() === 0)
        throwException($pdo, "Invalid Rendezvous: there must be at least one pawn at the specified destination.");
    
    $roles = $stmt->fetchAll();
    foreach ($roles as $row)
        array_push($rolesAtDestination, $row["rID"]);
    
    return $rolesAtDestination;
}

// Throws an PDOException if playing the specified $eventCardKey is illegal in the current game state.
// "Event cards can be played at any time, except in between drawing and resolving a card."
// Therefore, event cards cannot be played during the "draw" step or while resolving an epidemic.
//      EXCEPT:
//      1. "When 2 Epidemic cards are drawn together, events can be played after resolving the first epidemic."
//      2. From the Resilient Population event card text: "You may play this between the Infect and Intensify steps of an epidemic."
function checkEventCardLegality($pdo, $game, $eventCardKey)
{   
    $CARD_DRAW_CODE = "cd";
    $INTENSIFY_EVENT_CODE = "et";
    $cardIsNotResilientPopulation = $eventCardKey !== "resi";
    
    $col = "stepName";
    $stmt = $pdo->prepare("SELECT $col
                        FROM vw_gamestate
                        WHERE game = ?");
    $stmt->execute([$game]);
    $currentStep = $stmt->fetch()[$col];

    if ($currentStep === "draw" && countEventsOfTurn($pdo, $game, $CARD_DRAW_CODE) == 1
        || ($currentStep === "epIncrease" && countEventsOfTurn($pdo, $game, $INTENSIFY_EVENT_CODE) == 0) // 1.
        || $currentStep === "epInfect"
        || ($currentStep === "epIntensify" && $cardIsNotResilientPopulation)) // 2.
        throwException($pdo, "Event cards cannot be played between drawing and resolving a card.");

    // Additionally, event cards cannot be played mid-forecast (the drawn infection cards are considered unresolved).
    if (forecastIsInProgress($pdo, $game))
        throwException($pdo, "The Forecast must be resolved before another action can be performed.");
}

// A Forecast event manifests in the db as a pair of events: the draw, and the placement.
// Therefore if the number of draw/placement this turn is odd, there must be an unresolved draw awaiting placement.
function forecastIsInProgress($pdo, $game)
{
    $FORECAST_DRAW_CODE = "fd";
    $FORECAST_PLACEMENT_CODE = "fp";

    return countEventsOfTurn($pdo, $game, array($FORECAST_DRAW_CODE, $FORECAST_PLACEMENT_CODE)) % 2 === 1;
}

function getEventCardHolder($pdo, $game, $cardKey)
{
    $stmt = $pdo->prepare("SELECT pileID AS 'role'
                        FROM vw_playerCard
                        WHERE game = :game
                        AND cardKey = :cardKey
                        AND pile NOT IN ('deck', 'discard', 'removed')");
    $stmt->execute(["game" => $game, "cardKey" => $cardKey]);
    
    $eventCardHolder = $stmt->fetch()["role"];
    
    if (!$eventCardHolder)
        throwException($pdo, "The event card was not found in any player's hand.");
    
    return $eventCardHolder;
}

function discardOrRemoveEventCard($pdo, $game, $discardingRole, $cardKey)
{
    if ($cardKey && $cardKey === getContingencyCardKey($pdo, $game))
    {
        $cardType = "player";
        $currentPile = $discardingRole; // contingency
        $newPile = "removed";
        moveCardsToPile($pdo, $game, $cardType, $currentPile, $newPile, $cardKey);
    }
    else
        discardPlayerCards($pdo, $game, $discardingRole, $cardKey);
}

function getContingencyCardKey($pdo, $game)
{
    $stmt = $pdo->prepare("SELECT cardKey
                            FROM vw_playerCard
                            WHERE game = ?
                            AND pile = 'contingency'");
    $stmt->execute([$game]);
    
    if ($stmt->rowCount() === 0)
        return false;
    
    return $stmt->fetch()["cardKey"];
}

function convertRoleFromPossibleContingency($pdo, $possiblyContingency)
{
    $contingency = $pdo->query("SELECT ID FROM cardPile WHERE pileName = 'contingency'")->fetch()["ID"];
    
    if ($possiblyContingency != $contingency)
        return $possiblyContingency;
    
    return $pdo->query("SELECT roleID FROM role WHERE roleName = 'Contingency Planner'")->fetch()["roleID"];
}

function eventCardSatisfiedDiscard($pdo, $game, $currentStep, $discardingRole, $activeRole)
{
    if (roleHasTooManyCards($pdo, $game, $discardingRole))
        return false;
    
    if ($currentStep === "discard")
        $nextStep = "infect cities";
    else if ($currentStep === "hand limit")
        $nextStep = false; // the next step will be determined by updateStep
    else
        return false;

    return updateStep($pdo, $game, $currentStep, $nextStep, $activeRole);
}

// Moves the specified event card ($cardKey) to the pile which contained it before the $eventToUndo occured.
// Event cards can be played from a role's hand,
// or via the Contingency Planners's special ability which removes the card from the game instead of discarding it.
// Returns true if the card was placed back in the 'contingency' pile, otherwise returns false.
function moveEventCardToPrevPile($pdo, $game, $cardKey, $eventToUndo)
{
    $stmt = $pdo->prepare("SELECT pile
                            FROM vw_playerCard
                            WHERE game = ?
                            AND cardKey = ?");
    $stmt->execute([$game, $cardKey]);

    $currentPile = $stmt->fetch()["pile"];
    
    // The event card may have been removed by the Contingency Planner's special ability.
    $prevPile = $currentPile === "removed" ? "contingency" : $eventToUndo["role"];
    
    moveCardsToPile($pdo, $game, "player", $currentPile, $prevPile, $cardKey);

   return $prevPile === "contingency";
}

function countEpidemicsDrawnOnTurn($pdo, $game, $turnNum)
{
    $CARD_DRAW_EVENT_CODE = "cd";

    $stmt = $pdo->prepare("SELECT details
                            FROM vw_event
                            WHERE game = ?
                            AND turnNum = ?
                            AND eventType = '$CARD_DRAW_EVENT_CODE'");
    $stmt->execute([$game, $turnNum]);
    // The details of a card draw event are the two comma-separated card keys.
    $cardKeys = explode(",", $stmt->fetch()["details"]);

    $numEpidemics = 0;
    for ($i = 0; $i < count($cardKeys); $i++)
    {
        // Epidemic card keys begin with "epi"
        if (substr($cardKeys[$i], 0, 3) === "epi")
            $numEpidemics++;
    }

    return $numEpidemics;
}

function getEpidemicIntensifyCardKeys($pdo, $eventID)
{
    $stmt = $pdo->prepare("SELECT cityKey
                        FROM epidemicIntensify
                        WHERE eventID = ?
                        ORDER BY cardIndex DESC");
    $stmt->execute([$eventID]);
    $results = $stmt->fetchAll();
    foreach ($results as $row)
        $cardKeys[] = $row["cityKey"];
    
    return $cardKeys;
}

function oneQuietNightScheduledThisTurn($pdo, $game)
{
    $stmt = $pdo->prepare("SELECT COUNT(*) AS 'numEvents'
                            FROM vw_event
                            WHERE game = :game
                            AND turnNum = :turnNum
                            AND eventType = :eventType");
    $stmt->execute([
        "game" => $game,
        "turnNum" => getTurnNumber($pdo, $game),
        "eventType" => "oq"
    ]);
    
    return $stmt->fetch()["numEvents"] > 0;
}

// The players lose if not enough disease cubes are left when needed.
// Therefore, the $MAX_CUBES_ON_BOARD of a given $diseaseColor is equal to the cube supply of said $diseaseColor.
// Meaning a cube supply can be 0, but the players lose if it ever becomes negative).
// To make the cause of defeat more obvious for the user, the cube supply will become negative,
// after which the user will immediately be notified of defeat.
function checkAndRecordDiseaseCubeDefeat($pdo, $game, $diseaseColor)
{
    $MAX_CUBES_ON_BOARD = 24;

    if (numDiseaseCubesOnBoard($pdo, $game, $diseaseColor) > $MAX_CUBES_ON_BOARD)
    {
        recordGameEndCause($pdo, $game, "cubes");
        return true;
    }

    return false;
}

function numDiseaseCubesOnBoard($pdo, $game, $diseaseColor)
{
    $cubeColumn = getCubeColumnName($diseaseColor);

    $stmt = $pdo->prepare("SELECT SUM($cubeColumn) AS 'numCubes' FROM vw_location WHERE game = ?");
    $stmt->execute([$game]);
    
    return $stmt->fetch()["numCubes"];
}

function checkVictory($pdo, $game)
{
    $stmt = $pdo->prepare("SELECT yStatus,
                                rStatus,
                                uStatus,
                                bStatus
                            FROM vw_disease
                            WHERE game = ?");
    $stmt->Execute([$game]);
    $diseaseStatuses = $stmt->fetch();

    foreach ($diseaseStatuses as $key => $value)
        if ($value === "rampant")
            return false;

    // All diseases are cured or eradicated and the players are victorious.
    recordGameEndCause($pdo, $game, "victory");

    return true;
}

function recordGameEndCause($pdo, $game, $endCauseName)
{
    // If there is already a gameEndCause, don't overwrite it.
    // The first one triggered is the one that counts.
    if (getGameEndCause($pdo, $game))
        return;
    
    $stmt = $pdo->prepare("UPDATE game
                        SET endCauseID = udf_getEndCauseID(?)
                        WHERE gameID = ?");
    $stmt->execute([$endCauseName, $game]);
    
    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to record game end cause");

    recordCompletedGame($pdo, $game);    
}

function getGameEndCause($pdo, $game)
{
    $stmt = $pdo->prepare("SELECT endCauseID FROM game WHERE gameID = ? AND endCauseID IS NOT NULL");
    $stmt->execute([$game]);

    if ($stmt->rowCount() === 0)
        return false;
    
    $endCauseID = $stmt->fetch()["endCauseID"];
    $result = $pdo->query("SELECT udf_getEndCauseDescription($endCauseID) AS 'endCause'");
    return $result->fetch()["endCause"];
}

function recordCompletedGame($pdo, $game)
{
    $stmt = $pdo->prepare("SELECT endCauseID, epidemicCards FROM game WHERE gameID = ?");
    $stmt->execute([$game]);
    $gameDetails = $stmt->fetch();

    $endCauseID = $gameDetails["endCauseID"];
    $numEpidemics = $gameDetails["epidemicCards"];

    $stmt = $pdo->query("INSERT INTO gameRecord (numEpidemics, endCauseID) VALUES ($numEpidemics, $endCauseID)");

    if ($stmt->rowCount() !== 1)
        throwException($pdo, "failed to record completed game.");

    $recordID = $pdo->lastInsertId();

    $stmt = $pdo->prepare("SELECT rID FROM vw_player WHERE game = ?");
    $stmt->execute([$game]);
    $roles = $stmt->fetchAll();

    $stmt = $pdo->prepare("INSERT INTO roleRecord (recordID, roleID) VALUES ($recordID, ?)");
    foreach ($roles as $row)
    {
        $stmt->execute([$row["rID"]]);

        if ($stmt->rowCount() !== 1)
            throwException($pdo, "failed to record role of completed game.");
    }
}

function deleteGame($pdo, $game)
{
    $stmt = $pdo->query("DELETE FROM epidemicIntensify WHERE eventID IN (SELECT eventID FROM eventHistory WHERE gameID = $game)");
    if (queryCausedError($pdo))
        throwException($pdo, "failed to delete epidemic intensify records");

    $stmt = $pdo->query("DELETE FROM eventHistory WHERE gameID = $game");
    if (queryCausedError($pdo))
        throwException($pdo, "failed to delete event history");

    $stmt = $pdo->query("DELETE FROM player WHERE gameID = $game");
    if (queryCausedError($pdo))
        throwException($pdo, "failed to delete players");

    $stmt = $pdo->query("DELETE FROM location WHERE gameID = $game");
    if (queryCausedError($pdo))
        throwException($pdo, "failed to delete locations");

    $stmt = $pdo->query("DELETE FROM pandemic WHERE gameID = $game");
    if (queryCausedError($pdo))
        throwException($pdo, "failed to delete pandemic");

    $stmt = $pdo->query("DELETE FROM game WHERE gameID = $game");
    if (queryCausedError($pdo))
        throwException($pdo, "failed to delete game");
}

function getEventById($pdo, $game, $eventID)
{
    $stmt = $pdo->prepare("SELECT * FROM vw_event WHERE game = ? AND id = ?");
    $stmt->execute([$game, $eventID]);
    
    if ($stmt->rowCount() === 0)
        throwException($pdo, "the event does not exist.");
    
    return $stmt->fetch();
}

// Throws an PDOException if undoing $event is not allowed.
function validateEventCanBeUndone($pdo, $game, $event)
{
    $disallowedEventTypes = array("sh", "ii", "cd", "ic", "ec", "ef", "et", "ob", "oi", "fd", "ge");

    $eventType = $event["eventType"];
    if (in_array($eventType, $disallowedEventTypes))
        throwException($pdo, "events of type '$eventType' cannot be undone.");
    
    $stmt = $pdo->prepare("SELECT eventType FROM vw_event WHERE game = ? AND id > ?");
    $stmt->execute([$game, $event["id"]]);
    $eventsAfterEvent = $stmt->fetchAll();
    
    $disallowedEventsOccured = false;
    $notLastUndoableEvent = false;
    $undoableTriggeredEventTypes = array("at", "er");
    foreach ($eventsAfterEvent as $row)
    {
        $eventType = $row["eventType"];
        
        if (in_array($eventType, $disallowedEventTypes))
            throwException($pdo, "one or more events which cannot be undone occured after the event in question.");
        
        if (!in_array($eventType, $undoableTriggeredEventTypes))
            throwException($pdo, "one or more undoable events occured after the event in question.");
    }
}

function undoEventsTriggeredByEvent($pdo, $game, $triggerEventID)
{
    $AUTO_TREAT_DISEASE = "at";
    $ERADICATION = "er";
    
    $stmt = $pdo->prepare("SELECT * FROM vw_event WHERE game = ? AND id > ?");
    $stmt->execute([$game, $triggerEventID]);

    $eventsAfterEvent = $stmt->fetchAll();
    
    $undoneEventIds = array();
    foreach ($eventsAfterEvent as $event)
    {
        $eventType = $event["eventType"];

        if ($eventType === $AUTO_TREAT_DISEASE)
            array_push($undoneEventIds, undoAutoTreatDiseaseEvent($pdo, $game, $event));
        else if ($eventType === $ERADICATION)
            array_push($undoneEventIds, undoEradicationEvent($pdo, $game, $event));
        else
            throwException($pdo, "Failed to undo events triggered by event -- unexpected event type found: '$eventType'");
    }

    return $undoneEventIds;
}

function undoAutoTreatDiseaseEvent($pdo, $game, $event)
{
    $eventID = $event["id"];
    $eventDetails = explode(",", $event["details"]);
    $cityKey = $eventDetails[0];
    $diseaseColor = $eventDetails[1];
    $numCubesRemoved = $eventDetails[2];
    
    addCubesToCity($pdo, $game, $cityKey, $diseaseColor, $numCubesRemoved);
    deleteEvent($pdo, $game, $eventID);

    return $eventID;
}

function undoEradicationEvent($pdo, $game, $event)
{
    $column = $event["details"] . "StatusID";
    $eventID = $event["id"];

    $stmt = $pdo->prepare("UPDATE pandemic
                            SET $column = getDiseaseStatusID('cured')
                            WHERE gameID = ?");
    $stmt->execute([$game]);

    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to undo Eradication event");
    
    deleteEvent($pdo, $game, $eventID);

    return $eventID;
}

function deleteEvent($pdo, $game, $eventID)
{
    $stmt = $pdo->prepare("DELETE FROM vw_event WHERE game = ? AND id = ?");
    $stmt->execute([$game, $eventID]);

    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to delete event");
}

function previousStep($pdo, $game, $currentTurnRoleID, $currentStepName, $eventToUndo = false)
{
    $DISCARD = "ds";
    $PASS_ACTIONS = "pa";
    
    if ($eventToUndo && $eventToUndo["eventType"] === $DISCARD)
        $prevStepName = getPreviousDiscardStepName($pdo, $game);
    else if ($currentStepName === "hand limit")
        $prevStepName = "action " . (countEventsOfTurn($pdo, $game, getActionEventTypes()));
    else if ($eventToUndo && $eventToUndo["eventType"] === $PASS_ACTIONS)
        $prevStepName = "action " . (countEventsOfTurn($pdo, $game, getActionEventTypes()) + 1);
    else if ($currentStepName === "draw")
        $prevStepName = "action 4";
    else if ($currentStepName === "action 1")
        $prevStepName = "infect cities";
    else if (substr($currentStepName, 0, 6) === "action")
        $prevStepName = "action " . ($currentStepName[7] - 1);
    else
        throwException($pdo, "Cannot revert to previous step from '$currentStepName' step.");
    
    $stmt = $pdo->prepare("UPDATE game
                            SET stepID = udf_getStepID('$prevStepName')
                            WHERE gameID = ?
                            AND stepID = udf_getStepID(?)
                            AND turnRoleID = ?");
    $stmt->execute([$game, $currentStepName, $currentTurnRoleID]);
    
    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to revert to previous '$prevStepName' step from '$currentStepName' step");
    
    return $prevStepName;
}

function getPreviousDiscardStepName($pdo, $game)
{
    $CARD_DRAW = "cd";
    $turnNum = getTurnNumber($pdo, $game);

    $stmt = $pdo->prepare("SELECT COUNT(*) AS 'numEvents'
                            FROM vw_event
                            WHERE game = ?
                            AND turnNum = $turnNum
                            AND eventType = '$CARD_DRAW'");
    $stmt->execute([$game]);
    $cardsWereDrawnThisTurn = $stmt->fetch()["numEvents"] > 0;
    
    // The "discard" step is used when a role's hand limit is exceeded after the 'card draw' step.
    if ($cardsWereDrawnThisTurn)
        return "discard";
    
    // The "hand limit" step is used when a role's hand limit is exceeded following the Share Knowledge action.
    return "hand limit";
}

function goToStepBeforeOneQuietNight($pdo, $game, $prevStepName)
{
    // The card draw event of the previous turn is a good place to ensure that we retrieve the correct prevTurnRoleID.
    $prevTurnNum = getTurnNumber($pdo, $game) - 1;
    $CARD_DRAW = "cd";

    $stmt = $pdo->prepare("SELECT role AS 'prevTurnRoleID'
                            FROM vw_event
                            WHERE game = ?
                            AND turnNum = $prevTurnNum
                            AND eventType = '$CARD_DRAW'");
    $stmt->execute([$game]);
    $prevTurnRoleID = $stmt->fetch()["prevTurnRoleID"];
    
    // Decrement the turn number,
    // set the turn to the prevTurnRoleID,
    // and set the step to that which preceded the skipping of the 'infect cities' step by One Quiet Night
    // (could be 'infect cities' or 'discard').
    $stmt = $pdo->prepare("UPDATE game
                            SET turnNumber = $prevTurnNum,
                                turnRoleID = $prevTurnRoleID,
                                stepID = udf_getStepID(?)
                            WHERE gameID = ?
                            AND stepID = udf_getStepID('action 1')");
    $stmt->execute([$prevStepName, $game]);
    
    if ($stmt->rowCount() !== 1)
        throwException($pdo, "could not revert to the step which preceded the skipped 'infect cities' step of the previous turn.");
    
    return $prevTurnRoleID;
}
?>