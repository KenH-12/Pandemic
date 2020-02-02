<?php
    try
    {
        session_start();
        require "../connect.php";
        include "../utilities.php";
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["role"])
            throw new Exception("Role not set.");
        
        if (!isset($_POST["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($_POST["cityKey"]))
            throw new Exception("City key not set.");
        
        if (!isset($_POST["diseaseColor"]))
            throw new Exception("Disease color not set.");
        
        if (!isset($_POST["cardKeys"])))
            throw new Exception("Card keys not set.");
        
        $game = $_SESSION["game"];
        $role = $_POST["role"];
        $currentStep = $_POST["currentStep"];
        $cityKey = $_POST["cityKey"];
        $diseaseColor = $_POST["diseaseColor"];
        $cardKeys = $_POST["cardKeys"];

        // Make sure the disease has not already been cured.
        if (getDiseaseStatus($mysqli, $game, $diseaseColor) != "rampant")
            throw new Exception("the disease color has already been cured.");

        // Verify that the cityKey reported by the client.
        if (getLocationKey($mysqli, $game, $role) != $cityKey)
            throw new Exception("inconsistent cityKey");

        // Verify that the current location has a research station.
        if (!cityHasResearchStation($mysqli, $game, $cityKey))
            throw new Exception("the city must have a research station.");

        // Normally, discover a cure costs 5 cards of the same color.
        $numCardsRequired = 5;
        // Scientist special ability allows discover a cure for only 4 cards of the same color.
        if (getRoleName($mysqli, $role) == "Scientist")
            $numCardsRequired = 4;

        $numCards = count($cardKeys);
        if ($numCards != $numCardsRequired)
            throw new Exception("incorrect number of cards ($numCards)");
        
        // Check that all cards are the same color.
        for ($i = 0; $i < $numCards; $i++)
        {
            if (getCityColor($mysqli, $cardKeys[$i]) != $diseaseColor)
                throw new Exception("all cards must be the same color.");
        }

        $mysqli->autocommit(FALSE);

        discardPlayerCards($mysqli, $game, $role, $cardKeys);
        
        // Record "discover cure" event
        $eventType = "dc";
        $details = implode(",", $cardKeys);
        $response["events"][] = recordEvent($mysqli, $game, $eventType, $details, $role);

        // If there are 0 cubes of a cured disease color on the board, the disease becomes eradicated.
        // Determine and update the disease status.
        if (numDiseaseCubesOnBoard($mysqli, $game, $diseaseColor) > 0)
            setDiseaseStatus($mysqli, $game, $diseaseColor, "cured");
        else // Add any "eradication" events to the response.
            $response["events"][] = setDiseaseStatus($mysqli, $game, $diseaseColor, "eradicated");

        $playersAreVictorious = checkVictory($mysqli, $game);

        if ($playersAreVictorious) // Medic auto-treat events are irrelevant
            $response["gameEndCause"] = "victory";
        else
        {
            // The Medic automatically treats cured diseases in his location.
            $medicLocationKey = getLocationKey($mysqli, $game, "Medic");
            if ($medicLocationKey)
            {
                $autoTreatEvents = getAutoTreatDiseaseEvents($mysqli, $game, $medicLocationKey, $diseaseColor);
    
                if ($autoTreatEvents)
                    $response["events"] = array_merge($response["events"], $autoTreatEvents);
            }
    
            $response["nextStep"] = nextStep($mysqli, $game, $currentStep, $role);
        }
    }
    catch(Exception $e)
    {
        $response["failure"] = "Failed to discover cure: " . $e->getMessage();
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