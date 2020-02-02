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
        $eventDetails = explode(",", $event["details"]);
        $cardKey = $eventDetails[0];
        $giverRole = $eventDetails[1];
        $receiverRole = $eventDetails[2];

        $mysqli->autocommit(FALSE);

        moveCardsToPile($mysqli, $game, "player", $receiverRole, $giverRole, $cardKey);
        
        $response["undoneEventIds"] = array($eventID);
        $response["prevStepName"] = previousStep($mysqli, $game, $activeRole, $currentStep);
        deleteEvent($mysqli, $game, $eventID);
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo Share Knowledge: " . $e->getMessage();
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