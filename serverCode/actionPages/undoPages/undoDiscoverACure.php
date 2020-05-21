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

        $event = getEventById($pdo, $game, $eventID);
        validateEventCanBeUndone($pdo, $game, $event);

        $role = $event["role"];
        $eventType = $event["eventType"];
        $cardKeys = explode(",", $event["details"]);

        $pdo->beginTransaction();

        moveCardsToPile($pdo, $game, "player", "discard", $role, $cardKeys);

        $response["undoneEventIds"] = array($eventID);
        // Undo any auto-treat disease and eradication events that were triggered by discovering a cure.
        if ($triggeredEventIds = undoEventsTriggeredByEvent($pdo, $game, $eventID))
            $response["undoneEventIds"] = array_merge($response["undoneEventIds"], $triggeredEventIds);
        
        $diseaseColor = getCityColor($pdo, $cardKeys[0]);
        $diseaseStatus = "rampant";
        setDiseaseStatus($pdo, $game, $diseaseColor, $diseaseStatus);
       
        $response["prevStepName"] = previousStep($pdo, $game, $activeRole, $currentStep);
        deleteEvent($pdo, $game, $eventID);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to undo Discover A Cure: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo Discover A Cure: " . $e->getMessage();
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