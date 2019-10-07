<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["role"]))
            throw new Exception("Role not set.");

        if (!isset($_POST["currentStep"]))
            throw new Exception("Current step not set.");
        
        $game = $_SESSION["game"];
        $role = $_POST["role"];
        $currentStep = $_POST["currentStep"];

        $NEXT_STEP = "epInfect";
        
        require "../connect.php";
        include "../utilities.php";

        // Epidemic Step 1: INCREASE
        // "MOVE THE INFECTION RATE MARKER FORWARD 1 SPACE."
        $EVENT_CODE = "ec";
        
        $mysqli->autocommit(FALSE);
        
        // Update epidemicCount and infectionRate
        $newEpidemicCount = $mysqli->query("SELECT epidemicCount
                                            FROM vw_gamestate
                                            WHERE game = $game")->fetch_assoc()["epidemicCount"] + 1;
        
        $mysqli->query("UPDATE vw_gamestate
                        SET epidemicCount = $newEpidemicCount,
                            infRate = getInfectionRate($newEpidemicCount)
                        WHERE game = $game");
        
        if ($mysqli->affected_rows != 1)
            throw new Exception("Failed to update epidemic count / infection rate: " . $mysqli->error);

        $response["events"] = recordEvent($mysqli, $game, $EVENT_CODE, "$newEpidemicCount", $role);

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