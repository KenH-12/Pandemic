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

        $response["prevStepName"] = previousStep($mysqli, $game, $activeRole, $currentStep);
        $response["undoneEventIds"] = array($eventID);
        deleteEvent($mysqli, $game, $eventID);
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo Discard: " . $e->getMessage();
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