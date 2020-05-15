<?php
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

function getTurnNumber($pdo, $game)
{
    $stmt = $pdo->prepare("SELECT turnNum
                        FROM vw_gamestate
                        WHERE game = ?");
    $stmt->execute([$game]);
    
    return $stmt->fetch()["turnNum"];
}

function getCurrentStepName($mysqli, $game)
{
    $stepName = $mysqli->query("SELECT stepName
                                FROM vw_gamestate
                                WHERE game = $game")->fetch_assoc()["stepName"];
    return $stepName;
}

function getActiveRole($mysqli, $game)
{
    $roleID = $mysqli->query("SELECT turn AS 'roleID' FROM vw_gamestate WHERE game = $game")
                    ->fetch_assoc()["roleID"];

    return $roleID;
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

function addCubesToCity($mysqli, $game, $cityKey, $diseaseColor, $cubesToAdd)
{
    $MAX_CUBE_COUNT = 3;
    $cubeCount = getCubeCount($mysqli, $game, $cityKey, $diseaseColor);
    $cubeColumn = getCubeColumnName($diseaseColor);
    $result["prevCubeCount"] = $cubeCount;
    
    if ($cubeCount + $cubesToAdd <= $MAX_CUBE_COUNT)
        $newCubeCount = $cubeCount + $cubesToAdd;
    else
    {
        $newCubeCount = $MAX_CUBE_COUNT;
        $result["outbreakEvents"] = outbreak($mysqli, $game, $cityKey, $diseaseColor);
    }

    if ($newCubeCount != $cubeCount)
    {
        $mysqli->query("UPDATE vw_location
                        SET $cubeColumn = $newCubeCount
                        WHERE game = $game
                        AND locationKey = '$cityKey'");
        
        if ($mysqli->affected_rows != 1)
            throwException($pdo, "Failed to add $cubesToAdd cubes ($diseaseColor) to $cityKey: $mysqli->error");
        
        checkAndRecordDiseaseCubeDefeat($mysqli, $game, $diseaseColor);
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

    if ($mysqli->rowCount() !== 1)
        throwException($pdo, "Failed to remove $cubeColor cube(s) from $cityKey");

    if ($eventType === "td")
        return recordEvent($pdo, $game, $eventType, "$cityKey,$cubeColor,$cubeCount,$newCubeCount", $role);
    else if ($eventType === "at")
        return recordEvent($pdo, $game, $eventType, "$cityKey,$cubeColor,$cubeCount", $role);
}

function recordEvent($pdo, $game, $type, $details, $role = "NULL")
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

function outbreak($mysqli, $game, $originCityKey, $diseaseColor)
{
    $events = array();

    $OUTBREAK_LIMIT = 8;

    $outbreakCount = $mysqli->query("SELECT outbreakCount
                                    FROM vw_gamestate
                                    WHERE game = $game")->fetch_assoc()["outbreakCount"];
    
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
        $events[] = recordEvent($mysqli, $game, "ob", "$outbreakCount,$outbreakKey,$diseaseColor,$triggeredByKey");

        // If the outbreak limit is reached, the game is over and the players lose.
        if ($outbreakCount == $OUTBREAK_LIMIT)
        {
            recordGameEndCause($mysqli, $game, "outbreak");
            return $events;
        }

        $mysqli->query("UPDATE vw_gamestate SET outbreakCount = $outbreakCount WHERE game = $game");
        
        if ($mysqli->affected_rows != 1)
            throwException($pdo, "Failed to update gamestate after outbreak.");

        $connections = getConnectedCityKeyPairs($mysqli, $outbreakKey);

        if ($connections->num_rows == 0)
            throwException($pdo, "Failed to retrieve cities connected to $outbreakKey");

        while ($con = mysqli_fetch_assoc($connections))					
        {
            $affectedKey = $con["cityKeyA"] == $outbreakKey ? $con["cityKeyB"] : $con["cityKeyA"];

            // Cities which have already been triggered to outbreak as a result of
            // resolving the current infection card will already contain 3 cubes of the relevant color,
            // and can therefore be ignored.
            if (in_array($affectedKey, $currentOutbreakKeys))
                continue;
        
            $infectionPrevention = checkInfectionPrevention($mysqli, $game, $affectedKey, $diseaseColor);
            if ($infectionPrevention != "0")
            {
                // Infection prevented -- the city will not be affected.
                $events[] = recordEvent($mysqli, $game, "oi", "$outbreakKey,$affectedKey,$diseaseColor,$infectionPrevention");
                continue;
            }

            $cubeCount = getCubeCount($mysqli, $game, $affectedKey, $diseaseColor);

            if ($cubeCount < 3) // add one more cube to the city
            {
                $mysqli->query("UPDATE vw_location
                                SET $cubeColumn = ($cubeCount + 1)
                                WHERE game = $game
                                AND locationKey = '$affectedKey'");

                if ($mysqli->affected_rows != 1)
                    throwException($pdo, "Failed to add $cubeColumn to $affectedKey (outbreak infection triggered by $outbreakKey)");
                
                $events[] = recordEvent($mysqli, $game, "oi", "$outbreakKey,$affectedKey,$diseaseColor,$infectionPrevention");
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
        if (checkAndRecordDiseaseCubeDefeat($mysqli, $game, $diseaseColor))
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
    
    $stmt = $pdo->prepare("UPDATE vw_gamestate
                        SET turn = $nextTurnRoleID,
                            turnNum = $nextTurnNum
                        WHERE game = ?
                        AND turn = ?
                        AND stepName = 'infect cities'"); // 'infect cities' is always the last step in a turn
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
    
    $stmt = $pdo->prepare("UPDATE vw_gamestate
                            SET step = udf_getStepID(:nextStep)
                            WHERE game = :game
                            AND turn = :turn
                            AND stepName = :currentStep");
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
    $stmt = $pdo->prepare("UPDATE vw_gamestate
                        SET step = $nextStepID
                        WHERE game = ?
                        AND stepName = ?
                        AND turn = ?");
    $stmt->execute([$game, $currentStep, $currentTurnRoleID]);
    
    if ($stmt->rowCount() !== 1)
        throwException($pdo, "Failed to update step from '$currentStep' to '$nextStep'");
    
    return $nextStep;
}

function getPlayerCardType($mysqli, $cardKey)
{
    $color = $mysqli->query("SELECT diseaseColor FROM city WHERE cityKey = '$cardKey'")->fetch_assoc()["diseaseColor"];

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
    $pileID = callDbFunctionSafe($pdo, "udf_getPileID", $pile);

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

function getLocationKey($mysqli, $game, $role)
{
    if (!is_numeric($role))
        $role = "getRoleID('$role')";
    
    $location = $mysqli->query("SELECT location as 'locationKey'
                                    FROM vw_player
                                    WHERE game = $game
                                    AND rID = $role");
    
    if ($location->num_rows == 1)
        return $location->fetch_assoc()["locationKey"];

    return false;
}

function cityHasResearchStation($mysqli, $game, $cityKey)
{
    $hasResearchStation = $mysqli->query("SELECT researchStation
                                        FROM vw_location
                                        WHERE game = $game
                                        AND locationKey = '$cityKey'")->fetch_assoc()["researchStation"] == "1";
    return $hasResearchStation;
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

function getCityColor($mysqli, $cityKey)
{
    $color = $mysqli->query("SELECT diseaseColor FROM city WHERE cityKey = '$cityKey'")
        ->fetch_assoc()["diseaseColor"];

    return $color;
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
    $statusColumn = getCubeColumnName($diseaseColor);
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

function checkInfectionPrevention($mysqli, $game, $cityKey, $diseaseColor)
{
    // Possible return values
    $prevention = array("eradicated" => "e",
                        "quarantined" => "q",
                        "medic" => "m",
                        "not prevented" => "0");
    
    $diseaseStatus = getDiseaseStatus($mysqli, $game, $diseaseColor);

    // There are 3 ways an infection can be prevented:
    // - The disease color is eradicated
    // - The Quarantine Specialist is in the city or in a connected city
    // - The disease is cured and the Medic is in the city
    if ($diseaseStatus == "eradicated")
        return $prevention["eradicated"];
    
    if (cityIsQuarantined($mysqli, $game, $cityKey))
        return $prevention["quarantined"];
    
    if ($diseaseStatus == "cured" && roleIsInCity($mysqli, $game, "Medic", $cityKey))
        return $prevention["medic"];

    return $prevention["not prevented"];
}

function roleIsInCity($mysqli, $game, $role, $cityKey)
{
    return (getLocationKey($mysqli, $game, $role) == $cityKey);
}

function cityIsQuarantined($mysqli, $game, $cityKey)
{
    $qsLocationKey = getLocationKey($mysqli, $game, "Quarantine Specialist");

    // No Quarantine Specialist in the game?
    if (!$qsLocationKey)
        return false;
    
    // The Quarantine Specialist quarantines their current location
    // and all cities connected to their current location.
    return $qsLocationKey === $cityKey || citiesAreConnected($mysqli, $qsLocationKey, $cityKey);
}

function citiesAreConnected($mysqli, $cityKeyA, $cityKeyB)
{
    $cityConnections = getConnectedCityKeyPairs($mysqli, $cityKeyA);
    
    while ($row = mysqli_fetch_assoc($cityConnections))
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

function getConnectedCityKeyPairs($mysqli, $cityKey)
{
    return $mysqli->query("SELECT cityKeyA, cityKeyB
                            FROM cityConnection
                            WHERE '$cityKey' IN (cityKeyA, cityKeyB)");
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
    $stmt = $pdo->prepare("UPDATE pandemic.vw_player
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

function validateOperationsFlight($mysqli, $game, $role, $discardKey)
{
    // The specified discard must be a City card.
    if (getPlayerCardType($mysqli, $discardKey) != "city")
        throwException($pdo, "Invalid Operations Flight: the discard must be a City card.");
    
    // The player must be the Operations Expert.
    if (getRoleName($mysqli, $role) != "Operations Expert")
        throwException($pdo, "Invalid Operations Flight: invalid role.");

    // The player cannot have already performed Operations Flight this turn.
    $turnNum = getTurnNumber($mysqli, $game);
    $eventType = "of";
    $opFlightUnavailable
        = $mysqli->query("SELECT COUNT(*) AS 'numOpFlightsThisTurn'
                            FROM vw_event
                            WHERE game = $game
                            AND turnNum = $turnNum
                            AND eventType = '$eventType'")
                ->fetch_assoc()["numOpFlightsThisTurn"] > 0;
    
    if ($opFlightUnavailable)
        throwException($pdo, "Invalid Operations Flight: this action can be performed only once per turn.");
}

// Returns an array of roles whose pawns are currently at the specified destination.
// Validates Rendezvous event requests by throwing an PDOException if 0 pawns are at the specified destination.
function getRolesAtRendezvousDestination($mysqli, $game, $role, $destinationKey)
{
    // The Dispatcher can move any pawn to any city containing another pawn.
    $rolesAtDestination = array();
    $result = $mysqli->query("SELECT rID
                            FROM vw_player
                            WHERE game = $game
                            AND location = '$destinationKey'
                            AND rID != $role");
    
    if ($result->num_rows == 0)
        throwException($pdo, "Invalid Rendezvous: there must be at least one pawn at the specified destination.");
    
    while ($row = mysqli_fetch_assoc($result))
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
// Therefore if the number of draw/placement this turn is 1, there must be an unresolved draw awaiting placement.
function forecastIsInProgress($pdo, $game)
{
    $FORECAST_DRAW_CODE = "fd";
    $FORECAST_PLACEMENT_CODE = "fp";

    $numForecastEvents = countEventsOfTurn($pdo, $game, array($FORECAST_DRAW_CODE, $FORECAST_PLACEMENT_CODE)) == 1;
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
                        AND pile = 'contingency'
                        LIMIT 1");
    $stmt->execute([$game]);
    
    if (!$stmt->fetchColumn())
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
function moveEventCardToPrevPile($mysqli, $game, $cardKey, $eventToUndo)
{
    $currentPile = $mysqli->query("SELECT pile
                                    FROM vw_playerCard
                                    WHERE game = $game
                                    AND cardKey = '$cardKey'")->fetch_assoc()["pile"];
    
    // The event card may have been removed by the Contingency Planner's special ability.
    $prevPile = $currentPile === "removed" ? "contingency" : $eventToUndo["role"];
    
    moveCardsToPile($mysqli, $game, "player", $currentPile, $prevPile, $cardKey);

   return $prevPile === "contingency";
}

function countEpidemicsDrawnOnTurn($mysqli, $game, $turnNum)
{
    $CARD_DRAW_EVENT_CODE = "cd";

    $cardDrawDetails = $mysqli->query("SELECT details
                                        FROM vw_event
                                        WHERE game = $game
                                        AND turnNum = $turnNum
                                        AND eventType = '$CARD_DRAW_EVENT_CODE'")->fetch_assoc()["details"];
    
    // The details of a card draw event are the two card keys separated by a comma.
    $cardKeys = explode(",", $cardDrawDetails);

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
    
    while ($row = $stmt->fetchAll())
        $cardKeys[] = $row["cityKey"];
    
    return $cardKeys;
}

function oneQuietNightScheduledThisTurn($mysqli, $game)
{
    $EVENT_CODE = "oq";
    $turnNum = getTurnNumber($mysqli, $game);

    $isOneQuietNight = $mysqli->query("SELECT COUNT(*) AS 'numEvents'
                                        FROM vw_event
                                        WHERE game = $game
                                        AND turnNum = $turnNum
                                        AND eventType = '$EVENT_CODE'")->fetch_assoc()["numEvents"];
    
    return $isOneQuietNight;
}

// The players lose if not enough disease cubes are left when needed.
// Therefore, the $MAX_CUBES_ON_BOARD of a given $diseaseColor is equal to the cube supply of said $diseaseColor.
// Meaning a cube supply can be 0, but the players lose if it ever becomes negative).
// To make the cause of defeat more obvious for the user, the cube supply will become negative,
// after which the user will immediately be notified of defeat.
function checkAndRecordDiseaseCubeDefeat($mysqli, $game, $diseaseColor)
{
    $MAX_CUBES_ON_BOARD = 24;

    if (numDiseaseCubesOnBoard($mysqli, $game, $diseaseColor) > $MAX_CUBES_ON_BOARD)
    {
        recordGameEndCause($mysqli, $game, "cubes");
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

function checkVictory($mysqli, $game)
{
    $diseaseStatuses = $mysqli->query("SELECT   yStatus,
                                                rStatus,
                                                uStatus,
                                                bStatus
                                        FROM vw_disease
                                        WHERE game = $game")->fetch_assoc();

    foreach ($diseaseStatuses as $key => $value)
    {
        if ($value === "rampant")
            return false;
    }

    // All diseases are cured or eradicated and the players are victorious.
    recordGameEndCause($mysqli, $game, "victory");

    return true;
}

function recordGameEndCause($pdo, $game, $endCauseName)
{
    // If there is already a gameEndCause, don't overwrite it.
    // The first one triggered is the one that counts.
    if (getGameEndCause($pdo, $game))
        return;
    
    $stmt = $pdo->prepare("UPDATE vw_gamestate
                        SET endCause = getEndCauseID(?)
                        WHERE game = ?");
    $stmt->execute([$endCauseName, $game]);
    
    if ($stmt->rowCount !== 1)
        throwException($pdo, "Failed to record game end cause");
}

function getGameEndCause($pdo, $game)
{
    $stmt = $pdo->prepare("SELECT endCauseName FROM vw_gamestate WHERE game = ?");
    $stmt->execute([$game]);
    
    return $stmt->fetch()["endCauseName"];
}

function getEventById($mysqli, $game, $eventID)
{
    $result = $mysqli->query("SELECT * FROM vw_event WHERE game = $game AND id = $eventID");
    
    if ($result->num_rows === 0)
        throwException($pdo, "the event does not exist.");
    
    return $result->fetch_assoc();
}

// Throws an PDOException if undoing $event is not allowed.
function validateEventCanBeUndone($mysqli, $game, $event)
{
    $disallowedEventTypes = array("sh", "ii", "cd", "ic", "ec", "ef", "et", "ob", "oi", "fd", "ge");

    $eventType = $event["eventType"];
    if (in_array($eventType, $disallowedEventTypes))
        throwException($pdo, "events of type '$eventType' cannot be undone.");
    
    $eventID = $event["id"];
    $eventsAfterEvent = $mysqli->query("SELECT eventType FROM vw_event
                                        WHERE game = $game
                                        AND id > $eventID");
    
    $disallowedEventsOccured = false;
    $notLastUndoableEvent = false;
    $undoableTriggeredEventTypes = array("at", "er");
    while ($row = mysqli_fetch_assoc($eventsAfterEvent))
    {
        $eventType = $row["eventType"];
        if (in_array($eventType, $disallowedEventTypes))
        {
            $disallowedEventsOccured = true;
            break; // because this condition takes precendence over the $notLastUndoableEvent condition.
        }
        
        if (!in_array($eventType, $undoableTriggeredEventTypes))
            $notLastUndoableEvent = true;
    }

    if ($disallowedEventsOccured)
        throwException($pdo, "one or more events which cannot be undone occured after the event in question.");
        
    if ($notLastUndoableEvent)
        throwException($pdo, "one or more undoable events occured after the event in question.");
}

function undoEventsTriggeredByEvent($mysqli, $game, $triggerEventID)
{
    $AUTO_TREAT_DISEASE = "at";
    $ERADICATION = "er";
    
    $eventsAfterEvent = $mysqli->query("SELECT * FROM vw_event
                                        WHERE game = $game
                                        AND id > $triggerEventID");
    
    $undoneEventIds = array();
    while ($event = mysqli_fetch_assoc($eventsAfterEvent))
    {
        $eventType = $event["eventType"];

        if ($eventType === $AUTO_TREAT_DISEASE)
            array_push($undoneEventIds, undoAutoTreatDiseaseEvent($mysqli, $game, $event));
        else if ($eventType === $ERADICATION)
            array_push($undoneEventIds, undoEradicationEvent($mysqli, $game, $event));
        else
            throwException($pdo, "Failed to undo events triggered by event -- unexpected event type found: '$eventType'");
    }

    return $undoneEventIds;
}

function undoAutoTreatDiseaseEvent($mysqli, $game, $event)
{
    $eventID = $event["id"];
    $eventDetails = explode(",", $event["details"]);
    $cityKey = $eventDetails[0];
    $diseaseColor = $eventDetails[1];
    $numCubesRemoved = $eventDetails[2];
    
    addCubesToCity($mysqli, $game, $cityKey, $diseaseColor, $numCubesRemoved);
    deleteEvent($mysqli, $game, $eventID);

    return $eventID;
}

function undoEradicationEvent($mysqli, $game, $event)
{
    $column = $event["details"] . "StatusID";
    $eventID = $event["id"];

    $mysqli->query("UPDATE pandemic
                    SET $column = getDiseaseStatusID('cured')
                    WHERE gameID = $game");

    if ($mysqli->affected_rows != 1)
        throwException($pdo, "Failed to undo Eradication event");
    
    deleteEvent($mysqli, $game, $eventID);

    return $eventID;
}

function deleteEvent($mysqli, $game, $eventID)
{
    $mysqli->query("DELETE FROM vw_event
                    WHERE game = $game
                    AND id = $eventID");

    if ($mysqli->affected_rows != 1)
        throwException($pdo, "Failed to delete event");
}

function previousStep($mysqli, $game, $currentTurnRoleID, $currentStepName, $eventToUndo = false)
{
    $DISCARD = "ds";
    $PASS_ACTIONS = "pa";
    
    if ($eventToUndo && $eventToUndo["eventType"] === $DISCARD)
        $prevStepName = getPreviousDiscardStepName($mysqli, $game);
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
    
    $mysqli->query("UPDATE vw_gamestate
                    SET step = getStepID('$prevStepName')
                    WHERE game = $game
                    AND stepName = '$currentStepName'
                    AND turn = $currentTurnRoleID");
    
    if ($mysqli->affected_rows != 1)
        throwException($pdo, "Failed to revert to previous '$prevStepName' step from '$currentStepName' step");
    
    return $prevStepName;
}

function getPreviousDiscardStepName($mysqli, $game)
{
    $CARD_DRAW = "cd";
    $turnNum = getTurnNumber($mysqli, $game);
    $cardsWereDrawnThisTurn = $mysqli->query("SELECT COUNT(*) AS 'numEvents'
                                            FROM vw_event
                                            WHERE game = $game
                                            AND turnNum = $turnNum
                                            AND eventType = '$CARD_DRAW'")->fetch_assoc()["numEvents"] > 0;
    
    // The "discard" step is used when a role's hand limit is exceeded after the 'card draw' step.
    if ($cardsWereDrawnThisTurn)
        return "discard";
    
    // The "hand limit" step is used when a role's hand limit is exceeded following the Share Knowledge action.
    return "hand limit";
}

function goToStepBeforeOneQuietNight($mysqli, $game, $prevStepName)
{
    // The card draw event of the previous turn is a good place to ensure that we retrieve the correct prevTurnRoleID.
    $prevTurnNum = getTurnNumber($mysqli, $game) - 1;
    $CARD_DRAW = "cd";
    $prevTurnRoleID = $mysqli->query("SELECT role AS 'prevTurnRoleID'
                                    FROM vw_event
                                    WHERE game = $game
                                    AND turnNum = $prevTurnNum
                                    AND eventType = '$CARD_DRAW'")->fetch_assoc()["prevTurnRoleID"];
    
    // Decrement the turn number,
    // set the turn to the prevTurnRoleID,
    // and set the step to that which preceded the skipping of the 'infect cities' step by One Quiet Night
    // (could be 'infect cities' or 'discard').
    $mysqli->query("UPDATE vw_gamestate
                    SET turnNum = $prevTurnNum,
                        turn = $prevTurnRoleID,
                        step = getStepID('$prevStepName')
                    WHERE game = $game
                    AND stepName = 'action 1'");
    
    if ($mysqli->affected_rows != 1)
        throwException($pdo, "could not revert to the step which preceded the skipped 'infect cities' step of the previous turn.");
    
    return $prevTurnRoleID;
}
?>