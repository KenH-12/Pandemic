<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        $rootDir = realpath($_SERVER["DOCUMENT_ROOT"]);
        require "$rootDir/Pandemic/serverCode/connect.php";
        require "$rootDir/Pandemic/serverCode/utilities.php";

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
        
        $AIRLIFT_CARDKEY = "airl";

        $event = getEventById($pdo, $game, $eventID);
        validateEventCanBeUndone($pdo, $game, $event);

        $role = $event["role"];
        $eventDetails = explode(",", $event["details"]);
        $airliftedRole = $eventDetails[0];
        $originKey = $eventDetails[1];
		$destinationKey = $eventDetails[2];

        $pdo->beginTransaction();
        
        updateRoleLocation($pdo, $game, $airliftedRole, $destinationKey, $originKey);
        $response["wasContingencyCard"] = moveEventCardToPrevPile($pdo, $game, $AIRLIFT_CARDKEY, $event);

        $response["undoneEventIds"] = array($eventID);
        // If the medic moved as a result of the airlift, undo any resulting auto-treat disease and eradication events.
        if (getRoleName($pdo, $airliftedRole) === "Medic"
            && $triggeredEventIds = undoEventsTriggeredByEvent($pdo, $game, $eventID))
            $response["undoneEventIds"] = array_merge($response["undoneEventIds"], $triggeredEventIds);

        deleteEvent($pdo, $game, $eventID);

        if (roleHasTooManyCards($pdo, $game, $role))
        {
            $prevStep = getPreviousDiscardStepName($pdo, $game);
            $response["prevStepName"] = updateStep($pdo, $game, $currentStep, $prevStep, $activeRole);
        }
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to undo Airlift: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo Airlift: " . $e->getMessage();
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