<?php
    try
    {
        session_start();
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");
        
        require "../../connect.php";
        require "../../utilities.php";

        $details = json_decode(file_get_contents("php://input"), true);

        if (!isset($details["actionCode"]))
            throw new Exception("Action code not set.");
            
        if (!isset($details["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($details["role"]))
            throw new Exception("Role not set.");
           
        if (!isset($details["giver"]))
            throw new Exception("Giver not set.");
         
        if (!isset($details["receiver"]))
            throw new Exception("Receiver not set.");
        
        if (!isset($details["cardKey"]))
            throw new Exception("Card key not set.");
        
        $game = $_SESSION["game"];
        $eventType = $details["actionCode"];
        $currentStep = $details["currentStep"];
        $role = $details["role"];
        $giver = $details["giver"];
        $receiver = $details["receiver"];
        $cardKey = $details["cardKey"];

        $stmt = $pdo->prepare("SELECT location
                                FROM vw_player
                                WHERE game = ?
                                AND rID IN (?, ?)");
        $stmt->execute([$game, $giver, $receiver]);
        $playerLocations = $stmt->fetchAll();
        // Confirm that both players are in the same city.
        $cityKey = false;
        foreach ($playerLocations as $row)
		{
            if (!$cityKey)
                $cityKey = $row["location"];
            else if ($row["location"] !== $cityKey)
                throw new Exception("Share Knowledge requires both players to be in the same city.");
		}

        // If the cardKey does not match the cityKey,
        // the giver must be the Researcher (see Researcher special ability).
        if ($cardKey !== $cityKey
            && getRoleName($pdo, $giver) !== "Researcher")
            throw new Exception("Only the Researcher can give a card that does not match their current location.");

        $pdo->beginTransaction();
        
        $cardType = "player";
        moveCardsToPile($pdo, $game, $cardType, $giver, $receiver, $cardKey);
        
        $eventDetails = "$cardKey,$giver,$receiver";
        $response["events"] = recordEvent($pdo, $game, $eventType, $eventDetails, $role);

        if (roleHasTooManyCards($pdo, $game, $receiver))
        {
            $nextStep = "hand limit";
            $response["nextStep"] = updateStep($pdo, $game, $currentStep, $nextStep, $role);
        }
        else
            $response["nextStep"] = nextStep($pdo, $game, $currentStep, $role);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Share Knowledge failed: PDOException:" . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Share Knowledge failed: " . $e->getMessage();
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