<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        require "../../connect.php";
        require "../../utilities.php";

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($data["role"]))
            throw new Exception("Role not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $data["currentStep"];
        $role = $data["role"];

        if ($currentStep !== "infect cities")
            throw new Exception("wrong step.");

        $pdo->beginTransaction();

        $NEXT_STEP = "action 1";
        $response["nextStep"] = updateStep($pdo, $game, $currentStep, $NEXT_STEP, $role);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Failed to skip infection step: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to skip infection step: " . $e->getMessage();
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