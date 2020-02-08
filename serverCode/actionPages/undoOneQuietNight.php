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

        $ONE_QUIET_NIGHT_CARDKEY = "oneq";

        $event = getEventById($mysqli, $game, $eventID);
        validateEventCanBeUndone($mysqli, $game, $event);

        $role = $event["role"];
        $eventTurnNum = $event["turnNum"];

        $turnNum = getTurnNumber($mysqli, $game);

        $mysqli->autocommit(FALSE);

        $response["wasContingencyCard"] = moveEventCardToPrevPile($mysqli, $game, $ONE_QUIET_NIGHT_CARDKEY, $event);
        $roleHasTooManyCards = roleHasTooManyCards($mysqli, $game, $role);

        // It's possible to undo One Quiet Night after the 'infect cities' step has been skipped and the next turn has begun,
        // but only if nothing has been done in said next turn.
        if ($turnNum != $eventTurnNum)
        {
            $prevStepName = $roleHasTooManyCards ? "discard" : "infect cities";
            $response["prevTurnRoleID"] = goToStepBeforeOneQuietNight($mysqli, $game, $prevStepName);
            
            $response["prevTurnNum"] = $eventTurnNum;
            $response["prevStepName"] = $prevStepName;
        }
        else if ($roleHasTooManyCards)
        {
            $prevStep = getPreviousDiscardStepName($mysqli, $game);
            $response["prevStepName"] = updateStep($mysqli, $game, $currentStep, $prevStep, $activeRole);
        }

        $response["undoneEventIds"] = array($eventID);
        deleteEvent($mysqli, $game, $eventID);
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to undo One Quiet Night: " . $e->getMessage();
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