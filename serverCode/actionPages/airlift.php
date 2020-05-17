<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        require "../connect.php";
        require "../utilities.php";

        $airliftDetails = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($airliftDetails["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($airliftDetails["role"]))
            throw new Exception("Role not set.");

        if (!isset($airliftDetails["roleToAirlift"]))
            throw new Exception("Role to airlift not set.");

        if (!isset($airliftDetails["originKey"]))
            throw new Exception("Origin city not set.");

        if (!isset($airliftDetails["destinationKey"]))
            throw new Exception("Destination city not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $airliftDetails["currentStep"];
        $activeRole = $airliftDetails["role"];
        $roleToAirlift = $airliftDetails["roleToAirlift"];
        $originKey = $airliftDetails["originKey"];
        $destinationKey = $airliftDetails["destinationKey"];
        
        $EVENT_CODE = "ar";
        $CARD_KEY = "airl";

        checkEventCardLegality($pdo, $game, $CARD_KEY);
        
        // The destination must be different than the origin.
        if ($originKey === $destinationKey)
            throw new Exception("The player is already at the specified destination.");
        
        $discardingRole = getEventCardHolder($pdo, $game, $CARD_KEY);
        
        $pdo->beginTransaction();
        
        discardOrRemoveEventCard($pdo, $game, $discardingRole, $CARD_KEY);
        $discardingRole = convertRoleFromPossibleContingency($pdo, $discardingRole);
        
        updateRoleLocation($pdo, $game, $roleToAirlift, $originKey, $destinationKey);

        $details = "$roleToAirlift,$originKey,$destinationKey";
        $response["events"][] = recordEvent($pdo, $game, $EVENT_CODE, $details, $discardingRole);
        
        if (getRoleName($pdo, $roleToAirlift) === "Medic")
        {
            $autoTreatEvents = getAutoTreatDiseaseEvents($pdo, $game, $destinationKey);

            if ($autoTreatEvents)
                $response["events"] = array_merge($response["events"], $autoTreatEvents);
        }

        $proceedToNextStep = eventCardSatisfiedDiscard($pdo, $game, $currentStep, $discardingRole, $activeRole);

        if ($proceedToNextStep)
            $response["proceedFromDiscardToStep"] = $proceedToNextStep;
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Airlift failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Airlift failed: " . $e->getMessage();
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