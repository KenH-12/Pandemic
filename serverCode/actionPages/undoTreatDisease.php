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
        $eventDetails = explode(",", $event["details"]);
        $cityKey = $eventDetails[0];
        $diseaseColor = $eventDetails[1];
        $numCubesRemoved = $eventDetails[2] - $eventDetails[3];

        $mysqli->autocommit(FALSE);
        
        addCubesToCity($mysqli, $game, $cityKey, $diseaseColor, $numCubesRemoved);
        
        $response["undoneEventIds"] = array($eventID);
        // Undo any eradication events that were triggered by the Treat Disease event.
        if ($triggeredEventIds = undoEventsTriggeredByEvent($mysqli, $game, $eventID))
            $response["undoneEventIds"] = array_merge($response["undoneEventIds"], $triggeredEventIds);

        deleteEvent($mysqli, $game, $eventID);
        $response["prevStepName"] = previousStep($mysqli, $game, $activeRole, $currentStep);
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo Treat Disease: " . $e->getMessage();
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