<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        $rootDir = realpath($_SERVER["DOCUMENT_ROOT"]);
        require "$rootDir/Pandemic/serverCode/connect.php";
        require "$rootDir/Pandemic/serverCode/utilities.php";

        $details = json_decode(file_get_contents("php://input"), true);

        if (!isset($details["role"]))
            throw new Exception("Role not set.");

        if (!isset($details["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($details["diseaseColor"]))
            throw new Exception("Disease color not set.");
        
        if (!isset($details["cityKey"]))
            throw new Exception("City not set.");
        
        $game = $_SESSION["game"];
        $role = $details["role"];
        $currentStep = $details["currentStep"];
        $diseaseColor = $details["diseaseColor"];
        $cityKey = $details["cityKey"];

        // Medic special ability is to remove all cubes of the same color when performing treat disease.
		$playerIsMedic = getRoleName($pdo, $role) === "Medic";
        // Likewise, if the disease color is cured,
        // treat disease removes all cubes of the specified color from the city regardless of the player's role.
        $diseaseStatus = getDiseaseStatus($pdo, $game, $diseaseColor);
        // Note that the "eradicated" disease status is irrelevant here
        // because there can be no cubes of an eradicated disease on the board by definition.
        $removeAllCubes = ($playerIsMedic || $diseaseStatus == "cured");

        $pdo->beginTransaction();
        
        $response["events"][] = removeCubesFromCity($pdo, $game, $role, $cityKey, $diseaseColor, $removeAllCubes, "td");

        // Removing the last cube of a cured disease causes the disease to become eradicated.
        if ($diseaseStatus == "cured" && numDiseaseCubesOnBoard($pdo, $game, $diseaseColor) == 0)
            $response["events"][] = setDiseaseStatus($pdo, $game, $diseaseColor, "eradicated");

        $response["nextStep"] = nextStep($pdo, $game, $currentStep, $role);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Treat Disease failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Treat Disease failed: " . $e->getMessage();
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