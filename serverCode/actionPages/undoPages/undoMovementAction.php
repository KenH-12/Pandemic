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

        if (!isset($data["actionCode"]))
            throw new Exception("Action code not set.");
        
        if (!isset($data["eventID"]))
            throw new Exception("Event id not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $data["currentStep"];
        $activeRole = $data["activeRole"];
        $actionCode = $data["actionCode"];
        $eventID = $data["eventID"];

        $DRIVE_FERRY = "dr";
        $DIRECT_FLIGHT = "df";
        $CHARTER_FLIGHT = "cf";
        $SHUTTLE_FLIGHT = "sf";
        $OPERATIONS_FLIGHT = "of";
        $DISPATCH = "dp";

        $event = getEventById($pdo, $game, $eventID);
        validateEventCanBeUndone($pdo, $game, $event);

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
        
        $pdo->beginTransaction();
        
        updateRoleLocation($pdo, $game, $roleToMove, $destinationKey, $originKey);
        
        // If a card was discarded to perform the action, put it back in the role's hand.
        if ($discardKey)
            moveCardsToPile($pdo, $game, "player", "discard", $role, $discardKey);

        $response["undoneEventIds"] = array($eventID);
        // If the medic moved as a result of the action, undo any resulting auto-treat disease and eradication events.
        if (getRoleName($pdo, $roleToMove) === "Medic"
            && $triggeredEventIds = undoEventsTriggeredByEvent($pdo, $game, $eventID))
            $response["undoneEventIds"] = array_merge($response["undoneEventIds"], $triggeredEventIds);

        deleteEvent($pdo, $game, $eventID);
        $response["prevStepName"] = previousStep($pdo, $game, $activeRole, $currentStep);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to undo movement action: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo movement action: " . $e->getMessage();
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