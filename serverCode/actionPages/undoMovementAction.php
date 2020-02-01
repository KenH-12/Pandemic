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

        if (!isset($_POST["actionCode"]))
            throw new Exception("Action code not set.");
        
        if (!isset($_POST["eventID"]))
            throw new Exception("Event id not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $_POST["currentStep"];
        $activeRole = $_POST["activeRole"];
        $actionCode = $_POST["actionCode"];
        $eventID = $_POST["eventID"];

        $DRIVE_FERRY = "dr";
        $DIRECT_FLIGHT = "df";
        $CHARTER_FLIGHT = "cf";
        $SHUTTLE_FLIGHT = "sf";
        $OPERATIONS_FLIGHT = "of";
        $DISPATCH = "dp";

        $event = getEventById($mysqli, $game, $eventID);
        validateEventCanBeUndone($mysqli, $game, $event);

        $movementType = $event["eventType"];
        $role = $event["role"];
        $eventDetails = explode(",", $event["details"]);

        if ($movementType === $DISPATCH)
        {
            $roleToMove = $eventDetails[0];
            $originKey = $eventDetails[1];
            $destinationKey = $eventDetails[2];
            $movementType = $eventDetails[3];
        }
        else
        {
            $roleToMove = $role;
            $originKey = $eventDetails[0];
            $destinationKey = $eventDetails[1];
        }

        if ($movementType === $DIRECT_FLIGHT)
            $discardKey = $destinationKey;
        else if ($movementType === $CHARTER_FLIGHT)
            $discardKey = $originKey;
        else if ($movementType === $OPERATIONS_FLIGHT)
            $discardKey = $eventDetails[2];
        else
            $discardKey = false;
        
        $mysqli->autocommit(FALSE);
        
        // Put the pawn back on the origin city.
        $mysqli->query("UPDATE vw_player
                        SET location = '$originKey'
                        WHERE game = $game
                        AND rID = $roleToMove
                        AND location = '$destinationKey'");
        
        if ($mysqli->affected_rows != 1)
            throw new Exception("pawn ($roleToMove) could not be placed back on origin ('$originKey') from destination ('$destinationKey') : $mysqli->error");
        
        // If a card was discarded to perform the action, put it back in the role's hand.
        if ($discardKey)
            moveCardsToPile($mysqli, $game, "player", "discard", $role, $discardKey);

        $response["undoneEventIds"] = array($eventID);
        // If the medic moved as a result of the action, undo any resulting auto-treat disease and eradication events.
        if (getRoleName($mysqli, $roleToMove) === "Medic"
            && $triggeredEventIds = undoEventsTriggeredByEvent($mysqli, $game, $eventID))
            $response["undoneEventIds"] = array_merge($response["undoneEventIds"], $triggeredEventIds);

        deleteEvent($mysqli, $game, $eventID);
        $response["prevStepName"] = previousStep($mysqli, $game, $activeRole, $currentStep);
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo movement action: " . $e->getMessage();
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