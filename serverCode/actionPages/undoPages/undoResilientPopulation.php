<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        $rootDir = realpath($_SERVER["DOCUMENT_ROOT"]);
        require "$rootDir/Pandemic/serverCode/connect.php";
        require "$rootDir/Pandemic/serverCode/utilities.php";

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($data["activeRole"]))
            throw new Exception("Role not set.");
        
        if (!isset($data["eventID"]))
            throw new Exception("Event id not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $data["currentStep"];
        $activeRole = $data["activeRole"];
        $eventID = $data["eventID"];
        
        $RESILIENT_POPULATION_CARDKEY = "resi";

        $event = getEventById($pdo, $game, $eventID);
        validateEventCanBeUndone($pdo, $game, $event);

        $role = $event["role"];
        $eventDetails = explode(",", $event["details"]);
        $cardKey = $eventDetails[0];
        $infectionDiscardIndex = $eventDetails[1];

        $stmt = $pdo->prepare("SELECT cardKey, cardIndex
                                FROM vw_infectionCard
                                WHERE game = ?
                                AND pile = 'discard'");
        $stmt->execute([$game]);
        $discards = $stmt->fetchAll();
        
        // From the infection discard pile, find a card which neighbored the removed card before it was removed.
        // This will allow us to place the removed card back in the discard pile exactly where it was before.
        foreach ($discards as $row)
        {
            $idx = $row["cardIndex"];

            if ($idx == $infectionDiscardIndex - 1)
            {
                $response["neighborCardKey"] = $row["cardKey"];
                $response["neighborWasDrawnBefore"] = 1;
                break;
            }
            
            if ($idx == $infectionDiscardIndex + 1)
            {
                $response["neighborCardKey"] = $row["cardKey"];
                $response["neighborWasDrawnBefore"] = 0;
                break;
            }
        }
        
        $pdo->beginTransaction();

        // Put the infection card which was removed from the game by Resilient Population
        // back where it was in the infection discard pile.
        $stmt = $pdo->prepare("UPDATE vw_infectionCard
                                SET pileID = udf_getPileID('discard'),
                                    cardIndex = ?
                                WHERE game = ?
                                AND pile = 'removed'
                                AND cardKey = ?");
        $stmt->execute([$infectionDiscardIndex, $game, $cardKey]);
        
        if ($stmt->rowCount() !== 1)
            throwException($pdo, "could not place the removed infection card back in the discard pile: ");
        
        $response["wasContingencyCard"] = moveEventCardToPrevPile($pdo, $game, $RESILIENT_POPULATION_CARDKEY, $event);

        $response["undoneEventIds"] = array($eventID);
        deleteEvent($pdo, $game, $eventID);

        // Only check if a role has too many cards if the current step is not 'Epidemic Intensify'
        // because any epidemics that were drawn must be resolved before discarding to 7 cards.
        if (getCurrentStepName($pdo, $game) !== "epIntensify"
            && roleHasTooManyCards($pdo, $game, $role))
        {
            $prevStep = getPreviousDiscardStepName($pdo, $game);
            $response["prevStepName"] = updateStep($pdo, $game, $currentStep, $prevStep, $activeRole);
        }
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to undo Resilient Population: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo Resilient Population: " . $e->getMessage();
    }
    finally
    {
        if ($pdo->inTransaction())
        {
            if (isset($response["failure"]))
                $pdo->rollback();
            else
                $pdo->commit();
        }
        
        echo json_encode($response);
    }
?>