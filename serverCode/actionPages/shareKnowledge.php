<?php
    try
    {
        session_start();
        require "../connect.php";
        include "../utilities.php";
        
        if (!isset($_SESSION["game"]))
            throw new Exception("Game not found.");

        if (!isset($_POST["actionCode"])
            throw new Exception("Action code not set.");
            
        if (!isset($_POST["currentStep"]))
            throw new Exception("Current step not set.");
        
        if (!isset($_POST["role"]))
            throw new Exception("Role not set.");
           
        if (!isset($_POST["giver"]))
            throw new Exception("Giver not set.");
         
        if (!isset($_POST["receiver"]))
            throw new Exception("Receiver not set.");
        
        if (!isset($_POST["cardKey"]))
            throw new Exception("Card key not set.");
        
        $game = $_SESSION["game"];
        $eventType = $_POST["actionCode"];
        $currentStep = $_POST["currentStep"];
        $role = $_POST["role"];
        $giver = $_POST["giver"];
        $receiver = $_POST["receiver"];
        $cardKey = $_POST["cardKey"];

        $mysqli->autocommit(FALSE);

        $playerLocations = $mysqli->query("SELECT location
                                            FROM vw_player
                                            WHERE game = $game
                                            AND rID IN ($giver, $receiver)");
        // Confirm that both players are in the same city.
        $cityKey = false;
        while ($row = mysqli_fetch_assoc($playerLocations))
		{
            if (!$cityKey)
                $cityKey = $row["location"];
            else if ($row["location"] != $cityKey)
                throw new Exception("Share Knowledge requires both players to be in the same city.");
		}

        // If the cardKey does not match the cityKey,
        // the giver must be the Researcher (see Researcher special ability).
        if ($cardKey != $cityKey
            && getRoleName($mysqli, $giver) != "Researcher")
            throw new Exception("Invalid 'Share Knowledge' attempt: Only the Researcher can give a card that does not match their current location.");

        $cardType = "player";
        moveCardsToPile($mysqli, $game, $cardType, $giver, $receiver, $cardKey);
        
        $eventDetails = "$cardKey,$giver,$receiver";
        $response["events"] = recordEvent($mysqli, $game, $eventType, $eventDetails, $role);

        // Check receiver's hand size and prompt discard if needed
        $HAND_LIMIT = 7;
        $receiverHandSize = getHandSize($mysqli, $game, $receiver);
        
        if ($receiverHandSize > $HAND_LIMIT)
        {
            $nextStep = "hand limit";
            $response["nextStep"] = updateStep($mysqli, $game, $currentStep, $nextStep, $role);
        }
        else
            $response["nextStep"] = nextStep($mysqli, $game, $currentStep, $role);
    }
    catch(Exception $e)
    {
        $response["failure"] = $e->getMessage();
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