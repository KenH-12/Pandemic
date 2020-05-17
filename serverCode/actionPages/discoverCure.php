<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        require "../connect.php";
        require "../utilities.php";
        
        $details = json_decode(file_get_contents("php://input"), true);

        if (!isset($details["role"]))
            throw new Exception("Role not set.");
        
        if (!isset($details["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($details["cityKey"]))
            throw new Exception("City key not set.");
        
        if (!isset($details["diseaseColor"]))
            throw new Exception("Disease color not set.");
        
        if (!isset($details["cardKeys"]))
            throw new Exception("Card keys not set.");
        
        $game = $_SESSION["game"];
        $role = $details["role"];
        $currentStep = $details["currentStep"];
        $cityKey = $details["cityKey"];
        $diseaseColor = $details["diseaseColor"];
        $cardKeys = $details["cardKeys"];

        // Make sure the disease has not already been cured.
        if (getDiseaseStatus($pdo, $game, $diseaseColor) !== "rampant")
            throw new Exception("the disease color has already been cured.");

        // Verify that the cityKey reported by the client.
        if (getLocationKey($pdo, $game, $role) !== $cityKey)
            throw new Exception("inconsistent cityKey");

        // Verify that the current location has a research station.
        if (!cityHasResearchStation($pdo, $game, $cityKey))
            throw new Exception("the city must have a research station.");

        // Normally, discover a cure costs 5 cards of the same color.
        $numCardsRequired = 5;
        // Scientist special ability allows discover a cure for only 4 cards of the same color.
        if (getRoleName($pdo, $role) == "Scientist")
            $numCardsRequired = 4;

        $numCards = count($cardKeys);
        if ($numCards != $numCardsRequired)
            throw new Exception("incorrect number of cards ($numCards)");
        
        // Check that all cards are the same color.
        for ($i = 0; $i < $numCards; $i++)
        {
            if (getCityColor($pdo, $cardKeys[$i]) !== $diseaseColor)
                throw new Exception("all cards must be the same color.");
        }

        $pdo->beginTransaction();

        discardPlayerCards($pdo, $game, $role, $cardKeys);
        
        // Record "discover cure" event
        $eventType = "dc";
        $eventDetails = implode(",", $cardKeys);
        $response["events"][] = recordEvent($pdo, $game, $eventType, $eventDetails, $role);

        // If there are 0 cubes of a cured disease color on the board, the disease becomes eradicated.
        // Determine and update the disease status.
        if (numDiseaseCubesOnBoard($pdo, $game, $diseaseColor) > 0)
            setDiseaseStatus($pdo, $game, $diseaseColor, "cured");
        else // Add any "eradication" events to the response.
            $response["events"][] = setDiseaseStatus($pdo, $game, $diseaseColor, "eradicated");

        $playersAreVictorious = checkVictory($pdo, $game);
        
        if ($playersAreVictorious) // Medic auto-treat events are irrelevant
            $response["gameEndCause"] = "victory";
        else
        {
            // The Medic automatically treats cured diseases in his location.
            $medicLocationKey = getLocationKey($pdo, $game, "Medic");
            if ($medicLocationKey)
            {
                $autoTreatEvents = getAutoTreatDiseaseEvents($pdo, $game, $medicLocationKey, $diseaseColor);
    
                if ($autoTreatEvents)
                    $response["events"] = array_merge($response["events"], $autoTreatEvents);
            }
    
            $response["nextStep"] = nextStep($pdo, $game, $currentStep, $role);
        }
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Discover A Cure failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Discover A Cure failed: " . $e->getMessage();
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