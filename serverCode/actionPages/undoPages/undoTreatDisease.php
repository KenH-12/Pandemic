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
        $eventDetails = explode(",", $event["details"]);
        $cityKey = $eventDetails[0];
        $diseaseColor = $eventDetails[1];
        $numCubesRemoved = $eventDetails[2] - $eventDetails[3];

        $pdo->beginTransaction();
        
        addCubesToCity($pdo, $game, $cityKey, $diseaseColor, $numCubesRemoved);
        
        $response["undoneEventIds"] = array($eventID);
        // Undo any eradication events that were triggered by the Treat Disease event.
        if ($triggeredEventIds = undoEventsTriggeredByEvent($pdo, $game, $eventID))
            $response["undoneEventIds"] = array_merge($response["undoneEventIds"], $triggeredEventIds);

        deleteEvent($pdo, $game, $eventID);
        $response["prevStepName"] = previousStep($pdo, $game, $activeRole, $currentStep);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to undo Treat Disease: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo Treat Disease: " . $e->getMessage();
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