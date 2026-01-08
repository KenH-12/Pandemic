<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        require "../../connect.php";
        require "../../utilities.php";

        $details = json_decode(file_get_contents("php://input"), true);

        if (!isset($details["role"]))
            throw new Exception("Role not set.");
        
        if (!isset($details["currentStep"]))
            throw new Exception("Current step not set.");
        
        $game = $_SESSION["game"];
        $role = $details["role"];
        $currentStep = $details["currentStep"];

        // Record the number of actions forfeited as this information will be displayed in the event history.
        $MAX_NUM_ACTIONS = 4;
        $eventDetails = $MAX_NUM_ACTIONS - countEventsOfTurn($pdo, $game, getActionEventTypes());

        $pdo->beginTransaction();
        
        $EVENT_TYPE = "pa";
        $response["events"] = recordEvent($pdo, $game, $EVENT_TYPE, "$eventDetails", $role);

        $NEXT_STEP = "draw";
        $response["nextStep"] = updateStep($pdo, $game, $currentStep, $NEXT_STEP, $role);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to pass remaining actions: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to pass remaining actions: " . $e->getMessage();
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