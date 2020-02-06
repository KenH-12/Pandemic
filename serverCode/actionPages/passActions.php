<?php
    try
    {
        session_start();
        require "../connect.php";
        include "../utilities.php";
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["role"]))
            throw new Exception("Role not set.");
        
        if (!isset($_POST["currentStep"]))
            throw new Exception("Current step not set.");
        
        $game = $_SESSION["game"];
        $role = $_POST["role"];
        $currentStep = $_POST["currentStep"];

        // Record the number of actions forfeited as this information will be displayed in the event history.
        $MAX_NUM_ACTIONS = 4;
        $eventDetails = $MAX_NUM_ACTIONS - countActionsTakenThisTurn($mysqli, $game);

        $mysqli->autocommit(FALSE);
        
        $EVENT_TYPE = "pa";
        $response["events"] = recordEvent($mysqli, $game, $EVENT_TYPE, "$eventDetails", $role);

        $NEXT_STEP = "draw";
        $response["nextStep"] = updateStep($mysqli, $game, $currentStep, $NEXT_STEP, $role);
    }
    catch(Exception $e)
    {
        $response["failure"] = $e->getMessage();
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