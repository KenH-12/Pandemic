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

        if (!isset($_POST["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($_POST["role"]))
            throw new Exception("Role not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $_POST["currentStep"];
        $role = $_POST["role"];

        if ($currentStep !== "infect cities")
            throw new Exception("wrong step.");

        $mysqli->autocommit(FALSE);

        $NEXT_STEP = "action 1";
        $response["nextStep"] = updateStep($mysqli, $game, $currentStep, $NEXT_STEP, $role);
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to skip infection step: " . $e->getMessage();
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