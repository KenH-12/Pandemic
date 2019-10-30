<?php
function getTurnNumber($mysqli, $game)
{
    $turnNum = $mysqli->query("SELECT turnNum
                                FROM vw_gamestate
                                WHERE game = $game")->fetch_assoc()["turnNum"];
    return $turnNum;
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
    return "'dr','df','cf','sf','rs','sk','td','dc','pc','dp','of','pa'";
}

function countActionsTakenThisTurn($mysqli, $game)
{
    $turnNum = getTurnNumber($mysqli, $game);
    $actionsTakenThisTurn = $mysqli->query("SELECT COUNT(*) AS 'numActions'
                                            FROM vw_event
                                            WHERE game = $game
                                            AND turnNum = $turnNum
                                            AND eventType IN (" . getActionEventTypes() . ")")
                                                ->fetch_assoc()["numActions"];

    return $actionsTakenThisTurn;
}

function getHandSize($mysqli, $game, $role)
{
    $handSize = $mysqli->query("SELECT COUNT(*) AS 'handSize'
                                FROM vw_playercard
                                WHERE game = $game
                                AND pileID = $role")->fetch_assoc()["handSize"];
        
    if (!is_numeric($handSize))
        throw new Exception("Failed to retrieve hand size: " . $mysqli->error);
    
    return $handSize;
}

function getCubeColumnName($color)
{
    $validColors = array("y", "r", "u", "b");

    if (in_array($color, $validColors))
        return $color . "Cubes";
    else
        throw new Exception("Cube color does not exist: $color");
}

function getCubeCount($mysqli, $game, $cityKey, $diseaseColorOrCubeColumn)
{
    if (strlen($diseaseColorOrCubeColumn) == 1)
        $cubeColumn = getCubeColumnName($diseaseColorOrCubeColumn);
    else
        $cubeColumn = $diseaseColorOrCubeColumn;
    
    $cubeCount = $mysqli->query("SELECT $cubeColumn
                                FROM vw_location
                                WHERE game = $game
                                AND locationKey = '$cityKey'")->fetch_assoc()["$cubeColumn"];
    
    if (!is_numeric($cubeCount))
        throw new Exception("Failed to retrieve cube count ($cityKey, $cubeColumn): " . $mysqli->error);
    else if ($cubeCount > 3 || $cubeCount < 0)
        throw new Exception("Cube count out of range ($cityKey, $cubeColumn, $cubeCount): " . $mysqli->error);

    return $cubeCount;
}

function addCubesToCity($mysqli, $game, $cityKey, $cubeColor, $cubesToAdd)
{
    $MAX_CUBE_COUNT = 3;
    $cubeColumn = getCubeColumnName($cubeColor);
    $cubeCount = getCubeCount($mysqli, $game, $cityKey, $cubeColumn);
    $result["prevCubeCount"] = $cubeCount;
    
    if ($cubeCount + $cubesToAdd <= $MAX_CUBE_COUNT)
    {
        $newCubeCount = $cubeCount + $cubesToAdd;
    }
    else
    {
        $newCubeCount = $MAX_CUBE_COUNT;
        $result["outbreakEvents"] = outbreak($mysqli, $game, $cityKey, $cubeColor);
    }

    if ($newCubeCount != $cubeCount)
    {
        $mysqli->query("UPDATE vw_location
                        SET $cubeColumn = $newCubeCount
                        WHERE game = $game
                        AND locationKey = '$cityKey'");
        
        if ($mysqli->affected_rows != 1)
            throw new Exception("Failed to add $cubesToAdd cubes ($cubeColor) to $cityKey: $mysqli->error");
    }

    return $result;
}

function removeCubesFromCity($mysqli, $game, $role, $cityKey, $cubeColor, $removeAll, $eventType)
{
    $cubeColumn = getCubeColumnName($cubeColor);
    $cubeCount = getCubeCount($mysqli, $game, $cityKey, $cubeColumn);
    
    if ($removeAll)
        $newCubeCount = 0;
    else
    {
        $newCubeCount = $cubeCount - 1;

        if ($newCubeCount < 0)
            throw new Exception("Failed to remove cube from $cityKey: city already has 0 $cubeColor cubes.");
    }
    
    $mysqli->query("UPDATE vw_location
                    SET $cubeColumn = $newCubeCount
                    WHERE game = $game
                    AND locationKey = '$cityKey'");

    if ($mysqli->affected_rows != 1)
        throw new Exception("Failed to remove $cubeColor cube(s) from $cityKey: $mysqli->error");

    if ($eventType == "td")
        return recordEvent($mysqli, $game, $eventType, "$cityKey,$cubeColor,$cubeCount,$newCubeCount", $role);
    else if ($eventType == "at")
        return recordEvent($mysqli, $game, $eventType, "$cityKey,$cubeColor", $role);
}

function recordEvent($mysqli, $game, $type, $details, $role = "NULL")
{
    $turnNum = getTurnNumber($mysqli, $game);

    $mysqli->query("INSERT INTO vw_event
                        (game, turnNum, eventType, details, role)
                    VALUES
                        ($game, $turnNum, '$type', '$details', $role)");
    
    if ($mysqli->affected_rows != 1)
        throw new Exception("Failed to insert event ($type, $details): " . $mysqli->error);

    return array("id" =>  $mysqli->insert_id,
                "turnNum" => $turnNum,
                "code" => $type,
                "details" => $details,
                "role" => $role);
}

function outbreak($mysqli, $game, $originCityKey, $cubeColor)
{
    $events = array();

    $OUTBREAK_LIMIT = 8;

    $outbreakCount = $mysqli->query("SELECT outbreakCount
                                    FROM vw_gamestate
                                    WHERE game = $game")->fetch_assoc()["outbreakCount"];
    
    $cubeColumn = getCubeColumnName($cubeColor);
    $pendingOutbreakKeys = array($originCityKey);
    // A city cannot outbreak more than once
    // as a result of resolving the current infection card.
    $currentOutbreakKeys = array($originCityKey);
    
    while (count($pendingOutbreakKeys) > 0)
    {
        $outbreakKey = array_shift($pendingOutbreakKeys);
        
        $outbreakCount++;
        $events[] = recordEvent($mysqli, $game, "ob", "$outbreakCount,$outbreakKey,$cubeColor");

        // If the outbreak limit is reached, the game is over and the players lose.
        if ($outbreakCount == $OUTBREAK_LIMIT)
        {
            recordGameEndCause($mysqli, $game, "outbreak");
            return $events;
        }

        $mysqli->query("UPDATE vw_gamestate SET outbreakCount = $outbreakCount WHERE game = $game");
        
        if ($mysqli->affected_rows != 1)
            throw new Exception("Failed to update gamestate after outbreak.");

        $connections = getConnectedCityKeyPairs($mysqli, $outbreakKey);

        if ($connections->num_rows == 0)
            throw new Exception("Failed to retrieve cities connected to $outbreakKey: " . $mysqli->error);

        while ($con = mysqli_fetch_assoc($connections))					
        {
            $affectedKey = $con["cityKeyA"] == $outbreakKey ? $con["cityKeyB"] : $con["cityKeyA"];

            // Cities which have already been triggered to outbreak as a result of
            // resolving the current infection card will already contain 3 cubes of the relevant color,
            // and can therefore be ignored.
            if (in_array($affectedKey, $currentOutbreakKeys))
                continue;
        
            $infectionPrevention = checkInfectionPrevention($mysqli, $game, $affectedKey, $cubeColor);
            if ($infectionPrevention != "0")
            {
                // Infection prevented -- the city will not be affected.
                $events[] = recordEvent($mysqli, $game, "oi", "$outbreakKey,$affectedKey,$cubeColor,$infectionPrevention");
                continue;
            }

            $cubeCount = getCubeCount($mysqli, $game, $affectedKey, $cubeColumn);

            if ($cubeCount < 3) // add one more cube to the city
            {
                $mysqli->query("UPDATE vw_location
                                SET $cubeColumn = ($cubeCount + 1)
                                WHERE game = $game
                                AND locationKey = '$affectedKey'");

                if ($mysqli->affected_rows != 1)
                    throw new Exception("Failed to add $cubeColumn to $affectedKey (outbreak infection triggered by $outbreakKey): " . $mysqli->error);
                
                $events[] = recordEvent($mysqli, $game, "oi", "$outbreakKey,$affectedKey,$cubeColor,$infectionPrevention");
            }
            else // the affected city will have an outbreak
            {
                array_push($pendingOutbreakKeys, $affectedKey);
                array_push($currentOutbreakKeys, $affectedKey);
            }
        }
    }

    return $events;
}


// Performs Epidemic steps 1 and 2, which happen immediately when an epidemic card is drawn.
// Step 3 (INTENSIFY) is handled separately because the "RESILIENT POPULATION"
// event card can be played between steps 2 and 3.
// NOTE:    When two epidemic cards are drawn on the same turn,
//          the second is not triggered until after the first has been resolved.
// Epidemic Step 1: INCREASE
// "MOVE THE INFECTION RATE MARKER FORWARD 1 SPACE."
// Epidemic Step 2: INFECT
// "DRAW THE BOTTOM CARD FROM THE INFECTION DECK AND PUT 3 CUBES ON THAT CITY. DISCARD THAT CARD."
// Returns the epidemic event created by recordEvent.
function triggerEpidemic($mysqli, $game, $role)
{
    $EVENT_CODE = "ep";
    
    // Update epidemicCount and infectionRate
    $newEpidemicCount = $mysqli->query("SELECT epidemicCount
                                        FROM vw_gamestate
                                        WHERE game = $game")->fetch_assoc()["epidemicCount"] + 1;
    
    $mysqli->query("UPDATE vw_gamestate
                    SET epidemicCount = $newEpidemicCount,
                        infRate = getInfectionRate($newEpidemicCount)
                    WHERE game = $game");
    
    if ($mysqli->affected_rows != 1)
        throw new Exception("Failed to update epidemic count / infection rate: " . $mysqli->error);
    
    // Get the bottom card from the infection deck.
    $bottomCard = $mysqli->query("SELECT cardKey, color
                                FROM vw_infectionCard
                                WHERE game = $game
                                AND pile = 'deck'
                                AND cardIndex = (SELECT MIN(cardIndex)
                                                FROM vw_infectionCard
                                                WHERE game = $game
                                                AND pile = 'deck')")->fetch_assoc();
    
    $cardKey = $bottomCard["cardKey"];
    $color = $bottomCard["color"];

    discardInfectionCards($mysqli, $game, $cardKey);

    // Add 3 cubes to the corresponding city, unless the infection will be prevented somehow.
    $cubesToAdd = 3;
    $infectionPrevention = checkInfectionPrevention($mysqli, $game, $cardKey, $color);
    if ($infectionPrevention != "0")
        $cubesToAdd = 0;
    
    $prevCubeCount = addCubesToCity($mysqli, $game, $cardKey, $color, $cubesToAdd)["prevCubeCount"];
    
    return recordEvent($mysqli, $game, $EVENT_CODE, "$newEpidemicCount,$cardKey,$prevCubeCount,$infectionPrevention", $role);
}    

function nextTurn($mysqli, $game, $currentTurnRoleID)
{
    $nextTurnNum = getTurnNumber($mysqli, $game) + 1;
    $nextTurnRoleID = $mysqli->query("SELECT nextID
                                    FROM vw_player
                                    WHERE game = $game
                                    AND rID = $currentTurnRoleID")->fetch_assoc()["nextID"];
    
    $mysqli->query("UPDATE vw_gamestate
                    SET turn = $nextTurnRoleID,
                        turnNum = $nextTurnNum
                    WHERE game = $game
                    AND turn = $currentTurnRoleID
                    AND stepName = 'infect cities'"); // 'infect cities' is always the last step in a turn

    if ($mysqli->affected_rows != 1)
        throw new Exception("Failed to increment turn: " . $mysqli->error);

    return $nextTurnRoleID;
}

/*  Updates the step to the very next one and returns the new step description.
    NOTE:   Use only when the order of steps is guaranteed
            (such as from 'action1' through to 'action 4' to 'draw cards').
            The order of some steps will vary based on card draws etc.
*/
function nextStep($mysqli, $game, $currentStep, $currentTurnRoleID)
{
    $nextStep = $mysqli->query("SELECT description
                                FROM step
                                WHERE stepID = getStepID('$currentStep') + 1")->fetch_assoc()["description"];

    if (is_null($nextStep))
        $nextStep = "action 1";
    
    $mysqli->query("UPDATE vw_gamestate
                    SET step = getStepID('$nextStep')
                    WHERE game = $game
                    AND turn = $currentTurnRoleID
                    AND stepName = '$currentStep'");

    if ($mysqli->affected_rows != 1)
        throw new Exception("Failed to update step ($currentStep -> $nextStep): " . $mysqli->error);
    
    if ($nextStep === "draw" && countCardsInPlayerDeck($mysqli, $game) == 0)
        recordGameEndCause($mysqli, $game, "cards");
    
    return $nextStep;
}

function countCardsInPlayerDeck($mysqli, $game)
{
    $numCards = $mysqli->query("SELECT COUNT(*) AS 'numCards'
								FROM vw_playerCard
								WHERE game = $game
								AND pile = 'deck'")
                        ->fetch_assoc()["numCards"];
    
    return $numCards;
}

// Updates the step to the specified nextStep,
// or determines the nextStep after a hand-limit-reached condition.
// Calls nextTurn() if necessary.
// Ensures that the expected currentStep and currentTurnRoleID match what's in the db.
// Returns the nextStep.
function updateStep($mysqli, $game, $currentStep, $nextStep, $currentTurnRoleID)
{
    if ($currentStep == "infect cities" && $nextStep == "action 1")
        $currentTurnRoleID = nextTurn($mysqli, $game, $currentTurnRoleID);
    else if ($currentStep == "hand limit")
    {
        // If the current turn was interrupted by the hand-limit-reached condition,
        // determine which step comes next.
        $MAX_ACTIONS_PER_TURN = 4;
        $turnNum = getTurnNumber($mysqli, $game);
        $actionsTakenThisTurn = countActionsTakenThisTurn($mysqli, $game);

        if ($actionsTakenThisTurn < $MAX_ACTIONS_PER_TURN)
            $nextStep = "action " . ($actionsTakenThisTurn + 1);
        else // The draw step comes after the player has performed 4 actions.
            $nextStep = "draw";
    }
    
    $mysqli->query("UPDATE vw_gamestate
                    SET step = getStepID('$nextStep')
                    WHERE game = $game
                    AND stepName = '$currentStep'
                    AND turn = $currentTurnRoleID");
    
    if ($mysqli->affected_rows != 1)
        throw new Exception("Failed to update step: " . $mysqli->error);
    
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

function discardPlayerCards($mysqli, $game, $role, $cardKeys)
{
    $cardType = "player";
    $currentPile = $role;
    $newPile = "discard";
    
    moveCardsToPile($mysqli, $game, $cardType, $currentPile, $newPile, $cardKeys);
}

function discardInfectionCards($mysqli, $game, $cardKeys)
{
    $cardType = "infection";
    // infection cards are drawn from the deck and immediately placed in the discard pile.
    $currentPile = "deck";
    $newPile = "discard";

    moveCardsToPile($mysqli, $game, $cardType, $currentPile, $newPile, $cardKeys);
}

// Moves the specified playerCard or infectionCard keys to the newPile,
// given the cardType ("infection" or "player"), and the currentPile.
// Accepts pile names or pile IDs for currentPile and newPile.
function moveCardsToPile($mysqli, $game, $cardType, $currentPile, $newPile, $cardKeys)
{
    if ($cardType != "infection" && $cardType != "player")
        throw new Exception("Failed to move cards. Invalid card type: '$cardType'");
    
    $cardView = "vw_" . $cardType . "Card";

    if (!is_numeric($currentPile))
        $currentPile = "getPileID('$currentPile')";

    if (!is_numeric($newPile))
        $newPile = "getPileID('$newPile')";

    if (!is_array($cardKeys))
        $cardKeys = array($cardKeys);

    $cardIndex = $mysqli->query("SELECT MAX(cardIndex) AS 'maxIdx'
                                FROM $cardView
                                WHERE game = $game
                                AND pileID = $newPile")->fetch_assoc()["maxIdx"];
    
    // looping is necessary (as opposed to using WHERE cardKey IN ($cardKeys))
    // to allow the individual setting of cardIndex
    for ($i = 0; $i < count($cardKeys); $i++)
    {
        // Use the next available cardIndex
        $cardIndex++;
        
        $cardKey = $cardKeys[$i];

        $mysqli->query("UPDATE $cardView
                        SET pileID = $newPile,
                            cardIndex = $cardIndex
                        WHERE game = $game
                        AND pileID = $currentPile
                        AND cardKey = '$cardKey'");

        if ($mysqli->affected_rows != 1)
                throw new Exception("Failed to discard player card ($cardKey): " . $mysqli->error);
    }
}

function getEventCardHolder($mysqli, $game, $cardKey)
{
    $eventCardHolder = $mysqli->query("SELECT pileID AS 'role'
                                    FROM vw_playerCard
                                    WHERE game = $game
                                    AND cardKey = '$cardKey'
                                    AND pile NOT IN ('deck', 'discard', 'removed')")->fetch_assoc()["role"];
    
    if (!$eventCardHolder)
        throw new Exception("The event card was not found in any player's hand.");
    
    return $eventCardHolder;
}

function roleHasTooManyCards($mysqli, $game, $role)
{
    $HAND_LIMIT = 7;

    $handSize = $mysqli->query("SELECT COUNT(*) AS 'handSize'
                                FROM vw_playerCard
                                WHERE game = $game
                                AND pileID = $role")->fetch_assoc()["handSize"];

    return $handSize > $HAND_LIMIT;
}

function eventCardSatisfiedDiscard($mysqli, $game, $currentStep, $discardingRole, $activeRole)
{
    if (roleHasTooManyCards($mysqli, $game, $discardingRole))
        return false;
    
    if ($currentStep === "discard")
        $nextStep = "infect cities";
    else if ($currentStep === "hand limit")
        $nextStep = false; // the next step will be determined by updateStep
    else
        return false;

    return updateStep($mysqli, $game, $currentStep, $nextStep, $activeRole);
}

function getRoleID($mysqli, $roleName)
{
    $roleID = $mysqli->query("SELECT roleID
                                FROM role
                                WHERE roleName = '$roleName'")->fetch_assoc()["roleID"];
    return $roleID;
}

function getRoleName($mysqli, $roleID)
{
    $roleName = $mysqli->query("SELECT roleName
                                FROM role
                                WHERE roleID = $roleID")->fetch_assoc()["roleName"];
    return $roleName;
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

function getCityColor($mysqli, $cityKey)
{
    $color = $mysqli->query("SELECT diseaseColor FROM city WHERE cityKey = '$cityKey'")
        ->fetch_assoc()["diseaseColor"];

    return $color;
}

function getDiseaseStatus($mysqli, $game, $diseaseColor)
{
    $column = $diseaseColor . "Status";

    $status = $mysqli->query("SELECT $column FROM vw_disease WHERE game = $game")->fetch_assoc()[$column];

    return $status;
}

function setDiseaseStatus($mysqli, $game, $diseaseColor, $newStatus)
{
    $column = $diseaseColor . "StatusID";

    $mysqli->query("UPDATE pandemic
                    SET $column = getDiseaseStatusID('$newStatus')
                    WHERE gameID = $game");
    
    if ($mysqli->affected_rows != 1)
        throw new Exception("Failed to set disease status ($diseaseColor, $newStatus): " . $mysqli->error);

    // Record and return any "eradicaton" events
    if ($newStatus == "eradicated")
        return recordEvent($mysqli, $game, "er", $diseaseColor);
}

function numDiseaseCubesOnBoard($mysqli, $game, $diseaseColor)
{
    $cubeColumn = $diseaseColor . "Cubes";

    $numCubesOnBoard = $mysqli->query("SELECT SUM($cubeColumn) AS 'numCubes'
                                        FROM vw_location
                                        WHERE game = $game")->fetch_assoc()["numCubes"];

    return $numCubesOnBoard;
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

function getAutoTreatDiseaseEvents($mysqli, $game, $cityKey, $diseaseColor = false)
{
    if ($diseaseColor)
        $diseaseColors = array($diseaseColor);
    else
        $diseaseColors = array("y", "r", "u", "b");
    
    $events = array();
    $role = getRoleID($mysqli, "Medic");
    $removeAll = true;
    $eventType = "at"; // Auto-Treat

    for ($i = 0; $i < count($diseaseColors); $i++)
    {
        $color = $diseaseColors[$i];
        
        if (getDiseaseStatus($mysqli, $game, $color) === "cured"
            && getCubeCount($mysqli, $game, $cityKey, $color) > 0)
        {
            $events[] = removeCubesFromCity($mysqli, $game, $role, $cityKey, $color, $removeAll, $eventType);

            if (numDiseaseCubesOnBoard($mysqli, $game, $color) == 0)
                $events[] = setDiseaseStatus($mysqli, $game, $color, "eradicated");
        }
    }

    if (count($events) > 0)
        return $events;
    
    return false;
}

// Update's a role's location.
// If the role is "Medic" and auto-treat disease events occur, returns said events.
// Otherwise returns false.
function updateRoleLocation($mysqli, $game, $role, $originKey, $destinationKey)
{
    $mysqli->query("UPDATE vw_player
                    SET location = '$destinationKey'
                    WHERE game = $game
                    AND rID = $role
                    AND location = '$originKey'");
    
    if ($mysqli->affected_rows != 1)
        throw new Exception("Failed to update location from $originKey to $destinationKey: " . $mysqli->error);
}

function validateOperationsFlight($mysqli, $game, $role, $discardKey)
{
    // The specified discard must be a City card.
    if (getPlayerCardType($mysqli, $discardKey) != "city")
        throw new Exception("Invalid Operations Flight: the discard must be a City card.");
    
    // The player must be the Operations Expert.
    if (getRoleName($mysqli, $role) != "Operations Expert")
        throw new Exception("Invalid Operations Flight: invalid role.");

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
        throw new Exception("Invalid Operations Flight: this action can be performed only once per turn.");
}

function validateDispatcherRendezvous($mysqli, $game, $role, $destinationKey)
{
    // The Dispatcher can move any pawn to any city containing another pawn.
    $destinationContainsPawn = $mysqli->query("SELECT COUNT(*) AS 'numPawns'
                                                FROM vw_player
                                                WHERE game = $game
                                                AND location = '$destinationKey'
                                                AND rID != $role")->fetch_assoc()["numPawns"] > 0;
    
    return $destinationContainsPawn;
}

function getContingencyCardKey($mysqli, $game)
{
    $result = $mysqli->query("SELECT cardKey
                            FROM vw_playerCard
                            WHERE game = $game
                            AND pile = 'contingency'
                            LIMIT 1");
    
    if ($result->num_rows === 0)
        return false;
    
    return $result->fetch_assoc()["cardKey"];
}

function discardOrRemoveEventCard($mysqli, $game, $discardingRole, $cardKey)
{
    if ($cardKey && $cardKey === getContingencyCardKey($mysqli, $game))
    {
        $cardType = "player";
        $currentPile = $discardingRole; // contingency
        $newPile = "removed";
        moveCardsToPile($mysqli, $game, $cardType, $currentPile, $newPile, $cardKey);
    }
    else
        discardPlayerCards($mysqli, $game, $discardingRole, $cardKey);
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

function countEpidemicsResolvedOnTurn($mysqli, $game, $turnNum)
{
    $INTENSIFY_EVENT_CODE = "et";
    $numResolvedThisTurn = $mysqli->query("SELECT COUNT(*) AS 'numResolved'
                                            FROM vw_event
                                            WHERE game = $game
                                            AND turnNum = $turnNum
                                            AND eventType = '$INTENSIFY_EVENT_CODE'")->fetch_assoc()["numResolved"];
    
    return $numResolvedThisTurn;
}

// Throws an Exception if playing the specified $eventCardKey is illegal in the current game state.
// "Event cards can be played at any time, except in between drawing and resolving a card."
// Therefore, event cards cannot be played during the "draw" step or while resolving an epidemic.
// EXCEPT:
// 1. "When 2 Epidemic cards are drawn together, events can be played after resolving the first epidemic."
// 2. From the Resilient Population event card text: "You may play this between the Infect and Intensify steps of an epidemic."
function checkEventCardLegality($mysqli, $game, $eventCardKey)
{   
    $currentStep = $mysqli->query("SELECT stepName
                                    FROM vw_gamestate
                                    WHERE game = $game")->fetch_assoc()["stepName"];

    $RESILIENT_POPULATION_KEY = "resi";

    if ($currentStep === "draw" && playerCardsWereDrawnThisTurn($mysqli, $game)
        || ($currentStep === "epIncrease" && countEpidemicsResolvedOnTurn($mysqli, $game, $turnNum) !== 1) // 1.
        || $currentStep === "epInfect"
        || ($currentStep === "epIntensify" && $eventCardKey !== $RESILIENT_POPULATION_KEY)) // 2.
        throw new Exception("Event cards cannot be played between drawing and resolving a card.");

    // Additionally, event cards cannot be played mid-forecast (the drawn infection cards are considered unresolved).
    if (forecastIsInProgress($mysqli, $game))
        throw new Exception("The Forecast must be resolved before another action can be performed.");
}

function playerCardsWereDrawnThisTurn($mysqli, $game)
{
    $EVENT_CODE = "cd";
    $turnNum = getTurnNumber($mysqli, $game);

    $cardsWereDrawn = $mysqli->query("SELECT COUNT(*) AS 'cardDrawEvent'
                                    FROM vw_event
                                    WHERE game = $game
                                    AND turnNum = $turnNum
                                    AND eventType = '$EVENT_CODE")->fetch_assoc()["cardDrawEvent"] == 1;
    
    return $cardsWereDrawn;
}

// A Forecast event manifests in the db as a pair of events: the draw, and the placement.
// Therefore if the number of draw/placement events is odd (and greater than 0),
// there must be an unresolved draw awaiting placement.
function forecastIsInProgress($mysqli, $game)
{
    $FORECAST_DRAW_CODE = "fd";
    $FORECAST_PLACEMENT_CODE = "fp";
    $numForecastEvents = $mysqli->query("SELECT COUNT(*) AS 'numEvents'
                                            FROM vw_event
                                            WHERE game = $game
                                            AND eventType IN ('$FORECAST_DRAW_CODE', '$FORECAST_PLACEMENT_CODE')")
                                ->fetch_assoc()["numEvents"];
    
    return $numForecastEvents > 0 && $numForecastEvents % 2 !== 0;
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

function recordGameEndCause($mysqli, $game, $endCauseName)
{
    $mysqli->query("UPDATE vw_gamestate
                    SET endCause = getEndCauseID('$endCauseName')
                    WHERE game = $game");
    
    if ($mysqli->affected_rows != 1)
        throw new Exception("Failed to record game end cause: $mysqli->error");
}
?>