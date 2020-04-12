<?php
    try
    {
        session_start();
        require "../../connect.php";
        include "../../utilities.php";
        
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
        
        $AIRLIFT_CARDKEY = "airl";

        $event = getEventById($mysqli, $game, $eventID);
        validateEventCanBeUndone($mysqli, $game, $event);

        $role = $event["role"];
        $eventDetails = explode(",", $event["details"]);
        $airliftedRole = $eventDetails[0];
        $originKey = $eventDetails[1];
		$destinationKey = $eventDetails[2];

        $mysqli->autocommit(FALSE);
        
        updateRoleLocation($mysqli, $game, $airliftedRole, $destinationKey, $originKey);
        $response["wasContingencyCard"] = moveEventCardToPrevPile($mysqli, $game, $AIRLIFT_CARDKEY, $event);

        $response["undoneEventIds"] = array($eventID);
        // If the medic moved as a result of the airlift, undo any resulting auto-treat disease and eradication events.
        if (getRoleName($mysqli, $airliftedRole) === "Medic"
            && $triggeredEventIds = undoEventsTriggeredByEvent($mysqli, $game, $eventID))
            $response["undoneEventIds"] = array_merge($response["undoneEventIds"], $triggeredEventIds);

        deleteEvent($mysqli, $game, $eventID);

        if (roleHasTooManyCards($mysqli, $game, $role))
        {
            $prevStep = getPreviousDiscardStepName($mysqli, $game);
            $response["prevStepName"] = updateStep($mysqli, $game, $currentStep, $prevStep, $activeRole);
        }
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo Airlift: " . $e->getMessage();
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