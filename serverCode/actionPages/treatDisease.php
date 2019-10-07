<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["role"])
            || !isset($_POST["currentStep"])
            || !isset($_POST["cityKey"])
            || !isset($_POST["diseaseColor"]))
            throw new Exception("Required values not set.");
        
        $game = $_SESSION["game"];
        $role = $_POST["role"];
        $currentStep = $_POST["currentStep"];
        $diseaseColor = $_POST["diseaseColor"];
        $cityKey = $_POST["cityKey"];

        require "../connect.php";
        include "../utilities.php";

        // Medic special ability is to remove all cubes of the same color when performing treat disease.
		$playerIsMedic = getRoleName($mysqli, $role) == "Medic";
        // Likewise, if the disease color is cured,
        // treat disease removes all cubes of the specified color from the city regardless of the player's role.
        $diseaseStatus = getDiseaseStatus($mysqli, $game, $diseaseColor);
        // Note that the "eradicated" disease status is irrelevant here
        // because there can be no cubes of an eradicated disease on the board by definition.
        $removeAllCubes = ($playerIsMedic || $diseaseStatus == "cured");

        $mysqli->autocommit(FALSE);
        
        $response["events"][] = removeCubesFromCity($mysqli, $game, $role, $cityKey, $diseaseColor, $removeAllCubes, "td");

        // Removing the last cube of a cured disease causes the disease to become eradicated.
        if ($diseaseStatus == "cured" && numDiseaseCubesOnBoard($mysqli, $game, $diseaseColor) == 0)
            $response["events"][] = setDiseaseStatus($mysqli, $game, $diseaseColor, "eradicated");

        $response["nextStep"] = nextStep($mysqli, $game, $currentStep, $role);
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