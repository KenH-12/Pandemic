<?php
    try
    {
        session_start();
        require "../connect.php";
        include "../utilities.php";
        
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

        $event = getEventById($mysqli, $game, $eventID);
        validateEventCanBeUndone($mysqli, $game, $event);

        $role = $event["role"];
        $eventType = $event["eventType"];
        $cardKeys = explode(",", $event["details"]);

        $mysqli->autocommit(FALSE);

        moveCardsToPile($mysqli, $game, "player", "discard", $role, $cardKeys);

        $diseaseColor = getCityColor($mysqli, $cardKeys[0]);
        $diseaseStatus = "rampant";
        setDiseaseStatus($mysqli, $game, $diseaseColor, $diseaseStatus);

        $response["undoneEventIds"] = array($eventID);
        // Undo any auto-treat disease and eradication events that were triggered by discovering a cure.
        if ($triggeredEventIds = undoEventsTriggeredByEvent($mysqli, $game, $eventID))
            $response["undoneEventIds"] = array_merge($response["undoneEventIds"], $triggeredEventIds);
       
        $response["prevStepName"] = previousStep($mysqli, $game, $activeRole, $currentStep);
        deleteEvent($mysqli, $game, $eventID);
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo Discover A Cure: " . $e->getMessage();
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