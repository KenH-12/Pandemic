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

        // It's possible to undo One Quiet Night after the 'infect cities' step has been skipped and the next turn has begun,
        // but only if nothing has been done in said next turn.
        if ($turnNum != $eventTurnNum)
        {
            // The card draw event of the previous turn is a good place to ensure that we retrieve the correct prevTurnRoleID.
            $CARD_DRAW = "cd";
            $prevTurnRoleID = $mysqli->query("SELECT role AS 'prevTurnRoleID'
                                            FROM vw_event
                                            WHERE game = $game
                                            AND turnNum = $eventTurnNum
                                            AND eventType = '$CARD_DRAW'")->fetch_assoc()["prevTurnRoleID"];
            
            // Decrement the turn number,
            // set the turn to the prevTurnRoleID,
            // and set the step to 'infect cities' because that step was skipped by the One Quiet Night event which is being undone.
            $prevStepName = "infect cities";
            $mysqli->query("UPDATE vw_gamestate
                            SET turnNum = $eventTurnNum,
                                turn = $prevTurnRoleID,
                                step = getStepID('$prevStepName')
                            WHERE game = $game
                            AND turnNum = $turnNum
                            AND turn = $activeRole
                            AND stepName = '$currentStep'");
            
            if ($mysqli->affected_rows != 1)
                throw new Exception("could not revert to the skipped 'infect cities' step of the previous turn." . $mysqli->error);
            
            $response["prevTurnNum"] = $eventTurnNum;
            $response["prevTurnRoleID"] = $prevTurnRoleID;
            $response["prevStepName"] = $prevStepName;
        }

        $response["wasContingencyCard"] = moveEventCardToPrevPile($mysqli, $game, $ONE_QUIET_NIGHT_CARDKEY, $event);

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