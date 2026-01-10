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
        $activeRole = $data["role"];
        
        $EVENT_CODE = "fd";
        $CARD_KEY = "fore";
        $NUM_CARDS_TO_DRAW = 6;

        checkEventCardLegality($pdo, $game, $CARD_KEY);
        
        $discardingRole = getEventCardHolder($pdo, $game, $CARD_KEY);
        
        $pdo->beginTransaction();
        
        discardOrRemoveEventCard($pdo, $game, $discardingRole, $CARD_KEY);
        $discardingRole = convertRoleFromPossibleContingency($pdo, $discardingRole);

        $stmt = $pdo->prepare("SELECT cardKey
                                FROM vw_infectionCard
                                WHERE game = ?
                                AND pile = 'deck'
                                ORDER BY cardIndex DESC
                                LIMIT $NUM_CARDS_TO_DRAW");
        $stmt->execute([$game]);

        if ($stmt->rowCount() !== $NUM_CARDS_TO_DRAW)
            throw new Exception("fewer than $NUM_CARDS_TO_DRAW cards were drawn.");

        $infectionCards = $stmt->fetchAll();

        foreach ($infectionCards as $row)
            $cardKeys[] = $row["cardKey"];
        
        $eventDetails = implode(",", $cardKeys);
        $response["events"][] = recordEvent($pdo, $game, $EVENT_CODE, $eventDetails, $discardingRole);
    }
    catch(PDOException $e)
    {
        $response["failure"] = "Forecast draw failed: PDOException: " . $e->getMessage();
    }
    catch(Exception $e)
    {
        $response["failure"] = "Forecast draw failed: " . $e->getMessage();
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