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

        if (!isset($_POST["cardKeys"]))
            throw new Exception("Card order not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $_POST["currentStep"];
        $activeRole = $_POST["role"];
        $cardKeys = explode(",", $_POST["cardKeys"]);
        
        require "../connect.php";
        include "../utilities.php";
        
        $EVENT_CODE = "fp";
        $NUM_CARDS = 6;

        if (!forecastIsInProgress($mysqli, $game))
            throw new Exception("Forecast draw event was not found");

        if (count($cardKeys) !== $NUM_CARDS)
            throw new Exception("Incorrect number of cards.");
        
        $mysqli->autocommit(FALSE);
        
        $infectionCards = $mysqli->query("SELECT cardKey, cardIndex
                                        FROM vw_infectioncard
                                        WHERE game = $game
                                        AND pile = 'deck'
                                        ORDER BY cardIndex DESC
                                        LIMIT $NUM_CARDS");

        while ($row = mysqli_fetch_assoc($infectionCards))
        {
            $key = $row["cardKey"];
            if (!in_array($key, $cardKeys))
                throw new Exception("Card not among top 6 of infection deck: '$key'");
            
            $cardIndex = $row["cardIndex"];
        }

        for ($i = 0; $i < count($cardKeys); $i++)
        {
            $key = $cardKeys[$i];

            $mysqli->query("UPDATE vw_infectionCard
                            SET cardIndex = $cardIndex
                            WHERE game = $game
                            AND cardKey = '$key'");
            
            if ($mysqli->error)
                throw new Exception("Failed to update cardIndex ('$key', $cardIndex): " . $mysqli->error);
        }
        
        $eventDetails = implode(",", $cardKeys);
        $response["events"][] = recordEvent($mysqli, $game, $EVENT_CODE, $eventDetails);

        $proceedToNextStep = eventCardSatisfiedDiscard($mysqli, $game, $currentStep, $discardingRole, $activeRole);

        if ($proceedToNextStep)
            $response["proceedFromDiscardToStep"] = $proceedToNextStep;
    }
    catch(Exception $e)
    {
        $response["failure"] = "Forecast placement failed: " . $e->getMessage();
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