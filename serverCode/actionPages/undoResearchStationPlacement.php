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
        
        require "../connect.php";
        include "../utilities.php";

        $event = getEventById($mysqli, $game, $eventID);
        validateEventCanBeUndone($mysqli, $game, $event);

        $role = $event["role"];
        $eventDetails = explode(",", $event["details"]);
        $cityKey = $eventDetails[0];

        $mysqli->autocommit(FALSE);

        if (isset($eventDetails[1]))
        {
            $relocationKey = $eventDetails[1];
            placeResearchStation($mysqli, $game, $relocationKey, $cityKey);
        }
        else
            removeResearchStation($mysqli, $game, $cityKey);

        deleteEvent($mysqli, $game, $eventID);
        $response["prevStepName"] = previousStep($mysqli, $game, $activeRole, $currentStep);
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