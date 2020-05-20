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

        if (!isset($data["role"]))
            throw new Exception("Role not set.");

        if (!isset($data["currentStep"]))
            throw new Exception("Current step not set.");
        
        $game = $_SESSION["game"];
        $role = $data["role"];
        $currentStep = $data["currentStep"];

        $NEXT_STEP = "epInfect";

        // Epidemic Step 1: INCREASE
        // "MOVE THE INFECTION RATE MARKER FORWARD 1 SPACE."
        $EVENT_CODE = "ec";
        
        // Update epidemicCount and infectionRate
        $stmt = $pdo->prepare("SELECT epidemicCount
                                FROM vw_gamestate
                                WHERE game = ?");
        $stmt->execute([$game]);
        $newEpidemicCount = $stmt->fetch()["epidemicCount"] + 1;
        
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("UPDATE game
                                SET epidemicsDrawn = $newEpidemicCount,
                                    infectionRate = udf_getInfectionRate($newEpidemicCount)
                                WHERE gameID = ?");
        $stmt->execute([$game]);
        
        if ($stmt->rowCount() !== 1)
            throwException($pdo, "Failed to update epidemic count / infection rate");

        $response["events"] = recordEvent($pdo, $game, $EVENT_CODE, "$newEpidemicCount");

        $response["nextStep"] = updateStep($pdo, $game, $currentStep, $NEXT_STEP, $role);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Epidemic Increase failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Epidemic Increase failed: " . $e->getMessage();
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