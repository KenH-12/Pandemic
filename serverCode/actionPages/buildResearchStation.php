<?php
    try
    {
        session_start();

        if (!isset($_SESSION["game"]))
            throw new Exception("game not found");
        
        require "../connect.php";
        require "../utilities.php";

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["role"]))
            throw new Exception("role not set");
        
        if (!isset($data["currentStep"]))
            throw new Exception("current step not set");

        if (!isset($data["actionCode"]))
            throw new Exception("action code not set");
        
        if (!isset($data["locationKey"]))
            throw new Exception("location key not set");
        
        if (!isset($data["relocationKey"]))
            throw new Exception("relocation key not set");
            
        $game = $_SESSION["game"];
        $role = $data["role"];
        $currentStep = $data["currentStep"];
        $actionCode = $data["actionCode"];
        $locationKey = $data["locationKey"];
        $relocationKey = $data["relocationKey"];
        
        $response = array();
        
        $actionDetails = $locationKey;

        $BUILD_RS_EVENT_CODE = "rs";
        $GOVERNMENT_GRANT_EVENT_CODE = "gg";

        $pdo->beginTransaction();

        // Government Grant Event Card:
        // "Add 1 research station to any city (no city card needed)."
        if ($actionCode === $GOVERNMENT_GRANT_EVENT_CODE)
        {
            $cardKey = "gove";
            checkEventCardLegality($pdo, $game, $cardKey);
            
            $discardingRole = getEventCardHolder($pdo, $game, $cardKey);

            discardOrRemoveEventCard($pdo, $game, $discardingRole, $cardKey);
            $eventRole = convertRoleFromPossibleContingency($pdo, $discardingRole);

            $proceedToNextStep = eventCardSatisfiedDiscard($pdo, $game, $currentStep, $discardingRole, $role);
            if ($proceedToNextStep)
                $response["proceedFromDiscardToStep"] = $proceedToNextStep;
        }
        else // Build Research Station: "Discard the city card that matches the city you are in to place a research station there."
        {
            $eventRole = $role;
            // Operations Expert special ability:
            // "As an action, build a research station in his current city without discarding a city card."
            if (getRoleName($pdo, $role) !== "Operations Expert")
                discardPlayerCards($pdo, $game, $role, $locationKey);
            
            $response["nextStep"] = nextStep($pdo, $game, $currentStep, $role);
        }
        
        $RESEARCH_STATION_LIMIT = 6;
        $stmt = $pdo->prepare("SELECT COUNT(*) AS 'researchStationStock'
                                FROM vw_location
                                WHERE game = ?
                                AND researchStation = 1");
        $stmt->execute([$game]);
        
        // If the research station stock is depleted,
        // a research station must be relocated.
        if ($stmt->fetch()["researchStationStock"] == $RESEARCH_STATION_LIMIT)
        {
            if ($relocationKey == "0")
                throw new Exception("No research station pieces remain and no relocation was specified.");
            
            $actionDetails .= ",$relocationKey";
        }
        
        placeResearchStation($pdo, $game, $locationKey, $relocationKey);
        $response["events"] = recordEvent($pdo, $game, $actionCode, $actionDetails, $eventRole);
    }
    catch(Exception $e)
    {
        $response["failure"] = "Build Research Station failed: " . $e->getMessage();
    }
    finally
    {
        if (isset($response["failure"]))
            $pdo->rollback();
        else
            $pdo->commit();
        
        echo json_encode($response);
    }
?>