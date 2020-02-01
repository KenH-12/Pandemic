<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($_POST["activeRole"]))
            throw new Exception("Role not set.");
        
        if (!isset($_POST["eventID"]))
            throw new Exception("Event id not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $_POST["currentStep"];
        $activeRole = $_POST["activeRole"];
        $eventID = $_POST["eventID"];

        $BUILD_RESEARCH_STATION = "rs";
        $GOVERNMENT_GRANT = "gg";
        
        require "../connect.php";
        include "../utilities.php";

        $event = getEventById($mysqli, $game, $eventID);
        validateEventCanBeUndone($mysqli, $game, $event);

        $role = $event["role"];
        $eventType = $event["eventType"];
        $eventDetails = explode(",", $event["details"]);
        $cityKey = $eventDetails[0];

        $mysqli->autocommit(FALSE);

        if ($eventType === $BUILD_RESEARCH_STATION)
        {
            // (the Operations Expert can perform Build Research Station for free).
            if (getRoleName($mysqli, $role) !== "Operations Expert")
                moveCardsToPile($mysqli, $game, "player", "discard", $role, $cityKey);

            $response["prevStepName"] = previousStep($mysqli, $game, $activeRole, $currentStep);
        }
        else if ($eventType === $GOVERNMENT_GRANT)
        {
            $GOVERNMENT_GRANT_CARDKEY = "gove";
            $response["wasContingencyCard"] = moveEventCardToPrevPile($mysqli, $game, $GOVERNMENT_GRANT_CARDKEY, $event);
        }
        else
            throw new Exception("Invalid event type: '$eventType'");

        // If the action relocated a research station, place it back on the original city.
        if (isset($eventDetails[1]))
        {
            $relocationKey = $eventDetails[1];
            placeResearchStation($mysqli, $game, $relocationKey, $cityKey);
        }
        else
            removeResearchStation($mysqli, $game, $cityKey);

        $response["undoneEventIds"] = array($eventID);
        deleteEvent($mysqli, $game, $eventID);
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo research station placement: " . $e->getMessage();
    }
    finally
    {
        if (isset($response["failure"]))
            $mysqli->rollback();
        else
            $mysqli->commit();
        
        $mysqli->close();

        echo json_encode($response);
    }
?>