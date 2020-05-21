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

        $ONE_QUIET_NIGHT_CARDKEY = "oneq";

        $event = getEventById($pdo, $game, $eventID);
        validateEventCanBeUndone($pdo, $game, $event);

        $role = $event["role"];
        $eventTurnNum = $event["turnNum"];

        $turnNum = getTurnNumber($pdo, $game);

        $pdo->beginTransaction();

        $response["wasContingencyCard"] = moveEventCardToPrevPile($pdo, $game, $ONE_QUIET_NIGHT_CARDKEY, $event);
        $roleHasTooManyCards = roleHasTooManyCards($pdo, $game, $role);

        // It's possible to undo One Quiet Night after the 'infect cities' step has been skipped and the next turn has begun,
        // but only if nothing has been done in said next turn.
        if ($turnNum != $eventTurnNum)
        {
            $prevStepName = $roleHasTooManyCards ? "discard" : "infect cities";
            $response["prevTurnRoleID"] = goToStepBeforeOneQuietNight($pdo, $game, $prevStepName);
            
            $response["prevTurnNum"] = $eventTurnNum;
            $response["prevStepName"] = $prevStepName;
        }
        else if ($roleHasTooManyCards)
        {
            $prevStep = getPreviousDiscardStepName($pdo, $game);
            $response["prevStepName"] = updateStep($pdo, $game, $currentStep, $prevStep, $activeRole);
        }

        $response["undoneEventIds"] = array($eventID);
        deleteEvent($pdo, $game, $eventID);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to undo One Quiet Night: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo One Quiet Night: " . $e->getMessage();
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