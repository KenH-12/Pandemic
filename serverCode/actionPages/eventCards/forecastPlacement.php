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

        if (!isset($data["cardKeys"]))
            throw new Exception("Card order not set.");

        if (!isset($data["forecastingRole"]))
            throw new Exception("Forecasting role not set.");
        
        $game = $_SESSION["game"];
        $currentStep = $data["currentStep"];
        $activeRole = $data["role"];
        $cardKeys = $data["cardKeys"];
        $forecastingRole = $data["forecastingRole"];
        
        $EVENT_CODE = "fp";
        $NUM_CARDS = 6;

        if (!forecastIsInProgress($pdo, $game))
            throw new Exception("Forecast draw event was not found");

        if (count($cardKeys) !== $NUM_CARDS)
            throw new Exception("Incorrect number of cards.");
        
        $stmt = $pdo->prepare("SELECT cardKey, cardIndex
                                FROM vw_infectionCard
                                WHERE game = ?
                                AND pile = 'deck'
                                ORDER BY cardIndex DESC
                                LIMIT $NUM_CARDS");
        $stmt->execute([$game]);
        $infectionCards = $stmt->fetchAll();

        foreach ($infectionCards as $row)
        {
            $key = $row["cardKey"];
            if (!in_array($key, $cardKeys))
                throw new Exception("Card not among top 6 of infection deck: '$key'");
            
            $cardIndex = $row["cardIndex"];
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("UPDATE vw_infectionCard
                                SET cardIndex = ?
                                WHERE game = ?
                                AND cardKey = ?");
        
        for ($i = 0; $i < count($cardKeys); $i++)
        {
            $stmt->execute([$cardIndex, $game, $cardKeys[$i]]);
            
            if (queryCausedError($pdo))
                throwException($pdo, "Failed to update card index.");
            
            $cardIndex++;
        }
        
        $eventDetails = implode(",", array_reverse($cardKeys));
        $response["events"][] = recordEvent($pdo, $game, $EVENT_CODE, $eventDetails);

        $proceedToNextStep = eventCardSatisfiedDiscard($pdo, $game, $currentStep, $forecastingRole, $activeRole);

        if ($proceedToNextStep)
            $response["proceedFromDiscardToStep"] = $proceedToNextStep;
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Forecast placement failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Forecast placement failed: " . $e->getMessage();
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