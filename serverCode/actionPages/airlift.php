<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($_POST["role"]))
            throw new Exception("Role not set.");

        if (!isset($_POST["roleToAirlift"]))
            throw new Exception("Role to airlift not set.");

        if (!isset($_POST["originKey"]))
            throw new Exception("Origin city not set.");

        if (!isset($_POST["destinationKey"]))
            throw new Exception("Destination city not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $_POST["currentStep"];
        $activeRole = $_POST["role"];
        $roleToAirlift = $_POST["roleToAirlift"];
        $originKey = $_POST["originKey"];
        $destinationKey = $_POST["destinationKey"];
        
        require "../connect.php";
        include "../utilities.php";
        
        $EVENT_CODE = "ar";
        $CARD_KEY = "airl";

        checkEventCardLegality($mysqli, $game, $CARD_KEY);
        
        // The destination must be different than the origin.
        if ($originKey === $destinationKey)
            throw new Exception("The player is already at the specified destination.");
        
        $discardingRole = getEventCardHolder($mysqli, $game, $CARD_KEY);
        
        $mysqli->autocommit(FALSE);
        
        discardOrRemoveEventCard($mysqli, $game, $discardingRole, $CARD_KEY);
        $discardingRole = convertRoleFromPossibleContingency($mysqli, $discardingRole);
        
        updateRoleLocation($mysqli, $game, $roleToAirlift, $originKey, $destinationKey);

        $details = "$roleToAirlift,$originKey,$destinationKey";
        $response["events"][] = recordEvent($mysqli, $game, $EVENT_CODE, $details, $discardingRole);
        
        if (getRoleName($mysqli, $roleToAirlift) === "Medic")
        {
            $autoTreatEvents = getAutoTreatDiseaseEvents($mysqli, $game, $destinationKey);

            if ($autoTreatEvents)
                $response["events"] = array_merge($response["events"], $autoTreatEvents);
        }

        $proceedToNextStep = eventCardSatisfiedDiscard($mysqli, $game, $currentStep, $discardingRole, $activeRole);

        if ($proceedToNextStep)
            $response["proceedFromDiscardToStep"] = $proceedToNextStep;
    }
    catch(Exception $e)
    {
        $response["failure"] = "Airlift failed: " . $e->getMessage();
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