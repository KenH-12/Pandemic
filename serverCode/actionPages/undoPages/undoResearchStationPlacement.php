<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        require "../../connect.php";
        require "../../utilities.php";

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

        $BUILD_RESEARCH_STATION = "rs";
        $GOVERNMENT_GRANT = "gg";

        $event = getEventById($pdo, $game, $eventID);
        validateEventCanBeUndone($pdo, $game, $event);

        $role = $event["role"];
        $eventType = $event["eventType"];
        $eventDetails = explode(",", $event["details"]);
        $cityKey = $eventDetails[0];
        $relocationKey = isset($eventDetails[1]) ? $eventDetails[1] : "0";

        $pdo->beginTransaction();

        if ($eventType === $BUILD_RESEARCH_STATION)
        {
            // (the Operations Expert can perform Build Research Station for free).
            if (getRoleName($pdo, $role) !== "Operations Expert")
                moveCardsToPile($pdo, $game, "player", "discard", $role, $cityKey);

            $response["prevStepName"] = previousStep($pdo, $game, $activeRole, $currentStep);
        }
        else if ($eventType === $GOVERNMENT_GRANT)
        {
            $GOVERNMENT_GRANT_CARDKEY = "gove";
            $response["wasContingencyCard"] = moveEventCardToPrevPile($pdo, $game, $GOVERNMENT_GRANT_CARDKEY, $event);

            if (roleHasTooManyCards($pdo, $game, $role))
            {
                $prevStep = getPreviousDiscardStepName($pdo, $game);
                $response["prevStepName"] = updateStep($pdo, $game, $currentStep, $prevStep, $activeRole);
            }
        }
        else
            throw new Exception("Invalid event type: '$eventType'");

        // If the action relocated a research station, place it back on the original city.
        if ($relocationKey)
            placeResearchStation($pdo, $game, $relocationKey, $cityKey);
        else
        {
            $remove = true;
            addOrRemoveResearchStation($pdo, $game, $cityKey, $remove);
        }

        $response["undoneEventIds"] = array($eventID);
        deleteEvent($pdo, $game, $eventID);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to undo research station placement: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo research station placement: " . $e->getMessage();
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